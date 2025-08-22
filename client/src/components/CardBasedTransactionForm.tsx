import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Plus, Calculator, User, Trash2, Wallet, Banknote, CheckCircle, 
  ArrowRight, AlertCircle, TrendingUp, ArrowRightLeft, AlertTriangle,
  RefreshCw, ArrowUpRight, ArrowDownLeft, Minus, Eye, EyeOff, Activity
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { 
  formatInputWithCommas, 
  parseCommaFormattedNumber, 
  formatCurrency,
  formatTransactionAmount,
  determineTransactionRateType,
  getExchangeRatePair,
  getExchangeShopRate,
  calculateWeightedExchangeRate
} from '@/utils/helpers';
import { addCommas } from '@/lib/utils';

interface CardBasedTransactionFormProps {
  onClose: () => void;
  assets: any[];
}

interface TransactionCard {
  id: number;
  type: 'cash' | 'account';
  currency: string;
  amount: string;
  accountId: string;
  denominations: Record<string, number>;
  transactionType?: string;
  isValid?: boolean;
  errors?: string[];
}

// 자동 거래 유형 결정 함수
const determineTransactionType = (fromType: string, fromCurrency: string, toType: string, toCurrency: string): string => {
  // 현금 → 계좌
  if (fromType === 'cash' && toType === 'account') {
    return toCurrency === 'KRW' ? 'cash_to_krw_account' : 'cash_to_vnd_account';
  }
  // 계좌 → 현금
  if (fromType === 'account' && toType === 'cash') {
    return fromCurrency === 'KRW' ? 'krw_account_to_cash' : 'vnd_account_to_cash';
  }
  // 계좌 → 계좌
  if (fromType === 'account' && toType === 'account') {
    return fromCurrency === 'VND' ? 'vnd_account_to_krw_account' : 'krw_account_to_vnd_account';
  }
  // 기본값: 현금 환전
  return 'cash_exchange';
};

// 확장된 거래 유형 (계좌→현금 패턴 추가)
const TRANSACTION_TYPES = [
  { value: "cash_exchange", label: "현금 환전", icon: ArrowRightLeft },
  { value: "cash_to_krw_account", label: "현금 → KRW 계좌이체", icon: Banknote },
  { value: "cash_to_vnd_account", label: "현금 → VND 계좌이체", icon: ArrowUpRight },
  { value: "krw_account_to_cash", label: "KRW 계좌 → 현금 출금", icon: ArrowDownLeft },
  { value: "vnd_account_to_cash", label: "VND 계좌 → 현금 출금", icon: ArrowDownLeft },
  { value: "vnd_account_to_krw_account", label: "VND 계좌 → KRW 계좌이체", icon: TrendingUp },
  { value: "krw_account_to_vnd_account", label: "KRW 계좌 → VND 계좌이체", icon: TrendingUp }
];

// 권종별 설정
const CURRENCY_DENOMINATIONS = {
  USD: [
    { value: "100", label: "100달러" },
    { value: "50", label: "50달러" },
    { value: "20", label: "20달러" },
    { value: "10", label: "10달러" },
    { value: "5", label: "5달러" },
    { value: "2", label: "2달러" },
    { value: "1", label: "1달러" }
  ],
  KRW: [
    { value: "50000", label: "5만원" },
    { value: "10000", label: "1만원" },
    { value: "5000", label: "5천원" },
    { value: "1000", label: "1천원" }
  ],
  VND: [
    { value: "500000", label: "50만동" },
    { value: "200000", label: "20만동" },
    { value: "100000", label: "10만동" },
    { value: "50000", label: "5만동" },
    { value: "20000", label: "2만동" },
    { value: "10000", label: "1만동" },
    { value: "5000", label: "5천동" },
    { value: "1000", label: "1천동" }
  ]
};

export default function CardBasedTransactionForm({ 
  onClose, 
  assets 
}: CardBasedTransactionFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // 환율 데이터 조회
  const { data: exchangeRates = [] } = useQuery<any[]>({
    queryKey: ["/api/exchange-rates"],
  });

  // 기본 폼 상태 (거래 유형은 자동 결정됨)
  const [selectedTransactionType, setSelectedTransactionType] = useState('cash_exchange');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [memo, setMemo] = useState('');
  const [inputCards, setInputCards] = useState<TransactionCard[]>([]);
  const [outputCards, setOutputCards] = useState<TransactionCard[]>([]);
  
  // 고객 계좌 정보 상태
  const [customerAccountInfo, setCustomerAccountInfo] = useState({
    bankName: '',
    accountNumber: '',
    accountHolder: ''
  });
  
  // 자동 포커스를 위한 ref
  const bankNameInputRef = useRef<HTMLInputElement>(null);
  
  // 익명 거래 설정
  const [isAnonymousTransaction, setIsAnonymousTransaction] = useState(true);

  // UI 상태
  const [collapsedCards, setCollapsedCards] = useState<Set<number>>(new Set());
  const [showExchangeRates, setShowExchangeRates] = useState(true);
  const [showSystemSettings, setShowSystemSettings] = useState(false);
  const [showSellRates, setShowSellRates] = useState(false);

  // 자동 환율 계산 활성화 여부
  const [autoCalculation, setAutoCalculation] = useState(true);

  // 실시간 추천 시스템 상태
  const [showRecommendations, setShowRecommendations] = useState(true);

  // 자동 조정 시스템 상태
  const [autoAdjustment, setAutoAdjustment] = useState(true);

  // 단계별 승인 시스템 상태
  const [approvalStep, setApprovalStep] = useState(0); // 0: 입력, 1: 검토, 2: 승인, 3: 실행
  const [approvalRequired, setApprovalRequired] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // 컴포넌트 초기화 시 기본 카드들 추가
  useEffect(() => {
    if (inputCards.length === 0 && outputCards.length === 0) {
      // 기본 입금 카드 추가 (KRW 현금)
      const defaultInputCard: TransactionCard = {
        id: Date.now(),
        type: 'cash',
        currency: 'KRW',
        amount: '',
        accountId: '',
        denominations: {},
        isValid: false,
        errors: []
      };
      
      // 기본 출금 카드 추가 (VND 현금)
      const defaultOutputCard: TransactionCard = {
        id: Date.now() + 1,
        type: 'cash',
        currency: 'VND',
        amount: '',
        accountId: '',
        denominations: {},
        isValid: false,
        errors: []
      };
      
      setInputCards([defaultInputCard]);
      setOutputCards([defaultOutputCard]);
    }
  }, []);

  // 자동 포커스 기능 개선 - 계좌 선택 시에만 실행되도록 최적화
  const [previousOutputCards, setPreviousOutputCards] = useState<TransactionCard[]>([]);
  
  useEffect(() => {
    // 새로 계좌가 선택된 경우에만 포커스
    const newlySelectedAccount = outputCards.find((card, index) => {
      const previousCard = previousOutputCards[index];
      return card.type === 'account' && card.accountId && 
             (!previousCard || previousCard.type !== 'account' || !previousCard.accountId);
    });
    
    if (newlySelectedAccount && bankNameInputRef.current) {
      setTimeout(() => {
        bankNameInputRef.current?.focus();
      }, 100);
    }
    
    setPreviousOutputCards([...outputCards]);
  }, [outputCards, previousOutputCards]);

  // 카드 추가 함수들
  const addInputCard = () => {
    const newCard: TransactionCard = {
      id: Date.now(),
      type: 'cash',
      currency: 'KRW',
      amount: '',
      accountId: '',
      denominations: {},
      isValid: false,
      errors: []
    };
    setInputCards([...inputCards, newCard]);
  };

  const addOutputCard = () => {
    const newCard: TransactionCard = {
      id: Date.now(),
      type: 'cash', 
      currency: 'VND',
      amount: '',
      accountId: '',
      denominations: {},
      isValid: false,
      errors: []
    };
    setOutputCards([...outputCards, newCard]);
  };

  // 카드 제거
  const removeInputCard = (id: number) => {
    setInputCards(inputCards.filter(card => card.id !== id));
  };

  const removeOutputCard = (id: number) => {
    setOutputCards(outputCards.filter(card => card.id !== id));
  };

  // 카드 토글 (접기/펴기)
  const toggleCardCollapse = (id: number) => {
    const newCollapsed = new Set(collapsedCards);
    if (newCollapsed.has(id)) {
      newCollapsed.delete(id);
    } else {
      newCollapsed.add(id);
    }
    setCollapsedCards(newCollapsed);
  };

  // 권종별 환율 조회 함수 (TransactionForm에서 이식)
  const getDenominationRate = (fromCurrency: string, toCurrency: string, denomination: string) => {
    if (!Array.isArray(exchangeRates)) return null;
    
    // USD↔KRW 환전을 위한 직접 환율 조회
    if ((fromCurrency === "USD" && toCurrency === "KRW") || (fromCurrency === "KRW" && toCurrency === "USD")) {
      return exchangeRates.find((rate: any) => 
        rate.fromCurrency === fromCurrency && 
        rate.toCurrency === toCurrency && 
        rate.denomination === denomination &&
        rate.isActive === "true"
      );
    }
    
    // KRW 5천원권과 1천원권의 경우 5/1천원권 매매 시세 사용
    let searchDenomination = denomination;
    if (fromCurrency === "KRW" && (denomination === "5000" || denomination === "1000")) {
      searchDenomination = "5000_1000";
    }
    
    // VND의 경우 모든 권종에 대해 50만동 환율 사용
    if (fromCurrency === "VND") {
      searchDenomination = "500000";
    }
    
    const rate = exchangeRates.find((rate: any) => 
      rate.fromCurrency === fromCurrency && 
      rate.toCurrency === toCurrency && 
      rate.denomination === searchDenomination
    );
    
    return rate;
  };

  // 환율 조회 함수 (환전상 시세 적용)
  const getExchangeRate = (fromCurrency: string, toCurrency: string, denomination?: string): number => {
    if (fromCurrency === toCurrency) return 1;
    
    try {
      // 매수/매도 타입 자동 판별
      const rateType = determineTransactionRateType(selectedTransactionType, fromCurrency, toCurrency);
      
      // 환율 쌍 결정
      const ratePair = getExchangeRatePair(fromCurrency, toCurrency);
      
      // 권종별 환율 우선 조회
      if (denomination) {
        const denomRate = getDenominationRate(ratePair.fromCurrency, ratePair.toCurrency, denomination);
        if (denomRate) {
          // 매수/매도에 따라 적절한 환율 선택
          const rate = rateType === 'buy' 
            ? parseFloat(denomRate.myBuyRate || '0')
            : parseFloat(denomRate.mySellRate || '0');
          
          if (rate > 0) {
            // 환율 방향 조정 (필요한 경우 역환율 계산)
            let finalRate = rate;
            if (ratePair.fromCurrency !== fromCurrency) {
              finalRate = 1 / rate;
            }
            
            console.log(`환전상 시세 적용: ${fromCurrency}→${toCurrency} ${denomination} (${rateType}) = ${finalRate}`);
            return finalRate;
          }
        }
      }
      
      // 일반 환율 조회 (권종별 환율이 없는 경우)
      const rate = exchangeRates.find(rate => 
        rate.fromCurrency === ratePair.fromCurrency && 
        rate.toCurrency === ratePair.toCurrency &&
        (rate.isActive === true || rate.isActive === 'true')
      );
      
      if (rate) {
        // 매수/매도에 따라 적절한 환율 선택
        const rateValue = rateType === 'buy' 
          ? parseFloat(rate.myBuyRate || '0')
          : parseFloat(rate.mySellRate || '0');
        
        if (rateValue > 0) {
          // 환율 방향 조정
          let finalRate = rateValue;
          if (ratePair.fromCurrency !== fromCurrency) {
            finalRate = 1 / rateValue;
          }
          
          console.log(`환전상 일반 시세 적용: ${fromCurrency}→${toCurrency} (${rateType}) = ${finalRate}`);
          return finalRate;
        }
        
        // fallback: goldShopRate 사용
        const goldRate = parseFloat(rate.goldShopRate || '0');
        if (goldRate > 0) {
          let finalRate = goldRate;
          if (ratePair.fromCurrency !== fromCurrency) {
            finalRate = 1 / goldRate;
          }
          console.log(`금은방 시세 fallback 적용: ${fromCurrency}→${toCurrency} = ${finalRate}`);
          return finalRate;
        }
      }
      
      console.warn(`환전상 시세를 찾을 수 없습니다: ${fromCurrency} → ${toCurrency} (${rateType})`);
      return 1;
      
    } catch (error) {
      console.error('환율 조회 중 오류:', error);
      return 1;
    }
  };

  // 권종 가치 계산 함수
  const getDenominationValue = (currency: string, denomination: string): number => {
    if (currency === "KRW") {
      const value = parseInt(denomination.replace(/,/g, ''));
      return isNaN(value) ? 0 : value;
    } else if (currency === "USD") {
      if (denomination === "20_10") return 20; // 20달러
      if (denomination === "5_2_1") return 5; // 5달러
      const value = parseFloat(denomination);
      return isNaN(value) ? 0 : value;
    } else if (currency === "VND") {
      const value = parseInt(denomination.replace(/,/g, ''));
      return isNaN(value) ? 0 : value;
    }
    return 0;
  };

  // VND 권종별 분배 계산 (VND Floor 처리 포함)
  const calculateVNDBreakdown = (totalAmount: number): Record<string, number> => {
    const breakdown: Record<string, number> = {};
    // VND Floor 처리: 1000동 단위로 내림
    let remaining = Math.floor(totalAmount / 1000) * 1000;
    
    const denominations = [500000, 200000, 100000, 50000, 20000, 10000, 5000, 1000];
    
    for (const denom of denominations) {
      if (remaining >= denom) {
        breakdown[denom.toString()] = Math.floor(remaining / denom);
        remaining = remaining % denom;
      }
    }
    
    return breakdown;
  };

  // VND Floor 차액 계산 함수 (일관성 개선)
  const calculateVNDFloorDifference = (originalAmount: number): number => {
    if (originalAmount <= 0) return 0;
    const flooredAmount = Math.floor(originalAmount / 1000) * 1000;
    return Math.max(0, originalAmount - flooredAmount);
  };

  // 실시간 추천 시스템
  const generateRecommendations = (card: TransactionCard): { type: string; message: string; action?: () => void }[] => {
    const recommendations: { type: string; message: string; action?: () => void }[] = [];
    
    if (!card.amount || !card.currency) return recommendations;
    
    const amount = parseCommaFormattedNumber(card.amount);
    if (amount <= 0) return recommendations;
    
    // VND 권종 추천
    if (card.currency === 'VND' && card.type === 'cash') {
      const currentTotal = Object.entries(card.denominations).reduce((sum, [denom, count]) => {
        return sum + (parseInt(denom) * count);
      }, 0);
      
      if (currentTotal !== amount) {
        recommendations.push({
          type: 'optimization',
          message: `권종 자동 분배로 ${amount.toLocaleString()}동을 최적화할 수 있습니다`,
          action: () => {
            const newDenoms = calculateVNDBreakdown(amount);
            updateOutputCard(card.id, 'denominations', newDenoms);
          }
        });
      }
      
      // 고액권 우선 추천
      const has500k = card.denominations['500000'] || 0;
      const maxPossible500k = Math.floor(amount / 500000);
      if (has500k < maxPossible500k) {
        recommendations.push({
          type: 'efficiency',
          message: `50만동권을 ${maxPossible500k - has500k}장 더 사용하면 효율적입니다`,
          action: () => {
            const newDenoms = { ...card.denominations };
            newDenoms['500000'] = maxPossible500k;
            // 나머지 금액 재계산
            const remaining = amount - (maxPossible500k * 500000);
            const otherDenoms = calculateVNDBreakdown(remaining);
            Object.keys(otherDenoms).forEach(denom => {
              if (denom !== '500000') {
                newDenoms[denom] = otherDenoms[denom];
              }
            });
            updateOutputCard(card.id, 'denominations', newDenoms);
          }
        });
      }
    }
    
    // USD 권종 추천
    if (card.currency === 'USD' && card.type === 'cash') {
      const has100 = card.denominations['100'] || 0;
      const maxPossible100 = Math.floor(amount / 100);
      if (has100 < maxPossible100) {
        recommendations.push({
          type: 'efficiency',
          message: `100달러권을 ${maxPossible100 - has100}장 더 사용하면 효율적입니다`,
          action: () => {
            const newDenoms = calculateUSDBreakdown(amount);
            updateOutputCard(card.id, 'denominations', newDenoms);
          }
        });
      }
    }
    
    // 재고 부족 경고
    const validation = validateInventory(card);
    if (!validation.isValid) {
      recommendations.push({
        type: 'warning',
        message: '보유량이 부족합니다. 권종을 조정해주세요',
        action: () => {
          // 보유량에 맞춰 자동 조정
          adjustToAvailableInventory(card);
        }
      });
    }
    
    return recommendations;
  };

  // 보유량에 맞춰 자동 조정하는 함수
  const adjustToAvailableInventory = (card: TransactionCard) => {
    if (card.type !== 'cash' || !card.currency) return;
    
    const cashAsset = assets.find(asset => 
      asset.name === `${card.currency} 현금` && 
      asset.currency === card.currency && 
      asset.type === 'cash'
    );
    
    if (!cashAsset || !cashAsset.metadata?.denominations) return;
    
    const availableDenoms = cashAsset.metadata.denominations;
    const targetAmount = parseCommaFormattedNumber(card.amount);
    if (targetAmount <= 0) return;
    
    // 보유량 내에서 최대한 맞춰서 분배
    const adjustedDenoms: Record<string, number> = {};
    let remaining = targetAmount;
    
    const denominations = card.currency === 'VND' ? 
      [500000, 200000, 100000, 50000, 20000, 10000, 5000, 1000] :
      card.currency === 'USD' ?
      [100, 50, 20, 10, 5, 2, 1] :
      [50000, 10000, 5000, 1000];
    
    for (const denom of denominations) {
      const denomKey = card.currency === 'KRW' ? 
        denom.toLocaleString() : denom.toString();
      const availableCount = availableDenoms[denomKey] || 0;
      const neededCount = Math.floor(remaining / denom);
      const useCount = Math.min(neededCount, availableCount);
      
      if (useCount > 0) {
        adjustedDenoms[denom.toString()] = useCount;
        remaining -= useCount * denom;
      }
    }
    
    // 부족한 수량이 있으면 권종 분배를 하지 않고 경고만 표시
    if (remaining > 0) {
      toast({
        title: "권종 부족",
        description: `${remaining.toLocaleString()} ${card.currency}가 부족합니다. 거래를 진행할 수 없습니다.`,
        variant: "destructive",
      });
      // 권종 분배를 업데이트하지 않음
      return;
    }
    
    // 완전히 조정 가능한 경우에만 업데이트
    updateOutputCard(card.id, 'denominations', adjustedDenoms);
    toast({
      title: "자동 조정 완료",
      description: "보유량에 맞춰 권종을 조정했습니다.",
    });
  };

  // 자동 조정 시스템 - 목표 초과 시 재분배
  const handleAutoAdjustment = (card: TransactionCard) => {
    if (!autoAdjustment || card.type !== 'cash') return;
    
    const targetAmount = parseCommaFormattedNumber(card.amount);
    const currentTotal = Object.entries(card.denominations).reduce((sum, [denom, count]) => {
      return sum + (parseInt(denom) * count);
    }, 0);
    
    if (currentTotal > targetAmount) {
      // 초과한 경우 자동으로 재분배
      let newDenoms: Record<string, number> = {};
      
      if (card.currency === 'VND') {
        newDenoms = calculateVNDBreakdown(targetAmount);
      } else if (card.currency === 'KRW') {
        newDenoms = calculateKRWBreakdown(targetAmount);
      } else if (card.currency === 'USD') {
        newDenoms = calculateUSDBreakdown(targetAmount);
      }
      
      updateOutputCard(card.id, 'denominations', newDenoms);
      
      toast({
        title: "자동 조정됨",
        description: `목표 금액 초과로 권종을 자동 재분배했습니다.`,
      });
    }
  };

  // 고액 거래 판정 함수
  const isHighValueTransaction = (): boolean => {
    const totalValue = totalInputAmount + totalOutputAmount;
    const thresholds = {
      VND: 50000000, // 5천만동
      KRW: 5000000,  // 500만원
      USD: 5000      // 5천달러
    };
    
    // 주요 통화별 임계값 확인
    const mainCurrency = inputCards[0]?.currency || 'VND';
    const threshold = thresholds[mainCurrency as keyof typeof thresholds] || thresholds.VND;
    
    return totalValue >= threshold;
  };

  // 거래 위험도 평가
  const assessTransactionRisk = (): { level: 'low' | 'medium' | 'high'; reasons: string[] } => {
    const reasons: string[] = [];
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    
    // 고액 거래 확인
    if (isHighValueTransaction()) {
      reasons.push('고액 거래입니다');
      riskLevel = 'medium';
    }
    
    // 복잡한 거래 확인
    if (inputCards.length > 2 || outputCards.length > 2) {
      reasons.push('복잡한 거래 구조입니다');
      riskLevel = riskLevel === 'low' ? 'medium' : 'high';
    }
    
    // 보유량 부족 확인
    const hasInventoryIssues = [...inputCards, ...outputCards].some(card => {
      const validation = validateInventory(card);
      return !validation.isValid;
    });
    
    if (hasInventoryIssues) {
      reasons.push('보유량 부족 위험이 있습니다');
      riskLevel = 'high';
    }
    
    // 환율 변동성 확인 (예시)
    const hasVolatileCurrency = [...inputCards, ...outputCards].some(card => 
      card.currency === 'USD' || card.currency === 'BTC'
    );
    
    if (hasVolatileCurrency && totalInputAmount > 1000000) {
      reasons.push('변동성이 큰 통화를 포함합니다');
      riskLevel = riskLevel === 'low' ? 'medium' : 'high';
    }
    
    return { level: riskLevel, reasons };
  };

  // 단계별 승인 프로세스
  const handleStepByStepProcess = () => {
    const risk = assessTransactionRisk();
    
    if (risk.level === 'high' || isHighValueTransaction()) {
      setApprovalRequired(true);
      setApprovalStep(1); // 검토 단계로 이동
      
      toast({
        title: "단계별 승인 필요",
        description: `위험도: ${risk.level.toUpperCase()}. 검토가 필요합니다.`,
        variant: "destructive",
      });
    } else {
      // 낮은 위험도는 바로 실행
      handleSubmit();
    }
  };

  // 거래 미리보기 생성
  const generateTransactionPreview = () => {
    const transactions = decomposeComplexTransaction();
    const risk = assessTransactionRisk();
    
    return {
      transactions,
      risk,
      summary: {
        totalInputAmount,
        totalOutputAmount,
        cardCount: inputCards.length + outputCards.length,
        currencies: Array.from(new Set([...inputCards, ...outputCards].map(card => card.currency))),
        estimatedTime: `${transactions.length * 2}분`,
        fees: calculateEstimatedFees(transactions)
      }
    };
  };

  // 상세 수수료 계산 함수
  const calculateDetailedFees = (transactions: any[]) => {
    const feeBreakdown = {
      exchangeFees: 0,
      transferFees: 0,
      vndFloorProfit: 0,
      processingFees: 0,
      total: 0
    };
    
    const transactionFees: any[] = [];
    
    transactions.forEach((transaction, index) => {
      const amount = transaction.fromAmount || 0;
      let transactionFee = {
        index: index + 1,
        type: transaction.type,
        amount: amount,
        currency: transaction.fromCurrency,
        fees: {
          exchange: 0,
          transfer: 0,
          vndFloor: 0,
          processing: 0,
          total: 0
        }
      };
      
      // 거래 유형별 수수료 계산
      if (transaction.type === 'cash_exchange') {
        // 환전 수수료: 0.5%
        transactionFee.fees.exchange = amount * 0.005;
        feeBreakdown.exchangeFees += transactionFee.fees.exchange;
      } else if (transaction.type.includes('account')) {
        // 계좌이체 수수료: 고정 1000원 또는 1%
        transactionFee.fees.transfer = Math.max(1000, amount * 0.01);
        feeBreakdown.transferFees += transactionFee.fees.transfer;
      }
      
      // VND Floor 수익 추가
      if (transaction.toCurrency === 'VND') {
        const floorProfit = calculateVNDFloorDifference(transaction.toAmount);
        transactionFee.fees.vndFloor = floorProfit;
        feeBreakdown.vndFloorProfit += floorProfit;
      }
      
      // 고액 거래 처리 수수료
      if (amount > 1000000) {
        transactionFee.fees.processing = 2000;
        feeBreakdown.processingFees += 2000;
      } else if (amount > 500000) {
        transactionFee.fees.processing = 1000;
        feeBreakdown.processingFees += 1000;
      }
      
      transactionFee.fees.total = 
        transactionFee.fees.exchange + 
        transactionFee.fees.transfer + 
        transactionFee.fees.vndFloor + 
        transactionFee.fees.processing;
        
      transactionFees.push(transactionFee);
    });
    
    feeBreakdown.total = 
      feeBreakdown.exchangeFees + 
      feeBreakdown.transferFees + 
      feeBreakdown.vndFloorProfit + 
      feeBreakdown.processingFees;
    
    return { breakdown: feeBreakdown, transactions: transactionFees };
  };

  // 수수료 계산 함수 (기존 호환성)
  const calculateEstimatedFees = (transactions: any[]): number => {
    const fees = calculateDetailedFees(transactions);
    return Math.floor(fees.breakdown.total);
  };

  // 일일 정산 계산
  const calculateDailySettlement = () => {
    const today = new Date();
    const todayTransactions = ([] as any[]).filter((tx: any) => {
      const txDate = new Date(tx.createdAt);
      return txDate.toDateString() === today.toDateString();
    });
    
    let totalRevenue = 0;
    let totalVolume = 0;
    const currencyBreakdown: Record<string, { volume: number; revenue: number }> = {};
    
    todayTransactions.forEach((tx: any) => {
      const amount = tx.amount || 0;
      totalVolume += amount;
      
      // 거래별 수익 계산 (실제 저장된 수익 사용)
      if (tx.profit) {
        totalRevenue += tx.profit;
      }
      
      // 통화별 분석
      const currency = tx.fromCurrency || 'KRW';
      if (!currencyBreakdown[currency]) {
        currencyBreakdown[currency] = { volume: 0, revenue: 0 };
      }
      currencyBreakdown[currency].volume += amount;
      currencyBreakdown[currency].revenue += tx.profit || 0;
    });
    
    return {
      date: today.toLocaleDateString('ko-KR'),
      transactionCount: todayTransactions.length,
      totalVolume,
      totalRevenue,
      averageTransactionSize: todayTransactions.length > 0 ? totalVolume / todayTransactions.length : 0,
      currencyBreakdown,
      profitMargin: totalVolume > 0 ? (totalRevenue / totalVolume) * 100 : 0
    };
  };

  // 실시간 잔고 추적 계산
  const calculateBalanceTracking = () => {
    const balanceChanges: Record<string, { 
      current: number; 
      projected: number; 
      change: number; 
      assetName?: string; 
      changeType: 'increase' | 'decrease' 
    }> = {};
    
    // 현재 잔고 계산 - 모든 자산 유형 지원
    assets.forEach(asset => {
      if (asset.type === 'cash' || asset.type === 'bank_account' || asset.type === 'exchange_account') {
        const assetType = asset.type === 'cash' ? 'cash' : 'account';
        const key = `${asset.currency}_${assetType}`;
        
        if (!balanceChanges[key]) {
          balanceChanges[key] = {
            current: asset.balance,
            projected: asset.balance,
            change: 0,
            assetName: asset.name,
            changeType: 'increase'
          };
        } else {
          balanceChanges[key].current += asset.balance;
          balanceChanges[key].projected += asset.balance;
        }
      }
    });
    
    // 예상 잔고 변화 계산 - 입금 카드 (고객이 입금하는 것, 사업자 잔고 증가)
    inputCards.forEach(card => {
      const assetType = card.type === 'cash' ? 'cash' : 'account';
      const key = `${card.currency}_${assetType}`;
      const amount = parseCommaFormattedNumber(card.amount);
      
      if (balanceChanges[key] && amount > 0) {
        balanceChanges[key].projected += amount;
        balanceChanges[key].change += amount;
        balanceChanges[key].changeType = 'increase';
      }
    });
    
    // 예상 잔고 변화 계산 - 출금 카드 (고객이 출금하는 것, 사업자 잔고 감소)
    outputCards.forEach(card => {
      const assetType = card.type === 'cash' ? 'cash' : 'account';
      const key = `${card.currency}_${assetType}`;
      const amount = parseCommaFormattedNumber(card.amount);
      
      if (balanceChanges[key] && amount > 0) {
        balanceChanges[key].projected -= amount;
        balanceChanges[key].change -= amount;
        balanceChanges[key].changeType = 'decrease';
      }
    });
    
    return balanceChanges;
  };

  // 카드 연결 시각화를 위한 연결선 계산
  const calculateCardConnections = () => {
    const connections = [];
    
    for (let i = 0; i < inputCards.length; i++) {
      for (let j = 0; j < outputCards.length; j++) {
        const inputCard = inputCards[i];
        const outputCard = outputCards[j];
        
        // 환전 관계가 있는 카드들만 연결
        if (inputCard.currency !== outputCard.currency) {
          const rate = getExchangeRate(inputCard.currency, outputCard.currency);
          const inputAmount = parseCommaFormattedNumber(inputCard.amount);
          const outputAmount = parseCommaFormattedNumber(outputCard.amount);
          
          connections.push({
            from: i,
            to: j,
            fromCard: inputCard,
            toCard: outputCard,
            rate,
            inputAmount,
            outputAmount,
            relationship: rate > 0 ? 'exchange' : 'transfer'
          });
        }
      }
    }
    
    return connections;
  };

  // 카드 연결 시각화 컴포넌트
  const renderCardConnections = () => {
    if (inputCards.length === 0 || outputCards.length === 0) return null;
    
    const connections = calculateCardConnections();
    
    return (
      <div className="relative my-6">
        {/* 연결선 SVG */}
        <svg 
          className="absolute inset-0 w-full h-20 pointer-events-none z-10"
          style={{ top: '-10px' }}
        >
          {connections.map((connection, index) => {
            const fromX = (connection.from + 0.5) * (100 / Math.max(inputCards.length, 1));
            const toX = (connection.to + 0.5) * (100 / Math.max(outputCards.length, 1));
            
            return (
              <g key={index}>
                {/* 곡선 연결선 */}
                <path
                  d={`M ${fromX}% 10 Q 50% 50 ${toX}% 70`}
                  stroke={connection.relationship === 'exchange' ? '#3b82f6' : '#10b981'}
                  strokeWidth="2"
                  fill="none"
                  strokeDasharray={connection.relationship === 'transfer' ? '5,5' : '0'}
                  className="drop-shadow-sm"
                />
                
                {/* 화살표 */}
                <polygon
                  points={`${toX - 1}%,66 ${toX + 1}%,66 ${toX}%,74`}
                  fill={connection.relationship === 'exchange' ? '#3b82f6' : '#10b981'}
                />
                
                {/* 환율 라벨 */}
                <text
                  x="50%"
                  y="35"
                  textAnchor="middle"
                  className="text-xs font-medium fill-gray-600"
                  style={{ fontSize: '10px' }}
                >
                  {connection.rate.toFixed(2)}
                </text>
              </g>
            );
          })}
        </svg>
        
        {/* 연결 정보 표시 */}
        <div className="relative z-20 pt-3 bg-gradient-to-r from-blue-50 to-green-50 p-3 rounded-lg border">
          <div className="text-center">
            <div className="text-sm font-medium text-gray-700 mb-2">💫 카드 연결 흐름</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
              {connections.map((conn, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                  <span className="text-blue-600">
                    {conn.fromCard.currency} → {conn.toCard.currency}
                  </span>
                  <span className="font-medium">
                    {formatCurrency(conn.inputAmount, conn.fromCard.currency)} {conn.fromCard.currency} → {formatCurrency(conn.outputAmount, conn.toCard.currency)} {conn.toCard.currency}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 승인 단계 진행
  const proceedToNextStep = () => {
    if (approvalStep < 3) {
      setApprovalStep(approvalStep + 1);
      
      if (approvalStep === 2) {
        // 최종 승인 후 실행
        handleSubmit();
      }
    }
  };

  // 승인 취소
  const cancelApproval = () => {
    setApprovalStep(0);
    setApprovalRequired(false);
    setShowPreview(false);
    
    toast({
      title: "승인 취소됨",
      description: "거래가 취소되었습니다. 다시 검토해주세요.",
    });
  };

  // KRW 권종별 분배 계산
  const calculateKRWBreakdown = (totalAmount: number): Record<string, number> => {
    const breakdown: Record<string, number> = {};
    let remaining = Math.floor(totalAmount);
    
    const denominations = [50000, 10000, 5000, 1000];
    
    for (const denom of denominations) {
      if (remaining >= denom) {
        breakdown[denom.toString()] = Math.floor(remaining / denom);
        remaining = remaining % denom;
      }
    }
    
    return breakdown;
  };

  // USD 권종별 분배 계산
  const calculateUSDBreakdown = (totalAmount: number): Record<string, number> => {
    const breakdown: Record<string, number> = {};
    let remaining = Math.floor(totalAmount);
    
    const denominations = [100, 50, 20, 10, 5, 2, 1];
    
    for (const denom of denominations) {
      if (remaining >= denom) {
        breakdown[denom.toString()] = Math.floor(remaining / denom);
        remaining = remaining % denom;
      }
    }
    
    return breakdown;
  };

  // 자동 환율 계산 함수 (입금 카드 권종별 계산 지원)
  const calculateAutomaticAmount = (inputCard: TransactionCard, outputCard: TransactionCard) => {
    
    if (!autoCalculation || inputCard.currency === outputCard.currency) {
      return '';
    }

    let inputAmount = 0;
    
    // 입금 카드가 현금이고 권종별 수량이 있는 경우
    if (inputCard.type === 'cash' && inputCard.denominations) {
      Object.entries(inputCard.denominations).forEach(([denom, count]) => {
        const denomValue = getDenominationValue(inputCard.currency, denom);
        inputAmount += denomValue * count;
      });
    } else {
      // 계좌 타입이거나 권종별 수량이 없는 경우
      inputAmount = parseCommaFormattedNumber(inputCard.amount) || 0;
    }
    
    if (inputAmount <= 0) return '';

    const rate = getExchangeRate(inputCard.currency, outputCard.currency);
    if (!rate || rate <= 0) return '';
    
    const calculatedAmount = inputAmount * rate;
    
    // 통화별 정확한 처리
    if (outputCard.currency === 'VND') {
      // VND는 1000동 단위로 내림 처리
      return (Math.floor(calculatedAmount / 1000) * 1000).toString();
    } else if (outputCard.currency === 'KRW') {
      // KRW는 정수 처리
      return Math.floor(calculatedAmount).toString();
    } else if (outputCard.currency === 'USD') {
      // USD는 소수점 2자리까지
      return calculatedAmount.toFixed(2);
    }
    
    return Math.floor(calculatedAmount).toString();
  };

  // 카드 업데이트 함수들 (입금 카드 권종별 계산 지원)
  const updateInputCard = (id: number, field: string, value: any) => {
    setInputCards(prev => prev.map(card => {
      if (card.id === id) {
        const updatedCard = { ...card, [field]: value };
        
        // 현금 카드에서 권종별 수량 변경 시 총액 자동 계산
        if (field === 'denominations' && updatedCard.type === 'cash') {
          let totalAmount = 0;
          Object.entries(updatedCard.denominations || {}).forEach(([denom, count]) => {
            const denomValue = getDenominationValue(updatedCard.currency, denom);
            totalAmount += denomValue * count;
          });
          // 권종별 계산 결과를 천단위 콤마 포맷팅 적용
          updatedCard.amount = addCommas(totalAmount.toString());
        }
        
        // 자동 계산이 활성화된 경우 출금 카드 업데이트
        if ((field === 'amount' || field === 'denominations') && autoCalculation && outputCards.length > 0) {
          const mainOutputCard = outputCards[0];
          const calculatedAmount = calculateAutomaticAmount(updatedCard, mainOutputCard);
          if (calculatedAmount) {
            const formattedAmount = formatInputWithCommas(calculatedAmount.toString());
            
            setOutputCards(prevOutput => prevOutput.map((outCard, index) => 
              index === 0 ? { ...outCard, amount: formattedAmount } : outCard
            ));
          }
        }
        
        return updatedCard;
      }
      return card;
    }));
  };

  const updateOutputCard = (id: number, field: string, value: any) => {
    setOutputCards(prev => prev.map(card => {
      if (card.id === id) {
        const updatedCard = { ...card, [field]: value };
        
        // 권종별 분배 자동 계산
        if (field === 'amount' && updatedCard.type === 'cash' && updatedCard.amount) {
          const amount = parseCommaFormattedNumber(updatedCard.amount);
          if (amount > 0) {
            if (updatedCard.currency === 'VND') {
              updatedCard.denominations = calculateVNDBreakdown(amount);
            } else if (updatedCard.currency === 'KRW') {
              updatedCard.denominations = calculateKRWBreakdown(amount);
            } else if (updatedCard.currency === 'USD') {
              updatedCard.denominations = calculateUSDBreakdown(amount);
            }
          }
        }
        
        // 출금 카드에서 권종별 수량 변경 시 총액 자동 계산 및 포맷팅
        if (field === 'denominations' && updatedCard.type === 'cash') {
          let totalAmount = 0;
          Object.entries(updatedCard.denominations || {}).forEach(([denom, count]) => {
            const denomValue = getDenominationValue(updatedCard.currency, denom);
            totalAmount += denomValue * count;
          });
          // 권종별 계산 결과를 천단위 콤마 포맷팅 적용
          updatedCard.amount = addCommas(totalAmount.toString());
        }
        
        return updatedCard;
      }
      return card;
    }));
  };

  // 통화별 총 금액 계산 (개선된 버전)
  const calculateTotalByCurrency = (cards: TransactionCard[], currency: string) => {
    return cards
      .filter(card => card.currency === currency)
      .reduce((sum, card) => {
        const amount = parseCommaFormattedNumber(card.amount) || 0;
        return sum + amount;
      }, 0);
  };

  // 기본 통화로 통합 계산 (KRW 기준) - 입금 카드 권종별 환율 지원
  const calculateTotalInKRW = (cards: TransactionCard[], isInputCard: boolean = false) => {
    return cards.reduce((sum, card) => {
      // 입금 카드이면서 현금 타입일 때 권종별 환율 적용
      if (isInputCard && card.type === 'cash' && card.denominations) {
        let cardTotal = 0;
        Object.entries(card.denominations).forEach(([denom, count]) => {
          const rate = getExchangeRate(card.currency, 'KRW', denom);
          const denomValue = getDenominationValue(card.currency, denom);
          cardTotal += denomValue * count * rate;
        });
        return sum + cardTotal;
      }
      
      // 계좌 타입이거나 출금 카드일 때 기존 방식
      const amount = parseCommaFormattedNumber(card.amount) || 0;
      if (amount <= 0) return sum;
      
      if (card.currency === 'KRW') {
        return sum + amount;
      } else {
        const rate = getExchangeRate(card.currency, 'KRW');
        return sum + (amount * rate);
      }
    }, 0);
  };

  const totalInputAmount = calculateTotalInKRW(inputCards, true);  // 입금 카드는 권종별 계산
  const totalOutputAmount = calculateTotalInKRW(outputCards, false); // 출금 카드는 기존 방식
  

  // 통화별 출금 총액 계산 (KRW 환산 없이)
  const outputTotalsByCurrency = outputCards.reduce<Record<string, number>>((totals, card) => {
    const amount = parseCommaFormattedNumber(card.amount) || 0;
    if (amount > 0) {
      totals[card.currency] = (totals[card.currency] || 0) + amount;
    }
    return totals;
  }, {});

  // 통화별 계좌 필터링
  const getAccountsByCurrency = (currency: string) => {
    return assets.filter(asset => 
      asset.type === 'account' && 
      asset.currency === currency
    );
  };

  // 보유 수량 검증 함수 (TransactionForm에서 이식)
  const validateInventory = (card: TransactionCard): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    if (card.type !== 'cash' || !card.amount) {
      return { isValid: true, errors: [] };
    }

    const amount = parseCommaFormattedNumber(card.amount);
    if (amount <= 0) {
      return { isValid: true, errors: [] };
    }

    // 해당 통화의 현금 자산 찾기
    const cashAsset = assets.find(asset => 
      asset.name === `${card.currency} 현금` && 
      asset.currency === card.currency && 
      asset.type === 'cash'
    );

    if (!cashAsset || !cashAsset.metadata?.denominations) {
      errors.push(`${card.currency} 현금 자산이 없습니다`);
      return { isValid: false, errors };
    }

    const denomComposition = cashAsset.metadata.denominations;
    
    // 권종별 분배가 있는 경우 검증
    if (Object.keys(card.denominations).length > 0) {
      for (const [denom, requiredCount] of Object.entries(card.denominations)) {
        const denomKey = card.currency === 'KRW' ? 
          parseInt(denom).toLocaleString() : denom.toString();
        const availableCount = denomComposition[denomKey] || 0;
        
        if (requiredCount > availableCount) {
          errors.push(
            `${card.currency === 'KRW' ? parseInt(denom).toLocaleString() : parseInt(denom).toLocaleString()} ${
              card.currency === 'KRW' ? '원' : 
              card.currency === 'USD' ? '달러' : '동'
            }권이 ${requiredCount - availableCount}장 부족합니다`
          );
        }
      }
    }

    return { isValid: errors.length === 0, errors };
  };

  // 출금 카드 권종별 총액과 목표 금액 일치 검증
  const validateOutputCardAmounts = () => {
    const errors: string[] = [];
    
    outputCards.forEach((card, index) => {
      if (card.type === 'cash' && card.denominations && Object.keys(card.denominations).length > 0) {
        // 권종별 총액 계산
        let denominationTotal = 0;
        Object.entries(card.denominations).forEach(([denom, count]) => {
          const denomValue = getDenominationValue(card.currency, denom);
          denominationTotal += denomValue * count;
        });
        
        // 목표 금액
        const targetAmount = parseCommaFormattedNumber(card.amount) || 0;
        
        // 금액 불일치 검사
        if (denominationTotal !== targetAmount) {
          const difference = Math.abs(denominationTotal - targetAmount);
          const currencyUnit = card.currency === 'KRW' ? '원' : card.currency === 'VND' ? '동' : '달러';
          errors.push(
            `출금 카드 ${index + 1}: 권종별 총액(${denominationTotal.toLocaleString()}${currencyUnit})과 ` + 
            `목표 금액(${targetAmount.toLocaleString()}${currencyUnit})이 ${difference.toLocaleString()}${currencyUnit} 차이납니다`
          );
        }
      }
    });
    
    return errors;
  };

  // 전체 거래 유효성 검증
  const validateTransaction = () => {
    const errors: string[] = [];
    
    // 권종별 총액과 목표 금액 일치 검증 추가
    const amountValidationErrors = validateOutputCardAmounts();
    errors.push(...amountValidationErrors);

    // 계좌이체 거래인지 확인
    const isAccountTransfer = selectedTransactionType.includes('_to_') && 
      (selectedTransactionType.includes('_account') || outputCards.some(card => card.type === 'account'));
    
    // 익명 거래가 아니고 계좌이체인 경우에만 고객 정보 필수
    if (!isAnonymousTransaction && isAccountTransfer && !customerName.trim()) {
      errors.push('계좌이체 거래 시 고객명이 필요합니다');
    }
    
    // 계좌이체 거래인 경우 고객 계좌 정보 필수
    if (isAccountTransfer) {
      if (!customerAccountInfo.bankName.trim()) {
        errors.push('수신 은행명을 입력해주세요');
      }
      if (!customerAccountInfo.accountNumber.trim()) {
        errors.push('수신 계좌번호를 입력해주세요');
      }
      if (!customerAccountInfo.accountHolder.trim()) {
        errors.push('수신 예금주명을 입력해주세요');
      }
    }

    if (inputCards.length === 0) {
      errors.push('최소 1개의 입금 카드가 필요합니다');
    }

    if (outputCards.length === 0) {
      errors.push('최소 1개의 출금 카드가 필요합니다');
    }

    // 입금 카드 검증
    inputCards.forEach((card, index) => {
      if (!card.amount || parseCommaFormattedNumber(card.amount) <= 0) {
        errors.push(`입금 카드 ${index + 1}: 금액을 입력해주세요`);
      }
      if (card.type === 'account' && !card.accountId) {
        errors.push(`입금 카드 ${index + 1}: 계좌를 선택해주세요`);
      }
      
      // 보유 수량 검증
      const validation = validateInventory(card);
      if (!validation.isValid) {
        errors.push(...validation.errors.map(err => `입금 카드 ${index + 1}: ${err}`));
      }
    });

    // 출금 카드 검증
    outputCards.forEach((card, index) => {
      if (!card.amount || parseCommaFormattedNumber(card.amount) <= 0) {
        errors.push(`출금 카드 ${index + 1}: 금액을 입력해주세요`);
      }
      if (card.type === 'account' && !card.accountId) {
        errors.push(`출금 카드 ${index + 1}: 계좌를 선택해주세요`);
      }
      
      // 현금 출금 카드의 경우 권종별 분배 필수
      if (card.type === 'cash' && (!card.denominations || Object.keys(card.denominations).length === 0)) {
        errors.push(`출금 카드 ${index + 1}: 현금 출금 시 권종별 분배가 필요합니다`);
      }
      
      // 보유 수량 검증 (출금의 경우)
      const validation = validateInventory(card);
      if (!validation.isValid) {
        errors.push(...validation.errors.map(err => `출금 카드 ${index + 1}: ${err}`));
      }
    });

    return errors;
  };

  // 스마트 버튼 활성화 로직
  const isSubmitButtonEnabled = useMemo(() => {
    if (inputCards.length === 0 || outputCards.length === 0) return false;
    
    // 계좌이체 거래인지 확인
    const isAccountTransfer = selectedTransactionType.includes('_to_') && 
      (selectedTransactionType.includes('_account') || outputCards.some(card => card.type === 'account'));
    
    // 익명 거래가 아니고 계좌이체인 경우에만 고객명 필수
    if (!isAnonymousTransaction && isAccountTransfer && !customerName.trim()) return false;
    
    // 계좌이체인 경우 고객 계좌 정보 필수
    if (isAccountTransfer) {
      if (!customerAccountInfo.bankName.trim() || !customerAccountInfo.accountNumber.trim() || !customerAccountInfo.accountHolder.trim()) {
        return false;
      }
    }
    
    // 모든 카드에 금액이 입력되어 있는지 확인
    const allInputsHaveAmount = inputCards.every(card => 
      card.amount && parseCommaFormattedNumber(card.amount) > 0
    );
    const allOutputsHaveAmount = outputCards.every(card => 
      card.amount && parseCommaFormattedNumber(card.amount) > 0
    );
    
    if (!allInputsHaveAmount || !allOutputsHaveAmount) return false;
    
    // 계좌 카드의 경우 계좌 선택 확인
    const allAccountsSelected = [...inputCards, ...outputCards].every(card =>
      card.type === 'cash' || (card.type === 'account' && card.accountId)
    );
    
    if (!allAccountsSelected) return false;
    
    // 보유 수량 검증
    const allInventoryValid = [...inputCards, ...outputCards].every(card => {
      const validation = validateInventory(card);
      return validation.isValid;
    });
    
    if (!allInventoryValid) return false;
    
    // 출금 카드 권종별 총액과 목표 금액 일치 검증
    const amountValidationErrors = validateOutputCardAmounts();
    if (amountValidationErrors.length > 0) return false;
    
    return true;
  }, [inputCards, outputCards, customerName, assets]);

  // 복합 거래를 단일 거래들로 분해 (개선된 버전)
  const decomposeComplexTransaction = () => {
    const transactions: any[] = [];

    // 입금/출금 카드가 각각 1개인 간단한 케이스
    if (inputCards.length === 1 && outputCards.length === 1) {
      const inputCard = inputCards[0];
      const outputCard = outputCards[0];
      const inputAmount = parseCommaFormattedNumber(inputCard.amount) || 0;
      const outputAmount = parseCommaFormattedNumber(outputCard.amount) || 0;

      if (inputAmount > 0 && outputAmount > 0) {
        // 거래 타입 자동 결정
        let transactionType = determineTransactionType(
          inputCard.type, 
          inputCard.currency, 
          outputCard.type, 
          outputCard.currency
        );
        
        // 환율 계산
        const exchangeRate = getExchangeRate(inputCard.currency, outputCard.currency);

        // 계좌이체 거래인지 확인
        const isAccountTransfer = transactionType.includes('_to_') && 
          (transactionType.includes('_account') || outputCard.type === 'account');
        
        // 메타데이터 구성
        const metadata: any = {
          transferType: transactionType,
          denominationAmounts: outputCard.denominations || {},
          customer: {
            name: isAnonymousTransaction ? '' : customerName,
            phone: isAnonymousTransaction ? '' : customerPhone,
            isAnonymous: isAnonymousTransaction
          }
        };
        
        // 계좌이체인 경우 고객 계좌 정보 추가
        if (isAccountTransfer) {
          metadata.customerAccount = {
            bankName: customerAccountInfo.bankName,
            accountNumber: customerAccountInfo.accountNumber,
            accountHolder: customerAccountInfo.accountHolder
          };
        }

        transactions.push({
          type: transactionType,
          fromAssetType: inputCard.type === 'cash' ? 'cash' : (inputCard.type === 'account' ? 'bank' : inputCard.type),
          fromAssetId: inputCard.accountId || null,
          fromAssetName: inputCard.type === 'cash' ? `${inputCard.currency} 현금` : (assets.find(a => a.id === inputCard.accountId)?.name || ''),
          toAssetType: outputCard.type === 'cash' ? 'cash' : (outputCard.type === 'account' ? 'bank' : outputCard.type),
          toAssetId: outputCard.accountId || null,
          toAssetName: outputCard.type === 'cash' ? `${outputCard.currency} 현금` : (assets.find(a => a.id === outputCard.accountId)?.name || ''),
          fromAmount: Math.floor(inputAmount).toString(),
          toAmount: Math.floor(outputAmount).toString(),
          rate: exchangeRate?.toString() || '1',
          customerName,
          customerPhone,
          memo: memo || `복합거래 (${inputCard.currency}→${outputCard.currency})`,
          isMainTransaction: 'true',
          metadata: metadata
        });
      }
    } else {
      // 복잡한 케이스: 여러 입금/출금 조합
      const primaryInputCard = inputCards[0];
      
      outputCards.forEach((outputCard, index) => {
        const outputAmount = parseCommaFormattedNumber(outputCard.amount) || 0;
        const inputAmount = parseCommaFormattedNumber(primaryInputCard.amount) || 0;
        
        // 환율을 적용하여 실제 필요한 입금 금액 계산
        const exchangeRate = getExchangeRate(primaryInputCard.currency, outputCard.currency);
        const requiredInputAmount = outputAmount / (exchangeRate || 1);
        const allocatedInputAmount = Math.min(requiredInputAmount, inputAmount);

        if (allocatedInputAmount > 0 && outputAmount > 0) {
          // 거래 타입 자동 결정
          let transactionType = determineTransactionType(
            primaryInputCard.type, 
            primaryInputCard.currency, 
            outputCard.type, 
            outputCard.currency
          );

          // 환율은 이미 계산됨

          // 계좌이체 거래인지 확인
          const isAccountTransfer = transactionType.includes('_to_') && 
            (transactionType.includes('_account') || outputCard.type === 'account');
          
          // 메타데이터 구성
          const metadata: any = {
            transferType: transactionType,
            denominationAmounts: outputCard.denominations || {},
            customer: {
              name: isAnonymousTransaction ? '' : customerName,
              phone: isAnonymousTransaction ? '' : customerPhone,
              isAnonymous: isAnonymousTransaction
            }
          };
          
          // 계좌이체인 경우 고객 계좌 정보 추가
          if (isAccountTransfer) {
            metadata.customerAccount = {
              bankName: customerAccountInfo.bankName,
              accountNumber: customerAccountInfo.accountNumber,
              accountHolder: customerAccountInfo.accountHolder
            };
          }

          transactions.push({
            type: transactionType,
            fromAssetType: primaryInputCard.type === 'cash' ? 'cash' : (primaryInputCard.type === 'account' ? 'bank' : primaryInputCard.type),
            fromAssetId: primaryInputCard.accountId || null,
            fromAssetName: primaryInputCard.type === 'cash' ? `${primaryInputCard.currency} 현금` : (assets.find(a => a.id === primaryInputCard.accountId)?.name || ''),
            toAssetType: outputCard.type === 'cash' ? 'cash' : (outputCard.type === 'account' ? 'bank' : outputCard.type),
            toAssetId: outputCard.accountId || null,
            toAssetName: outputCard.type === 'cash' ? `${outputCard.currency} 현금` : (assets.find(a => a.id === outputCard.accountId)?.name || ''),
            fromAmount: Math.floor(allocatedInputAmount).toString(),
            toAmount: Math.floor(outputAmount).toString(),
            rate: exchangeRate?.toString() || '1',
            customerName,
            customerPhone,
            memo: memo || `복합거래 ${outputCard.currency} 출금 ${index + 1}`,
            isMainTransaction: index === 0 ? 'true' : 'false',
            parentTransactionId: index === 0 ? null : 'main',
            metadata: metadata
          });
        }
      });
    }

    return transactions;
  };

  // 거래 처리 mutation (개선된 버전)
  const processTransactionMutation = useMutation({
    mutationFn: async (transactionData: any) => {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transactionData),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '거래 처리 실패');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/assets'] });
    },
  });

  // 거래 실행 (부분 실패 및 롤백 지원)
  const handleSubmit = async () => {
    const validationErrors = validateTransaction();
    
    if (validationErrors.length > 0) {
      toast({
        title: "입력 오류",
        description: validationErrors[0],
        variant: "destructive",
      });
      return;
    }

    try {
      const transactions = decomposeComplexTransaction();
      const successfulTransactions: any[] = [];
      
      // 각 거래를 순차적으로 처리 (롤백 지원)
      for (let i = 0; i < transactions.length; i++) {
        try {
          const result = await processTransactionMutation.mutateAsync(transactions[i]);
          successfulTransactions.push(result);
          
          toast({
            title: `거래 ${i + 1}/${transactions.length} 완료`,
            description: `${transactions[i].fromCurrency} → ${transactions[i].toCurrency} 처리 완료`,
          });
        } catch (error) {
          // 부분 실패 발생
          const failedTransaction = transactions[i];
          
          toast({
            title: "거래 부분 실패",
            description: `거래 ${i + 1}에서 실패했습니다. 이전 ${successfulTransactions.length}개 거래는 성공했습니다.`,
            variant: "destructive",
          });
          
          // 롤백 옵션 제공
          const shouldRollback = confirm(
            `거래 ${i + 1}이 실패했습니다.\n` +
            `성공한 거래: ${successfulTransactions.length}개\n` +
            `실패한 거래: ${failedTransaction.fromCurrency} → ${failedTransaction.toCurrency}\n\n` +
            `성공한 거래를 모두 롤백하시겠습니까?`
          );
          
          if (shouldRollback) {
            // 성공한 거래들의 상태를 'cancelled'로 변경하여 롤백
            try {
              const successfulResults = successfulTransactions.filter((r: any) => r.success);
              
              for (const result of successfulResults) {
                if (result.transactionId) {
                  const rollbackResponse = await fetch(`/api/transactions/${result.transactionId}/status`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'cancelled' })
                  });
                  
                  if (!rollbackResponse.ok) {
                    throw new Error(`거래 ${result.transactionId} 롤백 실패`);
                  }
                }
              }

              toast({
                title: "롤백 완료",
                description: `${successfulResults.length}개 성공 거래가 안전하게 롤백되었습니다.`,
                variant: "default"
              });
            } catch (rollbackError) {
              console.error('롤백 실패:', rollbackError);
              toast({
                title: "롤백 실패",
                description: "수동 데이터 확인이 필요합니다. 관리자에게 문의하세요.",
                variant: "destructive"
              });
            }
            
            toast({
              title: "롤백 진행 중",
              description: "성공한 거래들을 롤백하고 있습니다...",
            });
          }
          
          return; // 처리 중단
        }
      }

      // 모든 거래 성공
      toast({
        title: "거래 완료",
        description: `${transactions.length}개의 거래가 모두 성공적으로 처리되었습니다.`,
      });

      // 폼 초기화
      setCustomerName('');
      setCustomerPhone('');
      setMemo('');
      setInputCards([]);
      setOutputCards([]);
      setCustomerAccountInfo({ bankName: '', accountNumber: '', accountHolder: '' });
      setIsAnonymousTransaction(false);

      // 잠시 후 홈으로 이동
      setTimeout(() => {
        onClose();
      }, 2000);

    } catch (error) {
      console.error('거래 처리 실패:', error);
      toast({
        title: "거래 실패",
        description: "거래 처리 중 오류가 발생했습니다. 다시 시도해주세요.",
        variant: "destructive",
      });
    }
  };

  // 카드 색상 테마
  const getCardTheme = (isInput: boolean, currency: string) => {
    if (isInput) {
      return "border-green-200 bg-green-50 hover:bg-green-100";
    } else {
      const colorMap = {
        'KRW': 'border-blue-200 bg-blue-50 hover:bg-blue-100',
        'VND': 'border-orange-200 bg-orange-50 hover:bg-orange-100',
        'USD': 'border-purple-200 bg-purple-50 hover:bg-purple-100'
      };
      return colorMap[currency as keyof typeof colorMap] || 'border-gray-200 bg-gray-50 hover:bg-gray-100';
    }
  };

  // 고급 리셋 기능
  const handleAdvancedReset = () => {
    const resetOptions = [
      "모든 데이터 초기화",
      "입금 카드만 초기화",
      "출금 카드만 초기화",
      "고객 정보만 초기화",
      "권종 분배만 초기화"
    ];

    const selectedOption = window.prompt(
      "리셋할 범위를 선택하세요:\n" +
      resetOptions.map((option, index) => `${index + 1}. ${option}`).join('\n') +
      "\n\n숫자를 입력하세요 (1-5):"
    );

    const optionIndex = parseInt(selectedOption || '0') - 1;
    
    if (optionIndex >= 0 && optionIndex < resetOptions.length) {
      switch (optionIndex) {
        case 0: // 모든 데이터 초기화
          setCustomerName('');
          setCustomerPhone('');
          setMemo('');
          setInputCards([]);
          setOutputCards([]);
          toast({
            title: "전체 초기화 완료",
            description: "모든 데이터가 초기화되었습니다.",
          });
          break;
        case 1: // 입금 카드만 초기화
          setInputCards([]);
          toast({
            title: "입금 카드 초기화 완료",
            description: "입금 카드가 모두 제거되었습니다.",
          });
          break;
        case 2: // 출금 카드만 초기화
          setOutputCards([]);
          toast({
            title: "출금 카드 초기화 완료",
            description: "출금 카드가 모두 제거되었습니다.",
          });
          break;
        case 3: // 고객 정보만 초기화
          setCustomerName('');
          setCustomerPhone('');
          setMemo('');
          toast({
            title: "고객 정보 초기화 완료",
            description: "고객 정보가 초기화되었습니다.",
          });
          break;
        case 4: // 권종 분배만 초기화
          setInputCards(prev => prev.map(card => ({ ...card, denominations: {} })));
          setOutputCards(prev => prev.map(card => ({ ...card, denominations: {} })));
          toast({
            title: "권종 분배 초기화 완료",
            description: "모든 권종 분배가 초기화되었습니다.",
          });
          break;
      }
    }
  };

  // 실시간 추천 UI 렌더링
  const renderRecommendations = (card: TransactionCard) => {
    if (!showRecommendations) return null;
    
    const recommendations = generateRecommendations(card);
    if (recommendations.length === 0) return null;

    return (
      <div className="mt-3 p-3 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-medium text-green-800">💡 실시간 추천</div>
          <Badge variant="outline" className="text-xs bg-green-100 text-green-700">
            {recommendations.length}개 제안
          </Badge>
        </div>
        
        <div className="space-y-2">
          {recommendations.map((rec, index) => (
            <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${
                  rec.type === 'optimization' ? 'bg-blue-500' :
                  rec.type === 'efficiency' ? 'bg-green-500' :
                  'bg-yellow-500'
                }`} />
                <span className="text-sm text-gray-700">{rec.message}</span>
              </div>
              {rec.action && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={rec.action}
                  className="h-7 px-2 text-xs"
                >
                  적용
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // 권종별 분배 UI 렌더링 (개선된 버전)
  const renderDenominationInputs = (card: TransactionCard, isOutput: boolean) => {
    if (card.type !== 'cash' || !card.currency) return null;
    
    // 출금 카드는 금액이 있어야 분배 표시, 입금 카드는 권종별 수량 입력이 우선
    if (isOutput && !card.amount) return null;
    
    const denominations = CURRENCY_DENOMINATIONS[card.currency as keyof typeof CURRENCY_DENOMINATIONS];
    if (!denominations) return null;

    // 출금 카드만 금액 검증, 입금 카드는 권종별 수량으로 금액 생성
    if (isOutput) {
      const amount = parseCommaFormattedNumber(card.amount);
      if (amount <= 0) return null;
    }

    return (
      <div className="space-y-3">
        {/* 권종별 분배 섹션 */}
        <div className="p-3 bg-white rounded-lg border">
          <div className="flex items-center justify-between mb-3">
            <Label className="text-sm font-medium text-gray-700">
              {isOutput ? '권종별 분배' : '권종별 수량 (매입)'}
            </Label>
            <div className="flex items-center space-x-1">
              {isOutput && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const amount = parseCommaFormattedNumber(card.amount);
                    let newDenoms: Record<string, number> = {};
                    if (card.currency === 'VND') {
                      newDenoms = calculateVNDBreakdown(amount);
                    } else if (card.currency === 'KRW') {
                      newDenoms = calculateKRWBreakdown(amount);
                    } else if (card.currency === 'USD') {
                      newDenoms = calculateUSDBreakdown(amount);
                    }
                    updateOutputCard(card.id, 'denominations', newDenoms);
                  }}
                  className="h-7 px-2 text-xs"
                >
                  <RefreshCw size={12} className="mr-1" />
                  자동분배
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => toggleCardCollapse(card.id)}
                className="h-7 w-7 p-0"
              >
                {collapsedCards.has(card.id) ? <Eye size={14} /> : <EyeOff size={14} />}
              </Button>
            </div>
          </div>
          
          {!collapsedCards.has(card.id) && (
            <div className="grid grid-cols-2 gap-2">
              {denominations.map((denom) => {
                const currentCount = card.denominations[denom.value] || 0;
                const denomValue = parseInt(denom.value);
                
                // 보유량 확인
                const cashAsset = assets.find(asset => 
                  asset.name === `${card.currency} 현금` && 
                  asset.currency === card.currency && 
                  asset.type === 'cash'
                );
                const denomKey = card.currency === 'KRW' ? 
                  denomValue.toLocaleString() : denom.value;
                const availableCount = cashAsset?.metadata?.denominations?.[denomKey] || 0;
                const isInsufficient = currentCount > availableCount;
                
                return (
                  <div key={denom.value} className={`flex items-center justify-between p-2 rounded ${
                    isInsufficient ? 'bg-red-50 border border-red-200' : 'bg-gray-50'
                  }`}>
                    <div className="flex flex-col">
                      <span className="text-xs font-medium">{denom.label}</span>
                      <span className="text-xs text-gray-500">보유: {availableCount}장</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => {
                          const newDenoms = { ...card.denominations };
                          newDenoms[denom.value] = Math.max(0, currentCount - 1);
                          if (isOutput) {
                            updateOutputCard(card.id, 'denominations', newDenoms);
                            if (autoAdjustment) handleAutoAdjustment({ ...card, denominations: newDenoms });
                          } else {
                            updateInputCard(card.id, 'denominations', newDenoms);
                          }
                        }}
                      >
                        <Minus size={10} />
                      </Button>
                      <Input
                        type="text"
                        value={currentCount.toString()}
                        onChange={(e) => {
                          const value = parseInt(e.target.value) || 0;
                          const newDenoms = { ...card.denominations };
                          newDenoms[denom.value] = value;
                          if (isOutput) {
                            updateOutputCard(card.id, 'denominations', newDenoms);
                            if (autoAdjustment) handleAutoAdjustment({ ...card, denominations: newDenoms });
                          } else {
                            updateInputCard(card.id, 'denominations', newDenoms);
                          }
                        }}
                        className={`h-6 w-12 text-center text-xs ${
                          isInsufficient ? 'border-red-300 bg-red-50' : ''
                        }`}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => {
                          const newDenoms = { ...card.denominations };
                          newDenoms[denom.value] = currentCount + 1;
                          if (isOutput) {
                            updateOutputCard(card.id, 'denominations', newDenoms);
                            if (autoAdjustment) handleAutoAdjustment({ ...card, denominations: newDenoms });
                          } else {
                            updateInputCard(card.id, 'denominations', newDenoms);
                          }
                        }}
                      >
                        <Plus size={10} />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          
          {/* 총 금액 표시 */}
          {!collapsedCards.has(card.id) && (
            <div className="mt-3 p-2 bg-gray-50 rounded border-t">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">권종별 총액:</span>
                <span className="font-bold text-blue-600">
                  {Object.entries(card.denominations || {}).reduce((sum, [denom, count]) => 
                    sum + (parseInt(denom) * count), 0
                  ).toLocaleString()} {card.currency}
                </span>
              </div>
              {!isOutput && (
                <div className="flex justify-between items-center text-sm mt-1">
                  <span className="text-gray-600">총 매입가:</span>
                  <span className="font-bold text-green-600">
                    {(() => {
                      let total = 0;
                      Object.entries(card.denominations || {}).forEach(([denom, count]) => {
                        const rate = getExchangeRate(card.currency, 'KRW', denom);
                        const denomValue = parseInt(denom);
                        total += denomValue * count * rate;
                      });
                      return formatCurrency(total, 'KRW');
                    })()} KRW
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 실시간 추천 시스템 */}
        {renderRecommendations(card)}
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 헤더 */}
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-2xl font-bold flex items-center text-primary">
              <Calculator className="mr-3" size={28} />
              복합 거래 시스템
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="text-sm">
                진행률: {Math.round(((inputCards.length > 0 ? 25 : 0) + 
                  (outputCards.length > 0 ? 25 : 0) + 
                  (customerName ? 25 : 0) + 
                  (isSubmitButtonEnabled ? 25 : 0)))}%
              </Badge>
              <Button variant="ghost" onClick={onClose}>닫기</Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* 자동 거래 유형 상태 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-lg">
            <ArrowRightLeft className="mr-2" size={20} />
            거래 유형 (자동 결정)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-center">
              <CheckCircle className="mr-2 text-green-600" size={16} />
              <span className="text-sm text-green-700 dark:text-green-300">
                거래 유형은 선택한 통화에 따라 자동으로 결정됩니다
              </span>
            </div>
            {(inputCards.length > 0 || outputCards.length > 0) && (
              <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                감지된 패턴: {inputCards.map(c => `${c.type === 'cash' ? '현금' : '계좌'}(${c.currency})`).join(', ')} 
                → {outputCards.map(c => `${c.type === 'cash' ? '현금' : '계좌'}(${c.currency})`).join(', ')}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 고객 정보 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-lg">
            <User className="mr-2" size={20} />
            고객 정보
            {customerName && <CheckCircle className="ml-2 text-green-500" size={16} />}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 익명 거래 옵션 */}
          <div className="flex items-center space-x-2 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
            <Checkbox
              id="anonymousTransaction"
              checked={isAnonymousTransaction}
              onCheckedChange={(checked) => {
                setIsAnonymousTransaction(checked === true);
                if (checked === true) {
                  setCustomerName('');
                  setCustomerPhone('');
                }
              }}
            />
            <Label htmlFor="anonymousTransaction" className="text-sm font-medium">
              익명 거래 (고객 정보 입력 생략)
            </Label>
          </div>
          
          {/* 고객 정보 입력 - 익명 거래가 아닌 경우만 표시 */}
          {!isAnonymousTransaction && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customerName">고객명</Label>
                <Input
                  id="customerName"
                  placeholder="고객명을 입력하세요"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className={customerName ? "border-green-300 bg-green-50" : ""}
                  data-testid="input-customer-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerPhone">연락처</Label>
                <Input
                  id="customerPhone"
                  placeholder="연락처를 입력하세요"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  data-testid="input-customer-phone"
                />
              </div>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="memo">메모</Label>
            <Textarea
              id="memo"
              placeholder="거래 관련 메모를 입력하세요"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              data-testid="textarea-memo"
            />
          </div>
          
          
          {/* 시스템 설정 옵션들 */}
          <div className="space-y-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <h4 className="text-sm font-semibold text-blue-800">⚙️ 시스템 설정</h4>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSystemSettings(!showSystemSettings)}
                  className="h-6 w-6 p-0"
                >
                  {showSystemSettings ? <EyeOff size={12} /> : <Eye size={12} />}
                </Button>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAdvancedReset}
                className="h-7 px-2 text-xs text-red-600 border-red-300 hover:bg-red-50"
              >
                <RefreshCw size={12} className="mr-1" />
                고급 리셋
              </Button>
            </div>
            
            {showSystemSettings && (
            <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* 자동 환율 계산 */}
              <div className="flex items-center space-x-2 p-2 bg-white rounded border">
                <Checkbox
                  id="autoCalculation"
                  checked={autoCalculation}
                  onCheckedChange={(checked) => setAutoCalculation(checked === true)}
                />
                <Label htmlFor="autoCalculation" className="text-xs">
                  자동 환율 계산
                </Label>
              </div>
              
              {/* 실시간 추천 시스템 */}
              <div className="flex items-center space-x-2 p-2 bg-white rounded border">
                <Checkbox
                  id="showRecommendations"
                  checked={showRecommendations}
                  onCheckedChange={(checked) => setShowRecommendations(checked === true)}
                />
                <Label htmlFor="showRecommendations" className="text-xs">
                  실시간 추천 표시
                </Label>
              </div>
              
              {/* 자동 조정 시스템 */}
              <div className="flex items-center space-x-2 p-2 bg-white rounded border">
                <Checkbox
                  id="autoAdjustment"
                  checked={autoAdjustment}
                  onCheckedChange={(checked) => setAutoAdjustment(checked === true)}
                />
                <Label htmlFor="autoAdjustment" className="text-xs">
                  자동 조정 활성화
                </Label>
              </div>
              
              {/* 환율 정보 표시 */}
              <div className="flex items-center space-x-2 p-2 bg-white rounded border">
                <Checkbox
                  id="showExchangeRates"
                  checked={showExchangeRates}
                  onCheckedChange={(checked) => setShowExchangeRates(checked === true)}
                />
                <Label htmlFor="showExchangeRates" className="text-xs">
                  환율 정보 표시
                </Label>
              </div>
            </div>
            
            <div className="text-xs text-blue-600 bg-white p-2 rounded border">
              💡 팁: 자동 환율 계산은 입금 금액 변경 시 출금 금액을 자동으로 계산합니다. 
              자동 조정은 권종 분배가 목표를 초과할 때 자동으로 재분배합니다.
            </div>
            </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 카드 섹션 */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* 입금 섹션 */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <h3 className="text-xl font-bold text-green-700">입금</h3>
              <Badge variant="secondary">{inputCards.length}개</Badge>
              {totalInputAmount > 0 && (
                <Badge className="bg-green-100 text-green-800">
                  총 {formatCurrency(totalInputAmount, inputCards[0]?.currency || 'KRW')}
                </Badge>
              )}
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={addInputCard}
              className="border-green-300 text-green-700 hover:bg-green-50"
              data-testid="button-add-input"
            >
              <Plus className="mr-1" size={16} />
              추가
            </Button>
          </div>
          
          {inputCards.map((card, index) => (
            <Card key={card.id} className={`border-2 transition-all duration-200 ${getCardTheme(true, card.currency)}`}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    {card.type === 'cash' ? <Banknote className="text-green-600" size={18} /> : <Wallet className="text-green-600" size={18} />}
                    <span className="font-semibold text-green-800">입금 카드 #{index + 1}</span>
                    {validateInventory(card).isValid && card.amount && (
                      <CheckCircle className="text-green-500" size={16} />
                    )}
                  </div>
                  <div className="flex items-center space-x-1">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => toggleCardCollapse(card.id)}
                      className="h-8 w-8 p-0"
                    >
                      {collapsedCards.has(card.id) ? <Eye size={14} /> : <EyeOff size={14} />}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => removeInputCard(card.id)}
                      className="h-8 w-8 p-0 text-red-500 hover:bg-red-50"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              {!collapsedCards.has(card.id) && (
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    {/* 유형 선택 */}
                    <div className="space-y-2">
                      <Label className="text-sm">유형</Label>
                      <Select value={card.type} onValueChange={(value) => {
                        // 타입 변경 시 기존 데이터 초기화
                        updateInputCard(card.id, 'type', value);
                        updateInputCard(card.id, 'amount', '');
                        updateInputCard(card.id, 'denominations', {});
                        updateInputCard(card.id, 'accountId', null);
                      }}>
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">현금</SelectItem>
                          <SelectItem value="account">계좌</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* 통화 선택 */}
                    <div className="space-y-2">
                      <Label className="text-sm">통화</Label>
                      <Select value={card.currency} onValueChange={(value) => updateInputCard(card.id, 'currency', value)}>
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="KRW">원 (KRW)</SelectItem>
                          <SelectItem value="VND">동 (VND)</SelectItem>
                          <SelectItem value="USD">달러 (USD)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* 계좌 선택 (계좌 유형인 경우) */}
                  {card.type === 'account' && (
                    <div className="space-y-2">
                      <Label className="text-sm">계좌 선택</Label>
                      <Select value={card.accountId} onValueChange={(value) => updateInputCard(card.id, 'accountId', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="계좌를 선택하세요" />
                        </SelectTrigger>
                        <SelectContent>
                          {getAccountsByCurrency(card.currency).map((account) => (
                            <SelectItem key={account.id} value={account.id}>
                              {account.accountName} ({formatCurrency(account.balance, card.currency)} {card.currency})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* 금액 입력 - 현금/계좌 타입별 다른 UI */}
                  {card.type === 'cash' ? (
                    /* 현금 입금: 권종별 수량 입력 */
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <Label className="text-sm font-medium">권종별 수량 (매입)</Label>
                        <div className="text-xs text-gray-500">
                          총액: {(() => {
                            // 권종별 환율 적용한 총 매입가 계산
                            let total = 0;
                            Object.entries(card.denominations || {}).forEach(([denom, count]) => {
                              const rate = getExchangeRate(card.currency, 'KRW', denom);
                              const denomValue = getDenominationValue(card.currency, denom);
                              total += denomValue * count * rate;
                            });
                            return formatCurrency(total, 'KRW');
                          })()}
                        </div>
                      </div>
                      {renderDenominationInputs(card, false)}
                    </div>
                  ) : (
                    /* 계좌 입금: 총액 입력 */
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">금액</Label>
                      <Input
                        type="text"
                        placeholder="0"
                        value={card.amount}
                        onChange={(e) => {
                          const formattedValue = formatInputWithCommas(e.target.value);
                          updateInputCard(card.id, 'amount', formattedValue);
                        }}
                        className="text-lg font-semibold text-center"
                      />
                    </div>
                  )}

                  {/* 보유량 부족 경고 */}
                  {!validateInventory(card).isValid && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center gap-2 text-red-800 mb-1">
                        <AlertCircle className="w-4 h-4" />
                        <span className="font-semibold text-sm">보유량 부족</span>
                      </div>
                      <div className="text-xs text-red-700 space-y-1">
                        {validateInventory(card).errors.map((error, idx) => (
                          <div key={idx}>• {error}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          ))}
          
          {inputCards.length === 0 && (
            <Card className="border-dashed border-2 border-green-300 bg-green-50">
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Banknote className="mx-auto mb-2 text-green-400" size={32} />
                  <p className="text-green-600 font-medium">입금 카드를 추가하세요</p>
                  <p className="text-sm text-green-500 mt-1">고객으로부터 받을 자산</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>


        {/* 출금 섹션 */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <h3 className="text-xl font-bold text-blue-700">출금</h3>
              <Badge variant="secondary">{outputCards.length}개</Badge>
              {Object.entries(outputTotalsByCurrency).map(([currency, amount]) => (
                <Badge key={currency} className="bg-blue-100 text-blue-800">
                  {formatCurrency(amount, currency)}
                </Badge>
              ))}
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={addOutputCard}
              className="border-blue-300 text-blue-700 hover:bg-blue-50"
              data-testid="button-add-output"
            >
              <Plus className="mr-1" size={16} />
              추가
            </Button>
          </div>
          
          {outputCards.map((card, index) => (
            <Card key={card.id} className={`border-2 transition-all duration-200 ${getCardTheme(false, card.currency)}`}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    {card.type === 'cash' ? <Banknote className="text-blue-600" size={18} /> : <Wallet className="text-blue-600" size={18} />}
                    <span className="font-semibold text-blue-800">출금 카드 #{index + 1}</span>
                    {validateInventory(card).isValid && card.amount && (
                      <CheckCircle className="text-blue-500" size={16} />
                    )}
                  </div>
                  <div className="flex items-center space-x-1">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => toggleCardCollapse(card.id)}
                      className="h-8 w-8 p-0"
                    >
                      {collapsedCards.has(card.id) ? <Eye size={14} /> : <EyeOff size={14} />}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => removeOutputCard(card.id)}
                      className="h-8 w-8 p-0 text-red-500 hover:bg-red-50"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              {!collapsedCards.has(card.id) && (
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    {/* 유형 선택 */}
                    <div className="space-y-2">
                      <Label className="text-sm">유형</Label>
                      <Select value={card.type} onValueChange={(value) => updateOutputCard(card.id, 'type', value)}>
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">현금</SelectItem>
                          <SelectItem value="account">계좌</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* 통화 선택 */}
                    <div className="space-y-2">
                      <Label className="text-sm">통화</Label>
                      <Select value={card.currency} onValueChange={(value) => updateOutputCard(card.id, 'currency', value)}>
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="KRW">원 (KRW)</SelectItem>
                          <SelectItem value="VND">동 (VND)</SelectItem>
                          <SelectItem value="USD">달러 (USD)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* 계좌 선택 (계좌 유형인 경우) */}
                  {card.type === 'account' && (
                    <div className="space-y-2">
                      <Label className="text-sm">계좌 선택</Label>
                      <Select value={card.accountId} onValueChange={(value) => updateOutputCard(card.id, 'accountId', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="계좌를 선택하세요" />
                        </SelectTrigger>
                        <SelectContent>
                          {getAccountsByCurrency(card.currency).map((account) => (
                            <SelectItem key={account.id} value={account.id}>
                              {account.accountName} ({formatCurrency(account.balance, card.currency)} {card.currency})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* 금액 입력 */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">금액</Label>
                      {autoCalculation && inputCards.length > 0 && inputCards[0].amount && (
                        <Badge variant="outline" className="text-xs">
                          자동 계산됨
                        </Badge>
                      )}
                    </div>
                    <Input
                      type="text"
                      placeholder="0"
                      value={card.amount}
                      onChange={(e) => {
                        const formattedValue = formatInputWithCommas(e.target.value);
                        updateOutputCard(card.id, 'amount', formattedValue);
                      }}
                      className="text-lg font-semibold text-center"
                      readOnly={autoCalculation && inputCards.length > 0 && index === 0}
                    />
                  </div>

                  {/* 매매시세 박스 (개선된 버전) */}
                  {inputCards.length > 0 && inputCards[0].currency !== card.currency && (
                    <div className="space-y-3">
                      {/* 기본 환율 정보 */}
                      <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <div className="text-sm font-bold text-blue-800">💱 매매시세</div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setShowSellRates(!showSellRates)}
                              className="h-6 w-6 p-0"
                            >
                              {showSellRates ? <EyeOff size={12} /> : <Eye size={12} />}
                            </Button>
                          </div>
                          <Badge className="bg-blue-100 text-blue-800 text-xs">실시간</Badge>
                        </div>
                        
                        {showSellRates && (
                        <div className="grid grid-cols-1 gap-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-blue-700 font-medium">
                              {inputCards[0].currency} → {card.currency}
                            </span>
                            <span className="text-lg font-bold text-blue-900">
                              {getExchangeRate(inputCards[0].currency, card.currency).toLocaleString('ko-KR', {
                                minimumFractionDigits: card.currency === 'VND' ? 0 : 2,
                                maximumFractionDigits: card.currency === 'VND' ? 0 : 2
                              })}
                            </span>
                          </div>
                          
                          {/* 권종별 환율 정보 (USD의 경우) */}
                          {inputCards[0].currency === 'USD' && card.currency === 'VND' && (
                            <div className="mt-2 p-2 bg-white rounded border">
                              <div className="text-xs font-medium text-gray-600 mb-1">권종별 매매시세</div>
                              <div className="grid grid-cols-2 gap-1 text-xs">
                                <div className="flex justify-between">
                                  <span>100달러:</span>
                                  <span className="font-medium text-red-600">
                                    {getDenominationRate('USD', 'VND', '100')?.myBuyRate ? 
                                      parseFloat(getDenominationRate('USD', 'VND', '100')?.myBuyRate).toLocaleString() : 
                                      '미적용'
                                    }
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span>50달러:</span>
                                  <span className="font-medium text-red-600">
                                    {getDenominationRate('USD', 'VND', '50')?.myBuyRate ? 
                                      parseFloat(getDenominationRate('USD', 'VND', '50')?.myBuyRate).toLocaleString() : 
                                      '미적용'
                                    }
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span>20달러:</span>
                                  <span className="font-medium text-red-600">
                                    {getDenominationRate('USD', 'VND', '20_10')?.myBuyRate ? 
                                      parseFloat(getDenominationRate('USD', 'VND', '20_10')?.myBuyRate).toLocaleString() : 
                                      '미적용'
                                    }
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span>5달러:</span>
                                  <span className="font-medium text-red-600">
                                    {getDenominationRate('USD', 'VND', '5_2_1')?.myBuyRate ? 
                                      parseFloat(getDenominationRate('USD', 'VND', '5_2_1')?.myBuyRate).toLocaleString() : 
                                      '미적용'
                                    }
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {/* KRW → VND 권종별 환율 */}
                          {inputCards[0].currency === 'KRW' && card.currency === 'VND' && (
                            <div className="mt-2 p-2 bg-white rounded border">
                              <div className="text-xs font-medium text-gray-600 mb-1">원화 권종별 시세</div>
                              <div className="grid grid-cols-1 gap-1 text-xs">
                                <div className="flex justify-between">
                                  <span>5만원권:</span>
                                  <span className="font-medium text-red-600">
                                    {getDenominationRate('KRW', 'VND', '50000')?.myBuyRate ? 
                                      parseFloat(getDenominationRate('KRW', 'VND', '50000')?.myBuyRate).toFixed(2) : 
                                      '미적용'
                                    }
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span>5천원/1천원권:</span>
                                  <span className="font-medium text-red-600">
                                    {getDenominationRate('KRW', 'VND', '5000_1000')?.myBuyRate ? 
                                      parseFloat(getDenominationRate('KRW', 'VND', '5000_1000')?.myBuyRate).toFixed(2) : 
                                      '미적용'
                                    }
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                        )}
                      </div>
                      
                      {/* VND Floor 차액 표시 */}
                      {card.currency === 'VND' && card.amount && (
                        (() => {
                          const originalAmount = parseCommaFormattedNumber(card.amount);
                          const floorDiff = calculateVNDFloorDifference(originalAmount);
                          return floorDiff > 0 ? (
                            <div className="p-3 bg-yellow-50 border border-yellow-300 rounded-lg">
                              <div className="flex items-center gap-2 mb-1">
                                <AlertTriangle className="w-4 h-4 text-yellow-600" />
                                <span className="text-sm font-medium text-yellow-800">VND Floor 처리</span>
                              </div>
                              <div className="text-xs text-yellow-700 space-y-1">
                                <div>원래 금액: {originalAmount.toLocaleString()} VND</div>
                                <div>처리 금액: {(originalAmount - floorDiff).toLocaleString()} VND</div>
                                {/* 사업자용 수익 정보는 숨김 처리 */}
                                <div className="font-medium text-yellow-800 hidden">
                                  차액: {floorDiff.toLocaleString()} VND (사업자 수익)
                                </div>
                              </div>
                            </div>
                          ) : null;
                        })()
                      )}
                    </div>
                  )}

                  {/* 권종별 분배 UI */}
                  {renderDenominationInputs(card, true)}

                  {/* 보유량 부족 경고 */}
                  {!validateInventory(card).isValid && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center gap-2 text-red-800 mb-1">
                        <AlertCircle className="w-4 h-4" />
                        <span className="font-semibold text-sm">보유량 부족</span>
                      </div>
                      <div className="text-xs text-red-700 space-y-1">
                        {validateInventory(card).errors.map((error, idx) => (
                          <div key={idx}>• {error}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          ))}
          
          {outputCards.length === 0 && (
            <Card className="border-dashed border-2 border-blue-300 bg-blue-50">
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Wallet className="mx-auto mb-2 text-blue-400" size={32} />
                  <p className="text-blue-600 font-medium">출금 카드를 추가하세요</p>
                  <p className="text-sm text-blue-500 mt-1">고객에게 지급할 자산</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
        
        {/* 출금 카드와 고객 계좌 정보 연결 화살표 */}
        {outputCards.some(card => card.type === 'account') && (
          <div className="flex flex-col items-center py-2">
            <div className="animate-bounce">
              <ArrowDownLeft className="text-orange-500" size={24} />
            </div>
            <div className="text-xs text-orange-600 font-medium">계좌 이체 정보 입력</div>
          </div>
        )}

        {/* 고객 계좌 정보 - 출금 카드에 계좌가 있을 때 바로 표시 */}
        {outputCards.some(card => card.type === 'account') && (
          <div className="border border-orange-200 rounded-lg p-4 bg-gradient-to-br from-orange-50 to-yellow-50 transform transition-all duration-500 animate-in slide-in-from-top-4 shadow-sm hover:shadow-md">
            <div className="flex items-center mb-3">
              <div className="bg-orange-100 p-1 rounded-full mr-3">
                <Banknote className="text-orange-600" size={18} />
              </div>
              <Label className="text-base font-semibold text-orange-800">고객 계좌 정보 (필수)</Label>
              <div className="ml-auto flex items-center gap-2">
                {(() => {
                  const completedFields = [
                    customerAccountInfo.bankName,
                    customerAccountInfo.accountNumber,
                    customerAccountInfo.accountHolder
                  ].filter(field => field.trim()).length;
                  
                  return (
                    <div className="flex items-center text-xs">
                      <div className="w-16 bg-gray-200 rounded-full h-1.5 mr-2">
                        <div 
                          className="bg-orange-500 h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${(completedFields / 3) * 100}%` }}
                        />
                      </div>
                      <span className="text-orange-600 font-medium">{completedFields}/3</span>
                    </div>
                  );
                })()}
              </div>
            </div>
            {/* 모바일 최적화: 스택 레이아웃과 더 큰 터치 영역 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bankName" className="text-sm font-medium text-orange-800">
                  수신 은행명 <span className="text-red-500">*</span>
                </Label>
                <Input
                  ref={bankNameInputRef}
                  id="bankName"
                  placeholder="예: 신한은행"
                  value={customerAccountInfo.bankName}
                  onChange={(e) => setCustomerAccountInfo(prev => ({...prev, bankName: e.target.value}))}
                  className={`h-12 text-base ${customerAccountInfo.bankName ? "border-green-300 bg-green-50 shadow-sm" : "border-orange-200"} focus:border-orange-400 focus:ring-orange-200 transition-all duration-200`}
                  data-testid="input-bank-name"
                />
                {customerAccountInfo.bankName && (
                  <div className="text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle size={12} />
                    입력 완료
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="accountNumber" className="text-sm font-medium text-orange-800">
                  수신 계좌번호 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="accountNumber"
                  type="text"
                  inputMode="numeric"
                  placeholder="예: 110-123-456789"
                  value={customerAccountInfo.accountNumber}
                  onChange={(e) => setCustomerAccountInfo(prev => ({...prev, accountNumber: e.target.value}))}
                  className={`h-12 text-base ${customerAccountInfo.accountNumber ? "border-green-300 bg-green-50 shadow-sm" : "border-orange-200"} focus:border-orange-400 focus:ring-orange-200 transition-all duration-200`}
                  data-testid="input-account-number"
                />
                {customerAccountInfo.accountNumber && (
                  <div className="text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle size={12} />
                    입력 완료
                  </div>
                )}
              </div>
              
              <div className="space-y-2 sm:col-span-2 lg:col-span-1">
                <Label htmlFor="accountHolder" className="text-sm font-medium text-orange-800">
                  수신 예금주명 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="accountHolder"
                  placeholder="예: 김철수"
                  value={customerAccountInfo.accountHolder}
                  onChange={(e) => setCustomerAccountInfo(prev => ({...prev, accountHolder: e.target.value}))}
                  className={`h-12 text-base ${customerAccountInfo.accountHolder ? "border-green-300 bg-green-50 shadow-sm" : "border-orange-200"} focus:border-orange-400 focus:ring-orange-200 transition-all duration-200`}
                  data-testid="input-account-holder"
                />
                {customerAccountInfo.accountHolder && (
                  <div className="text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle size={12} />
                    입력 완료
                  </div>
                )}
              </div>
            </div>
            
            {/* 모바일에서 완성도 표시 */}
            <div className="block sm:hidden mt-3">
              <div className="flex items-center justify-between p-2 bg-orange-100 rounded-lg">
                <span className="text-sm font-medium text-orange-800">입력 진행도</span>
                <div className="flex items-center gap-2">
                  <div className="w-20 bg-orange-200 rounded-full h-2">
                    <div 
                      className="bg-orange-600 h-2 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${([customerAccountInfo.bankName, customerAccountInfo.accountNumber, customerAccountInfo.accountHolder].filter(f => f.trim()).length / 3) * 100}%` 
                      }}
                    />
                  </div>
                  <span className="text-sm font-medium text-orange-700">
                    {[customerAccountInfo.bankName, customerAccountInfo.accountNumber, customerAccountInfo.accountHolder].filter(f => f.trim()).length}/3
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-4 p-3 bg-white rounded border-l-4 border-l-orange-400">
              <div className="flex items-start gap-2">
                <div className="bg-orange-100 p-1 rounded-full">
                  <CheckCircle className="text-orange-600" size={12} />
                </div>
                <div className="text-xs text-orange-700">
                  <div className="font-medium mb-1">📝 중요 안내사항</div>
                  <div>• 실제 계좌이체를 위해 정확한 정보를 입력해 주세요</div>
                  <div>• 입력된 정보는 거래 기록에 안전하게 저장됩니다</div>
                  <div>• 계좌번호는 대시(-) 포함하여 입력 가능합니다</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 카드 연결 시각화 */}
      {renderCardConnections()}

      {/* 실시간 잔고 추적 */}
      {(inputCards.length > 0 || outputCards.length > 0) && (() => {
        const balanceTracking = calculateBalanceTracking();
        const hasChanges = Object.values(balanceTracking).some(balance => balance.change !== 0);
        
        return hasChanges ? (
          <Card className="border-2 border-orange-200 bg-gradient-to-r from-orange-50 to-yellow-50">
            <CardHeader>
              <CardTitle className="flex items-center text-lg text-orange-800">
                <Activity className="mr-2" size={20} />
                실시간 잔고 추적
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(balanceTracking)
                  .sort(([keyA, balanceA], [keyB, balanceB]) => {
                    // 입금(양수)을 왼쪽에, 출금(음수)을 오른쪽에 배치
                    if (balanceA.change > 0 && balanceB.change < 0) return -1;
                    if (balanceA.change < 0 && balanceB.change > 0) return 1;
                    // 같은 타입 내에서는 알파벳 순서
                    return keyA.localeCompare(keyB);
                  })
                  .map(([key, balance]) => {
                  if (balance.change === 0) return null;
                  
                  const [currency, type] = key.split('_');
                  const isIncrease = balance.change > 0;
                  
                  // 통화 단위 표시 개선
                  const currencyDisplay = currency === 'KRW' ? '원' : currency === 'VND' ? '동' : currency === 'USD' ? '달러' : currency;
                  
                  // 변화 유형 표시 개선 (사업자 관점)
                  const changeLabel = isIncrease ? '입금' : '지급';
                  const changeDescription = `${currencyDisplay} ${type === 'cash' ? '현금' : '계좌'} ${changeLabel}`;
                  
                  return (
                    <div key={key} className={`p-3 rounded-lg border ${
                      isIncrease ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">
                          {currency} {type === 'cash' ? '현금' : '계좌'}
                        </span>
                        <Badge className={`text-xs ${
                          isIncrease ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {changeLabel}
                        </Badge>
                      </div>
                      
                      {/* 자산명 표시 (계좌의 경우) */}
                      {balance.assetName && type === 'account' && (
                        <div className="text-xs text-gray-500 mb-2">
                          {balance.assetName}
                        </div>
                      )}
                      
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">현재:</span>
                          <span className="font-medium">
                            {formatCurrency(balance.current, currency)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">예상:</span>
                          <span className={`font-bold ${
                            isIncrease ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {formatCurrency(balance.projected, currency)}
                          </span>
                        </div>
                        <div className="flex justify-between border-t pt-1">
                          <span className="text-gray-600">변화:</span>
                          <span className={`font-bold ${
                            isIncrease ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {isIncrease ? '+' : ''}{formatCurrency(balance.change, currency)}
                          </span>
                        </div>
                      </div>
                      
                      {/* 시각적 바 */}
                      <div className="mt-3">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all duration-300 ${
                              isIncrease ? 'bg-green-500' : 'bg-red-500'
                            }`}
                            style={{ 
                              width: `${Math.min(100, Math.abs((balance.change / balance.current) * 100))}%` 
                            }}
                          />
                        </div>
                        <div className="text-xs text-gray-500 mt-1 text-center">
                          {((Math.abs(balance.change) / balance.current) * 100).toFixed(1)}% 변화
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* 잔고 변화 요약 */}
              <div className="mt-4 p-3 bg-white rounded-lg border">
                <h4 className="text-sm font-medium text-gray-700 mb-2">💡 잔고 변화 요약</h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1">
                    <div className="text-gray-600">총 입금 금액:</div>
                    <div className="font-medium text-green-600">
                      {Object.entries(balanceTracking)
                        .filter(([key, b]) => b.change > 0)
                        .reduce((sum, [key, b]) => sum + Math.abs(b.change), 0)
                        .toLocaleString()} {Object.entries(balanceTracking).find(([key, b]) => b.change > 0)?.[0].split('_')[0] || 'KRW'}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-gray-600">총 출금 금액:</div>
                    <div className="font-medium text-red-600">
                      {Object.entries(balanceTracking)
                        .filter(([key, b]) => b.change < 0)
                        .reduce((sum, [key, b]) => sum + Math.abs(b.change), 0)
                        .toLocaleString()} {Object.entries(balanceTracking).find(([key, b]) => b.change < 0)?.[0].split('_')[0] || 'KRW'}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null;
      })()}

      {/* 거래 요약 정보 */}
      {(inputCards.length > 0 || outputCards.length > 0) && (
        <Card className="border-2 border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50">
          <CardHeader>
            <CardTitle className="flex items-center text-lg text-indigo-800">
              <TrendingUp className="mr-2" size={20} />
              거래 요약
              {isHighValueTransaction() && (
                <Badge className="ml-2 bg-orange-100 text-orange-800 text-xs">고액거래</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
              <div className="grid grid-cols-2 md:grid-cols-1 gap-2 md:gap-0">
                <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                  <span className="text-gray-600 block text-xs">입금 카드</span>
                  <div className="text-xs font-bold text-green-700">
                    {totalInputAmount > 0 ? `${totalInputAmount.toLocaleString()} 원` : '0 원'}
                  </div>
                </div>
                <div className="text-center p-3 bg-white rounded-lg shadow-sm md:hidden">
                  <span className="text-gray-600 block text-xs">출금 카드</span>
                  <div className="text-xs font-bold text-blue-700">
                    {Object.entries(outputTotalsByCurrency).length > 0 ? 
                      Object.entries(outputTotalsByCurrency).map(([currency, amount]) => (
                        <div key={currency}>
                          {amount.toLocaleString()} {currency === 'VND' ? '동' : currency === 'USD' ? '달러' : currency === 'KRW' ? '원' : currency}
                        </div>
                      )) : 
                      <span>0 동</span>
                    }
                  </div>
                </div>
              </div>
              <div className="hidden md:block text-center p-3 bg-white rounded-lg shadow-sm">
                <span className="text-gray-600 block text-xs">출금 카드</span>
                <div className="text-xs font-bold text-blue-700">
                  {Object.entries(outputTotalsByCurrency).length > 0 ? 
                    Object.entries(outputTotalsByCurrency).map(([currency, amount]) => (
                      <div key={currency}>
                        {amount.toLocaleString()} {currency === 'VND' ? '동' : currency === 'USD' ? '달러' : currency === 'KRW' ? '원' : currency}
                      </div>
                    )) : 
                    <span>0 동</span>
                  }
                </div>
              </div>
              <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                <span className="text-gray-600 block text-xs">총 입금</span>
                <span className="text-lg font-bold text-green-600">
                  {formatCurrency(totalInputAmount, inputCards[0]?.currency || 'KRW')}
                </span>
              </div>
              <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                <span className="text-gray-600 block text-sm font-medium">총 출금</span>
                <div className="space-y-1">
                  {Object.entries(outputTotalsByCurrency).length > 0 ? 
                    Object.entries(outputTotalsByCurrency).map(([currency, amount]) => (
                      <div key={currency} className="text-lg font-bold text-blue-600">
                        {formatCurrency(amount, currency)}
                      </div>
                    )) : 
                    <span className="text-lg font-bold text-blue-600">-</span>
                  }
                </div>
              </div>
            </div>
            
            {/* 위험도 평가 표시 */}
            {inputCards.length > 0 && outputCards.length > 0 && (() => {
              const risk = assessTransactionRisk();
              return (
                <div className={`mt-4 p-3 rounded-lg border ${
                  risk.level === 'high' ? 'bg-red-50 border-red-200' :
                  risk.level === 'medium' ? 'bg-yellow-50 border-yellow-200' :
                  'bg-green-50 border-green-200'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className={`w-4 h-4 ${
                      risk.level === 'high' ? 'text-red-600' :
                      risk.level === 'medium' ? 'text-yellow-600' :
                      'text-green-600'
                    }`} />
                    <span className={`font-medium text-sm ${
                      risk.level === 'high' ? 'text-red-800' :
                      risk.level === 'medium' ? 'text-yellow-800' :
                      'text-green-800'
                    }`}>
                      위험도: {risk.level.toUpperCase()}
                    </span>
                    {calculateEstimatedFees && (
                      <Badge variant="outline" className="ml-auto text-xs">
                        예상 수익: {formatCurrency(calculateEstimatedFees(decomposeComplexTransaction()), 'KRW')}
                      </Badge>
                    )}
                  </div>
                  {risk.reasons.length > 0 && (
                    <div className="text-xs space-y-1">
                      {risk.reasons.map((reason, index) => (
                        <div key={index}>• {reason}</div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
            
            {/* 환율 정보 */}
            {inputCards.length > 0 && outputCards.length > 0 && (
              <div className="mt-4 p-4 bg-white rounded-lg shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowExchangeRates(!showExchangeRates)}
                    className="flex items-center gap-2 text-sm font-medium text-indigo-800 hover:bg-indigo-50"
                  >
                    <span>적용된 환율</span>
                    {showExchangeRates ? <EyeOff size={14} /> : <Eye size={14} />}
                  </Button>
                </div>
                {showExchangeRates && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    {outputCards.map((output, index) => {
                      const inputCurrency = inputCards[0]?.currency || 'VND';
                      if (inputCurrency === output.currency) return null;
                      const rate = getExchangeRate(inputCurrency, output.currency);
                      return (
                        <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                          <span className="font-medium">{inputCurrency} → {output.currency}:</span>
                          <span className="font-bold text-indigo-600">
                            {rate.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

          </CardContent>
        </Card>
      )}

      {/* 승인 단계 표시 */}
      {approvalRequired && (
        <Card className="border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50">
          <CardHeader>
            <CardTitle className="flex items-center text-lg text-purple-800">
              <CheckCircle className="mr-2" size={20} />
              승인 진행 상황
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              {['입력', '검토', '승인', '실행'].map((step, index) => (
                <div key={index} className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    index < approvalStep ? 'bg-green-500 text-white' :
                    index === approvalStep ? 'bg-purple-500 text-white' :
                    'bg-gray-200 text-gray-500'
                  }`}>
                    {index < approvalStep ? '✓' : index + 1}
                  </div>
                  <span className={`text-xs mt-1 ${
                    index <= approvalStep ? 'text-purple-800 font-medium' : 'text-gray-500'
                  }`}>
                    {step}
                  </span>
                  {index < 3 && (
                    <div className={`w-16 h-0.5 mt-2 ${
                      index < approvalStep ? 'bg-green-500' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>
            
            <div className="text-center p-3 bg-white rounded-lg">
              <span className="text-sm text-purple-700">
                현재 단계: <strong>{['데이터 입력', '거래 검토', '최종 승인', '거래 실행'][approvalStep]}</strong>
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 거래 미리보기 모달 */}
      {showPreview && (() => {
        const preview = generateTransactionPreview();
        return (
          <Card className="border-2 border-blue-300 bg-gradient-to-r from-blue-50 to-cyan-50">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center text-lg text-blue-800">
                  <Eye className="mr-2" size={20} />
                  거래 미리보기
                </CardTitle>
                <Button variant="ghost" onClick={() => setShowPreview(false)}>
                  <EyeOff size={16} />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 거래 요약 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div className="p-3 bg-white rounded border">
                  <div className="text-gray-600 text-xs">거래 수</div>
                  <div className="font-bold text-blue-600">{preview.transactions.length}건</div>
                </div>
                <div className="p-3 bg-white rounded border">
                  <div className="text-gray-600 text-xs">예상 시간</div>
                  <div className="font-bold text-blue-600">{preview.summary.estimatedTime}</div>
                </div>
                <div className="p-3 bg-white rounded border">
                  <div className="text-gray-600 text-xs">통화 종류</div>
                  <div className="font-bold text-blue-600">{preview.summary.currencies.length}개</div>
                </div>
                <div className="p-3 bg-white rounded border">
                  <div className="text-gray-600 text-xs">예상 수익</div>
                  <div className="font-bold text-green-600">
                    {formatCurrency(preview.summary.fees, 'KRW')}
                  </div>
                </div>
              </div>
              
              {/* 개별 거래 목록 */}
              <div className="space-y-2">
                <h4 className="font-medium text-blue-800">실행될 거래들</h4>
                {preview.transactions.map((transaction, index) => (
                  <div key={index} className="p-3 bg-white rounded border flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                        {index + 1}
                      </span>
                      <div>
                        <div className="font-medium text-sm">
                          {formatCurrency(transaction.fromAmount, transaction.fromCurrency)} {transaction.fromCurrency} → {formatCurrency(transaction.toAmount, transaction.toCurrency)} {transaction.toCurrency}
                        </div>
                        <div className="text-xs text-gray-500">
                          환율: {transaction.exchangeRate.toFixed(2)}
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {TRANSACTION_TYPES.find(t => t.value === transaction.type)?.label || transaction.type}
                    </Badge>
                  </div>
                ))}
              </div>

              {/* 상세 수수료 분석 */}
              {(() => {
                const feeAnalysis = calculateDetailedFees(preview.transactions);
                return (
                  <div className="space-y-3">
                    <h4 className="font-medium text-blue-800">💰 수수료 분석</h4>
                    
                    {/* 수수료 요약 */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                      <div className="p-2 bg-green-50 border border-green-200 rounded">
                        <div className="text-green-600 text-xs">환전 수수료</div>
                        <div className="font-bold text-green-700">
                          {formatCurrency(feeAnalysis.breakdown.exchangeFees, 'KRW')}
                        </div>
                      </div>
                      <div className="p-2 bg-blue-50 border border-blue-200 rounded">
                        <div className="text-blue-600 text-xs">이체 수수료</div>
                        <div className="font-bold text-blue-700">
                          {formatCurrency(feeAnalysis.breakdown.transferFees, 'KRW')}
                        </div>
                      </div>
                      <div className="p-2 bg-yellow-50 border border-yellow-200 rounded hidden">
                        <div className="text-yellow-600 text-xs">VND Floor 수익</div>
                        <div className="font-bold text-yellow-700">
                          {formatCurrency(feeAnalysis.breakdown.vndFloorProfit, 'KRW')}
                        </div>
                      </div>
                      <div className="p-2 bg-purple-50 border border-purple-200 rounded">
                        <div className="text-purple-600 text-xs">처리 수수료</div>
                        <div className="font-bold text-purple-700">
                          {formatCurrency(feeAnalysis.breakdown.processingFees, 'KRW')}
                        </div>
                      </div>
                    </div>
                    
                    {/* 거래별 수수료 상세 */}
                    <div className="space-y-2">
                      <h5 className="text-sm font-medium text-gray-700">거래별 수수료 내역</h5>
                      {feeAnalysis.transactions.map((txFee, index) => (
                        <div key={index} className="p-2 bg-gray-50 rounded border text-xs">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-medium">
                              거래 {txFee.index}: {formatCurrency(txFee.amount, txFee.currency)} {txFee.currency}
                            </span>
                            <span className="font-bold text-green-600">
                              {formatCurrency(txFee.fees.total, 'KRW')}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-1 text-xs text-gray-600">
                            {txFee.fees.exchange > 0 && (
                              <div>환전: {formatCurrency(txFee.fees.exchange, 'KRW')}</div>
                            )}
                            {txFee.fees.transfer > 0 && (
                              <div>이체: {formatCurrency(txFee.fees.transfer, 'KRW')}</div>
                            )}
                            {txFee.fees.vndFloor > 0 && (
                              <div>VND Floor: {formatCurrency(txFee.fees.vndFloor, 'KRW')}</div>
                            )}
                            {txFee.fees.processing > 0 && (
                              <div>처리: {formatCurrency(txFee.fees.processing, 'KRW')}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* 총 수익 요약 */}
                    <div className="p-3 bg-gradient-to-r from-green-100 to-blue-100 border-2 border-green-300 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-green-800">총 예상 수익</span>
                        <span className="text-xl font-bold text-green-700">
                          {formatCurrency(feeAnalysis.breakdown.total, 'KRW')}
                        </span>
                      </div>
                      <div className="text-xs text-green-600 mt-1">
                        수익률: {((feeAnalysis.breakdown.total / (totalInputAmount || 1)) * 100).toFixed(2)}%
                      </div>
                    </div>
                  </div>
                );
              })()}
              
              {/* 위험 요소 */}
              {preview.risk.reasons.length > 0 && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <div className="font-medium text-yellow-800 text-sm mb-1">주의사항</div>
                  <div className="text-xs text-yellow-700 space-y-1">
                    {preview.risk.reasons.map((reason, index) => (
                      <div key={index}>• {reason}</div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowPreview(false)}>
                  닫기
                </Button>
                <Button onClick={proceedToNextStep} className="bg-green-500 hover:bg-green-600">
                  승인 진행
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* 실행 버튼 */}
      <div className="flex justify-end space-x-4 sticky bottom-4 bg-white p-4 rounded-lg shadow-lg border">
        <Button variant="outline" onClick={onClose} className="min-w-24">
          취소
        </Button>
        {!approvalRequired ? (
          <Button 
            onClick={handleStepByStepProcess}
            disabled={!isSubmitButtonEnabled || processTransactionMutation.isPending}
            className={`min-w-32 ${isSubmitButtonEnabled ? 'bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600' : ''}`}
            data-testid="button-submit-transaction"
          >
            {processTransactionMutation.isPending ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                처리중...
              </>
            ) : isHighValueTransaction() ? (
              <>
                <AlertCircle className="mr-2 h-4 w-4" />
                검토 및 실행
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                거래 실행
              </>
            )}
          </Button>
        ) : (
          <div className="flex space-x-2">
            <Button variant="outline" onClick={cancelApproval} className="min-w-24">
              취소
            </Button>
            {approvalStep === 1 && (
              <Button 
                onClick={() => setShowPreview(true)}
                className="min-w-32 bg-blue-500 hover:bg-blue-600"
              >
                <Eye className="mr-2 h-4 w-4" />
                미리보기
              </Button>
            )}
            {approvalStep === 2 && (
              <Button 
                onClick={proceedToNextStep}
                className="min-w-32 bg-orange-500 hover:bg-orange-600"
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                최종 승인
              </Button>
            )}
            {approvalStep > 0 && approvalStep < 2 && (
              <Button 
                onClick={proceedToNextStep}
                className="min-w-32 bg-green-500 hover:bg-green-600"
              >
                <ArrowRight className="mr-2 h-4 w-4" />
                다음 단계
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}