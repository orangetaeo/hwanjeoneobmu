import { useState, useEffect, useMemo } from 'react';
import { 
  Home, 
  TrendingUp, 
  Settings, 
  DollarSign, 
  Wallet,
  List,
  ChartLine
} from 'lucide-react';
import { collection, onSnapshot, doc, addDoc, query, orderBy, limit, setDoc, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useFirebaseAuth } from '@/hooks/useFirebaseAuth';
import { useExchangeRates } from '@/hooks/useExchangeRates';
import Dashboard from '@/components/Dashboard';
import AssetManager from '@/components/AssetManager';
import TransactionForm from '@/components/TransactionForm';
import RateManager from '@/components/RateManager';
import TransactionHistory from '@/components/TransactionHistory';
import AssetForm from '@/components/AssetForm';
import Modal from '@/components/Modal';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CashAsset, BankAccount, ExchangeAsset, BinanceAsset, Transaction, Asset, ModalInfo } from '@/types';

const initialAssets = [
  { 
    name: 'KRW 현금', 
    type: 'cash', 
    currency: 'KRW', 
    balance: 3540000, 
    denominations: { '50000': 59, '10000': 59, '5000': 0, '1000': 0 } 
  },
  { 
    name: 'USD 현금', 
    type: 'cash', 
    currency: 'USD', 
    balance: 436, 
    denominations: { '100': 2, '50': 1, '20': 3, '10': 8, '5': 3, '2': 0, '1': 31 } 
  },
  { 
    name: 'VND 현금', 
    type: 'cash', 
    currency: 'VND', 
    balance: 30790000, 
    denominations: { '500000': 56, '200000': 10, '100000': 5, '50000': 4, '20000': 1, '10000': 7 } 
  },
];

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

  // Initialize with sample data for development and save to localStorage
  useEffect(() => {
    if (!user || authLoading) return;

    // Try to load from localStorage first
    const savedData = localStorage.getItem(`exchangeManagerData_${user.uid}`);
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        setCashAssets(parsed.cashAssets || []);
        setKoreanAccounts(parsed.koreanAccounts || []);
        setVietnameseAccounts(parsed.vietnameseAccounts || []);
        setExchangeAssets(parsed.exchangeAssets || []);
        setBinanceAssets(parsed.binanceAssets || []);
        setTransactions(parsed.transactions || []);
        setLoading(false);
        return;
      } catch (e) {
        console.log('Failed to load saved data, using default');
      }
    }

    // Sample data initialization
    setCashAssets([
      {
        id: '1',
        name: '원화 현금',
        type: 'cash',
        currency: 'KRW',
        balance: 1025000,
        denominations: { '50000': 10, '10000': 20, '5000': 15, '1000': 25 }
      },
      {
        id: '2',
        name: '달러 현금',
        type: 'cash',
        currency: 'USD',
        balance: 1025,
        denominations: { '100': 5, '50': 10, '20': 15, '10': 20, '5': 25, '1': 50 }
      }
    ]);
    
    setKoreanAccounts([
      {
        id: '1',
        bankName: '신한은행',
        accountNumber: '110-123-456789',
        accountHolder: 'Hong Gil Dong',
        balance: 5000000
      }
    ]);
    
    setVietnameseAccounts([
      {
        id: '1', 
        bankName: 'Vietcombank',
        accountNumber: '0123456789',
        accountHolder: 'Nguyen Van A',
        balance: 50000000
      },
      {
        id: '2',
        bankName: 'BIDV',
        accountNumber: '0987654321', 
        accountHolder: 'Tran Thi B',
        balance: 25000000
      }
    ]);
    
    setExchangeAssets([
      {
        id: '1',
        exchangeName: 'Bithumb',
        coinName: 'USDT',
        quantity: 2563.07,
        currency: 'USDT'
      },
      {
        id: '2',
        exchangeName: 'Upbit',
        coinName: 'Bitcoin',
        quantity: 0.15,
        currency: 'BTC'
      }
    ]);
    
    setBinanceAssets([
      {
        id: '1',
        coinName: 'USDT',
        quantity: 1000.18,
        currency: 'USDT'
      },
      {
        id: '2',
        coinName: 'BTC',
        quantity: 0.025,
        currency: 'BTC'
      }
    ]);
    
    setTransactions([
      {
        id: '1',
        type: 'exchange',
        fromAssetName: 'KRW 현금',
        toAssetName: 'USD 현금',
        fromAmount: 1350000,
        toAmount: 1000,
        rate: 1350,
        profit: 0,
        timestamp: new Date('2024-08-15T10:30:00Z')
      },
      {
        id: '2',
        type: 'transfer',
        fromAssetName: 'Bithumb USDT',
        toAssetName: 'Binance USDT',
        fromAmount: 500,
        toAmount: 500,
        rate: 1,
        profit: 0,
        timestamp: new Date('2024-08-15T09:15:00Z')
      }
    ]);
    
    setLoading(false);

    // Save sample data to localStorage
    const sampleData = {
      cashAssets: [
        { id: '1', name: '원화 현금', type: 'cash', currency: 'KRW', balance: 1025000, denominations: { '50000': 10, '10000': 20, '5000': 15, '1000': 25 } },
        { id: '2', name: '달러 현금', type: 'cash', currency: 'USD', balance: 1025, denominations: { '100': 5, '50': 10, '20': 15, '10': 20, '5': 25, '1': 50 } }
      ],
      koreanAccounts: [{ id: '1', bankName: '신한은행', accountNumber: '110-123-456789', accountHolder: 'Hong Gil Dong', balance: 5000000 }],
      vietnameseAccounts: [
        { id: '1', bankName: 'Vietcombank', accountNumber: '0123456789', accountHolder: 'Nguyen Van A', balance: 50000000 },
        { id: '2', bankName: 'BIDV', accountNumber: '0987654321', accountHolder: 'Tran Thi B', balance: 25000000 }
      ],
      exchangeAssets: [
        { id: '1', exchangeName: 'Bithumb', coinName: 'USDT', quantity: 2563.07, currency: 'USDT' },
        { id: '2', exchangeName: 'Upbit', coinName: 'Bitcoin', quantity: 0.15, currency: 'BTC' }
      ],
      binanceAssets: [
        { id: '1', coinName: 'USDT', quantity: 1000.18, currency: 'USDT' },
        { id: '2', coinName: 'BTC', quantity: 0.025, currency: 'BTC' }
      ],
      transactions: [
        { id: '1', type: 'exchange', fromAssetName: 'KRW 현금', toAssetName: 'USD 현금', fromAmount: 1350000, toAmount: 1000, rate: 1350, profit: 0, timestamp: new Date('2024-08-15T10:30:00Z') },
        { id: '2', type: 'transfer', fromAssetName: 'Bithumb USDT', toAssetName: 'Binance USDT', fromAmount: 500, toAmount: 500, rate: 1, profit: 0, timestamp: new Date('2024-08-15T09:15:00Z') }
      ]
    };
    localStorage.setItem(`exchangeManagerData_${user.uid}`, JSON.stringify(sampleData));
  }, [user, authLoading]);

  // Save data to localStorage whenever state changes
  useEffect(() => {
    if (!user?.uid || loading) return;
    
    const dataToSave = {
      cashAssets,
      koreanAccounts, 
      vietnameseAccounts,
      exchangeAssets,
      binanceAssets,
      transactions
    };
    localStorage.setItem(`exchangeManagerData_${user.uid}`, JSON.stringify(dataToSave));
  }, [user?.uid, cashAssets, koreanAccounts, vietnameseAccounts, exchangeAssets, binanceAssets, transactions, loading]);

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
        setEditingAsset(null);
        setShowAssetForm(true);
        break;
      case 'addKoreanAccount':
        setAssetFormType('korean-account');
        setEditingAsset(null);
        setShowAssetForm(true);
        break;
      case 'addVietnameseAccount':
        setAssetFormType('vietnamese-account');
        setEditingAsset(null);
        setShowAssetForm(true);
        break;
      case 'addExchangeAsset':
        setAssetFormType('exchange');
        setEditingAsset(null);
        setShowAssetForm(true);
        break;
      case 'addBinanceAsset':
        setAssetFormType('binance');
        setEditingAsset(null);
        setShowAssetForm(true);
        break;
      case 'editAsset':
      case 'editAccount':
        if (data) {
          // Determine asset type based on data structure
          if (data.denominations) setAssetFormType('cash');
          else if (data.exchangeName) setAssetFormType('exchange');
          else if (data.coinName && !data.exchangeName) setAssetFormType('binance');
          else if (data.bankName) {
            // Check if it's Korean or Vietnamese account based on existing data
            const isKorean = koreanAccounts.find(acc => acc.id === data.id);
            setAssetFormType(isKorean ? 'korean-account' : 'vietnamese-account');
          }
          setEditingAsset(data);
          setShowAssetForm(true);
        }
        break;
      case 'deleteAsset':
      case 'deleteAccount':
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
          setKoreanAccounts(prev => [...prev, formData as BankAccount]);
        } else if (assetFormType === 'vietnamese-account') {
          setVietnameseAccounts(prev => [...prev, formData as BankAccount]);
        } else if (assetFormType === 'exchange') {
          setExchangeAssets(prev => [...prev, formData as ExchangeAsset]);
        } else if (assetFormType === 'binance') {
          setBinanceAssets(prev => [...prev, formData as BinanceAsset]);
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
              <Button variant="ghost" size="sm">
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
                      <span>새 거래</span>
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
            ) : (
              <>
                {currentView === 'dashboard' && (
                  <Dashboard
                    assets={{ cashAssets, koreanAccounts, vietnameseAccounts, exchangeAssets, binanceAssets }}
                    transactions={transactions}
                    realTimeRates={realTimeRates}
                    cryptoRates={cryptoRates}
                    isFetchingRates={isFetchingRates}
                    onOpenModal={handleOpenModal}
                  />
                )}
                {currentView === 'assets' && (
                  <AssetManager
                    data={{ cashAssets, koreanAccounts, vietnameseAccounts, exchangeAssets, binanceAssets }}
                    onOpenModal={handleOpenModal}
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
