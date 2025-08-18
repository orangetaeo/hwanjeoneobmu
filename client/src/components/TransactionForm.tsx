import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Calculator, ArrowRightLeft, RefreshCw, User, Banknote, TrendingUp } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface Asset {
  id: string;
  name: string;
  type: string;
  currency: string;
  balance: string;
  metadata?: any;
}

interface ExchangeRate {
  rate: number;
  source: string;
}

// 권종별 설정
const CURRENCY_DENOMINATIONS = {
  USD: [
    { value: "100", label: "100달러" },
    { value: "50", label: "50달러" },
    { value: "20_10", label: "20/10달러" },
    { value: "5_2_1", label: "5/2/1달러" }
  ],
  KRW: [
    { value: "50000", label: "5만원" },
    { value: "10000", label: "1만원" },
    { value: "5000", label: "5천원" },
    { value: "1000", label: "1천원" }
  ]
};

// 거래 유형별 설정
const TRANSACTION_TYPES = [
  { value: "cash_exchange", label: "현금 환전", icon: ArrowRightLeft },
  { value: "bank_transfer", label: "계좌 송금 환전(카카오뱅크 3333-03-1258874 예금주:김학태)", icon: Banknote },
  { value: "foreign_to_account", label: "외화 수령 → 원화 계좌이체", icon: TrendingUp }
];

export default function TransactionForm() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // 상태 관리
  const [formData, setFormData] = useState({
    transactionType: "cash_exchange",
    fromCurrency: "KRW",
    toCurrency: "VND",
    fromDenominations: [] as string[], // 여러 권종 선택
    toDenomination: "",
    denominationAmounts: {} as Record<string, string>, // 권종별 수량
    fromAmount: "",
    toAmount: "",
    exchangeRate: "",
    customerName: "",
    customerPhone: "",
    memo: "",
    fromAssetId: "",
    toAssetId: ""
  });

  // VND 권종별 분배 수정용 상태
  const [vndBreakdown, setVndBreakdown] = useState<Record<string, number>>({});

  // 권종별 환율의 평균 계산
  const calculateAverageExchangeRate = () => {
    const totalFromAmount = calculateTotalFromAmount();
    const totalToAmount = parseFloat(formData.toAmount);
    
    if (totalFromAmount > 0 && totalToAmount > 0) {
      return totalToAmount / totalFromAmount;
    }
    return parseFloat(formData.exchangeRate) || 0;
  };

  // VND 원본 계산값 저장 (내림 전)
  const [vndOriginalAmount, setVndOriginalAmount] = useState<number>(0);

  const [calculatedData, setCalculatedData] = useState({
    exchangeRate: 0,
    rateSource: "",
    isAutoCalculated: false
  });

  // 자산 목록 조회
  const { data: assets = [], isLoading: isLoadingAssets } = useQuery({
    queryKey: ["/api/assets"],
  });

  // 환율 목록 조회
  const { data: exchangeRates = [], isLoading: isLoadingRates } = useQuery({
    queryKey: ["/api/exchange-rates"],
  });

  // 환전상 시세 조회 (자동 환율 적용용)
  const fetchExchangeRate = async (fromCurrency: string, toCurrency: string, denomination: string, transactionType: 'buy' | 'sell') => {
    try {
      const response = await fetch(
        `/api/exchange-rates/transaction?fromCurrency=${fromCurrency}&toCurrency=${toCurrency}&denomination=${denomination}&transactionType=${transactionType}`
      );
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("환율 조회 실패:", error);
      return null;
    }
  };

  // 거래 생성 mutation
  const createTransactionMutation = useMutation({
    mutationFn: (transactionData: any) => apiRequest("POST", "/api/transactions", transactionData),
    onSuccess: () => {
      toast({
        title: "새거래 처리 완료",
        description: "거래가 성공적으로 처리되었습니다.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      
      // 폼 초기화
      setFormData({
        transactionType: "cash_exchange",
        fromCurrency: "KRW",
        toCurrency: "VND",
        fromDenominations: [],
        toDenomination: "",
        denominationAmounts: {},
        fromAmount: "",
        toAmount: "",
        exchangeRate: "",
        customerName: "",
        customerPhone: "",
        memo: "",
        fromAssetId: "",
        toAssetId: ""
      });
      setCalculatedData({
        exchangeRate: 0,
        rateSource: "",
        isAutoCalculated: false
      });
    },
    onError: (error: any) => {
      console.error("거래 생성 오류:", error);
      toast({
        variant: "destructive",
        title: "거래 처리 실패",
        description: error?.response?.data?.error || "거래 처리에 실패했습니다.",
      });
    }
  });

  // 자동 환율 적용
  const handleAutoExchangeRate = async () => {
    if (!formData.fromCurrency || !formData.toCurrency) {
      toast({
        variant: "destructive",
        title: "환율 조회 실패",
        description: "통화를 먼저 선택하세요.",
      });
      return;
    }

    // 거래 유형에 따른 buy/sell 결정
    const transactionType = formData.fromCurrency === "VND" ? "sell" : "buy";
    
    // 선택된 권종 중 첫 번째를 기준으로 환율 조회
    const denomination = formData.fromDenominations.length > 0 ? formData.fromDenominations[0] : "50000";
    
    const rate = await fetchExchangeRate(
      formData.fromCurrency,
      formData.toCurrency,
      denomination,
      transactionType
    );

    if (rate) {
      setCalculatedData({
        exchangeRate: rate.rate,
        rateSource: rate.source,
        isAutoCalculated: true
      });
      setFormData({ ...formData, exchangeRate: rate.rate.toString() });
      
      toast({
        title: "환율 적용 완료",
        description: `${rate.source} 환율이 적용되었습니다.`,
      });
    } else {
      toast({
        variant: "destructive",
        title: "환율 조회 실패",
        description: "해당 조건의 환율을 찾을 수 없습니다.",
      });
    }
  };

  // 금액 자동 계산
  const handleAmountCalculation = (sourceField: 'fromAmount' | 'toAmount', value: string) => {
    const rate = parseFloat(formData.exchangeRate);
    if (!rate || rate <= 0) return;

    const amount = parseFloat(value);
    if (isNaN(amount)) return;

    if (sourceField === 'fromAmount') {
      const calculatedTo = (amount * rate).toFixed(2);
      setFormData({ ...formData, fromAmount: value, toAmount: calculatedTo });
    } else {
      const calculatedFrom = (amount / rate).toFixed(2);
      setFormData({ ...formData, toAmount: value, fromAmount: calculatedFrom });
    }
  };

  // 권종별 총액 계산 (수량 × 권종 가치)
  const calculateTotalFromAmount = () => {
    let total = 0;
    Object.entries(formData.denominationAmounts).forEach(([denomination, quantity]) => {
      const qty = parseFloat(quantity as string);
      if (!isNaN(qty) && qty > 0) {
        const denominationValue = getDenominationValue(formData.fromCurrency, denomination);
        const subtotal = qty * denominationValue;
        console.log(`권종 계산: ${denomination} × ${qty}장 = ${subtotal} ${formData.fromCurrency}`);
        total += subtotal;
      }
    });
    console.log(`총 합계: ${total} ${formData.fromCurrency}`);
    return total;
  };

  // 특정 권종의 환율 정보 조회
  const getDenominationRate = (fromCurrency: string, toCurrency: string, denomination: string) => {
    if (!Array.isArray(exchangeRates)) return null;
    
    // KRW 5천원권과 1천원권의 경우 5/1천원권 매도 시세 사용
    let searchDenomination = denomination;
    if (fromCurrency === "KRW" && (denomination === "5000" || denomination === "1000")) {
      searchDenomination = "5000_1000";
    }
    
    return exchangeRates.find((rate: any) => 
      rate.fromCurrency === fromCurrency && 
      rate.toCurrency === toCurrency && 
      rate.denomination === searchDenomination
    );
  };

  // 환율 포맷팅 함수
  const formatRate = (rate: number, currency: string) => {
    if (currency === "KRW") {
      return rate.toLocaleString('ko-KR', { maximumFractionDigits: 2 });
    } else {
      return rate.toLocaleString('ko-KR', { maximumFractionDigits: 0 });
    }
  };

  // 권종 가치 계산 함수
  const getDenominationValue = (currency: string, denomination: string): number => {
    if (currency === "KRW") {
      if (denomination === "50000") return 50000;
      if (denomination === "10000") return 10000;
      if (denomination === "5000") return 5000;
      if (denomination === "1000") return 1000;
      if (denomination === "5000_1000") return 6000; // 5천원 + 1천원 조합 (기존 호환성)
    } else if (currency === "USD") {
      return parseInt(denomination) || 0;
    } else if (currency === "VND") {
      return parseInt(denomination) || 0;
    }
    return 0;
  };

  // VND 권종별 분배 계산 (고액권부터 우선 분배)
  const calculateVNDBreakdown = (totalAmount: number) => {
    const vndDenominations = [500000, 200000, 100000, 50000, 20000, 10000];
    const breakdown: { [key: string]: number } = {};
    let remaining = totalAmount;

    for (const denom of vndDenominations) {
      if (remaining >= denom) {
        const count = Math.floor(remaining / denom);
        breakdown[denom.toString()] = count;
        remaining = remaining % denom;
      }
    }

    return breakdown;
  };

  // VND 권종별 분배에서 총액 계산
  const calculateTotalFromVNDBreakdown = (breakdown: Record<string, number>) => {
    return Object.entries(breakdown).reduce((total, [denom, count]) => {
      return total + (parseInt(denom) * count);
    }, 0);
  };

  // VND 권종별 분배 수정 핸들러
  const handleVNDBreakdownChange = (denomination: string, newCount: number) => {
    const updatedBreakdown = {
      ...vndBreakdown,
      [denomination]: Math.max(0, newCount)
    };
    setVndBreakdown(updatedBreakdown);
    
    // 총액 재계산 및 formData 업데이트
    const newTotal = calculateTotalFromVNDBreakdown(updatedBreakdown);
    setFormData(prev => ({ ...prev, toAmount: newTotal.toString() }));
  };

  // 권종별 금액이 변경될 때 총액 업데이트 및 환율 자동 설정
  useEffect(() => {
    if (formData.transactionType === "cash_exchange") {
      const total = calculateTotalFromAmount();
      setFormData(prev => ({ ...prev, fromAmount: total.toString() }));
      
      // 입력된 수량이 없으면 VND 분배도 초기화
      if (Object.keys(formData.denominationAmounts).length === 0 || total === 0) {
        setVndBreakdown({});
        setVndOriginalAmount(0);
        setFormData(prev => ({ ...prev, toAmount: "0" }));
        return;
      }
      
      // 권종별 매도 시세 합계로 정확한 금액 계산 (소수점 보존)
      const calculatedToAmount = formData.fromDenominations.reduce((totalAmount, denomValue) => {
        const amount = parseFloat(formData.denominationAmounts[denomValue] || "0");
        if (amount <= 0) return totalAmount;
        
        const rateInfo = getDenominationRate(formData.fromCurrency, formData.toCurrency, denomValue);
        const rate = formData.fromCurrency === "KRW" ? parseFloat(rateInfo?.mySellRate || "0") : parseFloat(rateInfo?.myBuyRate || "0");
        const totalValue = amount * getDenominationValue(formData.fromCurrency, denomValue);
        const calculatedValue = totalValue * rate;
        console.log(`계산: ${totalValue} * ${rate} = ${calculatedValue}`);
        return totalAmount + calculatedValue;
      }, 0);
      
      if (calculatedToAmount > 0) {
        // VND의 경우 원본값 저장하고 무조건 내림 적용
        if (formData.toCurrency === "VND") {
          console.log("Setting VND original amount:", calculatedToAmount);
          console.log("VND original has decimal:", calculatedToAmount % 1 !== 0);
          setVndOriginalAmount(calculatedToAmount);
          const finalAmount = formatVNDWithFloor(calculatedToAmount);
          console.log("VND floored amount:", finalAmount);
          console.log("Difference:", calculatedToAmount - finalAmount);
          
          setFormData(prev => ({ 
            ...prev, 
            toAmount: finalAmount.toString(),
            exchangeRate: (finalAmount / total).toString()
          }));
          
          // VND인 경우 권종별 분배도 업데이트
          const breakdown = calculateVNDBreakdown(finalAmount);
          setVndBreakdown(breakdown);
        } else {
          setVndOriginalAmount(0); // 다른 통화는 0으로 리셋
          const finalAmount = Math.floor(calculatedToAmount);
          setFormData(prev => ({ 
            ...prev, 
            toAmount: finalAmount.toString(),
            exchangeRate: (finalAmount / total).toString()
          }));
        }
      } else {
        // 계산된 금액이 0이면 모든 것을 초기화
        setVndBreakdown({});
        setVndOriginalAmount(0);
        setFormData(prev => ({ ...prev, toAmount: "0" }));
      }
    }
  }, [formData.denominationAmounts, formData.transactionType, formData.fromDenominations]);

  // 통화별 자산 필터링
  const getAssetsByCurrency = (currency: string) => {
    return Array.isArray(assets) ? assets.filter((asset: any) => asset.currency === currency) : [];
  };

  // 폼 제출 처리
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 필수 입력 검증
    if (!formData.fromCurrency || !formData.toCurrency || !formData.fromAmount || !formData.exchangeRate) {
      toast({
        variant: "destructive",
        title: "입력 오류",
        description: "필수 항목을 모두 입력하세요.",
      });
      return;
    }

    // 고객 정보는 선택사항이므로 검증 제거

    // 권종별 보유 수량 검증 (VND 분배)
    if (formData.toCurrency === "VND" && Object.keys(vndBreakdown).length > 0) {
      const vndCashAsset = Array.isArray(assets) ? assets.find((asset: any) => 
        asset.name === "VND 현금" && asset.currency === "VND" && asset.type === "cash"
      ) : null;
      
      if (vndCashAsset?.metadata?.denominations) {
        const denomComposition = vndCashAsset.metadata.denominations;
        for (const [denom, requiredCount] of Object.entries(vndBreakdown)) {
          const availableCount = denomComposition[denom] || 0;
          if (requiredCount > availableCount) {
            toast({
              variant: "destructive",
              title: "보유 수량 부족",
              description: `${parseInt(denom).toLocaleString()} VND 권종이 ${requiredCount - availableCount}장 부족합니다.`,
            });
            return;
          }
        }
      }
    }

    // VND 내림으로 인한 수익 계산
    let floorProfit = 0;
    if (formData.toCurrency === "VND" && vndOriginalAmount > 0) {
      const flooredAmount = formatVNDWithFloor(vndOriginalAmount);
      floorProfit = vndOriginalAmount - flooredAmount;
    }

    // 거래 데이터 구성
    const transactionData = {
      type: formData.transactionType,
      fromAssetType: formData.fromCurrency === "VND" ? "cash" : (formData.fromCurrency === "USD" ? "cash" : "account"),
      fromAssetId: formData.fromAssetId,
      fromAssetName: `${formData.fromCurrency} 현금`,
      toAssetType: formData.toCurrency === "VND" ? "cash" : (formData.toCurrency === "USD" ? "cash" : "account"),
      toAssetId: formData.toAssetId,
      toAssetName: `${formData.toCurrency} 현금`,
      fromAmount: formData.fromAmount,
      toAmount: formData.toAmount,
      rate: formData.exchangeRate,
      fees: "0",
      profit: floorProfit.toString(),
      memo: formData.memo,
      metadata: {
        customerName: formData.customerName,
        customerPhone: formData.customerPhone,
        fromDenominations: formData.fromDenominations,
        denominationAmounts: formData.denominationAmounts,
        toDenomination: formData.toDenomination,
        exchangeRateSource: calculatedData.rateSource,
        isAutoCalculated: calculatedData.isAutoCalculated,
        floorProfit: floorProfit // VND 내림으로 인한 수익
      },
      status: "confirmed"
    };

    createTransactionMutation.mutate(transactionData);
  };

  // VND 천 단위 무조건 내림 함수 (환전상 지급 규칙)
  const formatVNDWithFloor = (amount: number) => {
    // 10,000원 단위에서 무조건 내림 처리 (천 단위 3자리 버림)
    return Math.floor(amount / 10000) * 10000;
  };

  // 숫자 포맷팅 함수 (통화별 처리)
  const formatNumber = (num: string | number, currency?: string) => {
    if (!num) return "";
    const numValue = typeof num === "string" ? parseFloat(num) : num;
    
    // VND의 경우 무조건 내림 적용
    if (currency === "VND") {
      const floorValue = formatVNDWithFloor(numValue);
      return floorValue.toLocaleString('ko-KR', { maximumFractionDigits: 0 });
    }
    
    return numValue.toLocaleString('ko-KR', { maximumFractionDigits: 2 });
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <Calculator className="w-6 h-6 text-green-600" />
        <h2 className="text-2xl font-bold">새거래</h2>
        <Badge variant="outline" className="ml-auto">
          고객 대면 거래 시스템
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5" />
            거래 정보 입력
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 거래 유형 선택 */}
            <div>
              <Label>거래 유형</Label>
              <Select 
                value={formData.transactionType} 
                onValueChange={(value) => setFormData({ ...formData, transactionType: value })}
              >
                <SelectTrigger data-testid="select-transaction-type">
                  <SelectValue placeholder="거래 유형 선택" />
                </SelectTrigger>
                <SelectContent>
                  {TRANSACTION_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 통화쌍 선택 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>받는 통화 (From)</Label>
                <Select 
                  value={formData.fromCurrency} 
                  onValueChange={(value) => setFormData({ ...formData, fromCurrency: value, fromDenominations: [], denominationAmounts: {} })}
                >
                  <SelectTrigger data-testid="select-from-currency">
                    <SelectValue placeholder="통화 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="KRW">KRW (한국 원)</SelectItem>
                    <SelectItem value="USD">USD (미국 달러)</SelectItem>
                    <SelectItem value="VND">VND (베트남 동)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>주는 통화 (To)</Label>
                <Select 
                  value={formData.toCurrency} 
                  onValueChange={(value) => setFormData({ ...formData, toCurrency: value, toDenomination: "" })}
                >
                  <SelectTrigger data-testid="select-to-currency">
                    <SelectValue placeholder="통화 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VND">VND (베트남 동)</SelectItem>
                    <SelectItem value="KRW">KRW (한국 원)</SelectItem>
                    <SelectItem value="USD">USD (미국 달러)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 권종 선택 - 모바일 최적화 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <Label>받는 권종</Label>
                {formData.transactionType === "bank_transfer" || formData.transactionType === "foreign_to_account" ? (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="총 금액 입력"
                      value={formData.fromAmount}
                      onChange={(e) => setFormData({ ...formData, fromAmount: e.target.value })}
                      data-testid="input-total-amount"
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      계좌이체/송금 시 총 금액만 입력
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {CURRENCY_DENOMINATIONS[formData.fromCurrency as keyof typeof CURRENCY_DENOMINATIONS]?.map((denom) => {
                      const rateInfo = getDenominationRate(formData.fromCurrency, formData.toCurrency, denom.value);
                      const isSelected = formData.fromDenominations.includes(denom.value);
                      const hasData = formData.denominationAmounts[denom.value] && parseFloat(formData.denominationAmounts[denom.value]) > 0;
                      const useRate = formData.fromCurrency === "KRW" ? parseFloat(rateInfo?.mySellRate || "0") : parseFloat(rateInfo?.myBuyRate || "0");
                      
                      return (
                        <div 
                          key={denom.value} 
                          className={`border rounded-lg p-2 transition-all shadow-sm cursor-pointer ${isSelected ? 'border-green-500 bg-green-50 ring-2 ring-green-200' : 'border-gray-200 hover:border-gray-300 hover:shadow-md'}`}
                          onClick={() => {
                            if (isSelected) {
                              // 카드를 접을 때는 데이터를 유지하고 선택만 해제
                              const newDenominations = formData.fromDenominations.filter(d => d !== denom.value);
                              setFormData({
                                ...formData,
                                fromDenominations: newDenominations
                              });
                              console.log(`권종 접기: ${denom.value}, 데이터 유지됨`);
                            } else {
                              setFormData({
                                ...formData,
                                fromDenominations: [...formData.fromDenominations, denom.value]
                              });
                            }
                          }}
                          data-testid={`card-denom-${denom.value}`}
                        >
                          {/* 상단: 권종명, 매도시세 */}
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <div 
                                className={`w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer ${(isSelected || hasData) ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // 접힌 상태에서 체크박스 클릭 시 데이터 초기화
                                  if (!isSelected && hasData) {
                                    const newDenominationAmounts = { ...formData.denominationAmounts };
                                    delete newDenominationAmounts[denom.value];
                                    
                                    setFormData({
                                      ...formData,
                                      denominationAmounts: newDenominationAmounts
                                    });
                                    console.log(`체크박스로 권종 데이터 초기화: ${denom.value}`);
                                  }
                                }}
                              >
                                {(isSelected || hasData) && (
                                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </div>
                              <div className="flex-1">
                                <div className="text-base font-semibold text-gray-800">
                                  {denom.label}
                                  {/* 접힌 상태에서 권종명 옆에 수량 표시 */}
                                  {!isSelected && hasData && (
                                    <span className="ml-2 text-sm font-medium text-gray-600">
                                      ({parseInt(formData.denominationAmounts[denom.value]).toLocaleString()}장)
                                    </span>
                                  )}
                                </div>
                                {/* 접힌 상태에서 권액 표시 */}
                                {!isSelected && hasData && (
                                  <div className="text-sm text-gray-600 mt-1">
                                    <span className="font-bold text-blue-600">
                                      {formatNumber(
                                        parseFloat(formData.denominationAmounts[denom.value]) * 
                                        getDenominationValue(formData.fromCurrency, denom.value)
                                      )} {formData.fromCurrency}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                            {useRate > 0 && (
                              <div className="px-2 py-1 bg-red-50 border border-red-200 rounded text-center min-w-[80px]">
                                <div className="text-xs text-red-600 font-medium">
                                  매도 시세
                                </div>
                                <div className="text-sm font-bold text-red-700">
                                  {useRate.toFixed(2)}
                                </div>
                              </div>
                            )}
                          </div>
                          
                          {/* 하단: 수량 입력 및 계산 결과 */}
                          {isSelected && (
                            <div className="bg-white p-3 rounded-lg border border-green-200 space-y-2">
                              <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
                                <div className="flex items-center space-x-3">
                                  <label className="text-sm font-medium text-gray-700 min-w-[40px]">수량:</label>
                                  <Input
                                    type="text"
                                    placeholder="0"
                                    value={formData.denominationAmounts[denom.value] ? 
                                      parseInt(formData.denominationAmounts[denom.value]).toLocaleString() : ""}
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      // 콤마와 숫자만 허용
                                      const cleanValue = value.replace(/[^0-9,]/g, '');
                                      // 콤마를 제거한 순수 숫자값 저장
                                      const numericValue = cleanValue.replace(/,/g, '');
                                      
                                      // 빈 값이 아닐 때만 업데이트
                                      if (numericValue === '' || !isNaN(parseInt(numericValue))) {
                                        setFormData({
                                          ...formData,
                                          denominationAmounts: {
                                            ...formData.denominationAmounts,
                                            [denom.value]: numericValue
                                          }
                                        });
                                      }
                                    }}
                                    onKeyDown={(e) => {
                                      // 숫자, 백스페이스, 삭제, 탭, 화살표 키, 콤마만 허용
                                      const allowedKeys = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
                                      const isNumber = /^[0-9]$/.test(e.key);
                                      const isComma = e.key === ',';
                                      
                                      if (!isNumber && !isComma && !allowedKeys.includes(e.key)) {
                                        e.preventDefault();
                                      }
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    data-testid={`input-quantity-${denom.value}`}
                                    className="w-32 h-12 text-center font-semibold text-lg border-2 border-gray-300 rounded-lg focus:border-green-500"
                                  />
                                  <span className="text-base font-medium text-gray-600">장</span>
                                </div>
                                {formData.denominationAmounts[denom.value] && (
                                  <div className="flex-1 p-3 bg-blue-50 rounded-lg">
                                    <div className="text-sm text-blue-600 font-medium mb-1">총 금액</div>
                                    <div className="text-lg font-bold text-blue-700">
                                      {formatNumber(
                                        parseFloat(formData.denominationAmounts[denom.value]) * 
                                        getDenominationValue(formData.fromCurrency, denom.value)
                                      )} {formData.fromCurrency}
                                    </div>
                                  </div>
                                )}
                              </div>
                              {useRate > 0 && formData.denominationAmounts[denom.value] && (
                                <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                                  <div className="text-sm text-orange-600 font-medium mb-1">환전 예상</div>
                                  <div className="text-lg font-bold text-orange-700">
                                    ≈ {(() => {
                                      const calculatedAmount = parseFloat(formData.denominationAmounts[denom.value]) * 
                                        getDenominationValue(formData.fromCurrency, denom.value) * 
                                        useRate;
                                      // VND의 경우 무조건 내림 적용
                                      const finalAmount = formData.toCurrency === "VND" ? 
                                        formatVNDWithFloor(calculatedAmount) : 
                                        Math.floor(calculatedAmount);
                                      return finalAmount.toLocaleString();
                                    })()} {formData.toCurrency}
                                  </div>
                                  <div className="text-sm text-orange-600 mt-1">
                                    환율: {useRate.toFixed(2)}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                

              </div>

            </div>

            {/* VND 권종별 분배 표시 (수정 가능) - 완전히 독립적인 섹션 */}
            {formData.toCurrency === "VND" && formData.toAmount && parseFloat(formData.toAmount) > 0 && (
              <div className="mt-6 p-4 bg-orange-50 border rounded-lg">
                <div className="text-sm font-medium text-orange-700 mb-3">권종별 분배 (고액권 우선)</div>
                <div className="space-y-3">
                  {[500000, 200000, 100000, 50000, 20000, 10000].map((denom) => {
                    // 수정된 분배가 있으면 사용, 없으면 자동 계산
                    const autoBreakdown = calculateVNDBreakdown(Math.floor(parseFloat(formData.toAmount)));
                    const currentBreakdown = Object.keys(vndBreakdown).length > 0 ? vndBreakdown : autoBreakdown;
                    const count = currentBreakdown[denom.toString()] || 0;
                    
                    // VND 현금 자산의 지폐 구성에서 실제 보유 수량 가져오기
                    const vndCashAsset = Array.isArray(assets) ? assets.find((asset: any) => 
                      asset.name === "VND 현금" && asset.currency === "VND" && asset.type === "cash"
                    ) : null;
                    
                    // 지폐 구성에서 해당 권종의 실제 보유 수량
                    const denomComposition = vndCashAsset?.metadata?.denominations || {};
                    const availableCount = denomComposition[denom.toString()] || 0;
                    
                    if (count > 0) {
                      return (
                        <div key={denom} className="bg-white p-3 rounded border border-orange-200">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="text-sm font-medium text-gray-900">
                                {formatNumber(denom)} VND
                              </div>
                              <div className="text-xs text-gray-500">
                                보유: {formatNumber(availableCount)}장
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Input
                                type="number"
                                min="0"
                                max={availableCount}
                                step="1"
                                value={count}
                                onChange={(e) => {
                                  const newCount = parseInt(e.target.value) || 0;
                                  handleVNDBreakdownChange(denom.toString(), newCount);
                                }}
                                className="w-16 h-8 text-center text-sm font-medium"
                                data-testid={`input-vnd-breakdown-${denom}`}
                              />
                              <span className="text-sm text-gray-600">장</span>
                            </div>
                          </div>
                          {count > availableCount && (
                            <div className="mt-1 text-xs text-red-600">
                              ⚠️ 보유 수량 부족 (부족: {count - availableCount}장)
                            </div>
                          )}
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
                
                {/* 권종별 분배 총액 확인 */}
                <div className="mt-3 p-2 bg-white border border-orange-300 rounded">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-orange-700">분배 총액:</span>
                    <span className="text-sm font-bold text-orange-800">
                      {Object.entries(Object.keys(vndBreakdown).length > 0 ? vndBreakdown : calculateVNDBreakdown(formatVNDWithFloor(parseFloat(formData.toAmount)))).reduce((total, [denom, count]) => total + (parseInt(denom) * parseInt(count.toString())), 0).toLocaleString()} VND
                    </span>
                  </div>

                  {Math.abs(
                    Object.entries(Object.keys(vndBreakdown).length > 0 ? vndBreakdown : calculateVNDBreakdown(formatVNDWithFloor(parseFloat(formData.toAmount)))).reduce((total, [denom, count]) => total + (parseInt(denom) * parseInt(count.toString())), 0) - 
                    formatVNDWithFloor(parseFloat(formData.toAmount))
                  ) > 0 && (
                    <div className="mt-1 text-xs text-red-600 font-medium">
                      ⚠️ 차이: {Math.abs(
                        Object.entries(Object.keys(vndBreakdown).length > 0 ? vndBreakdown : calculateVNDBreakdown(formatVNDWithFloor(parseFloat(formData.toAmount)))).reduce((total, [denom, count]) => total + (parseInt(denom) * parseInt(count.toString())), 0) - 
                        formatVNDWithFloor(parseFloat(formData.toAmount))
                      ).toLocaleString()} VND
                    </div>
                  )}
                </div>
                
                <div className="mt-2 text-xs text-orange-600">
                  💡 고객 요청에 따라 권종별 수량을 조정할 수 있습니다
                </div>
              </div>
            )}



            {/* 금액 입력 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-base font-medium">받는 금액 ({formData.fromCurrency})</Label>
                {formData.transactionType === "cash_exchange" ? (
                  <div className="p-4 bg-green-50 border-2 border-green-200 rounded-lg mt-2">
                    <div className="text-xl font-bold text-green-700">
                      {formatNumber(calculateTotalFromAmount())} {formData.fromCurrency}
                    </div>
                    <div className="text-sm text-green-600 mt-1">
                      권종별 총액 합계
                    </div>
                  </div>
                ) : (
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0"
                    value={formData.fromAmount}
                    onChange={(e) => {
                      setFormData({ ...formData, fromAmount: e.target.value });
                      handleAmountCalculation('fromAmount', e.target.value);
                    }}
                    data-testid="input-from-amount"
                    className="mt-2 text-lg font-medium"
                  />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Label className="text-base font-medium">주는 금액 ({formData.toCurrency})</Label>
                  {formData.toCurrency === "VND" && vndOriginalAmount > 0 && (() => {
                    console.log("VND original amount in display:", vndOriginalAmount);
                    console.log("VND original has decimal in display:", vndOriginalAmount % 1 !== 0);
                    const flooredAmount = formatVNDWithFloor(vndOriginalAmount);
                    const difference = vndOriginalAmount - flooredAmount;
                    console.log("VND difference:", difference);
                    console.log("Difference > 0:", difference > 0);
                    
                    return difference > 0 ? (
                      <span className="text-sm text-orange-600 font-medium">
                        ⚠️ 차이: {difference.toLocaleString()} VND
                      </span>
                    ) : null;
                  })()}
                </div>
                <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg mt-2">
                  <div className="text-xl font-bold text-blue-700">
                    {formData.toCurrency === "VND" ? 
                      (Math.floor(parseFloat(formData.toAmount) / 10000) * 10000).toLocaleString('ko-KR', { maximumFractionDigits: 0 }) :
                      formatNumber(formData.toAmount, formData.toCurrency)
                    } {formData.toCurrency}
                  </div>
                  <div className="text-sm text-blue-600 mt-1">
                    환전 지급 금액
                  </div>
                </div>
              </div>
            </div>

            {/* 고객 정보 (선택사항) */}
            {(formData.transactionType === "cash_exchange" || formData.transactionType === "foreign_to_account") && (
              <div className="p-4 bg-yellow-50 rounded-lg space-y-4">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <Label>고객 정보 (선택사항)</Label>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>고객명</Label>
                    <Input
                      placeholder="고객 이름 (선택사항)"
                      value={formData.customerName}
                      onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                      data-testid="input-customer-name"
                    />
                  </div>
                  <div>
                    <Label>연락처</Label>
                    <Input
                      placeholder="휴대폰 번호 (선택사항)"
                      value={formData.customerPhone}
                      onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                      data-testid="input-customer-phone"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 메모 */}
            <div>
              <Label>거래 메모 (선택사항)</Label>
              <Textarea
                placeholder="특이사항이나 참고사항을 입력하세요"
                value={formData.memo}
                onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
                data-testid="textarea-memo"
                rows={3}
              />
            </div>

            {/* 거래 확인 */}
            {formData.fromAmount && formData.toAmount && formData.exchangeRate && (
              <div className="relative overflow-hidden bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 border border-emerald-200 rounded-xl p-6 shadow-sm">
                {/* 배경 장식 */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-emerald-100/30 to-transparent rounded-full transform translate-x-16 -translate-y-16"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-teal-100/40 to-transparent rounded-full transform -translate-x-12 translate-y-12"></div>
                
                <div className="relative">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 bg-emerald-100 rounded-lg">
                      <Calculator className="w-5 h-5 text-emerald-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-emerald-800">거래 확인</h3>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-white/60 backdrop-blur-sm rounded-lg border border-white/40">
                      <span className="text-sm text-gray-600 font-medium">고객이 주는 금액</span>
                      <div className="text-right">
                        <div className="text-lg font-bold text-emerald-700">{formatNumber(formData.fromAmount)} {formData.fromCurrency}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-white/60 backdrop-blur-sm rounded-lg border border-white/40">
                      <span className="text-sm text-gray-600 font-medium">고객이 받는 금액</span>
                      <div className="text-right">
                        <div className="text-lg font-bold text-teal-700">{formatNumber(formData.toAmount)} {formData.toCurrency}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-white/60 backdrop-blur-sm rounded-lg border border-white/40">
                      <span className="text-sm text-gray-600 font-medium">적용 환율</span>
                      <div className="text-right">
                        <div className="text-lg font-bold text-cyan-700">{formatNumber(calculateAverageExchangeRate().toString())}</div>
                        <div className="text-xs text-gray-500 mt-0.5">(권종별 평균)</div>
                      </div>
                    </div>
                    
                    {formData.customerName && (
                      <div className="flex items-center justify-between p-3 bg-white/60 backdrop-blur-sm rounded-lg border border-white/40">
                        <span className="text-sm text-gray-600 font-medium">고객</span>
                        <div className="text-right">
                          <div className="text-lg font-bold text-gray-700">{formData.customerName}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full" 
              disabled={createTransactionMutation.isPending}
              data-testid="button-submit-transaction"
            >
              {createTransactionMutation.isPending ? "처리 중..." : "거래 확정"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}