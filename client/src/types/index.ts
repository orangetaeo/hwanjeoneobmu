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
  fromAssetName: string;
  toAssetName: string;
  fromAmount: number;
  toAmount: number;
  rate: number;
  profit: number;
  timestamp: any;
  type: string;
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
