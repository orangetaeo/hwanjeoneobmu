import { useState, useEffect, useMemo } from 'react';
import { 
  Home, 
  TrendingUp, 
  Settings, 
  DollarSign, 
  Wallet,
  List,
  ChartLine,
  Plus
} from 'lucide-react';
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

  // PostgreSQL 데이터베이스에서 실제 데이터 로드
  useEffect(() => {
    if (!user || authLoading) return;

    // PostgreSQL에서 실제 데이터 로드 - localStorage 제거
    const loadDatabaseData = async () => {
      try {
        const [assetsRes, transactionsRes, exchangeRatesRes] = await Promise.all([
          fetch('/api/assets'),
          fetch('/api/transactions'),
          fetch('/api/exchange-rates')
        ]);

        if (assetsRes.ok && transactionsRes.ok && exchangeRatesRes.ok) {
          const assetsData = await assetsRes.json();
          const transactionsData = await transactionsRes.json();
          const exchangeRatesData = await exchangeRatesRes.json();

          // 자산을 타입별로 분류 - 디버깅 로그 추가
          console.log('All assets from API:', assetsData);
          
          const cashAssets = assetsData.filter((asset: any) => asset.type === 'cash');
          const allAccounts = assetsData.filter((asset: any) => asset.type === 'account');
          const exchanges = assetsData.filter((asset: any) => asset.type === 'exchange');
          const binanceAssets = assetsData.filter((asset: any) => asset.type === 'binance');

          console.log('Filtered assets:', {
            cashAssets: cashAssets.length,
            allAccounts: allAccounts.length, 
            exchanges: exchanges.length,
            binanceAssets: binanceAssets.length
          });
          
          console.log('Exchange assets details:', exchanges);
          console.log('Binance assets details:', binanceAssets);

          // 계좌를 한국/베트남으로 분리
          const koreanAccounts = allAccounts.filter((account: any) => 
            account.currency === 'KRW' || !account.metadata?.country
          );
          const vietnameseAccounts = allAccounts.filter((account: any) => 
            account.metadata?.country === '베트남'
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

          console.log('Processed exchanges for Dashboard:', processedExchanges);
          console.log('Processed binance assets for Dashboard:', processedBinanceAssets);

          setCashAssets(cashAssets || []);
          setKoreanAccounts(koreanAccounts || []);
          setVietnameseAccounts(vietnameseAccounts || []);
          setExchangeAssets(processedExchanges || []);
          setBinanceAssets(processedBinanceAssets || []);
          setTransactions(transactionsData || []);
          setExchangeRates(exchangeRatesData || []);
        }
      } catch (error) {
        console.error('Failed to load data from database:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDatabaseData();
  }, [user, authLoading]);

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
          cashAssetsData.push({
            id: asset.id,
            type: 'cash',
            currency: asset.currency,
            balance: parseFloat(asset.balance),
            denominations: asset.metadata?.denomination || {},
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
              denomination: formData.denominations || {}
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
              denominations: asset.metadata?.denomination || {},
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
          createData = {
            name: `${formData.currency} 현금`,
            type: 'cash',
            currency: formData.currency,
            balance: formData.balance.toString(),
            metadata: {
              denomination: formData.denominations
            }
          };
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
              denominations: asset.metadata?.denomination || {},
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

  if (authLoading || loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="text-lg text-gray-600">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen font-sans">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <ChartLine className="text-primary text-2xl" />
              <h1 className="text-xl font-bold text-gray-900">자산 관리</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-600">실시간 연동</span>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowUserSettings(true)}
                data-testid="header-settings"
              >
                <Settings size={18} />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Navigation */}
      <nav className="md:hidden bg-white border-t border-gray-200 fixed bottom-0 left-0 right-0 z-50">
        <div className="flex justify-around items-center h-16">
          <Button 
            variant="ghost" 
            className={`flex flex-col items-center space-y-1 p-2 ${currentView === 'dashboard' ? 'text-primary' : 'text-gray-400'}`}
            onClick={() => setCurrentView('dashboard')}
            data-testid="mobile-nav-dashboard"
          >
            <Home size={20} />
            <span className="text-xs font-medium">대시보드</span>
          </Button>
          <Button 
            variant="ghost" 
            className={`flex flex-col items-center space-y-1 p-2 ${currentView === 'assets' ? 'text-primary' : 'text-gray-400'}`}
            onClick={() => setCurrentView('assets')}
            data-testid="mobile-nav-assets"
          >
            <Wallet size={20} />
            <span className="text-xs">자산</span>
          </Button>
          <Button 
            variant="ghost" 
            className={`flex flex-col items-center space-y-1 p-2 ${currentView === 'rates' ? 'text-primary' : 'text-gray-400'}`}
            onClick={() => setCurrentView('rates')}
            data-testid="mobile-nav-rates"
          >
            <TrendingUp size={20} />
            <span className="text-xs">환율</span>
          </Button>
          <Button 
            variant="ghost" 
            className={`flex flex-col items-center space-y-1 p-2 ${currentView === 'transactions' ? 'text-primary' : 'text-gray-400'}`}
            onClick={() => setCurrentView('transactions')}
            data-testid="mobile-nav-transactions"
          >
            <List size={20} />
            <span className="text-xs">거래내역</span>
          </Button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-20 md:pb-6">
        <div className="flex flex-col lg:flex-row gap-6">
          
          {/* Desktop Sidebar */}
          <aside className="hidden md:block w-64 flex-shrink-0">
            <Card className="p-4">
              <nav>
                <ul className="space-y-2">
                  {/* 네비게이션 메뉴 항목들 */}
                  {[
                    { id: 'dashboard', label: '대시보드', icon: Home },
                    { id: 'assets', label: '자산 관리', icon: Wallet },
                    { id: 'transactions', label: '거래 내역', icon: List },
                    { id: 'rates', label: '환율 관리', icon: TrendingUp },
                    { id: 'exchange-rates', label: '환전상 시세', icon: DollarSign },
                    { id: 'settings', label: '설정', icon: Settings }
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
                        <item.icon className="mr-3" size={18} />
                        <span>{item.label}</span>
                      </Button>
                    </li>
                  ))}
                </ul>
              </nav>
            </Card>

            {/* Real-time Rates Widget */}
            <Card className="mt-6 p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                <ChartLine className="mr-2 text-primary" size={16} />
                실시간 환율
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">USD/KRW</span>
                  <div className="text-right">
                    <div className="font-medium text-gray-900">
                      {realTimeRates['USD-KRW'] ? realTimeRates['USD-KRW'].toFixed(2) : '로딩중...'}
                    </div>
                    <div className="text-xs text-green-600 flex items-center">
                      <TrendingUp size={12} className="mr-1" />
                      <span>+0.15%</span>
                    </div>
                  </div>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">KRW/VND</span>
                  <div className="text-right">
                    <div className="font-medium text-gray-900">
                      {realTimeRates['KRW-VND'] ? realTimeRates['KRW-VND'].toFixed(2) : '로딩중...'}
                    </div>
                    <div className="text-xs text-blue-600 flex items-center">
                      <TrendingUp size={12} className="mr-1" />
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
                  className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
                  onClick={(e) => {
                    // Close modal if clicking on backdrop
                    if (e.target === e.currentTarget) {
                      setShowUserSettings(false);
                    }
                  }}
                >
                  <div className="w-full max-w-md">
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
                  />
                )}
              </>
            )}
          </main>
        </div>
      </div>

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
