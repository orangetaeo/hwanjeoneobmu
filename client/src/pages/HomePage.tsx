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
  Building,
  Coins,
  Bitcoin
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { collection, onSnapshot, doc, addDoc, query, orderBy, limit, setDoc, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
// import { useFirebaseAuth } from '@/hooks/useFirebaseAuth'; // 임시 비활성화
// import { useExchangeRates } from '@/hooks/useExchangeRates'; // CORS 문제로 임시 비활성화
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

export default function HomePage() {
  // Firebase 인증 임시 비활성화 - 개발용
  const user = { uid: 'dev-user' };
  const authLoading = false;
  
  // 환율 데이터를 단순화하여 CORS 문제 회피
  const realTimeRates = { 'USD-KRW': 1300, 'VND-KRW': 0.055, 'USDT-KRW': 1300 };
  const cryptoRates = {};
  const isFetchingRates = false;
  
  // Fetch assets from server
  const { data: serverAssets = [], isLoading: assetsLoading } = useQuery({
    queryKey: ['/api/assets'],
    enabled: true,
  });

  const { data: serverTransactions = [], isLoading: transactionsLoading } = useQuery({
    queryKey: ['/api/transactions'],
    enabled: true,
  });

  // Transform server assets to UI format
  const { cashAssets, koreanAccounts, vietnameseAccounts, exchangeAssets, binanceAssets } = useMemo(() => {
    const cash: CashAsset[] = [];
    const korean: BankAccount[] = [];
    const vietnamese: BankAccount[] = [];
    const exchange: ExchangeAsset[] = [];
    const binance: BinanceAsset[] = [];

    (serverAssets as any[]).forEach((asset: any) => {
      switch (asset.type) {
        case 'cash':
          cash.push({
            id: asset.id,
            name: asset.name,
            type: 'cash',
            currency: asset.currency,
            balance: parseFloat(asset.balance),
            denominations: asset.metadata || {}
          });
          break;
        case 'account':
          const accountData = {
            id: asset.id,
            bankName: asset.metadata?.bank || 'Unknown Bank',
            accountNumber: asset.id,
            accountHolder: asset.metadata?.holder || 'Unknown',
            balance: parseFloat(asset.balance)
          };
          if (asset.metadata?.country === '베트남') {
            vietnamese.push(accountData);
          } else {
            korean.push(accountData);
          }
          break;
        case 'exchange':
          if (asset.metadata?.exchange === 'Binance') {
            binance.push({
              id: asset.id,
              coinName: asset.currency,
              quantity: parseFloat(asset.balance),
              currency: asset.currency
            });
          } else {
            exchange.push({
              id: asset.id,
              exchangeName: asset.metadata?.exchange || 'Unknown Exchange',
              coinName: asset.currency,
              quantity: parseFloat(asset.balance),
              currency: asset.currency
            });
          }
          break;
      }
    });

    return { cashAssets: cash, koreanAccounts: korean, vietnameseAccounts: vietnamese, exchangeAssets: exchange, binanceAssets: binance };
  }, [serverAssets]);

  const transactions = useMemo(() => {
    return (serverTransactions as any[]).map((tx: any) => ({
      id: tx.id,
      type: tx.type,
      fromAsset: tx.fromAssetName,
      toAsset: tx.toAssetName,
      fromAssetName: tx.fromAssetName, // 추가된 필드
      toAssetName: tx.toAssetName, // 추가된 필드
      fromAmount: parseFloat(tx.fromAmount),
      toAmount: parseFloat(tx.toAmount),
      rate: parseFloat(tx.rate),
      fees: parseFloat(tx.fees || '0'),
      profit: parseFloat(tx.profit || '0'),
      timestamp: new Date(tx.timestamp),
      memo: tx.memo,
      metadata: tx.metadata
    }));
  }, [serverTransactions]);
  
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

  // Set loading state based on server data loading only
  useEffect(() => {
    setLoading(assetsLoading || transactionsLoading);
  }, [assetsLoading, transactionsLoading]);

  // Navigation menu
  const menuItems = [
    { id: 'dashboard', label: '대시보드', icon: Home },
    { id: 'assets', label: '자산 관리', icon: Wallet },
    { id: 'transactions', label: '거래 내역', icon: List },
    { id: 'rates', label: '환율 관리', icon: TrendingUp }
  ];

  const openModal = (type: string) => {
    switch (type) {
      case 'add-cash':
        setAssetFormType('cash');
        setShowAssetForm(true);
        break;
      case 'add-korean-account':
        setAssetFormType('korean-account');
        setShowAssetForm(true);
        break;
      case 'add-vietnamese-account':
        setAssetFormType('vietnamese-account');
        setShowAssetForm(true);
        break;
      case 'add-exchange':
        setAssetFormType('exchange');
        setShowAssetForm(true);
        break;
      case 'add-binance':
        setAssetFormType('binance');
        setShowAssetForm(true);
        break;
      case 'add-transaction':
        setShowAdvancedTransactionForm(true);
        break;
      case 'settings':
        setShowUserSettings(true);
        break;
    }
  };

  const closeModal = () => {
    setModalInfo(null);
    setShowAssetForm(false);
    setShowAdvancedTransactionForm(false);
    setShowUserSettings(false);
    setEditingAsset(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">환전상 관리 시스템</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                onClick={() => openModal('add-transaction')}
                className="text-blue-600 border-blue-600 hover:bg-blue-50"
              >
                <Plus className="mr-2 h-4 w-4" />
                새 거래
              </Button>
              <Button
                variant="ghost"
                onClick={() => openModal('settings')}
                className="text-gray-600 hover:text-gray-900"
              >
                <Settings className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentView(item.id)}
                  className={`flex items-center px-3 py-4 text-sm font-medium border-b-2 transition-colors ${
                    currentView === item.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="mr-2 h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentView === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* 총 자산 요약 */}
              <Card className="p-6">
                <div className="flex items-center">
                  <Wallet className="h-8 w-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">한국 계좌</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {koreanAccounts.reduce((sum, acc) => sum + acc.balance, 0).toLocaleString()}원
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center">
                  <Building className="h-8 w-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">베트남 계좌</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {vietnameseAccounts.reduce((sum, acc) => sum + acc.balance, 0).toLocaleString()}₫
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center">
                  <Coins className="h-8 w-8 text-yellow-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">거래소 자산</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {exchangeAssets.reduce((sum, asset) => sum + asset.quantity, 0).toFixed(2)} USDT
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center">
                  <Bitcoin className="h-8 w-8 text-orange-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">바이낸스</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {binanceAssets.reduce((sum, asset) => sum + asset.quantity, 0).toFixed(2)} USDT
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            {/* 자산 상세 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">현금 자산</h3>
                <div className="space-y-3">
                  {cashAssets.map((asset) => (
                    <div key={asset.id} className="flex justify-between items-center">
                      <span className="text-gray-700">{asset.name}</span>
                      <span className="font-medium">{asset.balance.toLocaleString()} {asset.currency}</span>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">최근 거래</h3>
                <div className="space-y-3">
                  {transactions.slice(0, 5).map((tx) => (
                    <div key={tx.id} className="flex justify-between items-center text-sm">
                      <span className="text-gray-700">{tx.type}</span>
                      <span className="font-medium">{tx.fromAmount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        )}
        
        {currentView === 'assets' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">자산 관리</h2>
            <p className="text-gray-600">현재 보유 자산 현황을 확인하세요.</p>
          </div>
        )}
        
        {currentView === 'transactions' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">거래 내역</h2>
            <div className="space-y-3">
              {transactions.map((tx) => (
                <Card key={tx.id} className="p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-medium">{tx.type}</span>
                      <p className="text-sm text-gray-600">{tx.fromAsset} → {tx.toAsset}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{tx.fromAmount.toLocaleString()}</p>
                      <p className="text-sm text-gray-600">{new Date(tx.timestamp).toLocaleDateString()}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
        
        {currentView === 'rates' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">환율 관리</h2>
            <p className="text-gray-600">실시간 환율 정보를 확인하세요.</p>
          </div>
        )}
      </main>

      {/* Modals */}
      {showAdvancedTransactionForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-screen overflow-y-auto m-4">
            <AdvancedTransactionForm 
              allAssets={[...cashAssets, ...koreanAccounts, ...vietnameseAccounts, ...exchangeAssets, ...binanceAssets]}
              onCancel={closeModal}
              onTransactionSuccess={closeModal}
            />
          </div>
        </div>
      )}

      {showUserSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto m-4">
            <UserSettingsForm />
          </div>
        </div>
      )}
    </div>
  );
}