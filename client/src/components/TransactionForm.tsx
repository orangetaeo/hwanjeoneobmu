import React, { useState, useEffect, useMemo, useCallback } from "react";
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
import { AlertTriangle, Calculator, ArrowRightLeft, RefreshCw, User, Banknote, TrendingUp, AlertCircle, ArrowUpRight, ArrowDownLeft } from "lucide-react";
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
  ],
  VND: [
    { value: "500000", label: "50만동" },
    { value: "200000", label: "20만동" },
    { value: "100000", label: "10만동" },
    { value: "50000", label: "5만동" },
    { value: "20000", label: "2만동" },
    { value: "10000", label: "1만동" }
  ]
};

// 거래 유형별 설정
const TRANSACTION_TYPES = [
  { value: "cash_exchange", label: "현금 환전", icon: ArrowRightLeft },
  { value: "cash_to_krw_account", label: "현금 → KRW 계좌이체", icon: Banknote },
  { value: "vnd_account_to_krw_account", label: "VND 계좌 → KRW 계좌이체", icon: TrendingUp },
  { value: "cash_to_vnd_account", label: "현금 → VND 계좌이체", icon: ArrowUpRight },
  { value: "krw_account_to_vnd_account", label: "KRW 계좌 → VND 계좌이체", icon: ArrowDownLeft }
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
    vndBreakdown: {} as Record<string, number>, // VND 권종별 분배
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

  // KRW 권종별 분배 수정용 상태
  const [krwBreakdown, setKrwBreakdown] = useState<Record<string, number>>({});
  
  // USD 권종별 분배 수정용 상태
  const [usdBreakdown, setUsdBreakdown] = useState<Record<string, number>>({});
  
  // 통화나 권종 변경 시 분배 상태 초기화
  useEffect(() => {
    setVndBreakdown({});
    setKrwBreakdown({});
    setUsdBreakdown({});
  }, [formData.fromCurrency, formData.toCurrency, JSON.stringify(formData.denominationAmounts)]);

  // 권종별 환율의 평균 계산
  const calculateAverageExchangeRate = () => {
    // VND→USD 거래의 경우 USD→VND 권종별 환율의 평균 계산
    if (formData.fromCurrency === "VND" && formData.toCurrency === "USD") {
      if (Array.isArray(exchangeRates)) {
        const usdToVndRates = exchangeRates.filter((rate: any) => 
          rate.fromCurrency === "USD" && 
          rate.toCurrency === "VND"
        );
        
        if (usdToVndRates.length > 0) {
          const avgRate = usdToVndRates.reduce((sum, rate) => sum + parseFloat(rate.myBuyRate), 0) / usdToVndRates.length;
          return avgRate;
        }
      }
    }
    
    // USD→KRW 거래의 경우 USD→KRW 권종별 환율의 평균 계산
    if (formData.fromCurrency === "USD" && formData.toCurrency === "KRW") {
      if (Array.isArray(exchangeRates)) {
        const usdToKrwRates = exchangeRates.filter((rate: any) => 
          rate.fromCurrency === "USD" && 
          rate.toCurrency === "KRW"
        );
        
        if (usdToKrwRates.length > 0) {
          const avgRate = usdToKrwRates.reduce((sum, rate) => sum + parseFloat(rate.mySellRate), 0) / usdToKrwRates.length;
          return avgRate;
        }
      }
    }
    
    // KRW→USD 거래의 경우 KRW→USD 권종별 환율의 평균 계산
    if (formData.fromCurrency === "KRW" && formData.toCurrency === "USD") {
      if (Array.isArray(exchangeRates)) {
        const krwToUsdRates = exchangeRates.filter((rate: any) => 
          rate.fromCurrency === "KRW" && 
          rate.toCurrency === "USD"
        );
        
        if (krwToUsdRates.length > 0) {
          const avgRate = krwToUsdRates.reduce((sum, rate) => sum + parseFloat(rate.mySellRate), 0) / krwToUsdRates.length;
          return avgRate;
        }
      }
    }
    
    // VND→KRW 거래의 경우 권종별 매매시세의 평균 계산
    if (formData.fromCurrency === "VND" && formData.toCurrency === "KRW") {
      if (Array.isArray(exchangeRates)) {
        // 입력된 권종들의 매매시세 수집
        const enteredDenominations = Object.keys(formData.denominationAmounts || {}).filter(denom => 
          formData.denominationAmounts[denom] && parseFloat(formData.denominationAmounts[denom]) > 0
        );
        
        if (enteredDenominations.length > 0) {
          const rates: number[] = [];
          
          enteredDenominations.forEach(denomination => {
            const displayRate = getVndToKrwDisplayRate(denomination);
            if (displayRate > 0) {
              rates.push(displayRate);
            }
          });
          
          if (rates.length > 0) {
            const avgRate = rates.reduce((sum, rate) => sum + rate, 0) / rates.length;
            console.log(`VND→KRW 평균 매매시세 계산: ${rates.join(', ')} → 평균: ${avgRate}`);
            return avgRate;
          }
        }
        
        // 입력된 권종이 없으면 기본값으로 500000 권종 환율 사용
        const defaultRate = getVndToKrwDisplayRate("500000");
        if (defaultRate > 0) {
          return defaultRate;
        }
      }
    }
    
    // 기존 로직: 실제 거래 금액 기준 계산
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
  const { data: assets = [], isLoading: isLoadingAssets, refetch: refetchAssets } = useQuery<Asset[]>({
    queryKey: ["/api/assets"],
    refetchOnWindowFocus: true,
    refetchInterval: 10000, // 10초마다 자동 새로고침
  });

  // 환율 목록 조회
  const { data: exchangeRates = [], isLoading: isLoadingRates } = useQuery<any[]>({
    queryKey: ["/api/exchange-rates"],
  });

  // 권종별 VND → KRW 매매시세 계산 함수
  const getVndToKrwDisplayRate = useCallback((denomination: string) => {
    if (formData.fromCurrency === "VND" && formData.toCurrency === "KRW" && Array.isArray(exchangeRates)) {
      // 우선 해당 권종의 VND → KRW 환율 조회
      let specificRate = exchangeRates.find((rate: any) => 
        rate.fromCurrency === "VND" && 
        rate.toCurrency === "KRW" && 
        rate.denomination === denomination &&
        rate.isActive === "true"
      );
      
      // 해당 권종 환율이 없으면 500000 권종 환율을 대표값으로 사용
      if (!specificRate) {
        specificRate = exchangeRates.find((rate: any) => 
          rate.fromCurrency === "VND" && 
          rate.toCurrency === "KRW" && 
          rate.denomination === "500000" &&
          rate.isActive === "true"
        );
      }
      
      if (specificRate) {
        const vndToKrwBuyRate = parseFloat(specificRate.myBuyRate);
        console.log(`권종별 VND→KRW 매매시세 (${denomination}: ${vndToKrwBuyRate}) - 내 매입가 사용`);
        return vndToKrwBuyRate;
      } else {
        console.log(`권종 ${denomination}의 VND→KRW 환율 정보 없음`);
        return 0;
      }
    }
    return 0;
  }, [formData.fromCurrency, formData.toCurrency, exchangeRates]);

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
      // 강제 캐시 무효화 및 새로고침
      queryClient.removeQueries({ queryKey: ["/api/transactions"] });
      queryClient.removeQueries({ queryKey: ["/api/assets"] });
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
        vndBreakdown: {},
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
      
      // 권종별 분배 초기화
      setVndBreakdown({});
      setKrwBreakdown({});
      setVndOriginalAmount(0);
      setVndBaseAmount(0);
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
    
    // VND→USD의 경우 USD→VND의 내 매입가를 역산하여 사용 (평균 환율)
    if (fromCurrency === "VND" && toCurrency === "USD") {
      // 모든 USD→VND 환율의 평균을 계산하여 사용
      const usdToVndRates = exchangeRates.filter((rate: any) => 
        rate.fromCurrency === "USD" && 
        rate.toCurrency === "VND"
      );
      
      if (usdToVndRates.length > 0) {
        // 평균 환율 계산
        const avgRate = usdToVndRates.reduce((sum, rate) => sum + parseFloat(rate.myBuyRate), 0) / usdToVndRates.length;
        const vndToUsdRate = 1 / avgRate;
        
        return {
          fromCurrency: "VND",
          toCurrency: "USD",
          denomination: searchDenomination,
          myBuyRate: vndToUsdRate.toFixed(8),
          mySellRate: vndToUsdRate.toFixed(8),
          sellRateVnd: avgRate
        };
      }
    }
    
    const rate = exchangeRates.find((rate: any) => 
      rate.fromCurrency === fromCurrency && 
      rate.toCurrency === toCurrency && 
      rate.denomination === searchDenomination
    );
    
    console.log(`환율 검색: ${fromCurrency}→${toCurrency}, 원본권종: ${denomination}, 검색권종: ${searchDenomination}, 결과:`, rate);
    return rate;
  };

  // 환율 포맷팅 함수
  const formatRate = (rate: number, fromCurrency: string, toCurrency: string) => {
    // USD→VND와 USD→KRW는 정수만 표기
    if (fromCurrency === "USD" && (toCurrency === "VND" || toCurrency === "KRW")) {
      return Math.round(rate).toLocaleString('ko-KR');
    }
    // VND→KRW는 소수점 3자리까지 표기
    else if (fromCurrency === "VND" && toCurrency === "KRW") {
      return rate.toLocaleString('ko-KR', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
    }
    // 받는 권종에 따른 매매시세 표기 방식 (기존 로직)
    else if (toCurrency === "KRW") {
      // KRW: 소수점 2자리까지 표기
      return rate.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } else if (toCurrency === "USD") {
      // USD: 정수만 표기
      return Math.round(rate).toLocaleString('ko-KR');
    } else if (toCurrency === "VND") {
      // VND: 소수점 2자리까지 표기 (KRW→VND 환율 표시)
      return rate.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
    const vndDenominations = [500000, 200000, 100000, 50000, 20000, 10000, 5000, 1000];
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

    // 남은 금액이 있으면 정확히 분배
    if (remaining > 0) {
      console.log(`남은 금액 ${remaining} VND를 추가 분배`);
      
      // 5000원과 1000원으로 정확히 분배
      if (remaining >= 5000) {
        const count5000 = Math.floor(remaining / 5000);
        breakdown["5000"] = (breakdown["5000"] || 0) + count5000;
        remaining = remaining % 5000;
        console.log(`5,000 VND: ${count5000}장 추가, 남은 금액: ${remaining}`);
      }
      
      if (remaining >= 1000) {
        const count1000 = Math.floor(remaining / 1000);
        breakdown["1000"] = (breakdown["1000"] || 0) + count1000;
        remaining = remaining % 1000;
        console.log(`1,000 VND: ${count1000}장 추가, 남은 금액: ${remaining}`);
      }
      
      // 1000원 미만의 잔액이 있으면 1000원권으로 올림
      if (remaining > 0) {
        breakdown["1000"] = (breakdown["1000"] || 0) + 1;
        console.log(`1,000 VND: 1장 추가 (잔액 ${remaining} 처리), 남은 금액: 0`);
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

  // KRW 권종별 분배 계산 (고액권부터 우선 분배, 보유 장수 고려)
  const calculateKRWBreakdown = (totalAmount: number, ignoreInventory: boolean = false) => {
    const krwDenominations = [50000, 10000, 5000, 1000];
    const breakdown: { [key: string]: number } = {};
    let remaining = totalAmount;

    console.log(`KRW 분배 계산 시작: ${totalAmount.toLocaleString()} KRW`);

    // KRW 현금 자산에서 권종별 보유 장수 조회
    const assetArray = Array.isArray(assets) ? assets : [];
    const krwCashAsset = assetArray.find((asset: Asset) => 
      asset.name === "KRW 현금" && asset.currency === "KRW"
    );
    
    console.log("전체 자산 배열:", assetArray);
    console.log("KRW 현금 자산 검색 결과:", krwCashAsset);
    console.log("권종별 보유량:", krwCashAsset?.metadata?.denominations);
    
    // 디버깅을 위한 키 목록 출력
    const allKeys = Object.keys(krwCashAsset?.metadata?.denominations || {});
    console.log("사용 가능한 모든 키:", allKeys);

    for (const denom of krwDenominations) {
      if (remaining >= denom) {
        const idealCount = Math.floor(remaining / denom);
        
        if (ignoreInventory) {
          // 재고 무시하고 이상적인 분배 계산
          if (idealCount > 0) {
            breakdown[denom.toString()] = idealCount;
            remaining -= idealCount * denom;
            console.log(`${denom.toLocaleString()} KRW: ${idealCount}장 (재고 무시), 남은 금액: ${remaining.toLocaleString()}`);
          }
        } else {
          // 보유 장수 제한 적용 - 키 매칭 로직 수정
          const denominations = krwCashAsset?.metadata?.denominations || {};
          let availableCount = 0;
          
          // 실제 키와 직접 매칭
          const denomKey = `${(denom/1000).toFixed(0)},000`; // "50,000" 형태
          availableCount = denominations[denomKey] || 0;
          
          console.log(`${denom.toLocaleString()} KRW 키 매칭: ${denom} → "${denomKey}", 보유량: ${availableCount}`);
          const actualCount = Math.min(idealCount, availableCount);
          

          
          if (actualCount > 0) {
            breakdown[denom.toString()] = actualCount;
            remaining -= actualCount * denom;
            console.log(`${denom.toLocaleString()} KRW: 이상값 ${idealCount}장, 보유량 ${availableCount}장, 실제 ${actualCount}장, 남은 금액: ${remaining.toLocaleString()}`);
          } else if (idealCount > 0) {
            console.log(`${denom.toLocaleString()} KRW: 필요 ${idealCount}장, 보유량 ${availableCount}장 부족으로 건너뜀`);
          }
        }
      }
    }

    // 남은 금액이 있으면 가장 작은 권종(1,000 KRW)으로 추가 처리
    if (remaining > 0) {
      const smallestDenom = 1000;
      const additionalCount = Math.ceil(remaining / smallestDenom);
      const currentCount = breakdown[smallestDenom.toString()] || 0;
      breakdown[smallestDenom.toString()] = currentCount + additionalCount;
      console.log(`${smallestDenom.toLocaleString()} KRW: ${additionalCount}장 추가, 남은 금액: 0`);
    }

    console.log("KRW 분배 결과:", breakdown);
    return breakdown;
  };

  // KRW 권종별 분배에서 총액 계산
  const calculateTotalFromKRWBreakdown = (breakdown: Record<string, number>) => {
    return Object.entries(breakdown).reduce((total, [denom, count]) => {
      return total + (parseInt(denom.replace(/,/g, '')) * count);
    }, 0);
  };

  // USD 권종별 분배 계산 (고액권부터 우선 분배, 보유 장수 고려)
  const calculateUSDBreakdown = (totalAmount: number, ignoreInventory: boolean = false) => {
    const usdDenominations = [100, 50, 20, 10, 5, 2, 1];
    const breakdown: { [key: string]: number } = {};
    let remaining = totalAmount;

    console.log(`USD 분배 계산 시작: ${totalAmount.toLocaleString()} USD`);

    // USD 현금 자산에서 권종별 보유 장수 조회
    const assetArray = Array.isArray(assets) ? assets : [];
    const usdCashAsset = assetArray.find((asset: Asset) => 
      asset.name === "USD 현금" && asset.currency === "USD"
    );
    
    console.log("USD 현금 자산 검색 결과:", usdCashAsset);
    console.log("USD 권종별 보유량:", usdCashAsset?.metadata?.denominations);

    for (const denom of usdDenominations) {
      if (remaining >= denom) {
        const idealCount = Math.floor(remaining / denom);
        
        if (ignoreInventory) {
          // 재고 무시하고 이상적인 분배 계산
          if (idealCount > 0) {
            breakdown[denom.toString()] = idealCount;
            remaining -= idealCount * denom;
            console.log(`${denom} USD: ${idealCount}장 (재고 무시), 남은 금액: ${remaining.toLocaleString()}`);
          }
        } else {
          // 보유 장수 제한 적용
          const availableCount = usdCashAsset?.metadata?.denominations?.[denom.toString()] || 0;
          const actualCount = Math.min(idealCount, availableCount);
          
          console.log(`${denom} USD: 이상값 ${idealCount}장, 보유량 ${availableCount}장, 실제 ${actualCount}장`);
          
          if (actualCount > 0) {
            breakdown[denom.toString()] = actualCount;
            remaining -= actualCount * denom;
            console.log(`${denom} USD: 이상값 ${idealCount}장, 보유량 ${availableCount}장, 실제 ${actualCount}장, 남은 금액: ${remaining.toLocaleString()}`);
          } else if (idealCount > 0) {
            console.log(`${denom} USD: 필요 ${idealCount}장, 보유량 ${availableCount}장 부족으로 건너뜀`);
          }
        }
      }
    }

    // 남은 금액이 있으면 가장 작은 권종(1 USD)으로 추가 처리
    if (remaining > 0) {
      const oneUsdCount = breakdown["1"] || 0;
      breakdown["1"] = oneUsdCount + remaining;
      console.log(`1 USD: ${remaining}장 추가, 남은 금액: 0`);
    }

    console.log("USD 분배 결과:", breakdown);
    return breakdown;
  };

  // USD 권종별 분배에서 총액 계산
  const calculateTotalFromUSDBreakdown = (breakdown: Record<string, number>) => {
    return Object.entries(breakdown).reduce((total, [denom, count]) => {
      return total + (parseInt(denom) * count);
    }, 0);
  }

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

  // KRW 권종별 분배 수정 핸들러
  const handleKRWBreakdownChange = (denomination: string, newCount: number) => {
    const updatedBreakdown = {
      ...krwBreakdown,
      [denomination]: Math.max(0, newCount)
    };
    setKrwBreakdown(updatedBreakdown);
    
    // 총액 재계산 및 formData 업데이트
    const newTotal = calculateTotalFromKRWBreakdown(updatedBreakdown);
    setFormData(prev => ({ ...prev, toAmount: newTotal.toString() }));
  };

  // USD 권종별 분배 수정 핸들러
  const handleUSDBreakdownChange = (denomination: string, newCount: number) => {
    const updatedBreakdown = {
      ...usdBreakdown,
      [denomination]: Math.max(0, newCount)
    };
    setUsdBreakdown(updatedBreakdown);
    
    // 총액 재계산 및 formData 업데이트
    const newTotal = calculateTotalFromUSDBreakdown(updatedBreakdown);
    setFormData(prev => ({ ...prev, toAmount: newTotal.toString() }));
  };

  // 권종별 금액이 변경될 때 총액 업데이트 및 환율 자동 설정
  useEffect(() => {
    if (formData.transactionType === "cash_exchange" || formData.transactionType === "cash_to_krw_account") {
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
        let rate = 0;
        if (formData.fromCurrency === "KRW") {
          // KRW를 주는 경우: 내 매도가 사용
          rate = parseFloat(rateInfo?.mySellRate || "0");
        } else if (formData.fromCurrency === "VND" || formData.fromCurrency === "USD") {
          // VND나 USD를 받는 경우: 내 매입가 사용
          rate = parseFloat(rateInfo?.myBuyRate || "0");
        } else {
          rate = parseFloat(rateInfo?.myBuyRate || "0");
        }
        console.log(`환율 조회: ${formData.fromCurrency}→${formData.toCurrency}, 권종: ${denomValue}, 환율: ${rate}`);
        const totalValue = amount * getDenominationValue(formData.fromCurrency, denomValue);
        
        // KRW→USD 환전의 경우 나누기 적용
        let calculatedValue;
        if (formData.fromCurrency === "KRW" && formData.toCurrency === "USD") {
          calculatedValue = totalValue / rate;
          console.log(`계산: ${totalValue} / ${rate} = ${calculatedValue}`);
        } else {
          calculatedValue = totalValue * rate;
          console.log(`계산: ${totalValue} * ${rate} = ${calculatedValue}`);
        }
        return totalAmount + calculatedValue;
      }, 0);
      
      if (calculatedToAmount > 0) {
        // VND의 경우 원본값 저장하고 무조건 내림 적용
        if (formData.toCurrency === "VND") {
          console.log("Setting VND original amount:", calculatedToAmount);
          console.log("VND original has decimal:", calculatedToAmount % 1 !== 0);
          setVndOriginalAmount(calculatedToAmount);
          const finalAmount = Math.floor(calculatedToAmount);
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
        } else if (formData.toCurrency === "KRW") {
          setVndOriginalAmount(0); // VND가 아니므로 0으로 리셋
          
          // USD→KRW인 경우 올림 처리 적용
          if (formData.fromCurrency === "USD") {
            // 1000원 단위 올림으로 고객에게 유리한 금액 제공
            const ceilAmount = Math.ceil(calculatedToAmount / 1000) * 1000;
            console.log(`USD→KRW 올림 처리: ${calculatedToAmount} → ${ceilAmount}`);
            
            setFormData(prev => ({ 
              ...prev, 
              toAmount: ceilAmount.toString(),
              exchangeRate: (ceilAmount / total).toString()
            }));
            
            // KRW 분배 계산 및 설정 (올림된 금액 기준)
            console.log("USD→KRW 환전: KRW 분배 계산 시작, finalAmount:", ceilAmount);
            let breakdown = calculateKRWBreakdown(ceilAmount, false);
            console.log("KRW 분배 계산 (보유량 기반):", breakdown);
            
            // 보유량 부족으로 분배가 불완전한 경우 이상적인 분배 사용
            const actualTotal = calculateTotalFromKRWBreakdown(breakdown);
            console.log(`KRW 분배 검증: 목표 ${ceilAmount}, 실제 ${actualTotal}`);
            
            if (actualTotal < ceilAmount) {
              console.log("KRW 보유량 부족으로 이상적인 분배 계산");
              breakdown = calculateKRWBreakdown(ceilAmount, true);
              console.log("KRW 분배 계산 (이상적 분배):", breakdown);
            }
            
            setKrwBreakdown(breakdown);
          } else {
            // VND→KRW나 다른 경우는 기존 로직 유지
            const finalAmount = Math.round(calculatedToAmount / 1000) * 1000;
            console.log(`KRW 1000원 단위 반올림: ${calculatedToAmount} → ${finalAmount}`);
            
            // KRW 분배 계산 및 설정
            console.log("VND→KRW 환전: KRW 분배 계산 시작, finalAmount:", finalAmount);
            // 우선 실제 보유량 기반으로 시도
            let breakdown = calculateKRWBreakdown(finalAmount, false);
            console.log("KRW 분배 계산 (보유량 기반):", breakdown);
            
            // 보유량 부족으로 분배가 불완전한 경우 이상적인 분배 사용
            const actualTotal = calculateTotalFromKRWBreakdown(breakdown);
            console.log(`KRW 분배 검증: 목표 ${finalAmount}, 실제 ${actualTotal}`);
            
            if (actualTotal < finalAmount) {
              console.log("KRW 보유량 부족으로 이상적인 분배 계산");
              breakdown = calculateKRWBreakdown(finalAmount, true);
              console.log("KRW 분배 계산 (이상적 분배):", breakdown);
            }
            
            setKrwBreakdown(breakdown);
            
            setFormData(prev => ({ 
              ...prev, 
              toAmount: finalAmount.toString(),
              exchangeRate: (finalAmount / total).toString()
            }));
          }
        } else if (formData.toCurrency === "USD") {
          setVndOriginalAmount(0); // VND가 아니므로 0으로 리셋
          
          // KRW→USD인 경우 올림 처리 적용
          if (formData.fromCurrency === "KRW") {
            // 올림 처리로 고객에게 유리한 금액 제공
            const ceilAmount = Math.ceil(calculatedToAmount);
            console.log(`KRW→USD 올림 처리: ${calculatedToAmount} → ${ceilAmount}`);
            setFormData(prev => ({ 
              ...prev, 
              toAmount: ceilAmount.toString(),
              exchangeRate: (ceilAmount / total).toString()
            }));
            
            // USD 분배 계산 및 설정 (올림된 정수 금액 기준)
            const breakdown = calculateUSDBreakdown(ceilAmount);
            setUsdBreakdown(breakdown);
          } else {
            // 다른 경우는 기존 로직 유지
            const finalAmount = Math.round(calculatedToAmount * 100) / 100;
            console.log(`USD 소수점 2자리 반올림: ${calculatedToAmount} → ${finalAmount}`);
            setFormData(prev => ({ 
              ...prev, 
              toAmount: finalAmount.toString(),
              exchangeRate: (finalAmount / total).toString()
            }));
            
            // USD 분배 계산 및 설정 (정수 부분만)
            const integerAmount = Math.round(finalAmount);
            const breakdown = calculateUSDBreakdown(integerAmount);
            setUsdBreakdown(breakdown);
          }
        } else {
          setVndOriginalAmount(0); // 다른 통화는 0으로 리셋
          const finalAmount = Math.round(calculatedToAmount);
          setFormData(prev => ({ 
            ...prev, 
            toAmount: finalAmount.toString(),
            exchangeRate: (finalAmount / total).toString()
          }));
        }
      } else {
        // 계산된 금액이 0이면 모든 것을 초기화
        setVndBreakdown({});
        setKrwBreakdown({});
        setUsdBreakdown({});
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
          // 권종 키를 숫자 형태 그대로 사용 (API 데이터가 "50000" 형태로 저장됨)
          const denomKey = denom; // 쉼표 없는 숫자 형태로 사용
          const availableCount = denomComposition[denomKey] || 0;
          console.log(`VND 권종 검증: ${denom} - 필요: ${requiredCount}장, 보유: ${availableCount}장`);
          
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

    // 권종별 보유 수량 검증 (KRW 분배)
    if (formData.toCurrency === "KRW" && Object.keys(krwBreakdown).length > 0) {
      const assetArray = Array.isArray(assets) ? assets : [];
      const krwCashAsset = assetArray.find((asset: Asset) => 
        asset.name === "KRW 현금" && asset.currency === "KRW"
      );
      
      if (krwCashAsset?.metadata?.denominations) {
        const denomComposition = krwCashAsset.metadata.denominations;
        for (const [denom, requiredCount] of Object.entries(krwBreakdown)) {
          // 권종 키를 쉼표 포함 형태로 변환 (예: "50000" → "50,000")
          const denomKey = parseInt(denom).toLocaleString();
          const availableCount = denomComposition[denomKey] || 0;
          if (requiredCount > availableCount) {
            toast({
              variant: "destructive",
              title: "KRW 보유 수량 부족",
              description: `${formatNumber(denom)} KRW 권종이 ${requiredCount - availableCount}장 부족합니다.`,
            });
            return;
          }
        }
      }
    }

    // 권종별 보유 수량 검증 (USD 분배)
    if (formData.toCurrency === "USD" && Object.keys(usdBreakdown).length > 0) {
      const usdCashAsset = Array.isArray(assets) ? assets.find((asset: Asset) => 
        asset.name === "USD 현금" && asset.currency === "USD" && asset.type === "cash"
      ) : null;
      
      if (usdCashAsset?.metadata?.denominations) {
        const denomComposition = usdCashAsset.metadata.denominations;
        
        // 1. 총 필요 USD 금액 계산
        const totalRequiredUSD = Object.entries(usdBreakdown).reduce((sum, [denom, count]) => {
          return sum + (parseFloat(denom) * (count as number));
        }, 0);
        
        const availableUSD = parseFloat(usdCashAsset.balance.toString());
        
        // 2. 총액 검증
        if (totalRequiredUSD > availableUSD) {
          toast({
            variant: "destructive",
            title: "USD 보유량 부족",
            description: `필요한 USD: $${totalRequiredUSD.toLocaleString()}, 보유 USD: $${availableUSD.toLocaleString()}`,
          });
          return;
        }
        
        // 3. 권종별 수량 검증
        for (const [denom, requiredCount] of Object.entries(usdBreakdown)) {
          const availableCount = denomComposition[denom] || 0;
          if (requiredCount > availableCount) {
            toast({
              variant: "destructive",
              title: "보유 수량 부족",
              description: `$${denom} 권종이 ${requiredCount - availableCount}장 부족합니다.`,
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

    // 자산명 결정: 계좌이체별 계좌명 매핑
    const getToAssetName = () => {
      if (formData.transactionType === "cash_to_krw_account" || formData.transactionType === "vnd_account_to_krw_account") {
        return "카카오뱅크 (김학태)";
      } else if (formData.transactionType === "cash_to_vnd_account" || formData.transactionType === "krw_account_to_vnd_account") {
        // VND 계좌는 선택에 따라 결정
        if (formData.toAssetId === "bidv") return "BIDV";
        if (formData.toAssetId === "shinhan") return "신한은행";
        return "신한은행"; // 기본값
      }
      return `${formData.toCurrency} 현금`;
    };
    
    const getFromAssetName = () => {
      if (formData.transactionType === "vnd_account_to_krw_account") {
        return formData.fromAssetId === "bidv" ? "BIDV" : "신한은행";
      } else if (formData.transactionType === "krw_account_to_vnd_account") {
        if (formData.fromAssetId === "kakao") return "카카오뱅크 (김학태)";
        if (formData.fromAssetId === "kookmin") return "국민은행 (김학태)";
        if (formData.fromAssetId === "hana") return "하나은행";
        return "카카오뱅크 (김학태)"; // 기본값
      }
      return `${formData.fromCurrency} 현금`;
    };

    // 거래 데이터 구성
    const transactionData = {
      type: formData.transactionType,
      fromAssetType: (formData.transactionType === "vnd_account_to_krw_account" || formData.transactionType === "krw_account_to_vnd_account") ? "account" : "cash",
      fromAssetId: formData.fromAssetId,
      fromAssetName: getFromAssetName(),
      toAssetType: (formData.transactionType === "cash_to_krw_account" || formData.transactionType === "vnd_account_to_krw_account" || formData.transactionType === "cash_to_vnd_account" || formData.transactionType === "krw_account_to_vnd_account") ? "account" : "cash",
      toAssetId: formData.toAssetId,
      toAssetName: getToAssetName(),
      fromAmount: formData.fromAmount,
      toAmount: formData.toAmount,
      rate: formData.exchangeRate,
      fees: "0",
      profit: floorProfit.toString(),
      memo: formData.transactionType === "cash_to_krw_account" ? 
        formData.memo.replace(/\-/g, '') : formData.memo,
      metadata: {
        customerName: formData.customerName,
        customerPhone: formData.customerPhone,
        fromDenominations: formData.fromDenominations,
        denominationAmounts: formData.denominationAmounts,
        toDenomination: formData.toDenomination,
        exchangeRateSource: calculatedData.rateSource,
        isAutoCalculated: calculatedData.isAutoCalculated,
        floorProfit: floorProfit, // VND 내림으로 인한 수익
        // USD 분배 정보 저장
        usdBreakdown: formData.toCurrency === "USD" ? usdBreakdown : undefined,
        // VND 분배 정보 저장  
        vndBreakdown: formData.toCurrency === "VND" ? vndBreakdown : undefined,
        // KRW 분배 정보 저장 (계좌이체용)
        krwBreakdown: formData.toCurrency === "KRW" && (formData.transactionType === "cash_to_krw_account" || formData.transactionType === "vnd_account_to_krw_account") ? krwBreakdown : undefined
      },
      status: "confirmed"
    };

    createTransactionMutation.mutate(transactionData);
  };

  // VND 천 단위 반올림 함수 (환전상 지급 규칙)
  const formatVNDWithFloor = (amount: number) => {
    // 10,000원 단위에서 반올림 처리 (천 단위 3자리 반올림)
    return Math.round(amount / 10000) * 10000;
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
                key={`transaction-${formData.transactionType || 'empty'}`}
                value={formData.transactionType} 
                onValueChange={(value) => {
                  // 기본값 설정
                  let newFormData = { ...formData, transactionType: value };
                  
                  // 현금 → KRW 계좌이체 선택 시 기본값 설정
                  if (value === "cash_to_krw_account") {
                    newFormData = {
                      ...newFormData,
                      fromCurrency: "VND", // 받는 통화 VND로 기본 설정
                      toCurrency: "KRW", // 주는 통화는 KRW (계좌이체)
                      fromAssetId: "kakao" // 출금 계좌 카카오뱅크로 기본 설정
                    };
                  }
                  
                  // 즉시 상태 업데이트
                  setFormData(newFormData);
                }}
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
                  key={`from-${formData.fromCurrency || 'empty'}-${formData.transactionType || 'none'}`}
                  value={formData.fromCurrency} 
                  onValueChange={(value) => {
                    // 거래유형별 통화 자동 설정
                    let newToCurrency = formData.toCurrency;
                    
                    // cash_to_krw_account일 때는 항상 toCurrency를 KRW로 고정
                    if (formData.transactionType === "cash_to_krw_account") {
                      newToCurrency = "KRW";
                    } else if (formData.transactionType === "vnd_account_to_krw_account") {
                      newToCurrency = "KRW";
                    } else if (formData.transactionType === "cash_to_vnd_account") {
                      newToCurrency = "VND";
                    } else if (formData.transactionType === "krw_account_to_vnd_account") {
                      newToCurrency = "VND";
                    } else {
                      // 일반 환전의 경우만 동일 통화 방지 로직 적용
                      newToCurrency = value === formData.toCurrency ? "" : formData.toCurrency;
                    }
                    const newFormData = { 
                      ...formData, 
                      fromCurrency: value, 
                      toCurrency: newToCurrency,
                      fromDenominations: [], 
                      denominationAmounts: {} 
                    };
                    
                    setFormData(newFormData);
                  }}
                >
                  <SelectTrigger data-testid="select-from-currency">
                      <SelectValue placeholder="통화 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* cash_to_krw_account인 경우 KRW 제외 */}
                    {formData.transactionType === "cash_to_krw_account" ? (
                      <>
                        <SelectItem value="USD">USD (미국 달러)</SelectItem>
                        <SelectItem value="VND">VND (베트남 동)</SelectItem>
                      </>
                    ) : (
                      <>
                        <SelectItem value="KRW">KRW (한국 원)</SelectItem>
                        <SelectItem value="USD">USD (미국 달러)</SelectItem>
                        <SelectItem value="VND">VND (베트남 동)</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>주는 통화 (To)</Label>
                <Select 
                  key={`to-${formData.toCurrency || 'empty'}-${formData.transactionType || 'none'}`}
                  value={formData.toCurrency} 
                  onValueChange={(value) => {
                    setFormData({ ...formData, toCurrency: value, toDenomination: "" });
                  }}
                >
                  <SelectTrigger data-testid="select-to-currency">
                      <SelectValue placeholder="통화 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {formData.transactionType === "cash_to_krw_account" || formData.transactionType === "vnd_account_to_krw_account" ? (
                      <SelectItem value="KRW">KRW (한국 원) - 카카오뱅크 계좌이체</SelectItem>
                    ) : formData.transactionType === "cash_to_vnd_account" || formData.transactionType === "krw_account_to_vnd_account" ? (
                      <SelectItem value="VND">VND (베트남 동) - 계좌 선택 필요</SelectItem>
                    ) : (
                      /* 받는 통화와 동일한 통화 제외 */
                      ["VND", "KRW", "USD"].filter(currency => currency !== formData.fromCurrency).map(currency => (
                        <SelectItem key={currency} value={currency}>
                          {currency === "VND" ? "VND (베트남 동)" : 
                           currency === "KRW" ? "KRW (한국 원)" : 
                           "USD (미국 달러)"}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 금액 입력 - 권종 선택 위로 이동 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-base font-medium">받는 금액 ({formData.fromCurrency})</Label>
                {/* 현금 → KRW 계좌이체도 현금환전과 동일한 UI 사용 */}
                {(formData.transactionType === "cash_exchange" || formData.transactionType === "cash_to_vnd_account" || formData.transactionType === "cash_to_krw_account") ? (
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
                        // 실제 환전금액 사용 (정확한 Math.floor 적용)
                        const flooredAmount = Math.floor(vndOriginalAmount);
                        console.log(`파란 박스 VND 표시: vndOriginalAmount=${vndOriginalAmount}, Math.floor=${flooredAmount}`);
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

            {/* 권종 선택 및 고객 계좌 정보 - 모바일 최적화 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <Label>받는 권종 ({formData.fromCurrency})</Label>
                {(formData.transactionType === "vnd_account_to_krw_account" || formData.transactionType === "krw_account_to_vnd_account") ? (
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
                      계좌 간 이체 시 총 금액만 입력
                    </div>
                    
                    {/* 계좌 선택 드롭다운 */}
                    {formData.transactionType === "vnd_account_to_krw_account" && (
                      <div className="mt-2">
                        <Label className="text-sm">출금 계좌</Label>
                        <Select value={formData.fromAssetId} onValueChange={(value) => setFormData({ ...formData, fromAssetId: value })}>
                          <SelectTrigger>
                            <SelectValue placeholder="VND 계좌 선택" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="shinhan">신한은행 (2,216만 VND)</SelectItem>
                            <SelectItem value="bidv">BIDV (120만 VND)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    
                    {formData.transactionType === "krw_account_to_vnd_account" && (
                      <div className="mt-2">
                        <Label className="text-sm">출금 계좌</Label>
                        <Select value={formData.fromAssetId} onValueChange={(value) => setFormData({ ...formData, fromAssetId: value })}>
                          <SelectTrigger>
                            <SelectValue placeholder="KRW 계좌 선택" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="kakao">카카오뱅크 (0원)</SelectItem>
                            <SelectItem value="kookmin">국민은행 (0원)</SelectItem>
                            <SelectItem value="hana">하나은행 (75만원)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    
                    {/* VND 계좌 선택 (cash_to_vnd_account용) */}
                    {(formData.transactionType === "cash_to_vnd_account" || formData.transactionType === "krw_account_to_vnd_account") && formData.toCurrency === "VND" && (
                      <div className="mt-2">
                        <Label className="text-sm">입금 계좌 선택</Label>
                        <Select value={formData.toAssetId} onValueChange={(value) => setFormData({ ...formData, toAssetId: value })}>
                          <SelectTrigger>
                            <SelectValue placeholder="VND 계좌 선택" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="shinhan">신한은행 (2,216만 VND)</SelectItem>
                            <SelectItem value="bidv">BIDV (120만 VND)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {CURRENCY_DENOMINATIONS[formData.fromCurrency as keyof typeof CURRENCY_DENOMINATIONS]?.map((denom) => {
                      const rateInfo = getDenominationRate(formData.fromCurrency, formData.toCurrency, denom.value);
                      const isSelected = formData.fromDenominations.includes(denom.value);
                      const hasData = formData.denominationAmounts[denom.value] && parseFloat(formData.denominationAmounts[denom.value]) > 0;
                      // 매매시세 표시를 위한 변수 설정
                      let useRate = 0;
                      let displayRate = 0;
                      
                      if (formData.fromCurrency === "VND" && formData.toCurrency === "KRW") {
                        // VND → KRW의 경우 권종별 매매시세 사용
                        displayRate = getVndToKrwDisplayRate(denom.value);
                        
                        // 환전 계산용 크로스 환율은 해당 권종의 매도가 사용
                        const specificRate = exchangeRates?.find((rate: any) => 
                          rate.fromCurrency === "USD" && 
                          rate.toCurrency === "VND" && 
                          rate.denomination === denom.value &&
                          rate.isActive === "true"
                        );
                        if (specificRate && displayRate > 0) {
                          const vndSellRate = parseFloat(specificRate.mySellRate);
                          useRate = displayRate / vndSellRate;
                        }
                      } else {
                        // 기존 로직: 직접 환율 사용
                        useRate = formData.fromCurrency === "KRW" ? parseFloat(rateInfo?.mySellRate || "0") : parseFloat(rateInfo?.myBuyRate || "0");
                        displayRate = useRate;
                      }
                      

                      
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
                          {/* 상단: 체크박스, 권종명, 매도시세 - 모바일 한 줄 배치 */}
                          <div className="flex items-center justify-between mb-2 gap-2">
                            <div className="flex items-center space-x-2 flex-1 min-w-0">
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
                                <div className="text-base sm:text-lg font-semibold text-gray-800 truncate">
                                  {denom.label}
                                  {/* 접힌 상태에서 권종명 옆에 수량 표시 */}
                                  {!isSelected && hasData && (
                                    <span className="ml-1 sm:ml-2 text-sm sm:text-base font-medium text-gray-600">
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
                            {(
                              (formData.fromCurrency === "KRW" && formData.toCurrency === "VND") || 
                              (formData.fromCurrency === "USD" && formData.toCurrency === "VND") ||
                              (formData.fromCurrency === "USD" && formData.toCurrency === "KRW") ||
                              (formData.fromCurrency === "KRW" && formData.toCurrency === "USD") ||
                              (formData.fromCurrency === "VND" && formData.toCurrency === "KRW")
                            ) && (
                              <div className="px-3 py-2 bg-red-50 border border-red-200 rounded text-center min-w-[150px] flex-shrink-0">
                                <div className="text-sm font-bold text-red-700 whitespace-nowrap">
                                  매매시세 {displayRate > 0 ? (
                                    formatRate(displayRate, formData.fromCurrency, formData.toCurrency)
                                  ) : '0.00'}
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
                              {useRate > 0 && formData.denominationAmounts[denom.value] && !(formData.fromCurrency === "VND" && formData.toCurrency === "USD") && (
                                <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                                  <div className="text-sm text-orange-600 font-medium mb-1">환전 예상</div>
                                  <div className="text-lg font-bold text-orange-700">
                                    ≈ {(() => {
                                      const amount = parseFloat(formData.denominationAmounts[denom.value]);
                                      const denomValue = getDenominationValue(formData.fromCurrency, denom.value);
                                      
                                      // KRW→USD 환전의 경우 나누기 적용
                                      let calculatedAmount;
                                      if (formData.fromCurrency === "KRW" && formData.toCurrency === "USD") {
                                        calculatedAmount = (amount * denomValue) / useRate;
                                        console.log(`환전 예상 계산 (${denom.value}): ${amount}장 × ${denomValue} ÷ ${useRate} = ${calculatedAmount}`);
                                      } else {
                                        calculatedAmount = amount * denomValue * useRate;
                                        console.log(`환전 예상 계산 (${denom.value}): ${amount}장 × ${denomValue} × ${useRate} = ${calculatedAmount}`);
                                      }
                                      
                                      console.log(`Math.floor(${calculatedAmount}) = ${Math.floor(calculatedAmount)}`);
                                      
                                      // VND의 경우 정확한 계산값 사용 (반올림 없음), USD는 소수점 2자리
                                      const finalAmount = formData.toCurrency === "USD" ? 
                                        Math.round(calculatedAmount * 100) / 100 : 
                                        Math.floor(calculatedAmount);
                                        
                                      console.log(`환전 예상 최종 (${denom.value}): ${finalAmount}`);
                                      return finalAmount.toLocaleString();
                                    })()} {formData.toCurrency}
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

              {/* 현금 → KRW 계좌이체에서 고객 계좌 정보 표시 */}
              {formData.transactionType === "cash_to_krw_account" ? (
                <div>
                  <Label className="text-base font-medium">고객 계좌 정보 (필수)</Label>
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg mt-2">
                    <div className="text-sm font-medium text-red-700 mb-3 flex items-center">
                      <span className="mr-2">📋</span>
                      계좌이체 필수 정보
                    </div>
                    <div className="space-y-3">
                      <div>
                        <Label className="text-red-600">계좌명 (예금주명) *</Label>
                        <Input
                          placeholder="예금주명 입력 (필수)"
                          value={formData.customerName}
                          onChange={(e) => {
                            const value = e.target.value;
                            // 한글(완성형+조합형), 영어, 공백만 허용
                            if (/^[ㄱ-ㅎㅏ-ㅣ가-힣a-zA-Z\s]*$/.test(value)) {
                              setFormData({ ...formData, customerName: value });
                            }
                          }}
                          data-testid="input-customer-name"
                          className="border-red-200 focus:border-red-400 mt-1"
                          required
                        />
                      </div>
                      <div>
                        <Label className="text-red-600">은행명 *</Label>
                        <Input
                          placeholder="은행명 입력 (필수)"
                          value={formData.customerPhone}
                          onChange={(e) => {
                            const value = e.target.value;
                            // 한글(완성형+조합형), 영어, 공백만 허용
                            if (/^[ㄱ-ㅎㅏ-ㅣ가-힣a-zA-Z\s]*$/.test(value)) {
                              setFormData({ ...formData, customerPhone: value });
                            }
                          }}
                          data-testid="input-customer-bank"
                          className="border-red-200 focus:border-red-400 mt-1"
                          required
                        />
                      </div>
                      <div>
                        <Label className="text-red-600">계좌번호 *</Label>
                        <Input
                          placeholder="계좌번호 입력 (필수)"
                          value={formData.memo}
                          onChange={(e) => {
                            const value = e.target.value;
                            // 숫자와 하이픈만 허용
                            if (/^[0-9\-]*$/.test(value)) {
                              setFormData({ ...formData, memo: value });
                            }
                          }}
                          data-testid="input-customer-account"
                          className="border-red-200 focus:border-red-400 mt-1"
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : /* VND 권종별 분배 - 받는 권종 오른쪽에 배치 */
              formData.toCurrency === "VND" ? (
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
                          return formData.toCurrency === "VND" ? Math.floor(calculatedAmount) : calculatedAmount;
                        })() : (parseFloat(formData.toAmount) || 0);
                        
                        // 실제로 고객이 받을 금액을 기준으로 분배 (vndOriginalAmount 사용)
                        const fixedBreakdown = calculateVNDBreakdown(vndOriginalAmount > 0 ? vndOriginalAmount : targetAmount);
                        
                        // VND 현금 보유 상황 확인
                        const assetArray = Array.isArray(assets) ? assets : [];
                        const vndCashAsset = assetArray.find((asset: Asset) => 
                          asset.name === "VND 현금" && asset.currency === "VND" && asset.type === "cash"
                        );
                        const denomComposition = vndCashAsset?.metadata?.denominations || {};
                        
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

                        // 실제 분배 상황: 수정값이 있으면 사용, 없으면 기본값 사용
                        const actualBreakdown = vndBreakdown && Object.keys(vndBreakdown).length > 0 ? vndBreakdown : fixedBreakdown;
                        
                        // VND 보유량 부족 검증
                        const vndShortageItems: Array<{denom: number, required: number, available: number, shortage: number}> = [];
                        [500000, 200000, 100000, 50000, 20000, 10000, 5000, 1000].forEach((denom) => {
                          const defaultCount = (fixedBreakdown as Record<string, number>)[denom.toString()] || 0;
                          const currentCount = vndBreakdown?.[denom.toString()] !== undefined ? 
                            vndBreakdown[denom.toString()] : defaultCount;
                          
                          if (currentCount > 0) {
                            const denomKey = denom.toString();
                            const availableCount = denomComposition[denomKey] || 0;
                            
                            if (currentCount > availableCount) {
                              vndShortageItems.push({
                                denom,
                                required: currentCount,
                                available: availableCount,
                                shortage: currentCount - availableCount
                              });
                            }
                          }
                        });

                        // VND 보유량 부족 시 오류 메시지 표시
                        if (vndShortageItems.length > 0) {
                          return (
                            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                              <div className="flex items-center gap-2 text-red-800 mb-2">
                                <AlertCircle className="w-5 h-5" />
                                <span className="font-semibold">VND 보유량 부족 오류</span>
                              </div>
                              <div className="text-sm text-red-700 space-y-1">
                                {vndShortageItems.map((item) => (
                                  <div key={item.denom}>
                                    • {formatNumber(item.denom.toString())} VND: 필요 {item.required}장, 보유 {item.available}장 
                                    <span className="font-bold text-red-800"> (부족: {item.shortage}장)</span>
                                  </div>
                                ))}
                              </div>
                              <div className="text-xs text-red-600 mt-2">
                                VND 현금 보유량을 확인하고 거래 금액을 조정하세요.
                              </div>
                            </div>
                          );
                        }
                        
                        // 동적 추천 시스템: 현재 상황에서 남은 금액을 최적 분배
                        const calculateSuggestions = () => {
                          // 현재 분배 상황 (수정값이 있으면 사용, 없으면 기본값 사용)
                          const currentBreakdown = vndBreakdown && Object.keys(vndBreakdown).length > 0 ? vndBreakdown : fixedBreakdown;
                          
                          // 현재 총액과 목표 총액 계산
                          const currentTotal = Object.entries(currentBreakdown).reduce((total, [denom, count]) => {
                            const denomValue = parseInt(denom);
                            const denomCount = typeof count === 'number' ? count : parseInt(String(count));
                            return total + (denomValue * denomCount);
                          }, 0);
                          
                          const targetTotal = Object.entries(fixedBreakdown).reduce((total, [denom, count]) => {
                            const denomValue = parseInt(denom);
                            const denomCount = typeof count === 'number' ? count : parseInt(String(count));
                            return total + (denomValue * denomCount);
                          }, 0);
                          
                          const remainingAmount = targetTotal - currentTotal;
                          console.log("목표 총액:", targetTotal, "현재 총액:", currentTotal, "남은 금액:", remainingAmount);
                          
                          const suggestions: Record<string, number> = {};
                          
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
                          console.log("VND 현금 자산:", vndCashAsset);
                          console.log("권종 구성 데이터:", denomComposition);
                          
                          // 각 권종별로 남은 금액을 분배하는 방법들을 계산
                          const denominations = [500000, 200000, 100000, 50000, 20000, 10000, 5000, 1000];
                          
                          denominations.forEach(denom => {
                            const currentCount = currentBreakdown[denom.toString()] || 0;
                            const denomKey = denom.toString(); // 쉼표 없는 형태로 변환
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

                        // 현재 화면에 표시되는 권종별 입력값들의 총합을 계산하여 외부에서 사용할 수 있도록 저장
                        let currentDisplayTotal = 0;
                        
                        const denominationCards = [500000, 200000, 100000, 50000, 20000, 10000, 5000, 1000].map((denom) => {
                          const defaultCount = (fixedBreakdown as Record<string, number>)[denom.toString()] || 0;
                          const currentCount = vndBreakdown?.[denom.toString()] !== undefined ? 
                            vndBreakdown[denom.toString()] : defaultCount;
                          
                          // 현재 표시되는 총합에 추가
                          currentDisplayTotal += denom * currentCount;
                          const suggestedCount = suggestions[denom.toString()] || 0;
                        
                          // 권종 키 형태 확인 (쉼표 없는 형태로 저장되어 있음)
                          const denomKey = denom.toString();  // 숫자를 "500000" 형태로 변환
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
                                        <span className="ml-1 text-blue-600">
                                          -{currentCount}장 = {Math.max(0, availableCount - currentCount)}장
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                                    <Input
                                      type="text"
                                      min="0"
                                      max={availableCount}
                                      value={currentCount?.toString() || "0"}
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
                                          setVndBreakdown(updatedBreakdown);
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
                                          setVndBreakdown({
                                            ...vndBreakdown,
                                            [denom.toString()]: newCount
                                          });
                                        } else {
                                          // +0 버튼 클릭 시 입력 칸을 0으로 설정
                                          setVndBreakdown({
                                            ...vndBreakdown,
                                            [denom.toString()]: 0
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
                        });
                        
                        return denominationCards.filter(Boolean);
                      })()}
                    </div>
                    
                    <div className="mt-3 pt-2 border-t border-orange-200">
                      <div className="text-xs sm:text-sm font-medium text-orange-700">
                        총 분배액: <span className="text-sm sm:text-lg font-bold">
                          {(() => {
                            // VND 권종별 분배 총액 계산 - 실제 환율 계산 결과를 우선 사용
                            let totalAmount = 0;
                            
                            if (vndBreakdown && Object.keys(vndBreakdown).length > 0) {
                              // 사용자가 수정한 값이 있는 경우
                              totalAmount = Object.entries(vndBreakdown).reduce((total, [denom, count]) => {
                                const denomValue = parseInt(denom);
                                const denomCount = typeof count === 'number' ? count : parseInt(String(count));
                                return total + (denomValue * denomCount);
                              }, 0);
                              console.log("총 분배액 (수정값):", totalAmount);
                            } else {
                              // 권종별 환율 적용 실제 계산값 사용 (VND 분배 자동 보정 무시)
                              const currentTotalFromDenominations = Object.entries(formData.denominationAmounts || {}).reduce((total, [denom, amount]) => {
                                if (amount && parseFloat(amount) > 0) {
                                  const denomValue = getDenominationValue(formData.fromCurrency, denom);
                                  return total + (parseFloat(amount) * denomValue);
                                }
                                return total;
                              }, 0);
                              
                              if (currentTotalFromDenominations > 0) {
                                // 권종별로 정확한 환율 적용해서 계산 - 실제 정확한 값 (반올림 없음)
                                totalAmount = Object.entries(formData.denominationAmounts || {}).reduce((totalVND, [denom, amount]) => {
                                  if (amount && parseFloat(amount) > 0) {
                                    const denomValue = getDenominationValue(formData.fromCurrency, denom);
                                    const totalFromCurrency = parseFloat(amount) * denomValue;
                                    
                                    const rateInfo = getDenominationRate(formData.fromCurrency, formData.toCurrency, denom);
                                    const rate = formData.fromCurrency === "KRW" ? 
                                      parseFloat(rateInfo?.mySellRate || "0") :
                                      parseFloat(rateInfo?.myBuyRate || "0");
                                    
                                    const denomResult = totalFromCurrency * rate;
                                    console.log(`권종별 계산: ${denom} ${formData.fromCurrency} ${amount}장 = ${totalFromCurrency} × ${rate} = ${denomResult} VND`);
                                    
                                    return totalVND + denomResult;
                                  }
                                  return totalVND;
                                }, 0);
                                
                                // 총 분배액 표시에서는 실제 계산값 그대로 사용 (반올림 안 함)
                                console.log(`최종 총 분배액 (반올림 전): ${totalAmount} VND`);
                              } else {
                                totalAmount = 0;
                              }
                              console.log("총 분배액 (실제 환율 계산):", totalAmount);
                            }
                            
                            return totalAmount.toLocaleString();
                          })()} VND
                        </span>
                      </div>
                      
                      {vndBreakdown && Object.keys(vndBreakdown).length > 0 && (
                        <div className="mt-2">
                          <button
                            type="button"
                            onClick={() => setVndBreakdown({})}
                            className="text-xs text-blue-600 hover:text-blue-800 underline"
                          >
                            기본값으로 되돌리기
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}
              
              {/* KRW 권종별 분배 - 현금 환전용만 (계좌이체는 제외) */}
              {formData.toCurrency === "KRW" && (formData.transactionType === "cash_exchange" || formData.transactionType === "vnd_account_to_krw_account") && (
                <div>
                  <Label className="text-base font-medium">권종별 분배</Label>
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg mt-2">
                    <div className="text-sm font-medium text-blue-700 mb-3 flex items-center">
                      <span className="mr-2">💰</span>
                      고액권 우선
                    </div>
                    <div className="space-y-2">
                      {(() => {
                        // VND 입력에서 직접 총액 계산
                        const totalFromDenominations = Object.entries(formData.denominationAmounts || {}).reduce((total, [denom, amount]) => {
                          if (amount && parseFloat(amount) > 0) {
                            const denomValue = getDenominationValue(formData.fromCurrency, denom);
                            return total + (parseFloat(amount) * denomValue);
                          }
                          return total;
                        }, 0);

                        // VND → KRW 환전될 KRW 금액 계산 (Math.ceil 사용), USD → KRW도 올림 처리
                        const targetAmount = totalFromDenominations > 0 ? (() => {
                          if (formData.fromCurrency === "VND" && formData.toCurrency === "KRW") {
                            // VND → KRW는 myBuyRate 사용 (고객에게 유리한 환율)
                            const rate = getDenominationRate(formData.fromCurrency, formData.toCurrency, "500000")?.myBuyRate || "0";
                            const calculatedAmount = totalFromDenominations * parseFloat(rate);
                            console.log(`VND→KRW 분배 계산: ${totalFromDenominations} VND × ${rate} = ${calculatedAmount} KRW`);
                            return Math.ceil(calculatedAmount);
                          } else if (formData.fromCurrency === "USD" && formData.toCurrency === "KRW") {
                            // USD → KRW는 myBuyRate 사용하고 1000원 단위 올림 처리
                            const calculatedTotal = Object.entries(formData.denominationAmounts || {}).reduce((total, [denom, amount]) => {
                              if (amount && parseFloat(amount) > 0) {
                                const denomValue = getDenominationValue(formData.fromCurrency, denom);
                                const totalFromCurrency = parseFloat(amount) * denomValue;
                                const rateInfo = getDenominationRate(formData.fromCurrency, formData.toCurrency, denom);
                                const rate = parseFloat(rateInfo?.myBuyRate || "0");
                                if (rate > 0) {
                                  return total + (totalFromCurrency * rate);
                                }
                              }
                              return total;
                            }, 0);
                            const ceilAmount = Math.ceil(calculatedTotal / 1000) * 1000;
                            console.log(`USD→KRW 분배 계산: 계산값 ${calculatedTotal} → 1000원 단위 올림 ${ceilAmount} KRW`);
                            return ceilAmount;
                          } else {
                            return totalFromDenominations;
                          }
                        })() : (parseFloat(formData.toAmount) || 0);
                        
                        // 실제로 고객이 받을 금액을 기준으로 분배
                        let fixedBreakdown = calculateKRWBreakdown(targetAmount > 0 ? targetAmount : 0, false);
                        
                        // 고액권(5만원, 1만원) 보유량 부족 시 이상적인 분배 사용
                        const hasHighDenominations = fixedBreakdown['50000'] > 0 || fixedBreakdown['10000'] > 0;
                        console.log(`KRW 분배 검증: 고액권 보유 여부 ${hasHighDenominations}, 분배:`, fixedBreakdown);
                        
                        if (!hasHighDenominations && targetAmount >= 50000) {
                          console.log("고액권 보유량 부족으로 이상적인 분배 표시");
                          fixedBreakdown = calculateKRWBreakdown(targetAmount, true);
                          console.log("KRW 분배 (이상적 분배):", fixedBreakdown);
                        }
                        
                        // 분배 자동 업데이트는 useEffect에서 처리하므로 제거
                        
                        // KRW 현금 보유 상황 확인
                        const assetArray = Array.isArray(assets) ? assets : [];
                        const krwCashAsset = assetArray.find((asset: any) => 
                          asset.name === "KRW 현금" && asset.currency === "KRW" && asset.type === "cash"
                        );
                        const denomComposition = krwCashAsset?.metadata?.denominations || {};
                        
                        // 권종 데이터가 없으면 안내 메시지 표시
                        if (totalFromDenominations === 0) {
                          return (
                            <div className="bg-white p-4 rounded border border-blue-200 text-center">
                              <div className="text-sm text-gray-500">
                                받는 권종을 선택하면 권종별 분배가 표시됩니다
                              </div>
                            </div>
                          );
                        }

                        // 분배 상황: 기본값 사용 (편집 불가로 단순화)
                        const actualBreakdown = fixedBreakdown;
                        
                        // 보유량 부족 검증
                        const shortageItems: Array<{denom: number, required: number, available: number, shortage: number}> = [];
                        [50000, 10000, 5000, 1000].forEach((denom) => {
                          const count = (actualBreakdown as Record<string, number>)[denom.toString()] || 0;
                          if (count > 0) {
                            // 통일된 키 매칭 방식 사용
                            const denomKey = `${(denom/1000).toFixed(0)},000`; // "50,000" 형태
                            const availableCount = denomComposition[denomKey] || 0;
                            
                            if (count > availableCount) {
                              shortageItems.push({
                                denom,
                                required: count,
                                available: availableCount,
                                shortage: count - availableCount
                              });
                            }
                          }
                        });

                        // 보유량 부족 시 오류 메시지 표시
                        if (shortageItems.length > 0) {
                          return (
                            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                              <div className="flex items-center gap-2 text-red-800 mb-2">
                                <AlertCircle className="w-5 h-5" />
                                <span className="font-semibold">KRW 보유량 부족 오류</span>
                              </div>
                              <div className="text-sm text-red-700 space-y-1">
                                {shortageItems.map((item) => (
                                  <div key={item.denom}>
                                    • {formatNumber(item.denom.toString())} KRW: 필요 {item.required}장, 보유 {item.available}장 
                                    <span className="font-bold text-red-800"> (부족: {item.shortage}장)</span>
                                  </div>
                                ))}
                              </div>
                              <div className="text-xs text-red-600 mt-2">
                                KRW 현금 보유량을 확인하고 거래 금액을 조정하세요.
                              </div>
                            </div>
                          );
                        }
                        
                        const denominationCards = [50000, 10000, 5000, 1000].map((denom) => {
                          const count = (actualBreakdown as Record<string, number>)[denom.toString()] || 0;
                          
                          // 통일된 키 매칭 방식 사용
                          const denomKey = `${(denom/1000).toFixed(0)},000`; // "50,000" 형태
                          const availableCount = denomComposition[denomKey] || 0;
                          
                          if (count > 0) {
                            return (
                              <div key={denom} className="bg-white p-3 sm:p-4 rounded border border-blue-200">
                                <div className="flex items-center justify-between gap-3">
                                  <div className="flex flex-col min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                      <div className="text-sm sm:text-base font-medium text-gray-900 truncate">
                                        {formatNumber(denom)} KRW
                                      </div>
                                      <div className="px-2 py-1 bg-red-100 border border-red-200 rounded text-xs text-red-700 font-medium">
                                        매도시세: {(() => {
                                          // KRW 권종에 따른 해당 KRW → VND 환율 찾기 (관점 변경)
                                          let searchDenom = denom.toString(); // KRW 권종 그대로 사용
                                          if (denom === 5000 || denom === 1000) {
                                            searchDenom = "5000_1000"; // 5천원, 1천원은 합쳐진 권종
                                          }
                                          
                                          const krwVndRate = exchangeRates?.find((rate: any) => 
                                            rate.fromCurrency === "KRW" && 
                                            rate.toCurrency === "VND" && 
                                            rate.denomination === searchDenom
                                          );
                                          
                                          // KRW → VND 매입시세 (myBuyRate) 소수점 2자리까지 표시
                                          const rate = krwVndRate?.myBuyRate || "18.90";
                                          return parseFloat(rate).toFixed(2);
                                        })()}
                                      </div>
                                    </div>
                                    <div className="text-xs sm:text-sm text-gray-500">
                                      보유: {formatNumber(availableCount)}장
                                      {count > 0 && (
                                        <span className="ml-1 text-blue-600">
                                          -{count}장 = {Math.max(0, availableCount - count)}장
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                                    <div className="text-lg sm:text-xl font-bold text-blue-700">
                                      {count}장
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        });
                        
                        return denominationCards.filter(Boolean);
                      })()}
                    </div>
                    
                    <div className="mt-3 pt-2 border-t border-blue-200">
                      <div className="text-xs sm:text-sm font-medium text-blue-700">
                        총 분배액: <span className="text-sm sm:text-lg font-bold">
                          {(() => {
                            // KRW 권종별 분배 총액 계산
                            let totalAmount = 0;
                            
                            // 권종별 환율 적용 실제 계산값 사용
                            const currentTotalFromDenominations = Object.entries(formData.denominationAmounts || {}).reduce((total, [denom, amount]) => {
                              if (amount && parseFloat(amount) > 0) {
                                const denomValue = getDenominationValue(formData.fromCurrency, denom);
                                return total + (parseFloat(amount) * denomValue);
                              }
                              return total;
                            }, 0);
                            
                            if (currentTotalFromDenominations > 0) {
                              if (formData.fromCurrency === "VND" && formData.toCurrency === "KRW") {
                                // VND → KRW는 myBuyRate 사용하고 Math.ceil로 고객에게 유리하게
                                const rateInfo = getDenominationRate(formData.fromCurrency, formData.toCurrency, "500000");
                                const rate = parseFloat(rateInfo?.myBuyRate || "0");
                                
                                if (rate > 0) {
                                  const calculatedAmount = currentTotalFromDenominations * rate;
                                  // Math.ceil 후 1000원 단위로 반올림
                                  const ceilAmount = Math.ceil(calculatedAmount);
                                  totalAmount = Math.ceil(ceilAmount / 1000) * 1000;
                                  console.log(`VND→KRW 총액 계산: ${currentTotalFromDenominations} VND × ${rate} = ${calculatedAmount} → Math.ceil = ${ceilAmount} → 1000원 반올림 = ${totalAmount} KRW`);
                                }
                              } else if (formData.fromCurrency === "USD" && formData.toCurrency === "KRW") {
                                // USD → KRW는 권종별 환율 적용하고 1000원 단위 올림 처리
                                const calculatedTotal = Object.entries(formData.denominationAmounts || {}).reduce((total, [denom, amount]) => {
                                  if (amount && parseFloat(amount) > 0) {
                                    const denomValue = getDenominationValue(formData.fromCurrency, denom);
                                    const totalFromCurrency = parseFloat(amount) * denomValue;
                                    const rateInfo = getDenominationRate(formData.fromCurrency, formData.toCurrency, denom);
                                    const rate = parseFloat(rateInfo?.myBuyRate || "0");
                                    if (rate > 0) {
                                      return total + (totalFromCurrency * rate);
                                    }
                                  }
                                  return total;
                                }, 0);
                                totalAmount = Math.ceil(calculatedTotal / 1000) * 1000;
                                console.log(`USD→KRW 총액 계산: 계산값 ${calculatedTotal} → 1000원 단위 올림 ${totalAmount} KRW`);
                              }
                            }
                            
                            return totalAmount.toLocaleString();
                          })()} KRW
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* USD 권종별 분배 (VND → USD, KRW → USD 거래시) */}
              {(() => {
                const shouldShow = formData.toCurrency === "USD" && 
                                 (formData.fromCurrency === "VND" || formData.fromCurrency === "KRW") && 
                                 parseFloat(formData.toAmount || "0") > 0;
                console.log("USD 분배 표시 조건:", {
                  toCurrency: formData.toCurrency,
                  fromCurrency: formData.fromCurrency,
                  toAmount: formData.toAmount,
                  toAmountParsed: parseFloat(formData.toAmount || "0"),
                  shouldShow
                });
                return shouldShow;
              })() && (() => {
                // 환전 금액으로부터 USD 분배 계산 - KRW→USD는 올림 처리 적용
                let targetUSDAmount;
                if (formData.fromCurrency === "KRW" && formData.toCurrency === "USD") {
                  // KRW→USD는 올림 처리하여 분배 대상 계산
                  const calculatedTotal = Object.entries(formData.denominationAmounts || {}).reduce((total, [denom, amount]) => {
                    if (amount && parseFloat(amount) > 0) {
                      const denomValue = getDenominationValue(formData.fromCurrency, denom);
                      const totalFromCurrency = parseFloat(amount) * denomValue;
                      const rateInfo = getDenominationRate(formData.fromCurrency, formData.toCurrency, denom);
                      const rate = parseFloat(rateInfo?.mySellRate || "0");
                      if (rate > 0) {
                        return total + (totalFromCurrency / rate);
                      }
                    }
                    return total;
                  }, 0);
                  targetUSDAmount = Math.ceil(calculatedTotal);
                  console.log(`USD 분배 대상 금액 (KRW→USD 올림): 계산값 ${calculatedTotal} → ${targetUSDAmount} USD`);
                } else {
                  targetUSDAmount = Math.floor(parseFloat(formData.toAmount) || 0);
                  console.log(`USD 분배 대상 금액: ${targetUSDAmount} USD`);
                }
                
                // 올림 처리된 금액을 기준으로 분배를 자동 업데이트
                let displayBreakdown;
                
                // 사용자 수정값이 있으면 그것을 사용
                if (Object.keys(usdBreakdown).length > 0) {
                  console.log("기존 USD 분배 사용:", usdBreakdown);
                  displayBreakdown = usdBreakdown;
                } else {
                  // 일반적인 경우 보유량 기반 분배
                  console.log("USD 분배 계산 시작 - 보유량 기반");
                  const realBreakdown = calculateUSDBreakdown(targetUSDAmount, false);
                  if (Object.keys(realBreakdown).length > 0) {
                    console.log("보유량 기반 USD 분배 성공:", realBreakdown);
                    displayBreakdown = realBreakdown;
                  } else {
                    console.log("보유량 기반 USD 분배 실패, 이상적 분배 시도");
                    displayBreakdown = calculateUSDBreakdown(targetUSDAmount, true);
                    console.log("이상적 USD 분배:", displayBreakdown);
                  }
                }

                return (
                <div>
                  <Label>주는 권종 ({formData.toCurrency}) - 권종별 분배</Label>
                  <div className="p-4 bg-green-50 border-2 border-green-200 rounded-lg">
                    <div className="space-y-3">
                      {(() => {

                        // USD 현금 자산 조회
                        const usdCashAsset = Array.isArray(assets) ? assets.find((asset: any) => 
                          asset.name === "USD 현금" && asset.currency === "USD"
                        ) : null;
                        const usdDenomComposition = usdCashAsset?.metadata?.denominations || {};

                        // USD 보유량 부족 검증
                        const usdShortageItems: Array<{denom: number, required: number, available: number, shortage: number}> = [];
                        Object.entries(displayBreakdown).forEach(([denom, count]) => {
                          const requiredCount = parseInt(count?.toString() || "0");
                          const availableCount = usdDenomComposition[denom] || 0;
                          
                          if (requiredCount > availableCount) {
                            usdShortageItems.push({
                              denom: parseInt(denom),
                              required: requiredCount,
                              available: availableCount,
                              shortage: requiredCount - availableCount
                            });
                          }
                        });

                        // USD 보유량 부족 시 오류 메시지 표시
                        if (usdShortageItems.length > 0) {
                          return (
                            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                              <div className="flex items-center gap-2 text-red-800 mb-2">
                                <AlertCircle className="w-5 h-5" />
                                <span className="font-semibold">USD 보유량 부족 오류</span>
                              </div>
                              <div className="text-sm text-red-700 space-y-1">
                                {usdShortageItems.map((item) => (
                                  <div key={item.denom}>
                                    • ${item.denom}: 필요 {item.required}장, 보유 {item.available}장 
                                    <span className="font-bold text-red-800"> (부족: {item.shortage}장)</span>
                                  </div>
                                ))}
                              </div>
                              <div className="text-xs text-red-600 mt-2">
                                USD 현금 보유량을 확인하고 거래 금액을 조정하세요.
                              </div>
                            </div>
                          );
                        }
                        
                        return Object.entries(displayBreakdown)
                          .filter(([denom, count]) => count > 0)
                          .sort(([a], [b]) => parseInt(b) - parseInt(a))
                          .map(([denom, count]) => {
                          const denomValue = parseInt(denom);
                          const subtotal = denomValue * count;
                          return (
                            <div key={denom} className="bg-white p-3 rounded border border-green-200">
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex flex-col min-w-0 flex-1">
                                  <div className="text-sm sm:text-base font-medium text-gray-900">
                                    ${denomValue}
                                  </div>
                                  <div className="text-xs sm:text-sm text-gray-500">
                                    {count}장 × ${denomValue} = ${subtotal}
                                  </div>
                                  {(() => {
                                    // USD 현금 자산에서 해당 권종의 보유 장수 조회
                                    const availableCount = usdDenomComposition[denom] || 0;
                                    
                                    return (
                                      <div className="text-xs text-gray-400">
                                        보유: {availableCount}장
                                        {count > 0 && (
                                          <span className="ml-1 text-blue-600">
                                            -{count}장 = {Math.max(0, availableCount - count)}장
                                          </span>
                                        )}
                                      </div>
                                    );
                                  })()}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Input
                                    type="number"
                                    min="0"
                                    value={displayBreakdown[denom] || 0}
                                    onChange={(e) => {
                                      const newCount = parseInt(e.target.value) || 0;
                                      handleUSDBreakdownChange(denom, newCount);
                                    }}
                                    className="w-16 h-8 text-xs text-center px-1"
                                  />
                                  <span className="text-xs text-gray-500">장</span>
                                </div>
                              </div>
                            </div>
                          );
                        });
                      })()}
                      
                    </div>
                    
                    <div className="mt-3 pt-2 border-t border-green-200">
                      <div className="text-xs sm:text-sm font-medium text-green-700">
                        총 분배액: <span className="text-sm sm:text-lg font-bold">
                          {(() => {
                            console.log("USD 총 분배액 계산 시작");
                            console.log("formData:", {
                              fromCurrency: formData.fromCurrency,
                              toCurrency: formData.toCurrency,
                              denominationAmounts: formData.denominationAmounts
                            });
                            
                            // USD 권종별 분배의 총액은 displayBreakdown 사용
                            const totalAmount = Object.entries(displayBreakdown || {}).reduce((total, [denom, count]) => {
                              const denomValue = parseInt(denom);
                              const subtotal = count * denomValue;
                              console.log(`USD 총액 계산: ${denom} USD × ${count}장 = ${subtotal}`);
                              return total + subtotal;
                            }, 0);
                            
                            console.log(`USD 총 분배액 최종: ${totalAmount}`);
                            return totalAmount.toLocaleString();
                          })()} USD
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                );
              })()}

            </div>









            {/* 고객 정보 */}
            {(formData.transactionType === "cash_exchange" || formData.transactionType === "foreign_to_account" || formData.transactionType === "cash_to_krw_account" || formData.transactionType === "cash_to_vnd_account" || formData.transactionType === "vnd_account_to_krw_account" || formData.transactionType === "krw_account_to_vnd_account") && (
              <div className="p-4 bg-yellow-50 rounded-lg space-y-4">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <Label>
                    {formData.transactionType === "cash_to_krw_account" ? 
                      "고객 계좌 정보 (필수)" : 
                      "고객 정보 (선택사항)"
                    }
                  </Label>
                </div>
                
                {/* 고객 계좌 정보는 받는 권종과 같은 줄로 이동됨 */}
                {formData.transactionType !== "cash_to_krw_account" && (
                  // 기존 선택사항 정보
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
                )}
              </div>
            )}

            {/* 메모 - cash_to_krw_account는 제외 (계좌번호 입력에 사용됨) */}
            {formData.transactionType !== "cash_to_krw_account" && (
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
            )}

            {/* 거래 확인 */}
            {(() => {
              console.log("거래 확인 조건 체크:");
              console.log("fromAmount:", formData.fromAmount);
              console.log("toAmount:", formData.toAmount);
              console.log("exchangeRate:", formData.exchangeRate);
              console.log("권종별 입력:", formData.denominationAmounts);
              console.log("총 권종별 합계:", calculateTotalFromAmount());
              
              // cash_to_krw_account는 권종별 선택이 없으므로 다른 로직 적용
              const hasFromAmount = formData.transactionType === "cash_to_krw_account" ? 
                formData.fromAmount && parseFloat(formData.fromAmount) > 0 : 
                (formData.fromAmount || calculateTotalFromAmount() > 0);
              const hasToAmount = formData.toAmount && parseFloat(formData.toAmount) > 0;
              const hasExchangeRate = formData.exchangeRate;
              
              console.log("표시 조건:", { hasFromAmount, hasToAmount, hasExchangeRate });
              return hasFromAmount && hasToAmount && hasExchangeRate;
            })() && (
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
                        <div className="text-lg font-bold text-emerald-700">
                          {formData.transactionType === "cash_to_krw_account" ? 
                            parseFloat(formData.fromAmount || "0").toLocaleString() : 
                            calculateTotalFromAmount().toLocaleString()
                          } {formData.fromCurrency}
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-3 bg-white/60 backdrop-blur-sm rounded-lg border border-white/40">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600 font-medium">고객이 받는 금액</span>
                        <div className="text-right">
                          <div className="text-lg font-bold text-teal-700">{(() => {
                            // 권종별로 정확한 환율 적용해서 계산
                            console.log("거래 확인 부분 계산 시작:");
                            const calculatedTotal = Object.entries(formData.denominationAmounts || {}).reduce((total, [denom, amount]) => {
                              if (amount && parseFloat(amount) > 0) {
                                const denomValue = getDenominationValue(formData.fromCurrency, denom);
                                const totalFromCurrency = parseFloat(amount) * denomValue;
                                
                                const rateInfo = getDenominationRate(formData.fromCurrency, formData.toCurrency, denom);
                                const rate = formData.fromCurrency === "KRW" ? 
                                  parseFloat(rateInfo?.mySellRate || "0") :
                                  parseFloat(rateInfo?.myBuyRate || "0");
                                
                                // KRW→USD 환전의 경우 나누기 적용
                                let subtotal;
                                if (formData.fromCurrency === "KRW" && formData.toCurrency === "USD") {
                                  subtotal = totalFromCurrency / rate;
                                  console.log(`거래확인: ${denom} ${amount}장 × ${denomValue} ÷ ${rate} = ${subtotal}`);
                                } else {
                                  subtotal = totalFromCurrency * rate;
                                  console.log(`거래확인: ${denom} ${amount}장 × ${denomValue} × ${rate} = ${subtotal}`);
                                }
                                return total + subtotal;
                              }
                              return total;
                            }, 0);
                            
                            console.log(`거래확인 최종 총액: ${calculatedTotal}`);
                            // VND→KRW 환전에서는 올림 사용, KRW 1000원 단위로 올림, VND→USD도 올림 사용
                            let finalAmount;
                            if (formData.fromCurrency === "VND" && formData.toCurrency === "KRW") {
                              // KRW 1000원 단위로 올림
                              finalAmount = Math.ceil(calculatedTotal / 1000) * 1000;
                              console.log(`VND→KRW 올림 처리: ${calculatedTotal} → ${finalAmount}`);
                            } else if (formData.fromCurrency === "VND" && formData.toCurrency === "USD") {
                              // USD는 소수점 이하 올림
                              finalAmount = Math.ceil(calculatedTotal);
                              console.log(`VND→USD 올림 처리: ${calculatedTotal} → ${finalAmount}`);
                            } else if (formData.fromCurrency === "KRW" && formData.toCurrency === "USD") {
                              // KRW→USD도 소수점 이하 올림
                              finalAmount = Math.ceil(calculatedTotal);
                              console.log(`KRW→USD 올림 처리: ${calculatedTotal} → ${finalAmount}`);
                            } else if (formData.fromCurrency === "USD" && formData.toCurrency === "KRW") {
                              // USD→KRW도 올림 처리 (1000원 단위)
                              finalAmount = Math.ceil(calculatedTotal / 1000) * 1000;
                              console.log(`USD→KRW 올림 처리: ${calculatedTotal} → ${finalAmount}`);
                            } else {
                              finalAmount = Math.floor(calculatedTotal);
                            }
                            console.log(`거래확인 Math.ceil/floor: ${finalAmount}`);
                            console.log(`formData.toAmount: ${formData.toAmount}`);
                            console.log(`실제 화면 표시값: ${finalAmount.toLocaleString()}`);
                            return finalAmount.toLocaleString();
                          })()} {formData.toCurrency}</div>
                        </div>
                      </div>
                      

                      {/* KRW 보유량 부족 경고 */}
                      {formData.toCurrency === "KRW" && Object.keys(krwBreakdown).length > 0 && (() => {
                        const assetArray = Array.isArray(assets) ? assets : [];
                        const krwCashAsset = assetArray.find((asset: any) => 
                          asset.name === "KRW 현금" && asset.currency === "KRW"
                        );
                        const denomComposition = krwCashAsset?.metadata?.denominations || {};

                        // 보유량 부족 항목들 찾기
                        const shortageItems: Array<{denom: string, required: number, available: number, shortage: number}> = [];
                        Object.entries(krwBreakdown).forEach(([denom, count]) => {
                          const requiredCount = parseInt(count.toString());
                          const denomKey = parseInt(denom).toLocaleString();
                          const availableCount = denomComposition[denomKey] || 0;
                          if (requiredCount > availableCount) {
                            const shortage = requiredCount - availableCount;
                            shortageItems.push({
                              denom: `${formatNumber(denom)} KRW`,
                              required: requiredCount,
                              available: availableCount,
                              shortage
                            });
                          }
                        });

                        if (shortageItems.length > 0) {
                          return (
                            <div className="mt-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                              <div className="flex items-center gap-2 text-red-800 mb-2">
                                <AlertCircle className="w-5 h-5" />
                                <span className="font-semibold">KRW 보유량 부족 오류</span>
                              </div>
                              <div className="text-sm text-red-700 space-y-1">
                                {shortageItems.map((item, index) => (
                                  <div key={index}>
                                    • {item.denom}: 필요 {item.required}장, 보유 {item.available}장 
                                    <span className="font-bold text-red-800"> (부족: {item.shortage}장)</span>
                                  </div>
                                ))}
                              </div>
                              <div className="text-xs text-red-600 mt-2">
                                KRW 현금 보유량을 확인하고 거래 금액을 조정하세요.
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
                        <div className="text-lg font-bold text-cyan-700">{(() => {
                          // 통화쌍별 환율 평균 계산
                          const rates: number[] = [];
                          
                          // USD→KRW 환전: USD 권종별 매도시세 수집
                          if (formData.fromCurrency === "USD" && formData.toCurrency === "KRW" && Object.keys(usdBreakdown).length > 0) {
                            Object.keys(usdBreakdown).forEach(denom => {
                              const count = usdBreakdown[denom];
                              if (count > 0) {
                                const usdKrwRate = exchangeRates?.find((rate: any) => 
                                  rate.fromCurrency === "USD" && 
                                  rate.toCurrency === "KRW" && 
                                  rate.denomination === denom
                                );
                                
                                if (usdKrwRate?.mySellRate) {
                                  rates.push(parseFloat(usdKrwRate.mySellRate));
                                }
                              }
                            });
                          }
                          
                          // KRW→USD 환전: KRW 권종별 매도시세 수집
                          if (formData.fromCurrency === "KRW" && formData.toCurrency === "USD" && Object.keys(krwBreakdown).length > 0) {
                            Object.keys(krwBreakdown).forEach(denom => {
                              const count = krwBreakdown[denom];
                              if (count > 0) {
                                const krwUsdRate = exchangeRates?.find((rate: any) => 
                                  rate.fromCurrency === "KRW" && 
                                  rate.toCurrency === "USD" && 
                                  rate.denomination === denom
                                );
                                
                                if (krwUsdRate?.mySellRate) {
                                  rates.push(parseFloat(krwUsdRate.mySellRate));
                                }
                              }
                            });
                          }
                          
                          // VND→KRW 환전: VND 권종별 매매시세 수집
                          if (formData.fromCurrency === "VND" && formData.toCurrency === "KRW" && Object.keys(formData.denominationAmounts || {}).length > 0) {
                            Object.keys(formData.denominationAmounts || {}).forEach(denom => {
                              const count = parseFloat(formData.denominationAmounts[denom] || "0");
                              if (count > 0) {
                                const vndToKrwRate = getVndToKrwDisplayRate(denom);
                                if (vndToKrwRate > 0) {
                                  rates.push(vndToKrwRate);
                                }
                              }
                            });
                          }
                          
                          // 기존 VND 환전: KRW→VND 매도시세 수집
                          if (formData.toCurrency === "KRW" && Object.keys(krwBreakdown).length > 0) {
                            Object.keys(krwBreakdown).forEach(denom => {
                              const count = krwBreakdown[denom];
                              if (count > 0) {
                                let searchDenom = denom.toString();
                                if (denom === "5000" || denom === "1000") {
                                  searchDenom = "5000_1000";
                                }
                                
                                const krwVndRate = exchangeRates?.find((rate: any) => 
                                  rate.fromCurrency === "KRW" && 
                                  rate.toCurrency === "VND" && 
                                  rate.denomination === searchDenom
                                );
                                
                                if (krwVndRate?.myBuyRate) {
                                  rates.push(parseFloat(krwVndRate.myBuyRate));
                                }
                              }
                            });
                          }
                          
                          if (rates.length > 0) {
                            const average = rates.reduce((sum, rate) => sum + rate, 0) / rates.length;
                            console.log(`거래 확인 적용 환율 평균 계산: ${rates.join(', ')} → 평균: ${average}`);
                            
                            // VND→KRW는 소수점 3자리, 나머지는 소수점 2자리
                            if (formData.fromCurrency === "VND" && formData.toCurrency === "KRW") {
                              return average.toFixed(3);
                            } else {
                              return average.toFixed(2);
                            }
                          }
                          
                          return calculateAverageExchangeRate().toString();
                        })()}</div>
                        <div className="text-xs text-gray-500 mt-0.5">(매도시세 평균)</div>
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
              // USD 권종 분배가 있는 경우 검증
              if (formData.toCurrency === "USD" && Object.keys(usdBreakdown).length > 0) {
                // USD 현금 보유 상황 확인
                const assetArray = Array.isArray(assets) ? assets : [];
                const usdCashAsset = assetArray.find((asset: any) => 
                  asset.name === "USD 현금" && asset.currency === "USD" && asset.type === "cash"
                );
                const denomComposition = usdCashAsset?.metadata?.denominations || {};

                // 보유량 부족 항목들 찾기
                const shortageItems: Array<{denom: string, required: number, available: number, shortage: number}> = [];
                Object.entries(usdBreakdown).forEach(([denom, count]) => {
                  const requiredCount = parseInt(count.toString());
                  const availableCount = denomComposition[denom] || 0;
                  if (requiredCount > availableCount) {
                    const shortage = requiredCount - availableCount;
                    shortageItems.push({
                      denom: `$${denom}`,
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
                        <span className="font-semibold">USD 보유량 부족 오류</span>
                      </div>
                      <div className="text-sm text-red-700 space-y-1">
                        {shortageItems.map((item, index) => (
                          <div key={index}>
                            • {item.denom}: 필요 {item.required}장, 보유 {item.available}장 
                            <span className="font-bold text-red-800"> (부족: {item.shortage}장)</span>
                          </div>
                        ))}
                      </div>
                      <div className="text-xs text-red-600 mt-2">
                        USD 현금 보유량을 확인하고 거래 금액을 조정하세요.
                      </div>
                    </div>
                  );
                }
              }
              // VND 권종 분배가 있는 경우에만 검증
              else if (formData.toCurrency === "VND") {
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
                const assetArray = Array.isArray(assets) ? assets : [];
                const vndCashAsset = assetArray.find((asset: any) => 
                  asset.name === "VND 현금" && asset.currency === "VND" && asset.type === "cash"
                );
                const denomComposition = vndCashAsset?.metadata?.denominations || {};

                // 보유량 부족 항목들 찾기
                const shortageItems: Array<{denom: number, required: number, available: number, shortage: number}> = [];
                Object.entries(actualBreakdown).forEach(([denom, count]) => {
                  const requiredCount = parseInt(count?.toString() || "0");
                  const denomKey = denom.toString(); // 쉼표 없는 형태로 변환
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
              if (formData.toCurrency === "VND" && vndBreakdown && Object.keys(vndBreakdown).length > 0) {
                // 실제 분배 총액 계산
                const actualTotal = Object.entries(vndBreakdown).reduce((total, [denom, count]) => {
                  const denomValue = parseInt(denom);
                  const denomCount = parseInt(count?.toString() || "0");
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

                // 현금 -> KRW 계좌이체의 경우 고객 계좌 정보 필수 검증
                if (formData.transactionType === "cash_to_krw_account") {
                  const hasCustomerName = formData.customerName && formData.customerName.trim().length > 0;
                  const hasBankName = formData.customerPhone && formData.customerPhone.trim().length > 0;
                  const hasAccountNumber = formData.memo && formData.memo.trim().length > 0;
                  
                  if (!hasCustomerName || !hasBankName || !hasAccountNumber) {
                    return true;
                  }
                }

                // KRW→USD 거래시 버튼 활성화 조건 검증
                if (formData.fromCurrency === "KRW" && formData.toCurrency === "USD") {
                  const calculatedUSDTotal = Object.entries(formData.denominationAmounts || {}).reduce((total, [denom, amount]) => {
                    if (amount && parseFloat(amount) > 0) {
                      const denomValue = getDenominationValue(formData.fromCurrency, denom);
                      const totalFromCurrency = parseFloat(amount) * denomValue;
                      const rateInfo = getDenominationRate(formData.fromCurrency, formData.toCurrency, denom);
                      const rate = parseFloat(rateInfo?.mySellRate || "0");
                      if (rate > 0) {
                        return total + (totalFromCurrency / rate);
                      }
                    }
                    return total;
                  }, 0);
                  
                  const expectedAmount = Math.ceil(calculatedUSDTotal);
                  const actualAmount = parseFloat(formData.toAmount || "0");
                  const totalFromAmount = calculateTotalFromAmount();
                  
                  console.log(`KRW→USD 버튼 검증: 계산 ${calculatedUSDTotal} → 올림 ${expectedAmount}, 실제 ${actualAmount}, 입력 ${totalFromAmount}`);
                  
                  return expectedAmount !== actualAmount || totalFromAmount === 0;
                }
                
                // USD→KRW 거래시 버튼 활성화 조건 검증  
                else if (formData.fromCurrency === "USD" && formData.toCurrency === "KRW") {
                  const calculatedKRWTotal = Object.entries(formData.denominationAmounts || {}).reduce((total, [denom, amount]) => {
                    if (amount && parseFloat(amount) > 0) {
                      const denomValue = getDenominationValue(formData.fromCurrency, denom);
                      const totalFromCurrency = parseFloat(amount) * denomValue;
                      const rateInfo = getDenominationRate(formData.fromCurrency, formData.toCurrency, denom);
                      const rate = parseFloat(rateInfo?.myBuyRate || "0");
                      if (rate > 0) {
                        return total + (totalFromCurrency * rate);
                      }
                    }
                    return total;
                  }, 0);
                  
                  const expectedAmount = Math.ceil(calculatedKRWTotal / 1000) * 1000;
                  const actualAmount = parseFloat(formData.toAmount || "0");
                  const totalFromAmount = calculateTotalFromAmount();
                  
                  console.log(`USD→KRW 버튼 검증: 계산 ${calculatedKRWTotal} → 올림 ${expectedAmount}, 실제 ${actualAmount}, 입력 ${totalFromAmount}`);
                  
                  return expectedAmount !== actualAmount || totalFromAmount === 0;
                }

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
                    targetAmount = Math.floor(calculatedAmount);
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
                    const denomKey = denom.toString(); // 쉼표 없는 형태로 유지
                    const availableCount = denomComposition[denomKey] || 0;
                    console.log(`보유량 검증: ${denom} VND - 필요: ${requiredCount}장, 보유: ${availableCount}장`);
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

                // USD 거래인 경우 보유량 부족 검증
                if (formData.toCurrency === "USD" && Object.keys(usdBreakdown).length > 0) {
                  // USD 현금 보유 상황 확인
                  const usdCashAsset = Array.isArray(assets) ? assets.find((asset: any) => 
                    asset.name === "USD 현금" && asset.currency === "USD" && asset.type === "cash"
                  ) : null;
                  const denomComposition = usdCashAsset?.metadata?.denominations || {};

                  // 보유량 부족 여부 확인
                  const hasShortage = Object.entries(usdBreakdown).some(([denom, count]) => {
                    const requiredCount = parseInt(count.toString());
                    const availableCount = denomComposition[denom] || 0;
                    return requiredCount > availableCount;
                  });

                  if (hasShortage) {
                    return true;
                  }

                  // USD 분배 금액 검증 - KRW→USD는 올림 처리
                  let expectedUSDTotal;
                  if (formData.fromCurrency === "KRW" && formData.toCurrency === "USD") {
                    // KRW→USD는 올림 처리하여 기대값 계산
                    const calculatedTotal = Object.entries(formData.denominationAmounts || {}).reduce((total, [denom, amount]) => {
                      if (amount && parseFloat(amount) > 0) {
                        const denomValue = getDenominationValue(formData.fromCurrency, denom);
                        const totalFromCurrency = parseFloat(amount) * denomValue;
                        const rateInfo = getDenominationRate(formData.fromCurrency, formData.toCurrency, denom);
                        const rate = parseFloat(rateInfo?.mySellRate || "0");
                        if (rate > 0) {
                          return total + (totalFromCurrency / rate);
                        }
                      }
                      return total;
                    }, 0);
                    expectedUSDTotal = Math.ceil(calculatedTotal);
                    console.log(`USD 버튼 활성화 검증: 계산값 ${calculatedTotal} → 올림 ${expectedUSDTotal}`);
                  } else {
                    expectedUSDTotal = Math.floor(parseFloat(formData.toAmount) || 0);
                  }
                  
                  const actualUSDTotal = calculateTotalFromUSDBreakdown(usdBreakdown);
                  console.log(`USD 버튼 활성화 검증: 기대값 ${expectedUSDTotal}, 실제값 ${actualUSDTotal}`);
                  
                  // 금액이 일치하지 않으면 비활성화
                  if (actualUSDTotal !== expectedUSDTotal && expectedUSDTotal > 0) {
                    console.log(`USD 금액 불일치로 버튼 비활성화: ${actualUSDTotal} !== ${expectedUSDTotal}`);
                    return true;
                  }
                }

                // KRW 거래인 경우 보유량 부족 검증
                if (formData.toCurrency === "KRW" && Object.keys(krwBreakdown).length > 0) {
                  const assetArray = Array.isArray(assets) ? assets : [];
                  const krwCashAsset = assetArray.find((asset: any) => 
                    asset.name === "KRW 현금" && asset.currency === "KRW"
                  );
                  const denomComposition = krwCashAsset?.metadata?.denominations || {};

                  // 보유량 부족 여부 확인
                  const hasShortage = Object.entries(krwBreakdown).some(([denom, count]) => {
                    const requiredCount = parseInt(count.toString());
                    const denomKey = parseInt(denom).toLocaleString(); // 쉼표 포함 형태로 변환
                    const availableCount = denomComposition[denomKey] || 0;
                    return requiredCount > availableCount;
                  });

                  if (hasShortage) {
                    return true;
                  }

                  // KRW 분배 금액 검증 - USD→KRW는 올림 처리
                  let expectedKRWTotal;
                  if (formData.fromCurrency === "USD" && formData.toCurrency === "KRW") {
                    // USD→KRW는 1000원 단위 올림 처리하여 기대값 계산
                    const calculatedTotal = Object.entries(formData.denominationAmounts || {}).reduce((total, [denom, amount]) => {
                      if (amount && parseFloat(amount) > 0) {
                        const denomValue = getDenominationValue(formData.fromCurrency, denom);
                        const totalFromCurrency = parseFloat(amount) * denomValue;
                        const rateInfo = getDenominationRate(formData.fromCurrency, formData.toCurrency, denom);
                        const rate = parseFloat(rateInfo?.myBuyRate || "0");
                        if (rate > 0) {
                          return total + (totalFromCurrency * rate);
                        }
                      }
                      return total;
                    }, 0);
                    expectedKRWTotal = Math.ceil(calculatedTotal / 1000) * 1000;
                    console.log(`KRW 버튼 활성화 검증: 계산값 ${calculatedTotal} → 1000원 단위 올림 ${expectedKRWTotal}`);
                  } else {
                    expectedKRWTotal = Math.floor(parseFloat(formData.toAmount) || 0);
                  }
                  
                  const actualKRWTotal = calculateTotalFromKRWBreakdown(krwBreakdown);
                  console.log(`KRW 버튼 활성화 검증: 기대값 ${expectedKRWTotal}, 실제값 ${actualKRWTotal}`);
                  
                  // 금액이 일치하지 않으면 비활성화
                  if (actualKRWTotal !== expectedKRWTotal && expectedKRWTotal > 0) {
                    console.log(`KRW 금액 불일치로 버튼 비활성화: ${actualKRWTotal} !== ${expectedKRWTotal}`);
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