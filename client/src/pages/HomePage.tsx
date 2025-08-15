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

  // Firebase data setup and subscriptions
  useEffect(() => {
    if (!user || authLoading) return;

    const uid = user.uid;
    const dataPath = `artifacts/exchange-manager/users/${uid}`;

    const setupInitialData = async () => {
      const collectionsToSetup = {
        'cash_assets': initialAssets,
        'korean_accounts': [],
        'vietnamese_accounts': [
          { bankName: 'Shinhan Bank', accountNumber: '123-456', accountHolder: 'Test User', balance: 26684000 },
          { bankName: 'BIDV', accountNumber: '789-012', accountHolder: 'Test User', balance: 1200000 }
        ],
        'exchange_assets': [
          { exchangeName: 'Bithumb', coinName: 'USDT', quantity: 2563.07363534, currency: 'USDT' }
        ],
        'binance_assets': [
          { coinName: 'USDT', quantity: 1.18, currency: 'USDT' }
        ],
      };

      for (const [name, data] of Object.entries(collectionsToSetup)) {
        const ref = collection(db, `${dataPath}/${name}`);
        const snapshot = await getDocs(query(ref));
        if (snapshot.empty && data.length > 0) {
          for (const item of data) {
            await addDoc(ref, item);
          }
        }
      }

      const ratesToSetup = {
        'goldsmith_rates': { 
          USD: { '100': 25500, '50': 25450, '20_10': 25400, '5_2_1': 25350 }, 
          KRW: { '50000': 21.5, '10000': 21.4, '5000_1000': 21.3 } 
        },
        'transaction_rates': { 
          USD: { '100_buy': 25400, '100_sell': 25500, '50_buy': 25350, '50_sell': 25450 }, 
          KRW: { '50000_buy': 21.3, '50000_sell': 21.5, '10000_buy': 21.2, '10000_sell': 21.4 }, 
          USDT: { 'USDT_buy': 0.99, 'USDT_sell': 1.01 } 
        }
      };

      for (const [name, data] of Object.entries(ratesToSetup)) {
        const ref = doc(db, `${dataPath}/rates`, name);
        await setDoc(ref, data);
      }
    };

    setupInitialData().then(() => {
      const unsubscribers = [
        onSnapshot(collection(db, `${dataPath}/cash_assets`), s => {
          setCashAssets(s.docs.map(d => ({ id: d.id, ...d.data() } as CashAsset)));
          setLoading(false);
        }),
        onSnapshot(collection(db, `${dataPath}/korean_accounts`), s => 
          setKoreanAccounts(s.docs.map(d => ({ id: d.id, ...d.data() } as BankAccount)))),
        onSnapshot(collection(db, `${dataPath}/vietnamese_accounts`), s => 
          setVietnameseAccounts(s.docs.map(d => ({ id: d.id, ...d.data() } as BankAccount)))),
        onSnapshot(collection(db, `${dataPath}/exchange_assets`), s => 
          setExchangeAssets(s.docs.map(d => ({ id: d.id, ...d.data() } as ExchangeAsset)))),
        onSnapshot(collection(db, `${dataPath}/binance_assets`), s => 
          setBinanceAssets(s.docs.map(d => ({ id: d.id, ...d.data() } as BinanceAsset)))),
        onSnapshot(query(collection(db, `${dataPath}/transactions`), orderBy('timestamp', 'desc'), limit(20)), s => 
          setTransactions(s.docs.map(d => ({ id: d.id, ...d.data() } as Transaction)))),
      ];
      
      return () => unsubscribers.forEach(unsub => unsub());
    });
  }, [user, authLoading]);

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
          title: '삭제 확인',
          message: '정말로 이 항목을 삭제하시겠습니까?',
          type: 'confirm',
          onConfirm: () => handleDeleteAsset(data)
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

  const handleDeleteAsset = async (asset: any) => {
    if (!user) return;
    
    try {
      const uid = user.uid;
      const dataPath = `artifacts/exchange-manager/users/${uid}`;
      
      // Determine collection based on asset type
      let collectionName = '';
      if (asset.denominations) collectionName = 'cash_assets';
      else if (asset.exchangeName) collectionName = 'exchange_assets';
      else if (asset.coinName && !asset.exchangeName) collectionName = 'binance_assets';
      else if (asset.bankName) {
        const isKorean = koreanAccounts.find(acc => acc.id === asset.id);
        collectionName = isKorean ? 'korean_accounts' : 'vietnamese_accounts';
      }
      
      if (collectionName) {
        const { deleteDoc, doc } = await import('firebase/firestore');
        await deleteDoc(doc(db, `${dataPath}/${collectionName}`, asset.id));
        
        setModalInfo({
          title: '삭제 완료',
          message: '항목이 성공적으로 삭제되었습니다.',
          type: 'success'
        });
      }
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
      const uid = user.uid;
      const dataPath = `artifacts/exchange-manager/users/${uid}`;
      
      // Determine collection name based on form type
      const collectionNames = {
        'cash': 'cash_assets',
        'korean-account': 'korean_accounts',
        'vietnamese-account': 'vietnamese_accounts',
        'exchange': 'exchange_assets',
        'binance': 'binance_assets'
      };
      
      const collectionName = collectionNames[assetFormType];
      
      if (editingAsset) {
        // Update existing asset
        const { updateDoc, doc } = await import('firebase/firestore');
        await updateDoc(doc(db, `${dataPath}/${collectionName}`, (editingAsset as any).id), formData);
      } else {
        // Add new asset
        const { addDoc, collection } = await import('firebase/firestore');
        await addDoc(collection(db, `${dataPath}/${collectionName}`), formData);
      }
      
      setShowAssetForm(false);
      setEditingAsset(null);
      setModalInfo({
        title: editingAsset ? '수정 완료' : '추가 완료',
        message: `${editingAsset ? '수정' : '추가'}이 성공적으로 완료되었습니다.`,
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
                      <span>실시간 환율</span>
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
              <AssetForm
                type={assetFormType}
                editData={editingAsset}
                onSubmit={handleAssetFormSubmit}
                onCancel={() => {
                  setShowAssetForm(false);
                  setEditingAsset(null);
                }}
              />
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
