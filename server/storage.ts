import { 
  transactions, 
  assets, 
  rates, 
  userSettings,
  exchangeRates,
  exchangeRateHistory,
  type InsertTransaction, 
  type Transaction, 
  type InsertAsset, 
  type Asset, 
  type InsertRate, 
  type Rate,
  type UserSettings,
  type InsertUserSettings,
  type ExchangeRate,
  type InsertExchangeRate,
  type ExchangeRateHistory,
  type InsertExchangeRateHistory
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";

export interface IStorage {
  // Transactions with asset movement
  createTransactionWithAssetMovement(userId: string, transaction: InsertTransaction): Promise<Transaction>;
  getTransactions(userId: string): Promise<Transaction[]>;
  getTransactionById(userId: string, id: string): Promise<Transaction | undefined>;
  updateTransactionStatus(userId: string, id: string, status: string): Promise<Transaction | undefined>;
  processTransactionConfirmation(userId: string, transactionId: string): Promise<void>;
  
  // Assets
  createAsset(userId: string, asset: InsertAsset): Promise<Asset>;
  getAssets(userId: string): Promise<Asset[]>;
  updateAsset(userId: string, id: string, updates: Partial<InsertAsset>): Promise<Asset | undefined>;
  deleteAsset(userId: string, id: string): Promise<boolean>;
  getAssetByName(userId: string, name: string, type: string): Promise<Asset | undefined>;
  
  // Rates
  createRate(userId: string, rate: InsertRate): Promise<Rate>;
  getRates(userId: string): Promise<Rate[]>;
  getLatestRate(userId: string, fromCurrency: string, toCurrency: string): Promise<Rate | undefined>;
  
  // User Settings
  getUserSettings(userId: string): Promise<UserSettings | undefined>;
  updateUserSettings(userId: string, settings: Partial<InsertUserSettings>): Promise<UserSettings>;
  
  // Exchange Rates
  createExchangeRate(userId: string, rate: InsertExchangeRate): Promise<ExchangeRate>;
  getExchangeRates(userId: string): Promise<ExchangeRate[]>;
  updateExchangeRate(id: string, updates: Partial<InsertExchangeRate>): Promise<ExchangeRate | undefined>;
  getExchangeRateHistory(userId: string): Promise<ExchangeRateHistory[]>;
  getExchangeRateForTransaction(userId: string, fromCurrency: string, toCurrency: string, denomination: string, transactionType: 'buy' | 'sell'): Promise<{ rate: number; source: string } | null>;
}

export class DatabaseStorage implements IStorage {
  // Transactions with asset movement logic
  async createTransactionWithAssetMovement(userId: string, transaction: InsertTransaction): Promise<Transaction> {
    // P2P 거래는 대기 상태로 생성 (실제 입금 확인 후 confirmed로 변경)
    const transactionData = {
      ...transaction,
      status: (transaction.type === 'binance_p2p' || transaction.type === 'p2p_trade') ? 'pending' : 'confirmed',
      userId
    };
    
    let createdTransaction: Transaction | null = null;
    
    try {
      // 거래 기록 먼저 생성
      const [result] = await db
        .insert(transactions)
        .values(transactionData)
        .returning();
      createdTransaction = result;
      
      // confirmed 상태인 경우에만 자산 이동 처리
      if (transactionData.status === 'confirmed') {
        await this.handleAssetMovement(userId, transaction);
      }
      
      return createdTransaction;
    } catch (error) {
      // 자산 이동 중 오류 발생시 거래를 취소 상태로 변경
      if (createdTransaction) {
        console.error('자산 이동 중 오류 발생. 거래 취소 처리:', error);
        await this.updateTransactionStatus(userId, createdTransaction.id, 'cancelled');
        throw error;
      }
      throw error;
    }
  }

  public async handleAssetMovement(userId: string, transaction: InsertTransaction | Transaction) {
    console.log('=== handleAssetMovement 시작 ===', {
      userId,
      transactionType: transaction.type,
      fromAssetName: transaction.fromAssetName,
      toAssetName: transaction.toAssetName
    });
    
    const fromAmount = parseFloat(transaction.fromAmount);
    const toAmount = parseFloat(transaction.toAmount);
    const fees = parseFloat(transaction.fees || "0");

    // Validate numeric values
    if (isNaN(fromAmount) || isNaN(toAmount) || isNaN(fees)) {
      throw new Error(`Invalid numeric values in transaction: fromAmount=${transaction.fromAmount}, toAmount=${transaction.toAmount}, fees=${transaction.fees}`);
    }

    if (fromAmount < 0 || toAmount < 0 || fees < 0) {
      throw new Error(`Negative values not allowed in transaction: fromAmount=${fromAmount}, toAmount=${toAmount}, fees=${fees}`);
    }

    switch (transaction.type) {
      case 'bank_to_exchange':
        console.log('은행 → 거래소 자산 이동 처리');
        // 은행에서 거래소로 송금: 은행 자금 감소, 거래소 자금 증가
        await this.moveAssetsBankToExchange(userId, transaction.fromAssetName!, transaction.toAssetName!, fromAmount);
        break;
        
      case 'exchange_purchase':
        console.log('거래소 코인 구매 자산 이동 처리');
        // 거래소에서 코인 구매: KRW 감소, 코인 증가 (수수료 적용)
        await this.moveAssetsExchangePurchase(userId, transaction.fromAssetName!, transaction.toAssetName!, fromAmount, toAmount, fees);
        break;
        
      case 'exchange_transfer':
      case 'network_transfer':
        console.log('네트워크 이동/거래소간 이체 자산 이동 처리');
        // 거래소간 이체/네트워크 이동: 출발 거래소 자산 감소, 도착 거래소 자산 증가 (수수료 적용)
        await this.moveAssetsExchangeTransfer(userId, transaction.fromAssetName!, transaction.toAssetName!, fromAmount, toAmount, fees);
        break;
        
      case 'p2p_trade':
      case 'binance_p2p':
        console.log('P2P 거래 자산 이동 처리');
        // P2P 거래: USDT 감소, VND 현금 증가
        await this.moveAssetsP2PTrade(userId, transaction.fromAssetName!, transaction.toAssetName!, fromAmount, toAmount, fees);
        break;

      case 'cash_exchange':
        console.log('현금 환전 자산 이동 처리');
        // 현금 환전: fromCurrency 현금 감소, toCurrency 현금 증가 (권종별 분배 포함)
        await this.moveAssetsCashExchange(userId, transaction);
        break;
        
      default:
        console.log('알 수 없는 거래 타입:', transaction.type);
        break;
    }
    
    console.log('=== handleAssetMovement 완료 ===');
  }

  // 거래 상태 업데이트
  async updateTransactionStatus(userId: string, id: string, status: string): Promise<Transaction | undefined> {
    const [result] = await db
      .update(transactions)
      .set({ status })
      .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
      .returning();
    return result;
  }

  // 거래 확인 처리 - 자산 이동만 처리 (상태는 이미 업데이트됨)
  async processTransactionConfirmation(userId: string, transactionId: string): Promise<void> {
    const transaction = await this.getTransactionById(userId, transactionId);
    if (!transaction) {
      throw new Error('Transaction not found');
    }
    
    // 자산 이동 처리 (상태 업데이트는 호출하는 측에서 이미 완료됨)
    await this.handleAssetMovement(userId, transaction);
  }

  // 거래 취소 처리 - 이미 이동된 자산을 원래대로 되돌림
  async processTransactionCancellation(userId: string, transactionId: string): Promise<void> {
    const transaction = await this.getTransactionById(userId, transactionId);
    if (!transaction) {
      throw new Error('Transaction not found');
    }
    
    console.log('=== 거래 취소 자산 복원 시작 ===', {
      userId,
      transactionId,
      transactionType: transaction.type,
      fromAmount: transaction.fromAmount,
      toAmount: transaction.toAmount
    });
    
    // 자산 이동을 역순으로 되돌림
    await this.reverseAssetMovement(userId, transaction);
  }

  // 자산 이동을 역순으로 되돌리는 함수
  public async reverseAssetMovement(userId: string, transaction: InsertTransaction | Transaction) {
    const fromAmount = parseFloat(transaction.fromAmount);
    const toAmount = parseFloat(transaction.toAmount);
    const fees = parseFloat(transaction.fees || "0");

    console.log('=== 자산 복원 처리 시작 ===', {
      transactionType: transaction.type,
      fromAmount,
      toAmount,
      fees
    });

    switch (transaction.type) {
      case 'p2p_trade':
      case 'binance_p2p':
        console.log('P2P 거래 자산 복원 처리');
        // P2P 거래 복원: Binance USDT 다시 증가, VND 계좌 감소
        await this.reverseP2PTradeMovement(userId, transaction.fromAssetName!, transaction.toAssetName!, fromAmount, toAmount);
        break;
        
      case 'exchange_transfer':
      case 'network_transfer':
        console.log('네트워크 이동 자산 복원 처리');
        // 네트워크 이동 복원: 출발 거래소 증가, 도착 거래소 감소
        await this.reverseExchangeTransferMovement(userId, transaction.fromAssetName!, transaction.toAssetName!, fromAmount, toAmount, fees);
        break;
        
      default:
        console.log('지원되지 않는 거래 타입 복원:', transaction.type);
        break;
    }
    
    console.log('=== 자산 복원 처리 완료 ===');
  }

  // P2P 거래 자산 복원
  private async reverseP2PTradeMovement(userId: string, fromAssetName: string, toAssetName: string, fromAmount: number, toAmount: number) {
    // Binance USDT 자산 다시 증가
    const binanceUsdtAsset = await this.getAssetByName(userId, 'Binance USDT', 'binance');
    if (binanceUsdtAsset) {
      const newBalance = parseFloat(binanceUsdtAsset.balance || "0") + fromAmount;
      console.log('Binance USDT 자산 복원:', {
        currentBalance: parseFloat(binanceUsdtAsset.balance || "0"),
        restoreAmount: fromAmount,
        newBalance
      });
      await this.updateAsset(userId, binanceUsdtAsset.id, { balance: newBalance.toString() });
    }

    // VND 계좌 자산 감소
    let targetAsset = await this.getAssetByName(userId, toAssetName, 'account');
    if (targetAsset) {
      const currentBalance = parseFloat(targetAsset.balance || "0");
      const newBalance = currentBalance - toAmount;
      console.log('VND 계좌 자산 복원 (차감):', {
        assetName: toAssetName,
        currentBalance,
        deductAmount: toAmount,
        newBalance
      });
      await this.updateAsset(userId, targetAsset.id, { balance: newBalance.toString() });
    }
  }

  // 네트워크 이동 자산 복원
  private async reverseExchangeTransferMovement(userId: string, fromAssetName: string, toAssetName: string, fromAmount: number, toAmount: number, fees: number) {
    // 출발 거래소 자산 다시 증가 (원래 차감된 금액)
    let fromAsset = await this.getAssetByName(userId, fromAssetName, 'exchange');
    if (!fromAsset) {
      fromAsset = await this.getAssetByName(userId, fromAssetName, 'binance');
    }
    
    if (fromAsset) {
      const newBalance = parseFloat(fromAsset.balance || "0") + fromAmount;
      console.log('출발 자산 복원:', {
        name: fromAssetName,
        currentBalance: parseFloat(fromAsset.balance || "0"),
        restoreAmount: fromAmount,
        newBalance
      });
      await this.updateAsset(userId, fromAsset.id, { balance: newBalance.toString() });
    }

    // 도착 거래소 자산 감소 (받았던 금액 차감)
    let toAsset = await this.getAssetByName(userId, toAssetName, 'binance');
    if (!toAsset) {
      toAsset = await this.getAssetByName(userId, toAssetName, 'exchange');
    }
    
    if (toAsset) {
      const currentBalance = parseFloat(toAsset.balance || "0");
      const newBalance = currentBalance - toAmount;
      console.log('도착 자산 복원 (차감):', {
        name: toAssetName,
        currentBalance,
        deductAmount: toAmount,
        newBalance
      });
      await this.updateAsset(userId, toAsset.id, { balance: newBalance.toString() });
    }
  }

  private async moveAssetsBankToExchange(userId: string, fromBankName: string, toExchangeName: string, amount: number) {
    // 은행 계좌 자금 감소
    console.log('은행 자산 검색:', { userId, fromBankName, type: 'account' });
    const bankAsset = await this.getAssetByName(userId, fromBankName, 'account');
    console.log('은행 자산 검색 결과:', bankAsset);
    if (bankAsset) {
      const currentBalance = parseFloat(bankAsset.balance || "0");
      const newBalance = currentBalance - amount;
      console.log('은행 자산 잔액 업데이트:', { name: fromBankName, currentBalance, amount, newBalance });
      await this.updateAsset(userId, bankAsset.id, { balance: newBalance.toString() });
    } else {
      console.error('은행 자산을 찾을 수 없음:', fromBankName);
    }

    // 거래소 KRW 자산 증가 (없으면 생성)
    const exchangeAssetName = `${toExchangeName} KRW`;
    let exchangeAsset = await this.getAssetByName(userId, exchangeAssetName, 'exchange_asset');
    
    if (exchangeAsset) {
      const newBalance = parseFloat(exchangeAsset.balance || "0") + amount;
      await this.updateAsset(userId, exchangeAsset.id, { balance: newBalance.toString() });
    } else {
      await this.createAsset(userId, {
        userId,
        type: 'exchange_asset',
        name: exchangeAssetName,
        currency: 'KRW',
        balance: amount.toString(),
        metadata: { exchange: toExchangeName }
      });
    }
  }

  private async moveAssetsExchangePurchase(userId: string, fromAssetName: string, toAssetName: string, fromAmount: number, toAmount: number, fees: number) {
    // 거래소 KRW 자산 감소
    const fromAsset = await this.getAssetByName(userId, fromAssetName, 'exchange_asset');
    if (fromAsset) {
      const newBalance = parseFloat(fromAsset.balance || "0") - fromAmount;
      await this.updateAsset(userId, fromAsset.id, { balance: newBalance.toString() });
    }

    // 거래소 코인 자산 증가 (수수료 제외)
    // Validate fromAmount to prevent division by zero
    if (fromAmount === 0) {
      throw new Error('fromAmount cannot be zero for fee calculation');
    }
    const actualAmount = toAmount - (toAmount * fees / fromAmount); // 수수료 적용
    let toAsset = await this.getAssetByName(userId, toAssetName, 'exchange_asset');
    
    if (toAsset) {
      const newBalance = parseFloat(toAsset.balance || "0") + actualAmount;
      await this.updateAsset(userId, toAsset.id, { balance: newBalance.toString() });
    } else {
      const currency = toAssetName.split(' ')[1] || 'USDT'; // "빗썸 USDT" -> "USDT"
      await this.createAsset(userId, {
        userId,
        type: 'exchange_asset',
        name: toAssetName,
        currency: currency,
        balance: actualAmount.toString(),
        metadata: { exchange: toAssetName.split(' ')[0] }
      });
    }
  }

  private async moveAssetsExchangeTransfer(userId: string, fromAssetName: string, toAssetName: string, fromAmount: number, toAmount: number, fees: number) {
    console.log('=== 자산 이동 시작 ===', {
      userId, fromAssetName, toAssetName, fromAmount, toAmount, fees
    });
    
    // 출발 거래소 자산 감소 (exchange 또는 binance 타입 검색)
    console.log('출발 자산 검색 시작:', { fromAssetName, userId });
    let fromAsset = await this.getAssetByName(userId, fromAssetName, 'exchange');
    console.log('exchange 타입으로 검색:', fromAsset);
    if (!fromAsset) {
      fromAsset = await this.getAssetByName(userId, fromAssetName, 'binance');
      console.log('binance 타입으로 검색:', fromAsset);
    }
    
    console.log('출발 자산 찾기 결과:', fromAsset);
    
    if (fromAsset) {
      const currentBalance = parseFloat(fromAsset.balance || "0");
      const newBalance = currentBalance - fromAmount;
      
      // 잔액 부족 검증 추가
      if (newBalance < 0) {
        console.error('잔액 부족 오류:', {
          name: fromAssetName,
          currentBalance,
          fromAmount,
          newBalance
        });
        throw new Error(`잔액이 부족합니다. 현재 잔액: ${currentBalance}, 필요 금액: ${fromAmount}`);
      }
      
      console.log('출발 자산 잔액 업데이트:', {
        name: fromAssetName,
        currentBalance,
        fromAmount,
        newBalance
      });
      await this.updateAsset(userId, fromAsset.id, { balance: newBalance.toString() });
    } else {
      console.error('출발 자산을 찾을 수 없음:', fromAssetName);
      throw new Error(`출발 자산을 찾을 수 없습니다: ${fromAssetName}`);
    }

    // 도착 거래소 자산 증가 (네트워크 수수료 제외)
    const actualAmount = toAmount; // 실제로는 수수료가 이미 차감된 상태
    let toAsset = await this.getAssetByName(userId, toAssetName, 'binance');
    if (!toAsset) {
      toAsset = await this.getAssetByName(userId, toAssetName, 'exchange');
    }
    
    console.log('도착 자산 찾기 결과:', toAsset);
    
    if (toAsset) {
      const currentBalance = parseFloat(toAsset.balance || "0");
      const newBalance = currentBalance + actualAmount;
      console.log('도착 자산 잔액 업데이트:', {
        name: toAssetName,
        currentBalance,
        actualAmount,
        newBalance
      });
      await this.updateAsset(userId, toAsset.id, { balance: newBalance.toString() });
    } else {
      console.log('도착 자산이 없어서 새로 생성:', toAssetName);
      const currency = toAssetName.split(' ')[1] || 'USDT';
      const assetType = toAssetName.toLowerCase().includes('binance') ? 'binance' : 'exchange';
      await this.createAsset(userId, {
        userId,
        type: assetType,
        name: toAssetName,
        currency: currency,
        balance: actualAmount.toString(),
        metadata: { exchange: toAssetName.split(' ')[0], assetType: 'crypto' }
      });
    }
    
    console.log('=== 자산 이동 완료 ===');
  }

  private async moveAssetsP2PTrade(userId: string, fromAssetName: string, toAssetName: string, fromAmount: number, toAmount: number, fees: number) {
    // Binance USDT 자산 감소 (fromAssetName이 실제 자산명이 아닐 수 있으므로 Binance USDT를 찾음)
    const binanceUsdtAsset = await this.getAssetByName(userId, 'Binance USDT', 'binance');
    if (binanceUsdtAsset) {
      const newBalance = parseFloat(binanceUsdtAsset.balance || "0") - fromAmount;
      await this.updateAsset(userId, binanceUsdtAsset.id, { balance: newBalance.toString() });
    }

    // VND 현금 자산 증가 (toAssetName이 asset ID인 경우 직접 업데이트)
    if (toAssetName && toAssetName.includes('-')) {
      // Asset ID로 직접 업데이트
      const toAssets = await this.getAssets(userId);
      const targetAsset = toAssets.find(asset => asset.id === toAssetName);
      if (targetAsset) {
        const newBalance = parseFloat(targetAsset.balance || "0") + toAmount;
        await this.updateAsset(userId, targetAsset.id, { balance: newBalance.toString() });
      }
    } else {
      // 자산명으로 검색 (은행 계좌와 현금 모두 검색)
      console.log('P2P 대상 자산 검색:', { userId, toAssetName, type: 'account' });
      let targetAsset = await this.getAssetByName(userId, toAssetName, 'account');
      if (!targetAsset) {
        console.log('account 타입에서 찾지 못함, cash 타입에서 검색:', { userId, toAssetName, type: 'cash' });
        targetAsset = await this.getAssetByName(userId, toAssetName, 'cash');
      }
      console.log('P2P 대상 자산 검색 결과:', targetAsset);
      if (targetAsset) {
        const currentBalance = parseFloat(targetAsset.balance || "0");
        const newBalance = currentBalance + toAmount;
        console.log('P2P 대상 자산 잔액 업데이트:', { name: toAssetName, currentBalance, toAmount, newBalance });
        await this.updateAsset(userId, targetAsset.id, { balance: newBalance.toString() });
      } else {
        console.error('P2P 대상 자산을 찾을 수 없음:', toAssetName);
      }
    }
  }

  async getTransactions(userId: string): Promise<Transaction[]> {
    return await db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.timestamp));
  }

  async getTransactionById(userId: string, id: string): Promise<Transaction | undefined> {
    const [result] = await db
      .select()
      .from(transactions)
      .where(and(eq(transactions.userId, userId), eq(transactions.id, id)));
    return result || undefined;
  }

  // Assets
  async createAsset(userId: string, asset: InsertAsset): Promise<Asset> {
    const [result] = await db
      .insert(assets)
      .values({ ...asset, userId })
      .returning();
    return result;
  }

  async getAssets(userId: string): Promise<Asset[]> {
    return await db
      .select()
      .from(assets)
      .where(eq(assets.userId, userId))
      .orderBy(desc(assets.createdAt));
  }

  async updateAsset(userId: string, id: string, updates: Partial<InsertAsset>): Promise<Asset | undefined> {
    const [result] = await db
      .update(assets)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(assets.userId, userId), eq(assets.id, id)))
      .returning();
    return result || undefined;
  }

  async deleteAsset(userId: string, id: string): Promise<boolean> {
    const result = await db
      .delete(assets)
      .where(and(eq(assets.userId, userId), eq(assets.id, id)));
    return (result.rowCount ?? 0) > 0;
  }

  async getAssetByName(userId: string, name: string, type: string): Promise<Asset | undefined> {
    console.log('getAssetByName 호출:', { userId, name, type });
    
    // 먼저 정확한 이름으로 검색
    let [result] = await db
      .select()
      .from(assets)
      .where(and(
        eq(assets.userId, userId),
        eq(assets.name, name),
        eq(assets.type, type)
      ));
    
    console.log('정확한 이름 검색 결과:', result);
    
    // 정확한 이름으로 찾지 못한 경우, 빗썸 관련 자산은 유연한 매칭 시도
    if (!result && (name.includes('Bithumb') || name === 'Bithumb USDT')) {
      console.log('빗썸 관련 자산 유연 검색 시작');
      const allAssets = await db
        .select()
        .from(assets)
        .where(and(
          eq(assets.userId, userId),
          eq(assets.type, type)
        ));
      
      console.log('같은 타입의 모든 자산:', allAssets.map(a => ({ name: a.name, type: a.type })));
      
      // Bithumb 관련 자산 찾기
      const foundAsset = allAssets.find(asset => 
        asset.name === 'Bithumb' || 
        asset.name === 'Bithumb USDT' || 
        asset.name.includes('Bithumb')
      );
      result = foundAsset || undefined;
      
      console.log('빗썸 유연 검색 결과:', result);
    }
    
    console.log('getAssetByName 최종 결과:', result);
    return result || undefined;
  }

  // Rates
  async createRate(userId: string, rate: InsertRate): Promise<Rate> {
    const [result] = await db
      .insert(rates)
      .values({ ...rate, userId })
      .returning();
    return result;
  }

  async getRates(userId: string): Promise<Rate[]> {
    return await db
      .select()
      .from(rates)
      .where(eq(rates.userId, userId))
      .orderBy(desc(rates.timestamp));
  }

  async getLatestRate(userId: string, fromCurrency: string, toCurrency: string): Promise<Rate | undefined> {
    const [result] = await db
      .select()
      .from(rates)
      .where(and(
        eq(rates.userId, userId),
        eq(rates.fromCurrency, fromCurrency),
        eq(rates.toCurrency, toCurrency)
      ))
      .orderBy(desc(rates.timestamp))
      .limit(1);
    return result || undefined;
  }

  // User Settings
  async getUserSettings(userId: string): Promise<UserSettings | undefined> {
    const [result] = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, userId));
    return result || undefined;
  }

  async updateUserSettings(userId: string, settings: Partial<InsertUserSettings>): Promise<UserSettings> {
    const existing = await this.getUserSettings(userId);
    
    if (existing) {
      const [result] = await db
        .update(userSettings)
        .set({ ...settings, updatedAt: new Date() })
        .where(eq(userSettings.userId, userId))
        .returning();
      return result;
    } else {
      const [result] = await db
        .insert(userSettings)
        .values({ 
          userId, 
          ...settings,
          bithumbFeeRate: settings.bithumbFeeRate || "0.0004",
          bithumbGrade: settings.bithumbGrade || "white"
        })
        .returning();
      return result;
    }
  }

  // Exchange Rates methods
  async createExchangeRate(userId: string, rate: InsertExchangeRate): Promise<ExchangeRate> {
    return await this.upsertExchangeRate({ ...rate, userId });
  }

  // 현재 환전상 시세 관리 (UPSERT 방식)
  async upsertExchangeRate(rate: InsertExchangeRate): Promise<ExchangeRate> {
    // 동일한 통화쌍과 권종이 있는지 확인
    const existing = await db
      .select()
      .from(exchangeRates)
      .where(
        and(
          eq(exchangeRates.userId, rate.userId),
          eq(exchangeRates.fromCurrency, rate.fromCurrency),
          eq(exchangeRates.toCurrency, rate.toCurrency),
          eq(exchangeRates.denomination, rate.denomination || '')
        )
      )
      .limit(1);

    if (existing.length > 0) {
      // 기존 데이터를 히스토리로 백업 (새로운 ID 생성)
      const { id, createdAt, updatedAt, ...historyData } = existing[0];
      await this.createExchangeRateHistory({
        ...historyData,
        recordDate: existing[0].updatedAt,
        changePercentage: rate.myBuyRate && existing[0].myBuyRate 
          ? ((parseFloat(rate.myBuyRate) - parseFloat(existing[0].myBuyRate)) / parseFloat(existing[0].myBuyRate) * 100).toString()
          : "0"
      });

      // 기존 레코드 업데이트
      const [result] = await db
        .update(exchangeRates)
        .set({ ...rate, updatedAt: new Date() })
        .where(eq(exchangeRates.id, existing[0].id))
        .returning();
      return result;
    } else {
      // 새 레코드 생성
      const [result] = await db
        .insert(exchangeRates)
        .values(rate)
        .returning();
      return result;
    }
  }

  async getExchangeRates(userId: string): Promise<ExchangeRate[]> {
    const result = await db
      .select()
      .from(exchangeRates)
      .where(eq(exchangeRates.userId, userId))
      .orderBy(desc(exchangeRates.updatedAt));
    return result;
  }

  async updateExchangeRate(id: string, updates: Partial<InsertExchangeRate>): Promise<ExchangeRate | undefined> {
    const [result] = await db
      .update(exchangeRates)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(exchangeRates.id, id))
      .returning();
    return result || undefined;
  }

  // 환전상 시세 이력 관리
  async createExchangeRateHistory(history: InsertExchangeRateHistory): Promise<ExchangeRateHistory> {
    const [result] = await db
      .insert(exchangeRateHistory)
      .values(history)
      .returning();
    return result;
  }

  async getExchangeRateHistory(userId: string, filters?: {
    fromCurrency?: string;
    toCurrency?: string;
    denomination?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<ExchangeRateHistory[]> {
    let query = db
      .select()
      .from(exchangeRateHistory)
      .where(eq(exchangeRateHistory.userId, userId));

    if (filters?.fromCurrency) {
      query = query.where(eq(exchangeRateHistory.fromCurrency, filters.fromCurrency));
    }
    if (filters?.toCurrency) {
      query = query.where(eq(exchangeRateHistory.toCurrency, filters.toCurrency));
    }
    if (filters?.denomination) {
      query = query.where(eq(exchangeRateHistory.denomination, filters.denomination));
    }

    const result = await query.orderBy(desc(exchangeRateHistory.recordDate));
    return result;
  }

  // 새거래용 환율 조회 (현재 시세에서 자동 선택)
  async getExchangeRateForTransaction(
    userId: string, 
    fromCurrency: string, 
    toCurrency: string, 
    denomination?: string,
    transactionType: 'buy' | 'sell' = 'buy'
  ): Promise<{ rate: number; source: string } | null> {
    const rateRecord = await db
      .select()
      .from(exchangeRates)
      .where(
        and(
          eq(exchangeRates.userId, userId),
          eq(exchangeRates.fromCurrency, fromCurrency),
          eq(exchangeRates.toCurrency, toCurrency),
          eq(exchangeRates.denomination, denomination || ''),
          eq(exchangeRates.isActive, 'true')
        )
      )
      .limit(1);

    if (rateRecord.length === 0) return null;

    const record = rateRecord[0];
    const rate = transactionType === 'buy' 
      ? parseFloat(record.myBuyRate || '0')
      : parseFloat(record.mySellRate || '0');

    return {
      rate,
      source: `${fromCurrency}-${toCurrency} ${denomination || ''} ${transactionType} rate`
    };
  }

  // 현금 환전 자산 이동 처리
  private async moveAssetsCashExchange(userId: string, transaction: InsertTransaction | Transaction) {
    console.log('=== 현금 환전 자산 이동 시작 ===');
    
    const fromAmount = parseFloat(transaction.fromAmount);
    const toAmount = parseFloat(transaction.toAmount);
    
    // 메타데이터에서 권종별 수량 정보 추출
    const metadata = transaction.metadata as any;
    const denominationAmounts = metadata?.denominationAmounts || {};
    
    console.log('권종별 수량 정보:', denominationAmounts);

    // KRW 현금 환전인 경우 보유량 사전 검증
    if (transaction.toAssetName?.includes('KRW')) {
      const toAsset = await this.getAssetByName(userId, transaction.toAssetName, 'cash');
      if (toAsset) {
        const currentBalance = parseFloat(toAsset.balance || "0");
        console.log(`KRW 보유량 검증: 필요 ${toAmount} KRW, 보유 ${currentBalance} KRW`);
        
        if (currentBalance < toAmount) {
          const shortage = toAmount - currentBalance;
          throw new Error(`KRW 현금이 부족합니다. 필요: ${toAmount.toLocaleString()} KRW, 보유: ${currentBalance.toLocaleString()} KRW (부족: ${shortage.toLocaleString()} KRW)`);
        }
      } else {
        throw new Error('KRW 현금 자산을 찾을 수 없습니다.');
      }
    }
    
    // 출발 통화 자산 업데이트 (고객이 준 돈 - 권종별 증가)
    const fromAsset = await this.getAssetByName(userId, transaction.fromAssetName!, 'cash');
    if (fromAsset) {
      const currentBalance = parseFloat(fromAsset.balance || "0");
      const newBalance = currentBalance + fromAmount;
      
      // 기존 권종별 정보 가져오기
      const currentMetadata = fromAsset.metadata as any || {};
      const currentDenominations = currentMetadata.denominations || {};
      
      // 권종별 수량 증가 (고객이 준 돈)
      const updatedDenominations = { ...currentDenominations };
      for (const [denomination, amount] of Object.entries(denominationAmounts)) {
        if (amount && parseFloat(amount as string) > 0) {
          const currentQty = updatedDenominations[denomination] || 0;
          const addQty = parseInt(amount as string);
          updatedDenominations[denomination] = currentQty + addQty;
          
          console.log(`받은 ${denomination} 권종: ${currentQty} → ${updatedDenominations[denomination]} (${addQty}장 증가)`);
        }
      }
      
      console.log('받은 자산 업데이트 (고객이 준 돈):', {
        assetName: transaction.fromAssetName,
        currentBalance,
        newBalance,
        denominationChanges: updatedDenominations
      });
      
      await this.updateAsset(userId, fromAsset.id, {
        balance: newBalance.toString(),
        metadata: {
          ...currentMetadata,
          denominations: updatedDenominations
        }
      });
    }
    
    // 도착 통화 자산 업데이트 (고객에게 준 돈)
    const toAsset = await this.getAssetByName(userId, transaction.toAssetName!, 'cash');
    if (toAsset) {
      const currentBalance = parseFloat(toAsset.balance || "0");
      const newBalance = currentBalance - toAmount;  // 고객에게 준 돈이므로 차감
      
      // KRW 현금의 경우 권종별 차감 처리
      if (transaction.toAssetName?.includes('KRW')) {
        const currentMetadata = toAsset.metadata as any || {};
        const currentDenominations = currentMetadata.denominations || {};
        const updatedDenominations = { ...currentDenominations };
        
        // KRW 권종별 차감 로직 (큰 권종부터 우선 차감)
        let remainingAmount = toAmount;
        const krwDenominations = [50000, 10000, 5000, 1000];
        
        console.log(`KRW 권종별 차감 시작: ${toAmount} KRW`);
        console.log('현재 보유 권종:', currentDenominations);
        
        for (const denom of krwDenominations) {
          const denomStr = denom.toString();
          const availableQty = currentDenominations[denomStr] || 0;
          const neededQty = Math.floor(remainingAmount / denom);
          const useQty = Math.min(availableQty, neededQty);
          
          if (useQty > 0) {
            updatedDenominations[denomStr] = availableQty - useQty;
            remainingAmount -= useQty * denom;
            console.log(`${denom}원권: ${availableQty}장 → ${updatedDenominations[denomStr]}장 (${useQty}장 차감)`);
          }
        }
        
        console.log('준 자산 업데이트 (고객에게 준 돈):', {
          assetName: transaction.toAssetName,
          currentBalance,
          newBalance,
          deductedAmount: toAmount,
          denominationChanges: updatedDenominations
        });
        
        await this.updateAsset(userId, toAsset.id, {
          balance: newBalance.toString(),
          metadata: {
            ...currentMetadata,
            denominations: updatedDenominations
          }
        });
      }
      // 도착 통화가 VND이고 VND 권종별 분배가 있는 경우 - VND 차감 처리
      else if (transaction.toAssetName?.includes('VND') && (metadata.vndBreakdown || Object.keys(denominationAmounts).length > 0)) {
        const currentMetadata = toAsset.metadata as any || {};
        const currentDenominations = currentMetadata.denominations || {};
        const updatedDenominations = { ...currentDenominations };
        
        // vndBreakdown이 있으면 사용하고, 없으면 현재 거래의 VND 총액을 기준으로 적절한 권종 추출
        const vndDenominationData = metadata.vndBreakdown || {};
        
        // vndBreakdown이 없는 경우 현재 거래의 VND 금액에서 큰 권종부터 차감
        if (!metadata.vndBreakdown && transaction.toAssetName?.includes('VND')) {
          const vndAmount = parseFloat(transaction.toAmount);
          let remainingAmount = vndAmount;
          
          // VND 권종을 큰 것부터 작은 것 순으로 정렬
          const vndDenominations = ['500000', '200000', '100000', '50000', '20000', '10000', '5000', '2000', '1000'];
          
          for (const denomination of vndDenominations) {
            const denomValue = parseFloat(denomination);
            const availableQty = updatedDenominations[denomination] || 0;
            
            if (availableQty > 0 && remainingAmount >= denomValue) {
              const neededQty = Math.min(Math.floor(remainingAmount / denomValue), availableQty);
              if (neededQty > 0) {
                vndDenominationData[denomination] = neededQty;
                remainingAmount -= neededQty * denomValue;
              }
            }
          }
        }
        
        for (const [denomination, amount] of Object.entries(vndDenominationData)) {
          if (amount && (amount as number) > 0) {
            const currentQty = updatedDenominations[denomination] || 0;
            const deductQty = amount as number;
            updatedDenominations[denomination] = Math.max(0, currentQty - deductQty);
            
            console.log(`VND ${denomination} 권종 차감: ${currentQty} → ${updatedDenominations[denomination]} (${deductQty}장 차감)`);
          }
        }
        
        const newBalance = Math.max(0, currentBalance - toAmount);
        
        console.log('VND 도착 자산 권종별 차감:', {
          assetName: transaction.toAssetName,
          currentBalance,
          newBalance,
          deductedAmount: toAmount,
          denominationChanges: updatedDenominations
        });
        
        await this.updateAsset(userId, toAsset.id, {
          balance: newBalance.toString(),
          metadata: {
            ...currentMetadata,
            denominations: updatedDenominations
          }
        });
      } 
      // 일반적인 경우 (고객에게 준 돈 - 총액만 감소)
      else {
        const newBalance = Math.max(0, currentBalance - toAmount);
        
        console.log('준 자산 업데이트 (고객에게 준 돈):', {
          assetName: transaction.toAssetName,
          currentBalance,
          newBalance,
          deductedAmount: toAmount
        });
        
        await this.updateAsset(userId, toAsset.id, {
          balance: newBalance.toString()
        });
      }
    }
    
    console.log('=== 현금 환전 자산 이동 완료 ===');
  }
}

export const storage = new DatabaseStorage();