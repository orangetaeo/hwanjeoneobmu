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
import { AlertTriangle, Calculator, ArrowRightLeft, RefreshCw, User, Banknote } from "lucide-react";

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
  { value: "bank_transfer", label: "계좌 송금 환전(카카오뱅크 3333-03-1258874 예금주:김학태)", icon: Banknote }
];

export default function TransactionForm() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // 상태 관리
  const [formData, setFormData] = useState({
    transactionType: "cash_exchange",
    fromCurrency: "VND",
    toCurrency: "KRW",
    fromDenomination: "",
    toDenomination: "",
    fromAmount: "",
    toAmount: "",
    exchangeRate: "",
    customerName: "",
    customerPhone: "",
    memo: "",
    fromAssetId: "",
    toAssetId: ""
  });

  const [calculatedData, setCalculatedData] = useState({
    exchangeRate: 0,
    rateSource: "",
    isAutoCalculated: false
  });

  // 자산 목록 조회
  const { data: assets = [], isLoading: isLoadingAssets } = useQuery({
    queryKey: ["/api/assets"],
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
    mutationFn: (transactionData: any) => apiRequest("/api/transactions", "POST", transactionData),
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
        fromCurrency: "VND",
        toCurrency: "KRW",
        fromDenomination: "",
        toDenomination: "",
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
    
    const rate = await fetchExchangeRate(
      formData.fromCurrency,
      formData.toCurrency,
      formData.fromDenomination,
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

    // 고객 정보 검증 (현금 환전의 경우)
    if (formData.transactionType === "cash_exchange" && (!formData.customerName || !formData.customerPhone)) {
      toast({
        variant: "destructive",
        title: "고객 정보 필요",
        description: "현금 환전 시 고객명과 연락처를 입력하세요.",
      });
      return;
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
      profit: "0",
      memo: formData.memo,
      metadata: {
        customerName: formData.customerName,
        customerPhone: formData.customerPhone,
        fromDenomination: formData.fromDenomination,
        toDenomination: formData.toDenomination,
        exchangeRateSource: calculatedData.rateSource,
        isAutoCalculated: calculatedData.isAutoCalculated
      },
      status: "confirmed"
    };

    createTransactionMutation.mutate(transactionData);
  };

  // 숫자 포맷팅 함수
  const formatNumber = (num: string | number) => {
    if (!num) return "";
    const numValue = typeof num === "string" ? parseFloat(num) : num;
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
                  onValueChange={(value) => setFormData({ ...formData, fromCurrency: value, fromDenomination: "" })}
                >
                  <SelectTrigger data-testid="select-from-currency">
                    <SelectValue placeholder="통화 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VND">VND (베트남 동)</SelectItem>
                    <SelectItem value="KRW">KRW (한국 원)</SelectItem>
                    <SelectItem value="USD">USD (미국 달러)</SelectItem>
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
                    <SelectItem value="KRW">KRW (한국 원)</SelectItem>
                    <SelectItem value="USD">USD (미국 달러)</SelectItem>
                    <SelectItem value="VND">VND (베트남 동)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 권종 선택 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>받는 권종</Label>
                <Select 
                  value={formData.fromDenomination} 
                  onValueChange={(value) => setFormData({ ...formData, fromDenomination: value })}
                >
                  <SelectTrigger data-testid="select-from-denomination">
                    <SelectValue placeholder="권종 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCY_DENOMINATIONS[formData.fromCurrency as keyof typeof CURRENCY_DENOMINATIONS]?.map((denom) => (
                      <SelectItem key={denom.value} value={denom.value}>
                        {denom.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>주는 권종</Label>
                <Select 
                  value={formData.toDenomination} 
                  onValueChange={(value) => setFormData({ ...formData, toDenomination: value })}
                >
                  <SelectTrigger data-testid="select-to-denomination">
                    <SelectValue placeholder="권종 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCY_DENOMINATIONS[formData.toCurrency as keyof typeof CURRENCY_DENOMINATIONS]?.map((denom) => (
                      <SelectItem key={denom.value} value={denom.value}>
                        {denom.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 환율 적용 섹션 */}
            <div className="p-4 bg-blue-50 rounded-lg space-y-4">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4" />
                <Label>환율 설정</Label>
              </div>
              
              <div className="flex items-center gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAutoExchangeRate}
                  disabled={!formData.fromCurrency || !formData.toCurrency}
                  data-testid="button-auto-rate"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  자동 환율 적용
                </Button>
                
                <div className="flex-1">
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="환율 입력"
                    value={formData.exchangeRate}
                    onChange={(e) => setFormData({ ...formData, exchangeRate: e.target.value })}
                    data-testid="input-exchange-rate"
                  />
                </div>
              </div>

              {calculatedData.rateSource && (
                <div className="text-sm text-blue-600">
                  <Badge variant="secondary">
                    {calculatedData.rateSource}
                  </Badge>
                </div>
              )}
            </div>

            {/* 금액 입력 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>받는 금액 ({formData.fromCurrency})</Label>
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
                />
                {formData.fromAmount && (
                  <div className="text-xs text-gray-500 mt-1">
                    {formatNumber(formData.fromAmount)} {formData.fromCurrency}
                  </div>
                )}
              </div>
              <div>
                <Label>주는 금액 ({formData.toCurrency})</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0"
                  value={formData.toAmount}
                  onChange={(e) => {
                    setFormData({ ...formData, toAmount: e.target.value });
                    handleAmountCalculation('toAmount', e.target.value);
                  }}
                  data-testid="input-to-amount"
                />
                {formData.toAmount && (
                  <div className="text-xs text-gray-500 mt-1">
                    {formatNumber(formData.toAmount)} {formData.toCurrency}
                  </div>
                )}
              </div>
            </div>

            {/* 고객 정보 (현금 환전 시) */}
            {formData.transactionType === "cash_exchange" && (
              <div className="p-4 bg-yellow-50 rounded-lg space-y-4">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <Label>고객 정보</Label>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>고객명</Label>
                    <Input
                      placeholder="고객 이름"
                      value={formData.customerName}
                      onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                      data-testid="input-customer-name"
                    />
                  </div>
                  <div>
                    <Label>연락처</Label>
                    <Input
                      placeholder="휴대폰 번호"
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