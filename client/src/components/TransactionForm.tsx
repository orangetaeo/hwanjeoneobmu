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
    { value: "5000_1000", label: "5천/1천원" }
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
      if (!isNaN(qty)) {
        const denominationValue = getDenominationValue(formData.fromCurrency, denomination);
        total += qty * denominationValue;
      }
    });
    return total;
  };

  // 특정 권종의 환율 정보 조회
  const getDenominationRate = (fromCurrency: string, toCurrency: string, denomination: string) => {
    if (!Array.isArray(exchangeRates)) return null;
    
    return exchangeRates.find((rate: any) => 
      rate.fromCurrency === fromCurrency && 
      rate.toCurrency === toCurrency && 
      rate.denomination === denomination
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
      if (denomination === "5000_1000") return 6000; // 5천원 + 1천원 조합
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
    if (formData.transactionType === "cash_exchange" && Object.keys(formData.denominationAmounts).length > 0) {
      const total = calculateTotalFromAmount();
      setFormData(prev => ({ ...prev, fromAmount: total.toString() }));
      
      // 권종별 매도 시세 합계로 정확한 금액 계산
      const calculatedToAmount = formData.fromDenominations.reduce((totalAmount, denomValue) => {
        const amount = parseFloat(formData.denominationAmounts[denomValue] || "0");
        if (amount <= 0) return totalAmount;
        
        const rateInfo = getDenominationRate(formData.fromCurrency, formData.toCurrency, denomValue);
        const rate = formData.fromCurrency === "KRW" ? parseFloat(rateInfo?.mySellRate || "0") : parseFloat(rateInfo?.myBuyRate || "0");
        const totalValue = amount * getDenominationValue(formData.fromCurrency, denomValue);
        return totalAmount + (totalValue * rate);
      }, 0);
      
      if (calculatedToAmount > 0) {
        // VND의 경우 무조건 내림 적용
        const finalAmount = formData.toCurrency === "VND" ? 
          formatVNDWithFloor(calculatedToAmount) : 
          Math.floor(calculatedToAmount);
          
        setFormData(prev => ({ 
          ...prev, 
          toAmount: finalAmount.toString(),
          exchangeRate: (finalAmount / total).toString()
        }));
        
        // VND인 경우 권종별 분배도 업데이트
        if (formData.toCurrency === "VND") {
          const breakdown = calculateVNDBreakdown(finalAmount);
          setVndBreakdown(breakdown);
        }
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
    if (formData.toCurrency === "VND") {
      const totalFromAmount = formData.transactionType === "cash_exchange" ? 
        calculateTotalFromAmount() : 
        parseFloat(formData.fromAmount || "0");
      
      if (totalFromAmount > 0) {
        const rateValue = parseFloat(formData.exchangeRate || "0");
        const calculatedOriginal = totalFromAmount * rateValue;
        const flooredAmount = formatVNDWithFloor(calculatedOriginal);
        floorProfit = calculatedOriginal - flooredAmount;
      }
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

  // VND 무조건 내림 함수
  const formatVNDWithFloor = (amount: number) => {
    // 무조건 내림 처리
    return Math.floor(amount);
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
                      const useRate = formData.fromCurrency === "KRW" ? parseFloat(rateInfo?.mySellRate || "0") : parseFloat(rateInfo?.myBuyRate || "0");
                      
                      return (
                        <div key={denom.value} className={`border rounded-lg p-3 md:p-4 transition-all ${isSelected ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}>
                          <div className="flex flex-col md:flex-row md:items-start md:justify-between space-y-2 md:space-y-0 mb-3">
                            <div className="flex items-center space-x-3">
                              <Checkbox
                                id={`denom-${denom.value}`}
                                checked={isSelected}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setFormData({
                                      ...formData,
                                      fromDenominations: [...formData.fromDenominations, denom.value]
                                    });
                                  } else {
                                    const newDenominations = formData.fromDenominations.filter(d => d !== denom.value);
                                    const newAmounts = { ...formData.denominationAmounts };
                                    delete newAmounts[denom.value];
                                    setFormData({
                                      ...formData,
                                      fromDenominations: newDenominations,
                                      denominationAmounts: newAmounts
                                    });
                                  }
                                }}
                                data-testid={`checkbox-denom-${denom.value}`}
                                className="w-5 h-5 md:w-4 md:h-4"
                              />
                              <div className="flex-1">
                                <Label htmlFor={`denom-${denom.value}`} className="text-base md:text-sm font-semibold">
                                  {denom.label}
                                </Label>
                              </div>
                            </div>
                            {useRate > 0 && (
                              <div className="px-3 py-1 bg-red-50 border border-red-200 rounded text-center min-w-[80px]">
                                <div className="text-xs text-red-600 font-medium">
                                  매도 시세
                                </div>
                                <div className="text-sm font-bold text-red-700">
                                  {useRate.toFixed(2)}
                                </div>
                              </div>
                            )}
                          </div>
                          
                          {isSelected && (
                            <div className="bg-white p-3 rounded border border-green-200">
                              <div className="flex flex-col md:flex-row md:items-center space-y-2 md:space-y-0 md:space-x-3 mb-2">
                                <div className="flex items-center space-x-3">
                                  <Input
                                    type="number"
                                    min="0"
                                    step="1"
                                    placeholder="수량"
                                    value={formData.denominationAmounts[denom.value] || ""}
                                    onChange={(e) => setFormData({
                                      ...formData,
                                      denominationAmounts: {
                                        ...formData.denominationAmounts,
                                        [denom.value]: e.target.value
                                      }
                                    })}
                                    data-testid={`input-quantity-${denom.value}`}
                                    className="w-20 md:w-24 text-center font-medium text-base md:text-sm"
                                  />
                                  <span className="text-sm text-gray-600">장</span>
                                </div>
                                {formData.denominationAmounts[denom.value] && (
                                  <div className="text-sm md:text-xs font-bold text-blue-600">
                                    = {formatNumber(
                                      parseFloat(formData.denominationAmounts[denom.value]) * 
                                      getDenominationValue(formData.fromCurrency, denom.value)
                                    )} {formData.fromCurrency}
                                  </div>
                                )}
                              </div>
                              {useRate > 0 && formData.denominationAmounts[denom.value] && (
                                <div className="text-xs text-orange-600 font-medium mt-1">
                                  환전 예상: ≈ {(() => {
                                    const calculatedAmount = parseFloat(formData.denominationAmounts[denom.value]) * 
                                      getDenominationValue(formData.fromCurrency, denom.value) * 
                                      useRate;
                                    // VND의 경우 무조건 내림 적용
                                    const finalAmount = formData.toCurrency === "VND" ? 
                                      formatVNDWithFloor(calculatedAmount) : 
                                      Math.floor(calculatedAmount);
                                    return finalAmount.toLocaleString();
                                  })()} {formData.toCurrency}
                                  <span className="ml-1 text-gray-500">
                                    (환율: {useRate.toFixed(2)})
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                
                {/* 매도 시세 합계 확인 */}
                {formData.fromDenominations.length > 0 && (
                  <div className="mt-4 p-3 bg-blue-50 border rounded-lg">
                    <div className="text-sm font-medium text-blue-700 mb-2">매도 시세 합계 확인</div>
                    <div className="space-y-1 text-sm">
                      {formData.fromDenominations.map((denomValue) => {
                        const amount = parseFloat(formData.denominationAmounts[denomValue] || "0");
                        if (amount <= 0) return null;
                        
                        const rateInfo = getDenominationRate(formData.fromCurrency, formData.toCurrency, denomValue);
                        const rate = formData.fromCurrency === "KRW" ? parseFloat(rateInfo?.mySellRate || "0") : parseFloat(rateInfo?.myBuyRate || "0");
                        const totalValue = amount * getDenominationValue(formData.fromCurrency, denomValue);
                        const calculatedAmount = totalValue * rate;
                        
                        // VND의 경우 무조건 내림 적용
                        const exchangedAmount = formData.toCurrency === "VND" ? 
                          formatVNDWithFloor(calculatedAmount) : 
                          Math.floor(calculatedAmount);
                        
                        return (
                          <div key={denomValue} className="flex justify-between text-xs">
                            <span>{CURRENCY_DENOMINATIONS[formData.fromCurrency as keyof typeof CURRENCY_DENOMINATIONS]?.find(d => d.value === denomValue)?.label} × {amount}장</span>
                            <span className="font-medium">{exchangedAmount.toLocaleString()} {formData.toCurrency}</span>
                          </div>
                        );
                      })}
                      <div className="border-t pt-1 mt-2 flex flex-col font-bold text-blue-800">
                        <div className="flex justify-between">
                          <span>합계</span>
                          <span>{(() => {
                            const totalCalculated = formData.fromDenominations.reduce((total, denomValue) => {
                              const amount = parseFloat(formData.denominationAmounts[denomValue] || "0");
                              if (amount <= 0) return total;
                              
                              const rateInfo = getDenominationRate(formData.fromCurrency, formData.toCurrency, denomValue);
                              const rate = formData.fromCurrency === "KRW" ? parseFloat(rateInfo?.mySellRate || "0") : parseFloat(rateInfo?.myBuyRate || "0");
                              const totalValue = amount * getDenominationValue(formData.fromCurrency, denomValue);
                              return total + (totalValue * rate);
                            }, 0);
                            
                            // VND의 경우 무조건 내림 적용
                            const finalTotal = formData.toCurrency === "VND" ? 
                              formatVNDWithFloor(totalCalculated) : 
                              Math.floor(totalCalculated);
                            
                            return finalTotal.toLocaleString();
                          })()} {formData.toCurrency}</span>
                        </div>
                        {formData.toCurrency === "VND" && (() => {
                          const originalTotal = formData.fromDenominations.reduce((total, denomValue) => {
                            const amount = parseFloat(formData.denominationAmounts[denomValue] || "0");
                            if (amount <= 0) return total;
                            
                            const rateInfo = getDenominationRate(formData.fromCurrency, formData.toCurrency, denomValue);
                            const rate = formData.fromCurrency === "KRW" ? parseFloat(rateInfo?.mySellRate || "0") : parseFloat(rateInfo?.myBuyRate || "0");
                            const totalValue = amount * getDenominationValue(formData.fromCurrency, denomValue);
                            return total + (totalValue * rate);
                          }, 0);
                          const flooredTotal = formatVNDWithFloor(originalTotal);
                          const difference = originalTotal - flooredTotal;
                          
                          return difference > 0 ? (
                            <div className="text-xs text-gray-600 mt-1">
                              원본: {originalTotal.toLocaleString('ko-KR', { maximumFractionDigits: 2 })} VND (내림 전)
                            </div>
                          ) : null;
                        })()}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div>
                
                {/* VND 권종별 분배 표시 (수정 가능) */}
                {formData.toCurrency === "VND" && formData.toAmount && parseFloat(formData.toAmount) > 0 && (
                  <div className="mt-4 p-4 bg-orange-50 border rounded-lg">
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
                        
                        if (count > 0 || Object.keys(vndBreakdown).length > 0) {
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
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-xs font-medium text-orange-700">예상 지급:</span>
                        <span className="text-sm font-bold text-orange-800">
                          {formatVNDWithFloor(parseFloat(formData.toAmount)).toLocaleString()} VND
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
              </div>
            </div>



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
                <Label className="text-base font-medium">주는 금액 ({formData.toCurrency})</Label>
                <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg mt-2">
                  <div className="flex items-center gap-2">
                    <div className="text-xl font-bold text-blue-700">
                      {formatNumber(formData.toAmount, formData.toCurrency)} {formData.toCurrency}
                    </div>
                    {formData.toCurrency === "VND" && formData.toAmount && (() => {
                      // 원본 계산 값을 찾기 위해 환율 적용 다시 계산
                      const totalFromAmount = formData.transactionType === "cash_exchange" ? 
                        calculateTotalFromAmount() : 
                        parseFloat(formData.fromAmount || "0");
                      
                      if (totalFromAmount > 0) {
                        const rateValue = parseFloat(formData.exchangeRate || "0");
                        const calculatedOriginal = totalFromAmount * rateValue;
                        const flooredAmount = formatVNDWithFloor(calculatedOriginal);
                        const difference = calculatedOriginal - flooredAmount;
                        
                        return difference > 0 ? (
                          <div className="text-sm text-orange-600 font-medium">
                            ⚠️ 차이: {Math.floor(difference).toLocaleString()} VND
                          </div>
                        ) : null;
                      }
                      return null;
                    })()}
                  </div>
                  <div className="text-sm text-blue-600 mt-1">
                    환전 지급 금액 (무조건 내림)
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
              <div className="p-4 bg-green-50 rounded-lg">
                <h3 className="font-medium mb-2">거래 확인</h3>
                <div className="space-y-1 text-sm">
                  <div>고객이 주는 금액: <span className="font-medium">{formatNumber(formData.fromAmount)} {formData.fromCurrency}</span></div>
                  <div>고객이 받는 금액: <span className="font-medium">{formatNumber(formData.toAmount)} {formData.toCurrency}</span></div>
                  <div>적용 환율: <span className="font-medium">{formatNumber(formData.exchangeRate)}</span></div>
                  {formData.customerName && (
                    <div>고객: <span className="font-medium">{formData.customerName}</span></div>
                  )}
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