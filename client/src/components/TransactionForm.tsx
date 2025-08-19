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
import { AlertTriangle, Calculator, ArrowRightLeft, RefreshCw, User, Banknote, TrendingUp, AlertCircle } from "lucide-react";
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
  
  // VND 분배 기준 금액 (권종 접기와 독립적)
  const [vndBaseAmount, setVndBaseAmount] = useState<number>(0);

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

  // 자산 목록 조회 (실시간 새로고침)
  const { data: assets = [], isLoading: isLoadingAssets, refetch: refetchAssets } = useQuery({
    queryKey: ["/api/assets"],
    refetchOnWindowFocus: true,
    refetchInterval: 10000, // 10초마다 자동 새로고침
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
    
    // KRW 5천원권과 1천원권의 경우 5/1천원권 매매 시세 사용
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

    console.log(`VND 분배 계산 시작: ${totalAmount.toLocaleString()} VND`);

    for (const denom of vndDenominations) {
      if (remaining >= denom) {
        const count = Math.floor(remaining / denom);
        if (count > 0) {
          breakdown[denom.toString()] = count;
          remaining = remaining % denom;
          console.log(`${denom.toLocaleString()} VND: ${count}장, 남은 금액: ${remaining.toLocaleString()}`);
        }
      }
    }

    console.log("VND 분배 결과:", breakdown);
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
        setVndBaseAmount(0);
        setFormData(prev => ({ ...prev, toAmount: "0" }));
        return;
      }
      
      // 권종별 매매 시세 합계로 정확한 금액 계산 (접기/펴기와 무관하게 모든 데이터 포함)
      const calculatedToAmount = Object.entries(formData.denominationAmounts || {}).reduce((totalAmount, [denomValue, amountStr]) => {
        const amount = parseFloat(amountStr || "0");
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
          
          // VND 기준 금액 설정 (처음 계산 시에만)
          if (vndBaseAmount === 0) {
            setVndBaseAmount(finalAmount);
            const breakdown = calculateVNDBreakdown(finalAmount);
            setVndBreakdown(breakdown);
          }
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
        setVndBaseAmount(0);
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
          const denomKey = parseInt(denom).toLocaleString(); // 쉼표 포함 형태로 변환
          const availableCount = denomComposition[denomKey] || 0;
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
      {/* 헤더 - 모바일 최적화 */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
        <div className="flex items-center gap-2 sm:gap-3">
          <Calculator className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
          <h2 className="text-xl sm:text-2xl font-bold">새거래</h2>
        </div>
        <div className="flex items-center gap-2 sm:ml-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchAssets()}
            disabled={isLoadingAssets}
            className="flex-1 sm:flex-initial"
          >
            <RefreshCw className={`w-3 h-3 sm:w-4 sm:h-4 mr-1 ${isLoadingAssets ? 'animate-spin' : ''}`} />
            <span className="text-xs sm:text-sm">자산 새로고침</span>
          </Button>
          <Badge variant="outline" className="text-xs sm:text-sm px-2 py-1">
            고객 대면 거래
          </Badge>
        </div>
      </div>

      <Card className="mx-2 sm:mx-0">
        <CardHeader className="pb-4 sm:pb-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <ArrowRightLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            거래 정보 입력
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 sm:px-6">
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
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
                  onValueChange={(value) => {
                    // KRW -> KRW 환전 방지
                    if (value === "KRW" && formData.toCurrency === "KRW") {
                      toast({
                        title: "환전 불가",
                        description: "같은 통화 간의 환전은 불가능합니다. 다른 통화를 선택해주세요.",
                        variant: "destructive",
                      });
                      return;
                    }
                    setFormData({ ...formData, fromCurrency: value, fromDenominations: [], denominationAmounts: {} });
                  }}
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
                  onValueChange={(value) => {
                    // KRW -> KRW 환전 방지
                    if (formData.fromCurrency === "KRW" && value === "KRW") {
                      toast({
                        title: "환전 불가",
                        description: "같은 통화 간의 환전은 불가능합니다. 다른 통화를 선택해주세요.",
                        variant: "destructive",
                      });
                      return;
                    }
                    setFormData({ ...formData, toCurrency: value, toDenomination: "" });
                  }}
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

            {/* 금액 입력 - 권종 선택 위로 이동 */}
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
                    const flooredAmount = formatVNDWithFloor(vndOriginalAmount);
                    const difference = vndOriginalAmount - flooredAmount;
                    
                    return difference > 0 ? (
                      <span className="text-sm text-orange-600 font-medium">
                        ⚠️ 차이: {difference.toLocaleString()} VND
                      </span>
                    ) : null;
                  })()}
                </div>
                <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg mt-2">
                  <div className="text-xl font-bold text-blue-700">
                    {(() => {
                      if (formData.transactionType === "cash_exchange" && formData.toCurrency === "VND" && vndOriginalAmount > 0) {
                        // 실제 환전금액 사용 (무조건 내림 적용)
                        const flooredAmount = formatVNDWithFloor(vndOriginalAmount);
                        return flooredAmount.toLocaleString('ko-KR', { maximumFractionDigits: 0 });
                      }
                      
                      // 기본 동작
                      return formData.toCurrency === "VND" ? 
                        (Math.floor(parseFloat(formData.toAmount) / 10000) * 10000).toLocaleString('ko-KR', { maximumFractionDigits: 0 }) :
                        formatNumber(formData.toAmount, formData.toCurrency);
                    })()} {formData.toCurrency}
                  </div>
                  <div className="text-sm text-blue-600 mt-1">
                    환전 지급 금액
                  </div>
                </div>
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
                          {/* 상단: 권종명, 매도시세 - 모바일 최적화 */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 gap-2">
                            <div className="flex items-center space-x-2 flex-1">
                              <div 
                                className={`w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer flex-shrink-0 ${(isSelected || hasData) ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}
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
                              <div className="flex-1 min-w-0">
                                <div className="text-sm sm:text-base font-semibold text-gray-800 truncate">
                                  {denom.label}
                                  {/* 접힌 상태에서 권종명 옆에 수량 표시 */}
                                  {!isSelected && hasData && (
                                    <span className="ml-1 sm:ml-2 text-xs sm:text-sm font-medium text-gray-600">
                                      ({parseInt(formData.denominationAmounts[denom.value]).toLocaleString()}장)
                                    </span>
                                  )}
                                </div>
                                {/* 접힌 상태에서 권액 표시 */}
                                {!isSelected && hasData && (
                                  <div className="text-xs sm:text-sm text-gray-600 mt-1">
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
                              <div className="px-2 py-1 bg-red-50 border border-red-200 rounded text-center min-w-[70px] sm:min-w-[80px] flex-shrink-0">
                                <div className="text-xs text-red-600 font-medium">
                                  매매 시세
                                </div>
                                <div className="text-xs sm:text-sm font-bold text-red-700">
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

              {/* VND 권종별 분배 - 받는 권종 오른쪽에 배치 */}
              {formData.toCurrency === "VND" && (
                <div>
                  <Label className="text-base font-medium">권종별 분배</Label>
                  <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg mt-2">
                    <div className="text-sm font-medium text-orange-700 mb-3 flex items-center">
                      <span className="mr-2">💰</span>
                      고액권 우선
                    </div>
                    <div className="space-y-2">
                      {(() => {
                        // denominationData에서 직접 총액 계산 (접기/펴기와 무관)
                        const totalFromDenominations = Object.entries(formData.denominationAmounts || {}).reduce((total, [denom, amount]) => {
                          if (amount && parseFloat(amount) > 0) {
                            const denomValue = getDenominationValue(formData.fromCurrency, denom);
                            return total + (parseFloat(amount) * denomValue);
                          }
                          return total;
                        }, 0);

                        // denominationAmounts에서 직접 환전될 VND 금액 계산
                        const targetAmount = totalFromDenominations > 0 ? (() => {
                          const rate = formData.fromCurrency === "KRW" ? 
                            getDenominationRate(formData.fromCurrency, formData.toCurrency, "50000")?.mySellRate || "0" :
                            getDenominationRate(formData.fromCurrency, formData.toCurrency, "50000")?.myBuyRate || "0";
                          const calculatedAmount = totalFromDenominations * parseFloat(rate);
                          return formData.toCurrency === "VND" ? formatVNDWithFloor(calculatedAmount) : calculatedAmount;
                        })() : (parseFloat(formData.toAmount) || 0);
                        
                        // 실제로 고객이 받을 금액을 기준으로 분배 (vndOriginalAmount 사용)
                        const fixedBreakdown = calculateVNDBreakdown(vndOriginalAmount > 0 ? vndOriginalAmount : targetAmount);
                        
                        // 권종 데이터가 없으면 안내 메시지 표시
                        if (totalFromDenominations === 0) {
                          return (
                            <div className="bg-white p-4 rounded border border-orange-200 text-center">
                              <div className="text-sm text-gray-500">
                                받는 권종을 선택하면 권종별 분배가 표시됩니다
                              </div>
                            </div>
                          );
                        }

                        // 동적 추천 시스템: 현재 상황에서 남은 금액을 최적 분배
                        const calculateSuggestions = () => {
                          if (!formData.vndBreakdown || Object.keys(formData.vndBreakdown).length === 0) {
                            return {};
                          }
                          
                          // 현재 총액과 목표 총액 계산
                          const currentTotal = Object.entries(formData.vndBreakdown).reduce((total, [denom, count]) => {
                            const denomValue = parseInt(denom);
                            const denomCount = parseInt(count.toString());
                            return total + (denomValue * denomCount);
                          }, 0);
                          
                          const targetTotal = Object.entries(fixedBreakdown).reduce((total, [denom, count]) => {
                            const denomValue = parseInt(denom);
                            const denomCount = parseInt(count.toString());
                            return total + (denomValue * denomCount);
                          }, 0);
                          
                          const remainingAmount = targetTotal - currentTotal;
                          console.log("목표 총액:", targetTotal, "현재 총액:", currentTotal, "남은 금액:", remainingAmount);
                          
                          const suggestions = {};
                          
                          // 목표 금액에 도달했으면 추천 없음
                          if (remainingAmount <= 0) {
                            console.log("목표 금액 도달, 추천 없음");
                            return suggestions;
                          }
                          
                          // VND 현금 보유 상황 확인
                          const vndCashAsset = Array.isArray(assets) ? assets.find((asset: any) => 
                            asset.name === "VND 현금" && asset.currency === "VND" && asset.type === "cash"
                          ) : null;
                          const denomComposition = vndCashAsset?.metadata?.denominations || {};
                          
                          // 각 권종별로 남은 금액을 분배하는 방법들을 계산
                          const denominations = [500000, 200000, 100000, 50000, 20000, 10000];
                          
                          denominations.forEach(denom => {
                            const currentCount = formData.vndBreakdown[denom.toString()] || 0;
                            const denomKey = denom.toLocaleString(); // 쉼표 포함 형태로 변환
                            const availableCount = denomComposition[denomKey] || 0;
                            const usableCount = availableCount - currentCount;
                            
                            if (usableCount > 0 && remainingAmount >= denom) {
                              // 이 권종으로 남은 금액을 얼마나 채울 수 있는지 계산
                              const maxPossible = Math.floor(remainingAmount / denom);
                              const suggestedCount = Math.min(maxPossible, usableCount);
                              
                              if (suggestedCount > 0) {
                                suggestions[denom.toString()] = suggestedCount;
                                console.log(`${denom} VND: ${remainingAmount} 중 ${suggestedCount}장으로 ${suggestedCount * denom} 분배 가능`);
                              }
                            }
                          });
                          
                          return suggestions;
                        };
                        
                        const suggestions = calculateSuggestions();

                        return [500000, 200000, 100000, 50000, 20000, 10000].map((denom) => {
                          const defaultCount = fixedBreakdown[denom.toString()] || 0;
                          const currentCount = formData.vndBreakdown?.[denom.toString()] !== undefined ? 
                            formData.vndBreakdown[denom.toString()] : defaultCount;
                          const suggestedCount = suggestions[denom.toString()] || 0;
                        
                          const vndCashAsset = Array.isArray(assets) ? assets.find((asset: any) => 
                            asset.name === "VND 현금" && asset.currency === "VND" && asset.type === "cash"
                          ) : null;
                          
                          const denomComposition = vndCashAsset?.metadata?.denominations || {};
                          
                          // 권종 키 형태 확인 (쉼표 포함된 형태로 저장되어 있음)
                          const denomKey = denom.toLocaleString();  // 숫자를 "500,000" 형태로 변환
                          const availableCount = denomComposition[denomKey] || 0;
                          
                          // 모든 권종을 기본으로 표기
                          if (true) {
                            return (
                              <div key={denom} className="bg-white p-3 sm:p-4 rounded border border-orange-200">
                                <div className="flex items-center justify-between gap-3">
                                  <div className="flex flex-col min-w-0 flex-1">
                                    <div className="text-sm sm:text-base font-medium text-gray-900 truncate">
                                      {formatNumber(denom)} VND
                                    </div>
                                    <div className="text-xs sm:text-sm text-gray-500">
                                      보유: {formatNumber(availableCount)}장
                                      {currentCount > 0 && (
                                        <span className={`ml-1 ${(availableCount - currentCount) < 0 ? 'text-red-600 font-bold' : 'text-blue-600'}`}>
                                          -{currentCount}장 = {availableCount - currentCount}장
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                                    <Input
                                      type="text"
                                      min="0"
                                      max={availableCount}
                                      value={currentCount.toString()}
                                      className="w-16 sm:w-20 h-10 sm:h-12 text-sm sm:text-base text-center font-medium"
                                      onChange={(e) => {
                                        const value = e.target.value;
                                        console.log(`입력 감지: ${denom} VND에 "${value}" 입력`);
                                        
                                        // 숫자만 허용
                                        if (value === '' || /^\d+$/.test(value)) {
                                          let newCount = value === '' ? 0 : parseInt(value);
                                          
                                          // 보유량 초과 검증
                                          if (newCount > availableCount) {
                                            console.log(`보유량 초과: ${newCount} > ${availableCount}, ${availableCount}로 제한`);
                                            newCount = availableCount;
                                          }
                                          
                                          console.log(`유효한 입력: ${denom} VND = ${newCount}장 (보유: ${availableCount}장)`);
                                          
                                          // 기본 분배를 먼저 포함한 새로운 분배로 업데이트
                                          const updatedBreakdown = {
                                            ...fixedBreakdown, // 기본값을 먼저 설정
                                            ...formData.vndBreakdown, // 기존 수정값 적용
                                            [denom.toString()]: newCount // 새로운 입력값 적용
                                          };
                                          
                                          console.log('업데이트된 분배:', updatedBreakdown);
                                          console.log('기본 분배:', fixedBreakdown);
                                          
                                          // 목표 초과 시 자동 조정
                                          const targetTotal = Object.entries(fixedBreakdown).reduce((total, [d, count]) => {
                                            return total + (parseInt(d) * parseInt(count.toString()));
                                          }, 0);
                                          
                                          const currentTotal = Object.entries(updatedBreakdown).reduce((total, [d, count]) => {
                                            return total + (parseInt(d) * parseInt(count.toString()));
                                          }, 0);
                                          
                                          console.log(`총액 비교: 현재 ${currentTotal}, 목표 ${targetTotal}`);
                                          
                                          if (currentTotal > targetTotal) {
                                            const excessAmount = currentTotal - targetTotal;
                                            console.log(`목표 초과 감지: 현재 ${currentTotal}, 목표 ${targetTotal}, 초과량 ${excessAmount}`);
                                            
                                            // 가장 큰 권종(사용자 입력 권종 제외)에서 초과량을 완전히 해결
                                            const denominations = [500000, 200000, 100000, 50000, 20000, 10000];
                                            for (const d of denominations) {
                                              if (d === denom) continue; // 현재 입력 권종은 제외
                                              
                                              const currentCount = updatedBreakdown[d.toString()] || 0;
                                              console.log(`${d} VND 확인: 현재 ${currentCount}장`);
                                              
                                              if (currentCount > 0) {
                                                // 이 권종에서 초과량을 완전히 해결하기 위해 필요한 장수 계산
                                                const neededReduction = Math.ceil(excessAmount / d);
                                                const actualReduction = Math.min(neededReduction, currentCount);
                                                
                                                if (actualReduction > 0) {
                                                  const newCount = currentCount - actualReduction;
                                                  updatedBreakdown[d.toString()] = newCount;
                                                  const reducedAmount = actualReduction * d;
                                                  console.log(`자동 조정: ${d} VND ${currentCount} → ${newCount} (${actualReduction}장 감소, ${reducedAmount} VND 감소)`);
                                                  
                                                  // 감소량이 초과량보다 크면 기본 분배에서 부족분을 추가
                                                  if (reducedAmount > excessAmount) {
                                                    const shortfall = reducedAmount - excessAmount;
                                                    console.log(`부족분 발생: ${shortfall} VND - 기본 분배에서 추가 필요`);
                                                    
                                                    // 기본 분배를 다시 계산해서 부족분 추가 (사용자 입력 권종 제외)
                                                    let remainingAmount = shortfall;
                                                    const smallerDenominations = [200000, 100000, 50000, 20000, 10000];
                                                    
                                                    for (const fillDenom of smallerDenominations) {
                                                      if (fillDenom >= d || fillDenom === denom || remainingAmount <= 0) continue;
                                                      
                                                      if (remainingAmount >= fillDenom) {
                                                        const addCount = Math.floor(remainingAmount / fillDenom);
                                                        if (addCount > 0) {
                                                          const currentFillCount = updatedBreakdown[fillDenom.toString()] || 0;
                                                          updatedBreakdown[fillDenom.toString()] = currentFillCount + addCount;
                                                          const addedAmount = addCount * fillDenom;
                                                          remainingAmount -= addedAmount;
                                                          console.log(`부족분 보충: ${fillDenom} VND ${currentFillCount} → ${currentFillCount + addCount} (+${addCount}장, ${addedAmount} VND), 남은 부족분: ${remainingAmount}`);
                                                          
                                                          // 부족분이 해결되면 중단
                                                          if (remainingAmount <= 0) break;
                                                        }
                                                      }
                                                    }
                                                  }
                                                  
                                                  break; // 한 권종에서만 조정
                                                }
                                              }
                                            }
                                          }
                                          
                                          console.log('최종 분배 저장:', updatedBreakdown);
                                          setFormData({
                                            ...formData,
                                            vndBreakdown: updatedBreakdown
                                          });
                                        }
                                      }}
                                      data-testid={`input-vnd-${denom}`}
                                    />
                                    <span className="text-sm sm:text-base text-gray-600 font-medium">장</span>
                                    <button
                                      type="button"
                                      className="px-3 sm:px-4 py-2 sm:py-3 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded text-sm sm:text-base font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                      disabled={suggestedCount === 0}
                                      onClick={() => {
                                        if (suggestedCount > 0) {
                                          const newCount = currentCount + suggestedCount;
                                          setFormData({
                                            ...formData,
                                            vndBreakdown: {
                                              ...formData.vndBreakdown,
                                              [denom.toString()]: newCount
                                            }
                                          });
                                        } else {
                                          // +0 버튼 클릭 시 입력 칸을 0으로 설정
                                          setFormData({
                                            ...formData,
                                            vndBreakdown: {
                                              ...formData.vndBreakdown,
                                              [denom.toString()]: 0
                                            }
                                          });
                                        }
                                      }}
                                      title={suggestedCount > 0 ? "추천값 적용" : "추천 없음 (클릭 가능)"}
                                    >
                                      +{suggestedCount}
                                    </button>
                                  </div>
                                </div>
                                {defaultCount !== currentCount && (
                                  <div className="mt-2 text-xs text-blue-600">
                                    기본: {defaultCount}장 → 수정: {currentCount}장
                                  </div>
                                )}
                              </div>
                            );
                          }
                          return null;
                        }).filter(Boolean);
                      })()}
                    </div>
                    
                    <div className="mt-3 pt-2 border-t border-orange-200">
                      <div className="text-xs sm:text-sm font-medium text-orange-700">
                        총 분배액: <span className="text-sm sm:text-lg font-bold">
                          {(() => {
                            // 수정된 VND 분배가 있으면 그것을 사용, 없으면 기본 계산값 사용
                            if (formData.vndBreakdown && Object.keys(formData.vndBreakdown).length > 0) {
                              return Object.entries(formData.vndBreakdown).reduce((total, [denom, count]) => 
                                total + (parseInt(denom) * parseInt(count.toString())), 0
                              ).toLocaleString();
                            }
                            
                            // 기본 계산
                            const totalFromDenominations = Object.entries(formData.denominationAmounts || {}).reduce((total, [denom, amount]) => {
                              if (amount && parseFloat(amount) > 0) {
                                const denomValue = getDenominationValue(formData.fromCurrency, denom);
                                return total + (parseFloat(amount) * denomValue);
                              }
                              return total;
                            }, 0);

                            const targetAmount = totalFromDenominations > 0 ? (() => {
                              const rate = formData.fromCurrency === "KRW" ? 
                                getDenominationRate(formData.fromCurrency, formData.toCurrency, "50000")?.mySellRate || "0" :
                                getDenominationRate(formData.fromCurrency, formData.toCurrency, "50000")?.myBuyRate || "0";
                              const calculatedAmount = totalFromDenominations * parseFloat(rate);
                              return formData.toCurrency === "VND" ? formatVNDWithFloor(calculatedAmount) : calculatedAmount;
                            })() : (parseFloat(formData.toAmount) || 0);
                            
                            // 실제 환전금액 기준으로 분배 계산
                            const breakdown = calculateVNDBreakdown(vndOriginalAmount > 0 ? vndOriginalAmount : targetAmount);
                            return Object.entries(breakdown).reduce((total, [denom, count]) => total + (parseInt(denom) * parseInt(count.toString())), 0).toLocaleString();
                          })()} VND
                        </span>
                      </div>
                      
                      {formData.vndBreakdown && Object.keys(formData.vndBreakdown).length > 0 && (
                        <div className="mt-2">
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, vndBreakdown: {} })}
                            className="text-xs text-blue-600 hover:text-blue-800 underline"
                          >
                            기본값으로 되돌리기
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

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
                    
                    <div className="p-3 bg-white/60 backdrop-blur-sm rounded-lg border border-white/40">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600 font-medium">고객이 받는 금액</span>
                        <div className="text-right">
                          <div className="text-lg font-bold text-teal-700">{formatNumber(formData.toAmount)} {formData.toCurrency}</div>
                        </div>
                      </div>
                      
                      {/* VND 권종별 분배 상세 */}
                      {formData.toCurrency === "VND" && (() => {
                        // 기본 분배 계산
                        const totalFromDenominations = Object.entries(formData.denominationAmounts || {}).reduce((total, [denom, amount]) => {
                          if (amount && parseFloat(amount) > 0) {
                            const denomValue = getDenominationValue(formData.fromCurrency, denom);
                            return total + (parseFloat(amount) * denomValue);
                          }
                          return total;
                        }, 0);

                        let targetAmount = 0;
                        if (totalFromDenominations > 0) {
                          const rate = formData.fromCurrency === "KRW" ? 
                            getDenominationRate(formData.fromCurrency, formData.toCurrency, "50000")?.mySellRate || "0" :
                            getDenominationRate(formData.fromCurrency, formData.toCurrency, "50000")?.myBuyRate || "0";
                          const calculatedAmount = totalFromDenominations * parseFloat(rate);
                          targetAmount = formatVNDWithFloor(calculatedAmount);
                        } else {
                          targetAmount = parseFloat(formData.toAmount) || 0;
                        }
                        
                        // 실제로 고객이 받을 금액을 기준으로 분배 (vndOriginalAmount 사용)
                        const fixedBreakdown = calculateVNDBreakdown(vndOriginalAmount > 0 ? vndOriginalAmount : targetAmount);
                        
                        // 실제 분배: 사용자 수정이 있으면 그것을 사용하고, 없으면 기본 분배 사용
                        const actualBreakdown = (formData.vndBreakdown && Object.keys(formData.vndBreakdown).length > 0) 
                          ? formData.vndBreakdown 
                          : fixedBreakdown;

                        // VND 분배가 있는 경우에만 표시
                        const hasBreakdown = Object.entries(actualBreakdown).some(([denom, count]) => parseInt(count.toString()) > 0);
                        
                        if (hasBreakdown) {
                          return (
                            <div className="mt-2 pt-2 border-t border-gray-200/50">
                              <div className="text-xs text-gray-500 mb-2 font-medium">권종별 분배 내역:</div>
                              <div className="space-y-1">
                                {Object.entries(actualBreakdown)
                                  .filter(([denom, count]) => parseInt(count.toString()) > 0)
                                  .sort(([a], [b]) => parseInt(b) - parseInt(a))
                                  .map(([denom, count]) => {
                                    const denomValue = parseInt(denom);
                                    const denomCount = parseInt(count.toString());
                                    const subtotal = denomValue * denomCount;
                                    return (
                                      <div key={denom} className="flex items-center justify-between text-xs">
                                        <span className="text-gray-600">
                                          {formatNumber(denomValue.toString())} VND × {denomCount}장
                                        </span>
                                        <span className="text-gray-700 font-medium">
                                          {formatNumber(subtotal.toString())} VND
                                        </span>
                                      </div>
                                    );
                                  })}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })()}
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



            {/* 보유량 부족 경고 */}
            {(() => {
              // VND 권종 분배가 있는 경우에만 검증
              if (formData.toCurrency === "VND") {
                // 기본 분배 계산
                const totalFromDenominations = Object.entries(formData.denominationAmounts || {}).reduce((total, [denom, amount]) => {
                  if (amount && parseFloat(amount) > 0) {
                    const denomValue = getDenominationValue(formData.fromCurrency, denom);
                    return total + (parseFloat(amount) * denomValue);
                  }
                  return total;
                }, 0);

                let targetAmount = 0;
                if (totalFromDenominations > 0) {
                  const rate = formData.fromCurrency === "KRW" ? 
                    getDenominationRate(formData.fromCurrency, formData.toCurrency, "50000")?.mySellRate || "0" :
                    getDenominationRate(formData.fromCurrency, formData.toCurrency, "50000")?.myBuyRate || "0";
                  const calculatedAmount = totalFromDenominations * parseFloat(rate);
                  targetAmount = formatVNDWithFloor(calculatedAmount);
                } else {
                  targetAmount = parseFloat(formData.toAmount) || 0;
                }
                
                // 실제로 고객이 받을 금액을 기준으로 분배 (vndOriginalAmount 사용)
                const fixedBreakdown = calculateVNDBreakdown(vndOriginalAmount > 0 ? vndOriginalAmount : targetAmount);
                
                // 실제 분배: 사용자 수정이 있으면 그것을 사용하고, 없으면 기본 분배 사용
                const actualBreakdown = (formData.vndBreakdown && Object.keys(formData.vndBreakdown).length > 0) 
                  ? formData.vndBreakdown 
                  : fixedBreakdown;

                // VND 현금 보유 상황 확인
                const vndCashAsset = Array.isArray(assets) ? assets.find((asset: any) => 
                  asset.name === "VND 현금" && asset.currency === "VND" && asset.type === "cash"
                ) : null;
                const denomComposition = vndCashAsset?.metadata?.denominations || {};

                // 보유량 부족 항목들 찾기
                const shortageItems = [];
                Object.entries(actualBreakdown).forEach(([denom, count]) => {
                  const requiredCount = parseInt(count.toString());
                  const denomKey = parseInt(denom).toLocaleString(); // 쉼표 포함 형태로 변환
                  const availableCount = denomComposition[denomKey] || 0;
                  if (requiredCount > availableCount) {
                    const shortage = requiredCount - availableCount;
                    shortageItems.push({
                      denom: parseInt(denom),
                      required: requiredCount,
                      available: availableCount,
                      shortage
                    });
                  }
                });

                if (shortageItems.length > 0) {
                  return (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center gap-2 text-red-800 mb-2">
                        <AlertCircle className="w-5 h-5" />
                        <span className="font-semibold">보유량 부족 오류</span>
                      </div>
                      <div className="text-sm text-red-700 space-y-1">
                        {shortageItems.map(item => (
                          <div key={item.denom}>
                            • {formatNumber(item.denom.toString())} VND: 필요 {item.required}장, 보유 {item.available}장 
                            <span className="font-bold text-red-800"> (부족: {item.shortage}장)</span>
                          </div>
                        ))}
                      </div>
                      <div className="text-xs text-red-600 mt-2">
                        VND 현금 보유량을 확인하고 권종 분배를 조정하세요.
                      </div>
                    </div>
                  );
                }
              }
              return null;
            })()}

            {/* 금액 불일치 경고 */}
            {(() => {
              // VND 권종 분배가 있는 경우에만 검증
              if (formData.toCurrency === "VND" && formData.vndBreakdown && Object.keys(formData.vndBreakdown).length > 0) {
                // 실제 분배 총액 계산
                const actualTotal = Object.entries(formData.vndBreakdown).reduce((total, [denom, count]) => {
                  const denomValue = parseInt(denom);
                  const denomCount = parseInt(count.toString());
                  return total + (denomValue * denomCount);
                }, 0);

                // 실제 환전금액은 vndOriginalAmount를 사용 (정확한 floor 적용 전 원본값)
                const expectedTotal = vndOriginalAmount > 0 ? vndOriginalAmount : (() => {
                  const totalFromDenominations = Object.entries(formData.denominationAmounts || {}).reduce((total, [denom, amount]) => {
                    if (amount && parseFloat(amount) > 0) {
                      const denomValue = getDenominationValue(formData.fromCurrency, denom);
                      return total + (parseFloat(amount) * denomValue);
                    }
                    return total;
                  }, 0);

                  if (totalFromDenominations > 0) {
                    const rate = formData.fromCurrency === "KRW" ? 
                      getDenominationRate(formData.fromCurrency, formData.toCurrency, "50000")?.mySellRate || "0" :
                      getDenominationRate(formData.fromCurrency, formData.toCurrency, "50000")?.myBuyRate || "0";
                    const calculatedAmount = totalFromDenominations * parseFloat(rate);
                    return formatVNDWithFloor(calculatedAmount); // 실제 환전될 금액 (floor 적용)
                  } else {
                    return parseFloat(formData.toAmount) || 0;
                  }
                })();

                const amountMismatch = Math.abs(actualTotal - expectedTotal) > 0;

                if (amountMismatch) {
                  return (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center gap-2 text-red-800 mb-2">
                        <AlertCircle className="w-5 h-5" />
                        <span className="font-semibold">금액 불일치 오류</span>
                      </div>
                      <div className="text-sm text-red-700 space-y-1">
                        <div>• 환전 예상 금액: {formatNumber(expectedTotal.toString())} VND</div>
                        <div>• 실제 분배 금액: {formatNumber(actualTotal.toString())} VND</div>
                        <div>• 차이: {formatNumber(Math.abs(actualTotal - expectedTotal).toString())} VND</div>
                      </div>
                      <div className="text-xs text-red-600 mt-2">
                        권종 분배를 조정하여 금액을 맞춘 후 거래를 진행하세요.
                      </div>
                    </div>
                  );
                }
              }
              return null;
            })()}

            <Button 
              type="submit" 
              className="w-full h-10 sm:h-12 text-sm sm:text-base font-medium" 
              disabled={(() => {
                // 기존 비활성화 조건
                if (createTransactionMutation.isPending) return true;

                // VND 거래인 경우 보유량 부족 검증
                if (formData.toCurrency === "VND") {
                  // 기본 분배 계산
                  const totalFromDenominations = Object.entries(formData.denominationAmounts || {}).reduce((total, [denom, amount]) => {
                    if (amount && parseFloat(amount) > 0) {
                      const denomValue = getDenominationValue(formData.fromCurrency, denom);
                      return total + (parseFloat(amount) * denomValue);
                    }
                    return total;
                  }, 0);

                  let targetAmount = 0;
                  if (totalFromDenominations > 0) {
                    const rate = formData.fromCurrency === "KRW" ? 
                      getDenominationRate(formData.fromCurrency, formData.toCurrency, "50000")?.mySellRate || "0" :
                      getDenominationRate(formData.fromCurrency, formData.toCurrency, "50000")?.myBuyRate || "0";
                    const calculatedAmount = totalFromDenominations * parseFloat(rate);
                    targetAmount = formatVNDWithFloor(calculatedAmount);
                  } else {
                    targetAmount = parseFloat(formData.toAmount) || 0;
                  }
                  
                  // 실제로 고객이 받을 금액을 기준으로 분배 (vndOriginalAmount 사용)
                  const fixedBreakdown = calculateVNDBreakdown(vndOriginalAmount > 0 ? vndOriginalAmount : targetAmount);
                  
                  // 실제 분배: 사용자 수정이 있으면 그것을 사용하고, 없으면 기본 분배 사용
                  const actualBreakdown = (formData.vndBreakdown && Object.keys(formData.vndBreakdown).length > 0) 
                    ? formData.vndBreakdown 
                    : fixedBreakdown;

                  // VND 현금 보유 상황 확인
                  const vndCashAsset = Array.isArray(assets) ? assets.find((asset: any) => 
                    asset.name === "VND 현금" && asset.currency === "VND" && asset.type === "cash"
                  ) : null;
                  const denomComposition = vndCashAsset?.metadata?.denominations || {};
                  


                  // 보유량 부족 여부 확인
                  const hasShortage = Object.entries(actualBreakdown).some(([denom, count]) => {
                    const requiredCount = parseInt(count.toString());
                    const denomKey = parseInt(denom).toLocaleString(); // 쉼표 포함 형태로 변환
                    const availableCount = denomComposition[denomKey] || 0;
                    return requiredCount > availableCount;
                  });

                  if (hasShortage) {
                    return true;
                  }

                  // VND 권종 분배 금액 검증
                  // 실제 분배 총액 계산
                  const actualTotal = Object.entries(actualBreakdown).reduce((total, [denom, count]) => {
                    const denomValue = parseInt(denom);
                    const denomCount = parseInt(count.toString());
                    return total + (denomValue * denomCount);
                  }, 0);

                  // 실제로 고객이 받을 금액 (vndOriginalAmount) 사용
                  const expectedTotal = vndOriginalAmount > 0 ? vndOriginalAmount : (() => {
                    if (totalFromDenominations > 0) {
                      const rate = formData.fromCurrency === "KRW" ? 
                        getDenominationRate(formData.fromCurrency, formData.toCurrency, "50000")?.mySellRate || "0" :
                        getDenominationRate(formData.fromCurrency, formData.toCurrency, "50000")?.myBuyRate || "0";
                      const calculatedAmount = totalFromDenominations * parseFloat(rate);
                      return formatVNDWithFloor(calculatedAmount);
                    } else {
                      return parseFloat(formData.toAmount) || 0;
                    }
                  })();

                  // 금액이 일치하지 않으면 비활성화
                  if (Math.abs(actualTotal - expectedTotal) > 0) {
                    return true;
                  }
                }

                return false;
              })()}
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