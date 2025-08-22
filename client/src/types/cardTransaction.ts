// 카드 기반 복합 거래 타입 정의

export interface TransactionInput {
  id: string;
  type: 'cash' | 'account';
  currency: 'KRW' | 'VND' | 'USD';
  amount: number;
  // 현금의 경우 권종별 분배
  denominations?: Record<string, number>;
  // 계좌의 경우 계좌 정보
  accountId?: string;
  accountName?: string;
}

export interface TransactionOutput {
  id: string;
  type: 'cash' | 'account';
  currency: 'KRW' | 'VND' | 'USD';
  amount: number;
  percentage: number;
  // 현금의 경우 권종별 분배
  denominations?: Record<string, number>;
  // 계좌의 경우 계좌 정보
  accountId?: string;
  accountName?: string;
  // 보상카드 정보
  isCompensation?: boolean;
  originalCurrency?: string;
  originalAmount?: string;
  originalCardId?: string;
  compensationReason?: string;
}

export interface ComplexTransaction {
  id: string;
  inputs: TransactionInput[];
  outputs: TransactionOutput[];
  customerName: string;
  customerPhone?: string;
  memo?: string;
  totalInputAmount: number;
  totalOutputAmount: number;
  exchangeRates: Record<string, number>;
  status: 'draft' | 'confirmed' | 'completed';
  createdAt: Date;
}

export interface CardFormData {
  inputs: TransactionInput[];
  outputs: TransactionOutput[];
  customerName: string;
  customerPhone: string;
  memo: string;
}

// 입금/출금 카드의 UI 상태
export interface CardState {
  isEditing: boolean;
  isCollapsed: boolean;
  showDenominations: boolean;
}

// 환율 계산 관련
export interface ExchangeCalculation {
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  amount: number;
  result: number;
}