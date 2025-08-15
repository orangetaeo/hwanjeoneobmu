import { 
  transactions, 
  assets, 
  rates, 
  userSettings,
  type InsertTransaction, 
  type Transaction, 
  type InsertAsset, 
  type Asset, 
  type InsertRate, 
  type Rate,
  type UserSettings,
  type InsertUserSettings
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";

export interface IStorage {
  // Transactions with asset movement
  createTransactionWithAssetMovement(userId: string, transaction: InsertTransaction): Promise<Transaction>;
  getTransactions(userId: string): Promise<Transaction[]>;
  getTransactionById(userId: string, id: string): Promise<Transaction | undefined>;
  
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
}

export class DatabaseStorage implements IStorage {
  // Transactions with asset movement logic
  async createTransactionWithAssetMovement(userId: string, transaction: InsertTransaction): Promise<Transaction> {
    // 거래 타입별 자산 이동 로직
    await this.handleAssetMovement(userId, transaction);
    
    // 거래 기록 생성
    const [result] = await db
      .insert(transactions)
      .values({ ...transaction, userId })
      .returning();
    return result;
  }

  private async handleAssetMovement(userId: string, transaction: InsertTransaction) {
    const fromAmount = parseFloat(transaction.fromAmount);
    const toAmount = parseFloat(transaction.toAmount);
    const fees = parseFloat(transaction.fees || "0");

    switch (transaction.type) {
      case 'bank_to_exchange':
        // 은행에서 거래소로 송금: 은행 자금 감소, 거래소 자금 증가
        await this.moveAssetsBankToExchange(userId, transaction.fromAssetName!, transaction.toAssetName!, fromAmount);
        break;
        
      case 'exchange_purchase':
        // 거래소에서 코인 구매: KRW 감소, 코인 증가 (수수료 적용)
        await this.moveAssetsExchangePurchase(userId, transaction.fromAssetName!, transaction.toAssetName!, fromAmount, toAmount, fees);
        break;
        
      case 'exchange_transfer':
        // 거래소간 이체: 출발 거래소 자산 감소, 도착 거래소 자산 증가 (수수료 적용)
        await this.moveAssetsExchangeTransfer(userId, transaction.fromAssetName!, transaction.toAssetName!, fromAmount, toAmount, fees);
        break;
        
      case 'p2p_trade':
        // P2P 거래: 기존 자산 변화 없음 (외부 거래)
        break;
    }
  }

  private async moveAssetsBankToExchange(userId: string, fromBankName: string, toExchangeName: string, amount: number) {
    // 은행 계좌 자금 감소
    const bankAsset = await this.getAssetByName(userId, fromBankName, 'bank_account');
    if (bankAsset) {
      const newBalance = parseFloat(bankAsset.balance || "0") - amount;
      await this.updateAsset(userId, bankAsset.id, { balance: newBalance.toString() });
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
    // 출발 거래소 자산 감소
    const fromAsset = await this.getAssetByName(userId, fromAssetName, 'exchange_asset');
    if (fromAsset) {
      const newBalance = parseFloat(fromAsset.balance || "0") - fromAmount;
      await this.updateAsset(userId, fromAsset.id, { balance: newBalance.toString() });
    }

    // 도착 거래소 자산 증가 (네트워크 수수료 제외)
    const actualAmount = toAmount - fees;
    let toAsset = await this.getAssetByName(userId, toAssetName, 'exchange_asset');
    
    if (toAsset) {
      const newBalance = parseFloat(toAsset.balance || "0") + actualAmount;
      await this.updateAsset(userId, toAsset.id, { balance: newBalance.toString() });
    } else {
      const currency = toAssetName.split(' ')[1] || 'USDT';
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
    const [result] = await db
      .select()
      .from(assets)
      .where(and(
        eq(assets.userId, userId),
        eq(assets.name, name),
        eq(assets.type, type)
      ));
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
}

export const storage = new DatabaseStorage();