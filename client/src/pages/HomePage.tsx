import { useState, useEffect, useMemo } from 'react';
import { 
  Home, 
  TrendingUp, 
  Settings, 
  DollarSign, 
  Wallet,
  List,
  ChartLine,
  Plus,
  Coins
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
// Firebase는 실시간 환율 전용으로 제한 - 데이터 저장은 PostgreSQL 사용
// import { collection, onSnapshot, doc, addDoc, query, orderBy, limit, setDoc, getDocs } from 'firebase/firestore';
// import { db } from '@/lib/firebase';
import { useFirebaseAuth } from '@/hooks/useFirebaseAuth';
import { useExchangeRates } from '@/hooks/useExchangeRates';
import Dashboard from '@/components/Dashboard';
import AssetManager from '@/components/AssetManager';
import TransactionForm from '@/components/TransactionForm';
import RateManager from '@/components/RateManager';
import TransactionHistory from '@/components/TransactionHistory';
import AssetForm from '@/components/AssetForm';
import AdvancedTransactionForm from '@/components/AdvancedTransactionForm';
import UserSettingsForm from '@/components/UserSettingsForm';
import ExchangeRateManager from '@/components/ExchangeRateManager';
import ExchangeOperations from '@/components/ExchangeOperations';
import CashTransactionHistory from '@/components/CashTransactionHistory';
import CashChangeDetailModal from '@/components/CashChangeDetailModal';
import Modal from '@/components/Modal';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CashAsset, BankAccount, ExchangeAsset, BinanceAsset, Transaction, Asset, ModalInfo } from '@/types';
import { ExchangeRate, InsertExchangeRate } from '@shared/schema';

// 기초 데이터는 사용자가 직접 설정하므로 초기 자산 제거

export default function HomePage() {
  const { user, loading: authLoading } = useFirebaseAuth();
  const { realTimeRates, cryptoRates, isFetchingRates } = useExchangeRates();
  
  // Data states
  const [cashAssets, setCashAssets] = useState<CashAsset[]>([]);
  const [koreanAccounts, setKoreanAccounts] = useState<BankAccount[]>([]);
  const [vietnameseAccounts, setVietnameseAccounts] = useState<BankAccount[]>([]);
  const [exchangeAssets, setExchangeAssets] = useState<ExchangeAsset[]>([]);
  const [binanceAssets, setBinanceAssets] = useState<BinanceAsset[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([]);
  
  // UI states
  const [currentView, setCurrentView] = useState('dashboard');
  const [modalInfo, setModalInfo] = useState<ModalInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAssetForm, setShowAssetForm] = useState(false);
  const [assetFormType, setAssetFormType] = useState<'cash' | 'korean-account' | 'vietnamese-account' | 'exchange' | 'binance'>('cash');
  const [editingAsset, setEditingAsset] = useState(null);
  const [activeAssetTab, setActiveAssetTab] = useState('cash');
  const [showAdvancedTransactionForm, setShowAdvancedTransactionForm] = useState(false);
  const [showUserSettings, setShowUserSettings] = useState(false);
  const [showCashTransactionHistory, setShowCashTransactionHistory] = useState(false);
  const [selectedCashAsset, setSelectedCashAsset] = useState<CashAsset | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isCashDetailModalOpen, setIsCashDetailModalOpen] = useState(false);

  // React Query로 실시간 데이터 로딩
  const { data: assetsData = [], isLoading: assetsLoading, error: assetsError, refetch: refetchAssets } = useQuery({
    queryKey: ['/api/assets'],
    enabled: !authLoading && !!user,
    retry: 3,
    retryDelay: 1000,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false
  });
  
  const { data: transactionsData = [], isLoading: transactionsLoading, error: transactionsError } = useQuery({
    queryKey: ['/api/transactions'], 
    enabled: !authLoading && !!user,
    retry: 3,
    retryDelay: 1000
  });
  
  const { data: exchangeRatesData = [], isLoading: exchangeRatesLoading, error: exchangeRatesError } = useQuery({
    queryKey: ['/api/exchange-rates'],
    enabled: !authLoading && !!user,
    retry: 3,
    retryDelay: 1000
  });

  // 에러 처리
  useEffect(() => {
    if (assetsError) {
      console.error('Assets API error:', assetsError);
    }
    if (transactionsError) {
      console.error('Transactions API error:', transactionsError);
    }
    if (exchangeRatesError) {
      console.error('Exchange rates API error:', exchangeRatesError);
    }
  }, [assetsError, transactionsError, exchangeRatesError]);

  // 자산 분류 및 상태 업데이트 - React Query 데이터 기반
  useEffect(() => {
    if (!user || authLoading || assetsLoading || transactionsLoading || exchangeRatesLoading) {
      return;
    }
    
    if (!Array.isArray(assetsData)) {
      setLoading(false);
      return;
    }

    // 자산을 타입별로 분류
    const filteredCashAssets = assetsData.filter((asset: any) => asset.type === 'cash');
    const allAccounts = assetsData.filter((asset: any) => asset.type === 'account');
    const exchanges = assetsData.filter((asset: any) => asset.type === 'exchange');
    const binanceAssets = assetsData.filter((asset: any) => asset.type === 'binance');

    try {
      // 계좌를 한국/베트남으로 분리 - 개선된 로직
          const koreanAccounts = allAccounts.filter((account: any) => 
            account.currency === 'KRW'
          );
          const vietnameseAccounts = allAccounts.filter((account: any) => 
            account.currency === 'VND'
          );

          // 거래소와 바이낸스 자산에 balance 필드 추가 (quantity -> balance 매핑)
          const processedExchanges = exchanges.map((asset: any) => ({
            ...asset,
            exchangeName: asset.metadata?.exchange || asset.name?.split(' ')[0] || 'Exchange',
            coinName: asset.currency,
            quantity: parseFloat(asset.balance) || 0,
            balance: parseFloat(asset.balance) || 0
          }));
          
          const processedBinanceAssets = binanceAssets.map((asset: any) => ({
            ...asset,
            coinName: asset.currency,
            quantity: parseFloat(asset.balance) || 0,
            balance: parseFloat(asset.balance) || 0
          }));



          setCashAssets(filteredCashAssets || []); // API에서 받은 현금 자산 필터링 결과
          setKoreanAccounts(koreanAccounts || []);
          setVietnameseAccounts(vietnameseAccounts || []);
          setExchangeAssets(processedExchanges || []);
          setBinanceAssets(processedBinanceAssets || []);
          setTransactions(Array.isArray(transactionsData) ? transactionsData : []);
          setExchangeRates(Array.isArray(exchangeRatesData) ? exchangeRatesData : []);
    } catch (error) {
      console.error('Failed to load data from database:', error);
    } finally {
      setLoading(false);
    }
  }, [user, authLoading, assetsLoading, transactionsLoading, exchangeRatesLoading, assetsData, transactionsData, exchangeRatesData]);

  // PostgreSQL 중심 운영 - localStorage 사용 중단

  // Prepare all assets for transaction form
  const allAssetsForTransaction = useMemo(() => {
    const formatAccount = (acc: BankAccount, type: string, currency: string): Asset => ({
      ...acc,
      type: 'account' as const,
      assetId: `${type}_${acc.id}`,
      displayName: `${acc.bankName} (${acc.accountHolder})`,
      currency
    });
    
    const formatCrypto = (asset: ExchangeAsset | BinanceAsset, type: string): Asset => ({
      ...asset,
      type: 'crypto' as const,
      assetId: `${type}_${asset.id}`,
      displayName: `${(asset as ExchangeAsset).exchangeName || '바이낸스'} (${asset.coinName})`,
      balance: asset.quantity || (asset as any).balance // quantity 필드를 balance로 매핑
    });
    
    return [
      ...cashAssets.map(a => ({
        ...a,
        type: 'cash' as const,
        assetId: `cash_${a.id}`,
        displayName: a.name
      })),
      ...koreanAccounts.map(a => formatAccount(a, 'korean_account', 'KRW')),
      ...vietnameseAccounts.map(a => formatAccount(a, 'vietnamese_account', 'VND')),
      ...exchangeAssets.map(a => formatCrypto(a, 'exchange_asset')),
      ...binanceAssets.map(a => formatCrypto(a, 'binance_asset')),
    ];
  }, [cashAssets, koreanAccounts, vietnameseAccounts, exchangeAssets, binanceAssets]);

  const handleOpenModal = (type: string, data?: any) => {
    switch (type) {
      case 'addCash':
      case 'addCashAsset':
        setAssetFormType('cash');
        setActiveAssetTab('cash');
        setEditingAsset(null);
        setShowAssetForm(true);
        break;
      case 'addKoreanAccount':
        setAssetFormType('korean-account');
        setActiveAssetTab('korean-banks');
        setEditingAsset(null);
        setShowAssetForm(true);
        break;
      case 'addVietnameseAccount':
        setAssetFormType('vietnamese-account');
        setActiveAssetTab('vietnamese-banks');
        setEditingAsset(null);
        setShowAssetForm(true);
        break;
      case 'addExchangeAsset':
        setAssetFormType('exchange');
        setActiveAssetTab('exchanges');
        setEditingAsset(null);
        setShowAssetForm(true);
        break;
      case 'addBinanceAsset':
        setAssetFormType('binance');
        setActiveAssetTab('binance');
        setEditingAsset(null);
        setShowAssetForm(true);
        break;
      case 'editAsset':
      case 'editAccount':
      case 'editCashAsset':
      case 'editKoreanAccount':
      case 'editVietnameseAccount':
      case 'editExchangeAsset':
      case 'editBinanceAsset':
        if (data) {
          // Determine asset type based on data structure
          if (data.denominations || type === 'editCashAsset') {
            setAssetFormType('cash');
            setActiveAssetTab('cash');
          } else if (data.exchangeName || type === 'editExchangeAsset') {
            setAssetFormType('exchange');
            setActiveAssetTab('exchanges');
          } else if ((data.coinName && !data.exchangeName) || type === 'editBinanceAsset') {
            setAssetFormType('binance');
            setActiveAssetTab('binance');
          } else if (data.bankName || type === 'editKoreanAccount' || type === 'editVietnameseAccount') {
            // Check if it's Korean or Vietnamese account based on existing data
            const isKorean = koreanAccounts.find(acc => acc.id === data.id) || type === 'editKoreanAccount';

            if (isKorean) {
              setAssetFormType('korean-account');
              setActiveAssetTab('korean-banks');
            } else {
              setAssetFormType('vietnamese-account');
              setActiveAssetTab('vietnamese-banks');
            }
          }
          setEditingAsset(data);
          setShowAssetForm(true);
        }
        break;
      case 'deleteAsset':
      case 'deleteAccount':
      case 'deleteCashAsset':
      case 'deleteKoreanAccount':
      case 'deleteVietnameseAccount':
      case 'deleteExchangeAsset':
      case 'deleteBinanceAsset':
        setModalInfo({
          title: '자산 삭제',
          message: '삭제 사유를 필수로 입력해주세요:',
          type: 'delete',
          onConfirm: (memo?: string) => {
            if (memo?.trim()) {
              handleDeleteAsset(data, memo);
            }
          },
          asset: data
        });
        break;
      case 'exchange':
        setCurrentView('transaction');
        break;
      case 'transfer':
        setCurrentView('transaction');
        break;
      case 'viewCashTransactions':
        if (data) {
          setSelectedCashAsset(data);
          setShowCashTransactionHistory(true);
        }
        break;
      case 'viewCashChangeDetail':
        if (data) {
          setSelectedTransaction(data);
          setIsCashDetailModalOpen(true);
        }
        break;
      case 'reports':
        setModalInfo({
          title: '리포트 기능',
          message: '리포트 기능은 현재 개발 중입니다.',
          type: 'info'
        });
        break;
      default:
        setModalInfo({
          title: '기능 준비 중',
          message: '해당 기능은 현재 개발 중입니다.',
          type: 'info'
        });
    }
  };

  const handleDeleteAsset = async (asset: any, memo?: string) => {
    if (!user) return;
    
    try {
      console.log('Deleting asset:', asset.id, 'with memo:', memo);
      
      // PostgreSQL API 호출로 자산 삭제
      const response = await fetch(`/api/assets/${asset.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error('Failed to delete asset');
      }

      console.log('Asset deleted successfully from database');

      // 서버에서 최신 데이터를 다시 불러오기
      const assetsResponse = await fetch('/api/assets');
      const latestAssets = await assetsResponse.json();
      
      // 각 타입별로 데이터 분류하여 state 업데이트
      const cashAssetsData: CashAsset[] = [];
      const koreanAccountsData: BankAccount[] = [];
      const vietnameseAccountsData: BankAccount[] = [];
      const exchangeAssetsData: ExchangeAsset[] = [];
      const binanceAssetsData: BinanceAsset[] = [];

      latestAssets.forEach((asset: any) => {
        if (asset.type === 'cash') {
          console.log('Loading cash asset from DB:', {
            id: asset.id,
            name: asset.name,
            currency: asset.currency,
            balance: asset.balance,
            metadata: asset.metadata,
            denominations: asset.metadata?.denominations
          });
          
          cashAssetsData.push({
            id: asset.id,
            type: 'cash',
            currency: asset.currency,
            balance: parseFloat(asset.balance),
            denominations: asset.metadata?.denominations || {},
            name: asset.name
          });
        } else if (asset.type === 'account') {
          const accountData = {
            id: asset.id,
            bankName: asset.metadata?.bank || asset.name,
            accountNumber: asset.metadata?.accountNumber || '',
            accountHolder: asset.metadata?.accountHolder || '',
            balance: parseFloat(asset.balance),
            currency: asset.currency
          };
          
          if (asset.currency === 'KRW') {
            koreanAccountsData.push(accountData);
          } else {
            vietnameseAccountsData.push(accountData);
          }
        } else if (asset.type === 'exchange') {
          exchangeAssetsData.push({
            id: asset.id,
            exchangeName: asset.metadata?.exchange || asset.name,
            coinName: asset.currency,
            quantity: parseFloat(asset.balance),
            currency: asset.currency
          });
        } else if (asset.type === 'binance') {
          binanceAssetsData.push({
            id: asset.id,
            coinName: asset.currency,
            quantity: parseFloat(asset.balance),
            currency: asset.currency
          });
        }
      });

      // 모든 state 업데이트
      setCashAssets(cashAssetsData);
      setKoreanAccounts(koreanAccountsData);
      setVietnameseAccounts(vietnameseAccountsData);
      setExchangeAssets(exchangeAssetsData);
      setBinanceAssets(binanceAssetsData);
        
      setModalInfo({
        title: '삭제 완료',
        message: `항목이 성공적으로 삭제되었습니다.\n삭제 사유: ${memo}`,
        type: 'success'
      });
    } catch (error) {
      console.error('Error deleting asset:', error);
      setModalInfo({
        title: '삭제 실패',
        message: '항목 삭제 중 오류가 발생했습니다.',
        type: 'error'
      });
    }
  };

  const handleAssetFormSubmit = async (formData: any) => {
    if (!user) return;
    
    try {
      if (editingAsset) {
        // Update existing asset - API 호출로 데이터베이스 업데이트
        const assetId = (editingAsset as any).id;
        
        // PostgreSQL 형식으로 데이터 변환
        let updateData: any = {};
        
        if (assetFormType === 'cash') {
          updateData = {
            id: assetId,
            name: formData.name || `${formData.currency} 현금`,
            type: 'cash',
            currency: formData.currency,
            balance: formData.balance.toString(),
            metadata: {
              denominations: formData.denominations || {}
            }
          };
        } else if (assetFormType === 'korean-account' || assetFormType === 'vietnamese-account') {
          updateData = {
            id: assetId,
            name: formData.bankName,
            type: 'account',
            currency: assetFormType === 'korean-account' ? 'KRW' : 'VND',
            balance: formData.balance.toString(),
            metadata: {
              bank: formData.bankName,
              accountNumber: formData.accountNumber,
              accountHolder: formData.accountHolder
            }
          };
        } else if (assetFormType === 'exchange') {
          updateData = {
            id: assetId,
            name: formData.exchangeName,
            type: 'exchange',
            currency: formData.coinName,
            balance: formData.quantity.toString(),
            metadata: {
              exchange: formData.exchangeName
            }
          };
        } else if (assetFormType === 'binance') {
          updateData = {
            id: assetId,
            name: 'Binance',
            type: 'binance',
            currency: formData.coinName,
            balance: formData.quantity.toString(),
            metadata: {}
          };
        }

        console.log('Updating asset:', updateData);
        
        // API 호출
        const response = await fetch(`/api/assets/${assetId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData)
        });

        if (!response.ok) {
          throw new Error('Failed to update asset');
        }

        const updatedAsset = await response.json();
        console.log('Asset updated successfully:', updatedAsset);

        // 서버에서 최신 데이터를 다시 불러오기
        const assetsResponse = await fetch('/api/assets');
        const latestAssets = await assetsResponse.json();
        
        // 각 타입별로 데이터 분류하여 state 업데이트
        const cashAssetsData: CashAsset[] = [];
        const koreanAccountsData: BankAccount[] = [];
        const vietnameseAccountsData: BankAccount[] = [];
        const exchangeAssetsData: ExchangeAsset[] = [];
        const binanceAssetsData: BinanceAsset[] = [];

        latestAssets.forEach((asset: any) => {
          if (asset.type === 'cash') {
            cashAssetsData.push({
              id: asset.id,
              type: 'cash',
              currency: asset.currency,
              balance: parseFloat(asset.balance),
              denominations: asset.metadata?.denominations || {},
              name: asset.name
            });
          } else if (asset.type === 'account') {
            const accountData = {
              id: asset.id,
              bankName: asset.metadata?.bank || asset.name,
              accountNumber: asset.metadata?.accountNumber || '',
              accountHolder: asset.metadata?.accountHolder || '',
              balance: parseFloat(asset.balance),
              currency: asset.currency
            };
            
            if (asset.currency === 'KRW') {
              koreanAccountsData.push(accountData);
            } else {
              vietnameseAccountsData.push(accountData);
            }
          } else if (asset.type === 'exchange') {
            exchangeAssetsData.push({
              id: asset.id,
              exchangeName: asset.metadata?.exchange || asset.name,
              coinName: asset.currency,
              quantity: parseFloat(asset.balance),
              currency: asset.currency
            });
          } else if (asset.type === 'binance') {
            binanceAssetsData.push({
              id: asset.id,
              coinName: asset.currency,
              quantity: parseFloat(asset.balance),
              currency: asset.currency
            });
          }
        });

        // 모든 state 업데이트
        setCashAssets(cashAssetsData);
        setKoreanAccounts(koreanAccountsData);
        setVietnameseAccounts(vietnameseAccountsData);
        setExchangeAssets(exchangeAssetsData);
        setBinanceAssets(binanceAssetsData);
      } else {
        // Add new asset - PostgreSQL API 사용
        let createData: any = {};
        
        if (assetFormType === 'cash') {
          // API에서 가져온 최신 자산 데이터에서 직접 찾기 (state가 아닌 원본 데이터 사용)
          const assetsResponse = await fetch('/api/assets');
          const latestAssets = await assetsResponse.json();
          const existingCashAssetFromDB = latestAssets.find((asset: any) => 
            asset.type === 'cash' && asset.currency === formData.currency
          );
          
          if (existingCashAssetFromDB) {
            // 기존 자산이 있으면 업데이트 로직으로 전환
            const assetId = existingCashAssetFromDB.id;
            
            console.log('기존 현금 자산 정보 (API에서 직접 조회):', {
              id: existingCashAssetFromDB.id,
              currency: existingCashAssetFromDB.currency,
              balance: existingCashAssetFromDB.balance,
              metadata: existingCashAssetFromDB.metadata,
              denominations: existingCashAssetFromDB.metadata?.denominations
            });
            
            // 기존 denomination과 새로운 denomination 합산 (API 데이터에서 직접 가져오기)
            let existingDenominations = existingCashAssetFromDB.metadata?.denominations || {};
            const newDenominations = formData.denominations || {};
            
            // 데이터베이스 denomination 형식 정규화 (쉼표 없는 형식을 쉼표 있는 형식으로 변환)
            let normalizedExistingDenominations: Record<string, number> = {};
            Object.entries(existingDenominations).forEach(([key, value]) => {
              // 통화별 denomination 형식 정규화
              let normalizedKey;
              const numValue = parseFloat(key.replace(/,/g, ''));
              
              if (formData.currency === 'USD') {
                // USD는 작은 숫자들이므로 쉼표 없이 사용
                normalizedKey = numValue.toString();
              } else {
                // KRW, VND는 큰 숫자들이므로 쉼표 있는 형식 사용
                normalizedKey = numValue.toLocaleString();
              }
              
              normalizedExistingDenominations[normalizedKey] = typeof value === 'number' ? value : 0;
            });
            
            console.log('Original existingDenominations:', existingDenominations);
            console.log('Normalized to:', normalizedExistingDenominations);
            
            console.log('정규화된 기존 denomination:', normalizedExistingDenominations);
            
            // 기존 자산에 denomination 정보가 없다면 현재 잔액을 기반으로 생성
            const currentBalance = parseFloat(existingCashAssetFromDB.balance);
            if (Object.keys(normalizedExistingDenominations).length === 0 && currentBalance > 0) {
              console.log('기존 자산에 denomination 정보가 없음. 잔액을 기반으로 생성:', currentBalance);
              
              // 통화별 기본 denomination 구조 (AssetForm과 동일)
              const defaultDenominations: Record<string, Record<string, number>> = {
                'KRW': { '50,000': 0, '10,000': 0, '5,000': 0, '1,000': 0 },
                'USD': { '100': 0, '50': 0, '20': 0, '10': 0, '5': 0, '2': 0, '1': 0 },
                'VND': { '500,000': 0, '200,000': 0, '100,000': 0, '50,000': 0, '20,000': 0, '10,000': 0, '5,000': 0, '2,000': 0, '1,000': 0 }
              };
              
              // 기존 잔액을 가장 큰 지폐로 표현 (근사치)
              const denoms = defaultDenominations[formData.currency] || defaultDenominations['KRW'];
              const denomKeys = Object.keys(denoms).sort((a, b) => {
                const numA = parseFloat(a.replace(/,/g, ''));
                const numB = parseFloat(b.replace(/,/g, ''));
                return numB - numA; // 큰 것부터 정렬
              });
              
              let remainingBalance = currentBalance;
              normalizedExistingDenominations = { ...denoms };
              
              console.log(`${formData.currency} 자동 denomination 생성:`, {
                currentBalance,
                denomKeys,
                currency: formData.currency
              });
              
              // 큰 지폐부터 나누어 떨어지는 만큼 할당
              for (const denomKey of denomKeys) {
                const denomValue = parseFloat(denomKey.replace(/,/g, ''));
                const count = Math.floor(remainingBalance / denomValue);
                if (count > 0) {
                  normalizedExistingDenominations[denomKey] = count;
                  remainingBalance -= count * denomValue;
                  
                  console.log(`${denomKey}: ${count}장 (값: ${denomValue * count})`);
                }
              }
              
              console.log(`남은 잔액: ${remainingBalance}`);
              
              console.log(`생성된 ${formData.currency} denomination:`, normalizedExistingDenominations);
            }
            const mergedDenominations: Record<string, number> = {};
            
            // 모든 denomination 키를 합침 (정규화된 기존 denomination 사용)
            const allDenomKeys = new Set([...Object.keys(normalizedExistingDenominations), ...Object.keys(newDenominations)]);
            
            // 증가/감소 자동 감지 (음수면 감소, 양수면 증가)
            allDenomKeys.forEach(key => {
              const existingCount = normalizedExistingDenominations[key] || 0;
              const newCount = newDenominations[key] || 0;
              
              // 새로운 수량이 음수면 기존에서 차감, 양수면 기존에 추가
              if (newCount < 0) {
                // 감소: 기존에서 절대값만큼 차감 (0 이하로는 안 내려감)
                mergedDenominations[key] = Math.max(0, existingCount + newCount); // newCount가 음수이므로 + 사용
              } else {
                // 증가: 기존에 추가
                mergedDenominations[key] = existingCount + newCount;
              }
            });
            
            console.log('현금 자산 처리 결과:', {
              existingDenominations: normalizedExistingDenominations,
              newDenominations: newDenominations,
              mergedDenominations: mergedDenominations
            });
            
            // 합산된 denomination을 기반으로 총 잔액 재계산 (AssetForm과 동일한 로직)
            const newTotalBalance = Object.entries(mergedDenominations).reduce((total, [denom, count]) => {
              // Remove commas from denomination string before parsing
              const denomValue = parseFloat(String(denom).replace(/,/g, ''));
              const countValue = typeof count === 'number' ? count : 0;
              
              if (isNaN(denomValue) || isNaN(countValue)) {
                console.warn(`Invalid denomination data: ${denom}=${count}`);
                return total;
              }
              
              return total + (denomValue * countValue);
            }, 0);
            
            const updateData = {
              id: assetId,
              name: `${formData.currency} 현금`,
              type: 'cash',
              currency: formData.currency,
              balance: newTotalBalance.toString(),
              metadata: {
                denominations: mergedDenominations
              }
            };
            
            console.log('=== 자산 업데이트 디버깅 ===');
            console.log('Existing asset balance:', currentBalance);
            console.log('Existing denominations (processed):', normalizedExistingDenominations);
            console.log('New denominations from form:', newDenominations);
            console.log('Merged denominations:', mergedDenominations);
            console.log('Calculated new total balance:', newTotalBalance);
            console.log('Form data balance (ignore this):', formData.balance);

            console.log('Updating existing cash asset:', updateData);
            
            // 기존 자산 업데이트
            const response = await fetch(`/api/assets/${assetId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(updateData)
            });

            if (!response.ok) {
              throw new Error('Failed to update existing cash asset');
            }

            const updatedAsset = await response.json();
            console.log('Existing cash asset updated successfully:', updatedAsset);

            // 현금 증감 거래 기록 생성
            const changeAmount = Object.entries(newDenominations).reduce((total, [denom, count]) => {
              const denomValue = parseFloat(String(denom).replace(/,/g, ''));
              const countValue = typeof count === 'number' ? count : 0;
              return total + (denomValue * countValue);
            }, 0);

            if (changeAmount !== 0) {
              const transactionData = {
                type: 'cash_change',
                fromAssetName: changeAmount > 0 ? '현금 증가' : `${formData.currency} 현금`,
                toAssetName: changeAmount > 0 ? `${formData.currency} 현금` : '현금 감소',
                fromAmount: String(changeAmount > 0 ? changeAmount : Math.abs(changeAmount)),
                toAmount: String(changeAmount > 0 ? changeAmount : Math.abs(changeAmount)),
                fromCurrency: formData.currency,
                toCurrency: formData.currency,
                rate: "1.0",
                fees: "0",
                profit: "0",
                memo: formData.memo || '', // 사용자가 입력한 메모만 사용, 자동 생성 메모 제거
                metadata: {
                  assetId: assetId,
                  denominationChanges: newDenominations
                }
              };

              try {
                const transactionResponse = await fetch('/api/transactions', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(transactionData)
                });

                if (transactionResponse.ok) {
                  const createdTransaction = await transactionResponse.json();
                  console.log('Cash change transaction created:', createdTransaction);
                  
                  // 거래 내역 상태도 업데이트
                  const transactionsResponse = await fetch('/api/transactions');
                  const latestTransactions = await transactionsResponse.json();
                  setTransactions(latestTransactions);
                }
              } catch (error) {
                console.error('Failed to create transaction record:', error);
              }
            }
          } else {
            // 기존 자산이 없으면 새로 생성
            createData = {
              name: `${formData.currency} 현금`,
              type: 'cash',
              currency: formData.currency,
              balance: formData.balance.toString(),
              metadata: {
                denomination: formData.denominations
              }
            };
          }
        } else if (assetFormType === 'korean-account') {
          createData = {
            name: formData.bankName,
            type: 'account',
            currency: 'KRW',
            balance: formData.balance.toString(),
            metadata: {
              bank: formData.bankName,
              accountNumber: formData.accountNumber,
              accountHolder: formData.accountHolder
            }
          };
        } else if (assetFormType === 'vietnamese-account') {
          createData = {
            name: formData.bankName,
            type: 'account',
            currency: 'VND',
            balance: formData.balance.toString(),
            metadata: {
              bank: formData.bankName,
              accountNumber: formData.accountNumber,
              accountHolder: formData.accountHolder,
              country: '베트남'
            }
          };
        } else if (assetFormType === 'exchange') {
          createData = {
            name: formData.exchangeName,
            type: 'exchange',
            currency: formData.coinName,
            balance: formData.quantity.toString(),
            metadata: {
              exchange: formData.exchangeName
            }
          };
        } else if (assetFormType === 'binance') {
          createData = {
            name: 'Binance',
            type: 'binance',
            currency: formData.coinName,
            balance: formData.quantity.toString(),
            metadata: {}
          };
        }

        // 새로운 자산 생성이 필요한 경우에만 실행
        if (Object.keys(createData).length > 0) {
          console.log('Creating new asset:', createData);
          
          // API 호출
          const response = await fetch('/api/assets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(createData)
          });

          if (!response.ok) {
            throw new Error('Failed to create asset');
          }

          const createdAsset = await response.json();
          console.log('Asset created successfully:', createdAsset);
        }

        // 서버에서 최신 데이터를 다시 불러오기
        const assetsResponse = await fetch('/api/assets');
        const latestAssets = await assetsResponse.json();
        
        // 각 타입별로 데이터 분류하여 state 업데이트
        const cashAssetsData: CashAsset[] = [];
        const koreanAccountsData: BankAccount[] = [];
        const vietnameseAccountsData: BankAccount[] = [];
        const exchangeAssetsData: ExchangeAsset[] = [];
        const binanceAssetsData: BinanceAsset[] = [];

        latestAssets.forEach((asset: any) => {
          if (asset.type === 'cash') {
            cashAssetsData.push({
              id: asset.id,
              type: 'cash',
              currency: asset.currency,
              balance: parseFloat(asset.balance),
              denominations: asset.metadata?.denominations || {},
              name: asset.name
            });
          } else if (asset.type === 'account') {
            const accountData = {
              id: asset.id,
              bankName: asset.metadata?.bank || asset.name,
              accountNumber: asset.metadata?.accountNumber || '',
              accountHolder: asset.metadata?.accountHolder || '',
              balance: parseFloat(asset.balance),
              currency: asset.currency
            };
            
            if (asset.currency === 'KRW') {
              koreanAccountsData.push(accountData);
            } else {
              vietnameseAccountsData.push(accountData);
            }
          } else if (asset.type === 'exchange') {
            exchangeAssetsData.push({
              id: asset.id,
              exchangeName: asset.metadata?.exchange || asset.name,
              coinName: asset.currency,
              quantity: parseFloat(asset.balance),
              currency: asset.currency
            });
          } else if (asset.type === 'binance') {
            binanceAssetsData.push({
              id: asset.id,
              coinName: asset.currency,
              quantity: parseFloat(asset.balance),
              currency: asset.currency
            });
          }
        });

        // 모든 state 업데이트
        setCashAssets(cashAssetsData);
        setKoreanAccounts(koreanAccountsData);
        setVietnameseAccounts(vietnameseAccountsData);
        setExchangeAssets(exchangeAssetsData);
        setBinanceAssets(binanceAssetsData);
      }
      
      setShowAssetForm(false);
      setEditingAsset(null);
      
      let successMessage = '';
      if (editingAsset) {
        successMessage = '수정이 성공적으로 완료되었습니다.';
      } else if (assetFormType === 'cash') {
        const existingCashAsset = cashAssets.find(asset => asset.currency === formData.currency);
        if (existingCashAsset) {
          successMessage = `기존 ${formData.currency} 현금 자산에 추가되었습니다.`;
        } else {
          successMessage = `새로운 ${formData.currency} 현금 자산이 등록되었습니다.`;
        }
      } else if (assetFormType === 'korean-account') {
        const existingAccount = koreanAccounts.find(acc => 
          acc.bankName === formData.bankName && acc.accountNumber === formData.accountNumber
        );
        if (existingAccount) {
          successMessage = `기존 ${formData.bankName} 계좌에 잔액이 추가되었습니다.`;
        } else {
          successMessage = `새로운 ${formData.bankName} 계좌가 등록되었습니다.`;
        }
      } else if (assetFormType === 'vietnamese-account') {
        const existingAccount = vietnameseAccounts.find(acc => 
          acc.bankName === formData.bankName && acc.accountNumber === formData.accountNumber
        );
        if (existingAccount) {
          successMessage = `기존 ${formData.bankName} 계좌에 잔액이 추가되었습니다.`;
        } else {
          successMessage = `새로운 ${formData.bankName} 계좌가 등록되었습니다.`;
        }
      } else if (assetFormType === 'exchange') {
        const existingAsset = exchangeAssets.find(asset => 
          asset.exchangeName === formData.exchangeName && asset.coinName === formData.coinName
        );
        if (existingAsset) {
          successMessage = `기존 ${formData.exchangeName} ${formData.coinName} 자산에 수량이 추가되었습니다.`;
        } else {
          successMessage = `새로운 ${formData.exchangeName} ${formData.coinName} 자산이 등록되었습니다.`;
        }
      } else if (assetFormType === 'binance') {
        const existingAsset = binanceAssets.find(asset => 
          asset.coinName === formData.coinName
        );
        if (existingAsset) {
          successMessage = `기존 바이낸스 ${formData.coinName} 자산에 수량이 추가되었습니다.`;
        } else {
          successMessage = `새로운 바이낸스 ${formData.coinName} 자산이 등록되었습니다.`;
        }
      } else {
        successMessage = '추가가 성공적으로 완료되었습니다.';
      }
      
      setModalInfo({
        title: editingAsset ? '수정 완료' : '추가 완료',
        message: successMessage,
        type: 'success'
      });
    } catch (error) {
      console.error('Error saving asset:', error);
      setModalInfo({
        title: editingAsset ? '수정 실패' : '추가 실패',
        message: '저장 중 오류가 발생했습니다.',
        type: 'error'
      });
    }
  };

  // Handle advanced transaction form submission
  const handleAdvancedTransactionSuccess = (transaction: Transaction) => {
    setTransactions(prev => [transaction, ...prev]);
    setShowAdvancedTransactionForm(false);
    setModalInfo({
      title: '거래 기록 저장 완료',
      message: `${transaction.type === 'bank_to_exchange' ? '은행→거래소' : 
                 transaction.type === 'exchange_purchase' ? '코인 구매' : 
                 transaction.type === 'exchange_transfer' ? '거래소 이동' : 
                 transaction.type === 'p2p_trade' ? 'P2P 거래' : '거래'} 내역이 저장되었습니다.`,
      type: 'success'
    });
  };

  // 로딩 상태 확인 - 인증 로딩 또는 데이터 로딩 중
  const isDataLoading = authLoading || assetsLoading || transactionsLoading || exchangeRatesLoading;
  
  if (isDataLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="text-lg text-gray-600">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen font-sans">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex justify-between items-center h-12 lg:h-16">
            <div className="flex items-center space-x-2 lg:space-x-4">
              <ChartLine className="text-primary w-5 h-5 lg:w-6 lg:h-6" />
              <h1 className="text-base lg:text-xl font-bold text-gray-900">
                {currentView === 'dashboard' ? '대시보드' :
                 currentView === 'assets' ? '자산 관리' :
                 currentView === 'exchange-operations' ? '거래소 운영' :
                 currentView === 'transactions' ? '거래 내역' :
                 currentView === 'rates' ? '환율 관리' :
                 currentView === 'exchange-rates' ? '환전상 시세' :
                 '자산 관리'}
              </h1>
            </div>
            <div className="flex items-center space-x-2 lg:space-x-4">
              <div className="flex items-center space-x-1 lg:space-x-2">
                <div className="w-1.5 h-1.5 lg:w-2 lg:h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs lg:text-sm text-gray-600 hidden sm:inline">실시간 연동</span>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                className="p-1.5 lg:p-2"
                onClick={() => setShowUserSettings(true)}
                data-testid="header-settings"
              >
                <Settings className="w-4 h-4 lg:w-5 lg:h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Navigation */}
      <nav className="md:hidden bg-white border-t border-gray-200 fixed bottom-0 left-0 right-0 z-40">
        <div className="flex justify-around items-center h-12 px-1">
          <Button 
            variant="ghost" 
            className={`flex flex-col items-center space-y-0.5 p-1 min-w-0 ${currentView === 'dashboard' ? 'text-primary' : 'text-gray-400'}`}
            onClick={() => setCurrentView('dashboard')}
            data-testid="mobile-nav-dashboard"
          >
            <span className="text-base">📊</span>
            <span className="text-xs font-medium truncate">대시보드</span>
          </Button>
          <Button 
            variant="ghost" 
            className={`flex flex-col items-center space-y-0.5 p-1 min-w-0 ${currentView === 'assets' ? 'text-primary' : 'text-gray-400'}`}
            onClick={() => setCurrentView('assets')}
            data-testid="mobile-nav-assets"
          >
            <span className="text-base">💰</span>
            <span className="text-xs truncate">자산</span>
          </Button>
          <Button 
            variant="ghost" 
            className={`flex flex-col items-center space-y-0.5 p-1 min-w-0 ${currentView === 'exchange-operations' ? 'text-primary' : 'text-gray-400'}`}
            onClick={() => setCurrentView('exchange-operations')}
            data-testid="mobile-nav-exchange-operations"
          >
            <span className="text-base">🔄</span>
            <span className="text-xs truncate">거래소</span>
          </Button>
          <Button 
            variant="ghost" 
            className={`flex flex-col items-center space-y-0.5 p-1 min-w-0 ${currentView === 'transactions' ? 'text-primary' : 'text-gray-400'}`}
            onClick={() => setCurrentView('transactions')}
            data-testid="mobile-nav-transactions"
          >
            <span className="text-base">📋</span>
            <span className="text-xs truncate">내역</span>
          </Button>
          <Button 
            variant="ghost" 
            className={`flex flex-col items-center space-y-0.5 p-1 min-w-0 ${currentView === 'rates' ? 'text-primary' : 'text-gray-400'}`}
            onClick={() => setCurrentView('rates')}
            data-testid="mobile-nav-rates"
          >
            <span className="text-base">📈</span>
            <span className="text-xs truncate">환율</span>
          </Button>
          <Button 
            variant="ghost" 
            className={`flex flex-col items-center space-y-0.5 p-1 min-w-0 text-gray-400`}
            onClick={() => setShowUserSettings(true)}
            data-testid="mobile-nav-settings"
          >
            <span className="text-base">⚙️</span>
            <span className="text-xs truncate">설정</span>
          </Button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 lg:py-6 pb-16 md:pb-6">
        <div className="flex flex-col lg:flex-row gap-3 lg:gap-6">
          
          {/* Desktop Sidebar */}
          <aside className="hidden md:block w-60 lg:w-64 flex-shrink-0">
            <Card className="p-3 lg:p-4">
              <nav>
                <ul className="space-y-2">
                  {/* 네비게이션 메뉴 항목들 */}
                  {[
                    { id: 'dashboard', label: '대시보드', emoji: '📊' },
                    { id: 'assets', label: '자산 관리', emoji: '💰' },
                    { id: 'exchange-operations', label: '거래소 운영', emoji: '🔄' },
                    { id: 'transactions', label: '거래 내역', emoji: '📋' },
                    { id: 'rates', label: '환율 관리', emoji: '📈' },
                    { id: 'exchange-rates', label: '환전상 시세', emoji: '💱' },
                    { id: 'settings', label: '설정', emoji: '⚙️' }
                  ].map((item) => (
                    <li key={item.id}>
                      <Button 
                        variant="ghost" 
                        className={`w-full justify-start ${currentView === item.id ? 'bg-primary/10 text-primary' : ''}`}
                        onClick={() => {
                          if (item.id === 'settings') {
                            setShowUserSettings(true);
                          } else {
                            setCurrentView(item.id);
                          }
                        }}
                        data-testid={`desktop-nav-${item.id}`}
                      >
                        <span className="text-xl mr-3">{item.emoji}</span>
                        <span>{item.label}</span>
                      </Button>
                    </li>
                  ))}
                </ul>
              </nav>
            </Card>

            {/* Real-time Rates Widget */}
            <Card className="mt-4 lg:mt-6 p-3 lg:p-4">
              <h3 className="text-xs lg:text-sm font-semibold text-gray-900 mb-2 lg:mb-3 flex items-center">
                <ChartLine className="mr-1.5 lg:mr-2 text-primary w-3 h-3 lg:w-4 lg:h-4" />
                실시간 환율
              </h3>
              <div className="space-y-1.5 lg:space-y-2">
                <div className="flex justify-between items-center text-xs lg:text-sm">
                  <span className="text-gray-600">USD/KRW</span>
                  <div className="text-right">
                    <div className="font-medium text-gray-900">
                      {realTimeRates['USD-KRW'] ? realTimeRates['USD-KRW'].toFixed(2) : '로딩중...'}
                    </div>
                    <div className="text-xs text-green-600 flex items-center">
                      <TrendingUp className="mr-0.5 lg:mr-1 w-2.5 h-2.5 lg:w-3 lg:h-3" />
                      <span>+0.15%</span>
                    </div>
                  </div>
                </div>
                <div className="flex justify-between items-center text-xs lg:text-sm">
                  <span className="text-gray-600">KRW/VND</span>
                  <div className="text-right">
                    <div className="font-medium text-gray-900">
                      {realTimeRates['KRW-VND'] ? realTimeRates['KRW-VND'].toFixed(2) : '로딩중...'}
                    </div>
                    <div className="text-xs text-blue-600 flex items-center">
                      <TrendingUp className="mr-0.5 lg:mr-1 w-2.5 h-2.5 lg:w-3 lg:h-3" />
                      <span>실시간</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            {showAssetForm ? (
              <>
                {/* Modal Backdrop */}
                <div 
                  className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center p-2 sm:p-4 pt-2 sm:pt-8 overflow-y-auto"
                  onClick={(e) => {
                    // Close modal if clicking on backdrop
                    if (e.target === e.currentTarget) {
                      setShowAssetForm(false);
                      setEditingAsset(null);
                    }
                  }}
                >
                  <div className="w-full max-w-2xl min-h-full sm:min-h-0 sm:max-h-[90vh] my-auto">
                    <AssetForm
                      type={assetFormType}
                      editData={editingAsset}
                      onSubmit={handleAssetFormSubmit}
                      onCancel={() => {
                        setShowAssetForm(false);
                        setEditingAsset(null);
                      }}
                    />
                  </div>
                </div>
              </>
            ) : showAdvancedTransactionForm ? (
              <>
                {/* Advanced Transaction Modal Backdrop */}
                <div 
                  className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center p-2 sm:p-4 pt-2 sm:pt-8 overflow-y-auto"
                  onClick={(e) => {
                    // Close modal if clicking on backdrop
                    if (e.target === e.currentTarget) {
                      setShowAdvancedTransactionForm(false);
                    }
                  }}
                >
                  <div className="w-full max-w-6xl min-h-full sm:min-h-0 sm:max-h-[95vh] my-auto">
                    <AdvancedTransactionForm
                      allAssets={allAssetsForTransaction}
                      onTransactionSuccess={handleAdvancedTransactionSuccess}
                      onCancel={() => setShowAdvancedTransactionForm(false)}
                    />
                  </div>
                </div>
              </>
            ) : showUserSettings ? (
              <>
                {/* User Settings Modal Backdrop */}
                <div 
                  className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center p-2 sm:p-4 pt-2 sm:pt-8 overflow-y-auto"
                  onClick={(e) => {
                    // Close modal if clicking on backdrop
                    if (e.target === e.currentTarget) {
                      setShowUserSettings(false);
                    }
                  }}
                >
                  <div className="w-full max-w-md min-h-full sm:min-h-0 my-auto">
                    <UserSettingsForm
                      onClose={() => setShowUserSettings(false)}
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                {currentView === 'dashboard' && (
                  <Dashboard
                    assets={{ 
                      cashAssets: cashAssets || [], 
                      koreanAccounts: koreanAccounts || [], 
                      vietnameseAccounts: vietnameseAccounts || [], 
                      exchangeAssets: exchangeAssets || [], 
                      binanceAssets: binanceAssets || [] 
                    }}
                    transactions={transactions || []}
                    realTimeRates={realTimeRates}
                    cryptoRates={cryptoRates}
                    isFetchingRates={isFetchingRates}
                    onOpenModal={handleOpenModal}
                  />
                )}
                {currentView === 'assets' && (
                  <AssetManager
                    data={{ 
                      cashAssets: cashAssets || [], 
                      koreanAccounts: koreanAccounts || [], 
                      vietnameseAccounts: vietnameseAccounts || [], 
                      exchangeAssets: exchangeAssets || [], 
                      binanceAssets: binanceAssets || [] 
                    }}
                    onOpenModal={handleOpenModal}
                    activeTab={activeAssetTab}
                    onTabChange={setActiveAssetTab}
                  />
                )}
                {currentView === 'exchange-operations' && (
                  <ExchangeOperations />
                )}
                {currentView === 'transaction' && (
                  <TransactionForm
                    allAssets={allAssetsForTransaction}
                    onTransactionSuccess={() => setCurrentView('dashboard')}
                    onOpenModal={handleOpenModal}
                  />
                )}
                {currentView === 'rates' && (
                  <RateManager
                    realTimeRates={realTimeRates}
                    cryptoRates={cryptoRates}
                    isFetchingRates={isFetchingRates}
                  />
                )}
                {currentView === 'exchange-rates' && (
                  <ExchangeRateManager
                    rates={exchangeRates}
                    onSave={async (rate) => {
                      try {
                        const response = await fetch('/api/exchange-rates', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify(rate)
                        });

                        if (!response.ok) {
                          throw new Error('Failed to save exchange rate');
                        }

                        const exchangeRatesRes = await fetch('/api/exchange-rates');
                        const exchangeRatesData = await exchangeRatesRes.json();
                        setExchangeRates(exchangeRatesData);
                      } catch (error) {
                        console.error('환율 저장 실패:', error);
                      }
                    }}
                    onUpdate={async (id, rate) => {
                      try {
                        const response = await fetch(`/api/exchange-rates/${id}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify(rate)
                        });

                        if (!response.ok) {
                          throw new Error('Failed to update exchange rate');
                        }

                        const exchangeRatesRes = await fetch('/api/exchange-rates');
                        const exchangeRatesData = await exchangeRatesRes.json();
                        setExchangeRates(exchangeRatesData);
                      } catch (error) {
                        console.error('환율 수정 실패:', error);
                      }
                    }}
                    realTimeRates={realTimeRates}
                  />
                )}
                {currentView === 'transactions' && (
                  <TransactionHistory
                    transactions={transactions}
                    onTransactionClick={(transaction) => {
                      if (transaction.type === 'cash_change') {
                        handleOpenModal('viewCashChangeDetail', transaction);
                      }
                    }}
                  />
                )}
              </>
            )}
          </main>
        </div>
      </div>

      {/* Cash Transaction History Modal */}
      {showCashTransactionHistory && selectedCashAsset && (
        <CashTransactionHistory
          isOpen={showCashTransactionHistory}
          onClose={() => {
            setShowCashTransactionHistory(false);
            setSelectedCashAsset(null);
          }}
          cashAsset={selectedCashAsset}
          transactions={transactions}
        />
      )}

      {/* Cash Change Detail Modal */}
      <CashChangeDetailModal
        transaction={selectedTransaction}
        isOpen={isCashDetailModalOpen}
        onClose={() => {
          setIsCashDetailModalOpen(false);
          setSelectedTransaction(null);
        }}
      />

      {/* Modal */}
      {modalInfo && (
        <Modal
          {...modalInfo}
          onCancel={() => setModalInfo(null)}
        />
      )}
    </div>
  );
}
