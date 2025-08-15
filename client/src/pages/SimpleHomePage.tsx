import { useState, useEffect } from 'react';
import { 
  Home, 
  TrendingUp, 
  Settings, 
  DollarSign, 
  Wallet,
  List,
  ChartLine
} from 'lucide-react';
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

export default function SimpleHomePage() {
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

  // Load data from API
  useEffect(() => {
    const loadData = async () => {
      try {
        // Fetch assets from API
        const assetsResponse = await fetch('/api/assets');
        if (assetsResponse.ok) {
          const assets = await assetsResponse.json();
          
          // Group assets by type
          const cashAssetsData = assets.filter((asset: any) => asset.type === 'cash');
          const accountsData = assets.filter((asset: any) => asset.type === 'account');
          const exchangeAssetsData = assets.filter((asset: any) => asset.type === 'exchange');
          const binanceAssetsData = assets.filter((asset: any) => asset.type === 'binance');
          
          // Convert to expected format
          setCashAssets(cashAssetsData.map((asset: any) => ({
            id: asset.id,
            name: asset.name,
            type: 'cash',
            currency: asset.currency,
            balance: parseFloat(asset.balance),
            denominations: asset.metadata?.denomination || {}
          })));
          
          setKoreanAccounts(accountsData.map((asset: any) => ({
            id: asset.id,
            name: asset.name,
            bankName: asset.metadata?.bank || '',
            accountNumber: asset.metadata?.accountNumber || '',
            accountHolder: asset.metadata?.accountHolder || '',
            balance: parseFloat(asset.balance)
          })));
          
          setExchangeAssets(exchangeAssetsData.map((asset: any) => ({
            id: asset.id,
            name: asset.name,
            exchangeName: asset.metadata?.exchange || '',
            coinName: asset.currency,
            quantity: parseFloat(asset.balance),
            currency: asset.currency
          })));
          
          setBinanceAssets(binanceAssetsData.map((asset: any) => ({
            id: asset.id,
            name: asset.name,
            coinName: asset.currency,
            quantity: parseFloat(asset.balance),
            currency: asset.currency
          })));
        } else {
          console.error('Failed to fetch assets');
        }
        
        // Fetch transactions from API
        const transactionsResponse = await fetch('/api/transactions');
        if (transactionsResponse.ok) {
          const transactionsData = await transactionsResponse.json();
          setTransactions(transactionsData);
        } else {
          console.error('Failed to fetch transactions');
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error loading data from API:', error);
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Helper functions to get all assets in unified format
  const getAllAssets = (): Asset[] => {
    const allAssets: Asset[] = [];
    
    // Add cash assets
    cashAssets.forEach(asset => {
      allAssets.push({
        id: asset.id,
        assetId: asset.id,
        name: asset.name,
        displayName: asset.name,
        type: 'cash',
        currency: asset.currency,
        balance: asset.balance,
        metadata: { denominations: asset.denominations }
      });
    });
    
    // Add Korean bank accounts
    koreanAccounts.forEach(account => {
      allAssets.push({
        id: account.id,
        assetId: account.id,
        name: account.name || `${account.bankName} (${account.accountHolder})`,
        displayName: account.name || `${account.bankName} (${account.accountHolder})`,
        type: 'account',
        currency: 'KRW',
        balance: account.balance,
        metadata: {
          bank: account.bankName,
          accountNumber: account.accountNumber,
          accountHolder: account.accountHolder
        }
      });
    });
    
    // Add exchange assets
    exchangeAssets.forEach(asset => {
      allAssets.push({
        id: asset.id,
        assetId: asset.id,
        name: `${asset.exchangeName} ${asset.coinName}`,
        displayName: `${asset.exchangeName} ${asset.coinName}`,
        type: 'exchange',
        currency: asset.currency,
        balance: asset.quantity,
        metadata: { exchange: asset.exchangeName }
      });
    });
    
    // Add Binance assets
    binanceAssets.forEach(asset => {
      allAssets.push({
        id: asset.id,
        assetId: asset.id,
        name: `Binance ${asset.coinName}`,
        displayName: `Binance ${asset.coinName}`,
        type: 'binance',
        currency: asset.currency,
        balance: asset.quantity,
        metadata: { exchange: 'Binance' }
      });
    });
    
    return allAssets;
  };

  const refreshData = () => {
    setLoading(true);
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">환전 관리 시스템</h1>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowUserSettings(true)}
                className="flex items-center gap-2"
              >
                <Settings size={16} />
                설정
              </Button>
              <Button
                onClick={() => setShowAdvancedTransactionForm(true)}
                className="flex items-center gap-2"
              >
                <DollarSign size={16} />
                고급 거래
              </Button>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="flex border-b">
            <button
              onClick={() => setCurrentView('dashboard')}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                currentView === 'dashboard'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Home size={16} />
              대시보드
            </button>
            <button
              onClick={() => setCurrentView('assets')}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                currentView === 'assets'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Wallet size={16} />
              자산 관리
            </button>
            <button
              onClick={() => setCurrentView('rates')}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                currentView === 'rates'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <TrendingUp size={16} />
              환율 관리
            </button>
            <button
              onClick={() => setCurrentView('history')}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                currentView === 'history'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <List size={16} />
              거래 내역
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {currentView === 'dashboard' && (
            <Dashboard
              cashAssets={cashAssets}
              koreanAccounts={koreanAccounts}
              vietnameseAccounts={vietnameseAccounts}
              exchangeAssets={exchangeAssets}
              binanceAssets={binanceAssets}
              transactions={transactions}
            />
          )}

          {currentView === 'assets' && (
            <AssetManager
              cashAssets={cashAssets}
              koreanAccounts={koreanAccounts}
              vietnameseAccounts={vietnameseAccounts}
              exchangeAssets={exchangeAssets}
              binanceAssets={binanceAssets}
              onRefresh={refreshData}
            />
          )}

          {currentView === 'rates' && (
            <RateManager />
          )}

          {currentView === 'history' && (
            <TransactionHistory 
              transactions={transactions}
              allAssets={getAllAssets()}
            />
          )}
        </div>

        {/* Modals */}
        {showAdvancedTransactionForm && (
          <Modal onClose={() => setShowAdvancedTransactionForm(false)}>
            <AdvancedTransactionForm
              allAssets={getAllAssets()}
              onCancel={() => setShowAdvancedTransactionForm(false)}
              onSuccess={() => {
                setShowAdvancedTransactionForm(false);
                refreshData();
              }}
            />
          </Modal>
        )}

        {showUserSettings && (
          <Modal onClose={() => setShowUserSettings(false)}>
            <UserSettingsForm
              onCancel={() => setShowUserSettings(false)}
              onSuccess={() => setShowUserSettings(false)}
            />
          </Modal>
        )}
      </div>
    </div>
  );
}