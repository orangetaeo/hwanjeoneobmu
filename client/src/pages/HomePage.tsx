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
import Modal from '@/components/Modal';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CashAsset, BankAccount, ExchangeAsset, BinanceAsset, Transaction, Asset, ModalInfo } from '@/types';

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
        const [assetsRes, transactionsRes] = await Promise.all([
          fetch('/api/assets'),
          fetch('/api/transactions')
        ]);

        if (assetsRes.ok && transactionsRes.ok) {
          const assetsData = await assetsRes.json();
          const transactionsData = await transactionsRes.json();

          // 자산을 타입별로 분류
          const cashAssets = assetsData.filter((asset: any) => asset.type === 'cash');
          const allAccounts = assetsData.filter((asset: any) => asset.type === 'account');
          const exchanges = assetsData.filter((asset: any) => asset.type === 'exchange');
          const binanceAssets = assetsData.filter((asset: any) => asset.type === 'binance');

          // 계좌를 한국/베트남으로 분리
          const koreanAccounts = allAccounts.filter((account: any) => 
            account.currency === 'KRW' || !account.metadata?.country
          );
          const vietnameseAccounts = allAccounts.filter((account: any) => 
            account.metadata?.country === '베트남'
          );

          setCashAssets(cashAssets || []);
          setKoreanAccounts(koreanAccounts || []);
          setVietnameseAccounts(vietnameseAccounts || []);
          setExchangeAssets(exchanges || []);
          setBinanceAssets(binanceAssets || []);
          setTransactions(transactionsData || []);
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
      displayName: `${(asset as ExchangeAsset).exchangeName || '바이낸스'} (${asset.coinName})`
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
      const uid = user.uid;
      const dataPath = `exchangeManagerData_${uid}`;
      
      // Log deletion with memo to localStorage
      const deletionLog = {
        asset,
        memo,
        timestamp: new Date().toISOString(),
        deletedBy: user.uid
      };
      
      const existingLogs = JSON.parse(localStorage.getItem(`${dataPath}_deletions`) || '[]');
      existingLogs.push(deletionLog);
      localStorage.setItem(`${dataPath}_deletions`, JSON.stringify(existingLogs));
      
      // Delete from localStorage data
      if (asset.denominations) {
        setCashAssets(prev => prev.filter(a => a.id !== asset.id));
      } else if (asset.exchangeName) {
        setExchangeAssets(prev => prev.filter(a => a.id !== asset.id));
      } else if (asset.coinName && !asset.exchangeName) {
        setBinanceAssets(prev => prev.filter(a => a.id !== asset.id));
      } else if (asset.bankName) {
        const isKorean = koreanAccounts.find(acc => acc.id === asset.id);
        if (isKorean) {
          setKoreanAccounts(prev => prev.filter(a => a.id !== asset.id));
        } else {
          setVietnameseAccounts(prev => prev.filter(a => a.id !== asset.id));
        }
      }
        
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

  const handleAssetFormSubmit = (formData: any) => {
    if (!user) return;
    
    try {
      if (editingAsset) {
        // Update existing asset
        const assetId = (editingAsset as any).id;
        if (assetFormType === 'cash') {
          setCashAssets(prev => prev.map(a => a.id === assetId ? { ...a, ...formData } : a));
        } else if (assetFormType === 'korean-account') {
          setKoreanAccounts(prev => prev.map(a => a.id === assetId ? { ...a, ...formData } : a));
        } else if (assetFormType === 'vietnamese-account') {
          setVietnameseAccounts(prev => prev.map(a => a.id === assetId ? { ...a, ...formData } : a));
        } else if (assetFormType === 'exchange') {
          setExchangeAssets(prev => prev.map(a => a.id === assetId ? { ...a, ...formData } : a));
        } else if (assetFormType === 'binance') {
          setBinanceAssets(prev => prev.map(a => a.id === assetId ? { ...a, ...formData } : a));
        }
      } else {
        // Add new asset
        if (assetFormType === 'cash') {
          // 같은 통화의 현금 자산이 이미 있는지 확인
          const existingCashAsset = cashAssets.find(asset => asset.currency === formData.currency);
          
          if (existingCashAsset) {
            // 기존 자산에 추가 (기존 수량 + 새로운 수량)
            setCashAssets(prev => prev.map(asset => {
              if (asset.id === existingCashAsset.id) {
                const updatedDenominations = { ...asset.denominations };
                
                // 각 지폐별로 수량 합산
                Object.entries(formData.denominations).forEach(([denom, newCount]) => {
                  const existingCount = updatedDenominations[denom] || 0;
                  const newAmount = typeof newCount === 'number' ? newCount : 0;
                  updatedDenominations[denom] = existingCount + newAmount;
                });
                
                // 새로운 총 잔액 계산
                const newBalance = Object.entries(updatedDenominations).reduce((total, [denom, count]) => {
                  const denomValue = parseFloat(denom.replace(/,/g, ''));
                  const countValue = typeof count === 'number' ? count : 0;
                  return total + (denomValue * countValue);
                }, 0);
                
                return {
                  ...asset,
                  denominations: updatedDenominations,
                  balance: newBalance
                };
              }
              return asset;
            }));
          } else {
            // 새로운 통화이므로 새 카드 생성
            setCashAssets(prev => [...prev, formData as CashAsset]);
          }
        } else if (assetFormType === 'korean-account') {
          // 같은 은행/계좌가 이미 있는지 확인
          const existingAccount = koreanAccounts.find(acc => 
            acc.bankName === formData.bankName && acc.accountNumber === formData.accountNumber
          );
          
          if (existingAccount) {
            // 기존 계좌에 잔액 합산
            setKoreanAccounts(prev => prev.map(acc => 
              acc.id === existingAccount.id 
                ? { ...acc, balance: acc.balance + formData.balance }
                : acc
            ));
          } else {
            setKoreanAccounts(prev => [...prev, formData as BankAccount]);
          }
        } else if (assetFormType === 'vietnamese-account') {
          // 같은 은행/계좌가 이미 있는지 확인
          const existingAccount = vietnameseAccounts.find(acc => 
            acc.bankName === formData.bankName && acc.accountNumber === formData.accountNumber
          );
          
          if (existingAccount) {
            // 기존 계좌에 잔액 합산
            setVietnameseAccounts(prev => prev.map(acc => 
              acc.id === existingAccount.id 
                ? { ...acc, balance: acc.balance + formData.balance }
                : acc
            ));
          } else {
            setVietnameseAccounts(prev => [...prev, formData as BankAccount]);
          }
        } else if (assetFormType === 'exchange') {
          // 같은 거래소/코인이 이미 있는지 확인
          const existingAsset = exchangeAssets.find(asset => 
            asset.exchangeName === formData.exchangeName && asset.coinName === formData.coinName
          );
          
          if (existingAsset) {
            // 기존 자산에 수량 합산
            setExchangeAssets(prev => prev.map(asset => 
              asset.id === existingAsset.id 
                ? { ...asset, quantity: asset.quantity + formData.quantity }
                : asset
            ));
          } else {
            setExchangeAssets(prev => [...prev, formData as ExchangeAsset]);
          }
        } else if (assetFormType === 'binance') {
          // 같은 코인이 이미 있는지 확인
          const existingAsset = binanceAssets.find(asset => 
            asset.coinName === formData.coinName
          );
          
          if (existingAsset) {
            // 기존 자산에 수량 합산
            setBinanceAssets(prev => prev.map(asset => 
              asset.id === existingAsset.id 
                ? { ...asset, quantity: asset.quantity + formData.quantity }
                : asset
            ));
          } else {
            setBinanceAssets(prev => [...prev, formData as BinanceAsset]);
          }
        }
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
                  <li>
                    <Button 
                      variant="ghost" 
                      className={`w-full justify-start ${currentView === 'dashboard' ? 'bg-primary/10 text-primary' : ''}`}
                      onClick={() => setCurrentView('dashboard')}
                      data-testid="desktop-nav-dashboard"
                    >
                      <Home className="mr-3" size={18} />
                      <span>대시보드</span>
                    </Button>
                  </li>
                  <li>
                    <Button 
                      variant="ghost" 
                      className={`w-full justify-start ${currentView === 'assets' ? 'bg-primary/10 text-primary' : ''}`}
                      onClick={() => setCurrentView('assets')}
                      data-testid="desktop-nav-assets"
                    >
                      <Wallet className="mr-3" size={18} />
                      <span>자산 관리</span>
                    </Button>
                  </li>
                  <li>
                    <Button 
                      variant="ghost" 
                      className={`w-full justify-start ${currentView === 'rates' ? 'bg-primary/10 text-primary' : ''}`}
                      onClick={() => setCurrentView('rates')}
                      data-testid="desktop-nav-rates"
                    >
                      <TrendingUp className="mr-3" size={18} />
                      <span>환율/시세 관리</span>
                    </Button>
                  </li>
                  <li>
                    <Button 
                      variant="ghost" 
                      className={`w-full justify-start ${currentView === 'transaction' ? 'bg-primary/10 text-primary' : ''}`}
                      onClick={() => setCurrentView('transaction')}
                      data-testid="desktop-nav-transaction"
                    >
                      <DollarSign className="mr-3" size={18} />
                      <span>간편 거래</span>
                    </Button>
                  </li>
                  <li>
                    <Button 
                      variant="ghost" 
                      className={`w-full justify-start ${currentView === 'advanced-transaction' ? 'bg-primary/10 text-primary' : ''}`}
                      onClick={() => setShowAdvancedTransactionForm(true)}
                      data-testid="desktop-nav-advanced-transaction"
                    >
                      <TrendingUp className="mr-3" size={18} />
                      <span>고급 거래</span>
                    </Button>
                  </li>
                  <li>
                    <Button 
                      variant="ghost" 
                      className={`w-full justify-start ${currentView === 'transactions' ? 'bg-primary/10 text-primary' : ''}`}
                      onClick={() => setCurrentView('transactions')}
                      data-testid="desktop-nav-transactions"
                    >
                      <List className="mr-3" size={18} />
                      <span>거래 내역</span>
                    </Button>
                  </li>
                  <li>
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start"
                      onClick={() => setShowUserSettings(true)}
                      data-testid="desktop-nav-settings"
                    >
                      <Settings className="mr-3" size={18} />
                      <span>거래 설정</span>
                    </Button>
                  </li>
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
