export interface CashAsset {
  id: string;
  name: string;
  type: 'cash';
  currency: string;
  balance: number;
  denominations: Record<string, number>;
}

export interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  balance: number;
}

export interface ExchangeAsset {
  id: string;
  exchangeName: string;
  coinName: string;
  quantity: number;
  currency: string;
}

export interface BinanceAsset {
  id: string;
  coinName: string;
  quantity: number;
  currency: string;
}

export interface Transaction {
  id: string;
  type: 'bank_to_exchange' | 'exchange_purchase' | 'exchange_transfer' | 'p2p_trade' | 'exchange' | 'transfer';
  fromAssetType?: 'bank' | 'exchange' | 'binance' | 'cash';
  fromAssetId?: string;
  fromAssetName: string;
  toAssetType?: 'bank' | 'exchange' | 'binance' | 'cash';
  toAssetId?: string;
  toAssetName: string;
  fromAmount: number;
  toAmount: number;
  rate: number;
  fees?: number;
  profit: number;
  marketPrice?: number; // 시장 가격
  customPrice?: number; // 사용자 입력 가격
  memo?: string;
  metadata?: Record<string, any>; // 추가 정보
  timestamp: any;
}

export interface Asset {
  id: string;
  type: 'cash' | 'account' | 'crypto';
  assetId: string;
  displayName: string;
  currency?: string;
  name?: string;
  balance?: number;
  quantity?: number;
  denominations?: Record<string, number>;
  bankName?: string;
  accountNumber?: string;
  accountHolder?: string;
  exchangeName?: string;
  coinName?: string;
}

export interface ModalInfo {
  title: string;
  message?: string;
  type?: 'info' | 'success' | 'error' | 'confirm' | 'delete';
  onConfirm?: (memo?: string) => void;
  confirmDisabled?: boolean;
  children?: React.ReactNode;
  asset?: any;
}

export const CURRENCY_SYMBOLS = {
  KRW: '₩',
  USD: '$',
  VND: '₫',
  USDT: '₮'
};
