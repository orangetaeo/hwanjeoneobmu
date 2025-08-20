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
import { Separator } from "@/components/ui/separator";
import { Globe, Banknote, DollarSign, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { formatCurrency, removeCommas, formatNumberInput } from "@/lib/utils";

interface ExchangeRate {
  id: string;
  userId: string;
  fromCurrency: string;
  toCurrency: string;
  denomination: string;
  goldShopRate: string | null;
  myBuyRate: string | null;
  mySellRate: string | null;
  isActive: string;
  memo: string | null;
  updatedAt: string;
  createdAt: string;
}

interface ExchangeRateHistory {
  id: string;
  userId: string;
  fromCurrency: string;
  toCurrency: string;
  denomination: string;
  goldShopRate: string | null;
  myBuyRate: string | null;
  mySellRate: string | null;
  changePercentage: string | null;
  recordDate: string;
  createdAt: string;
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

const CURRENCY_PAIRS = [
  { from: "USD", to: "VND", label: "USD → VND" },
  { from: "KRW", to: "VND", label: "KRW → VND" },
  { from: "USD", to: "KRW", label: "USD → KRW" },
  { from: "KRW", to: "USD", label: "KRW → USD" }
];

export default function ExchangeRateManager({ realTimeRates }: { realTimeRates?: any }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // 상태 관리
  const [activeTab, setActiveTab] = useState<"current" | "history">("current");
  const [formData, setFormData] = useState({
    fromCurrency: "USD",
    toCurrency: "VND",
    denomination: "",
    goldShopRate: "",
    myBuyRate: "",
    mySellRate: "",
    memo: "",
    isActive: "true"
  });

  // 현재 환전상 시세 데이터 조회
  const { data: exchangeRates = [], isLoading: isLoadingRates } = useQuery({
    queryKey: ["/api/exchange-rates"],
  });

  // 기준통화 변경 시 최근 시세 자동 입력
  useEffect(() => {
    if (Array.isArray(exchangeRates) && exchangeRates.length > 0) {
      const recentRate = exchangeRates
        .filter((rate: ExchangeRate) => rate.fromCurrency === formData.fromCurrency)
        .sort((a: ExchangeRate, b: ExchangeRate) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];
      
      if (recentRate) {
        setFormData(prev => ({
          ...prev,
          goldShopRate: recentRate.goldShopRate || "",
          myBuyRate: recentRate.myBuyRate || "",
          mySellRate: recentRate.mySellRate || ""
        }));
      }
    }
  }, [formData.fromCurrency, exchangeRates]);

  // 권종 변경 시 해당 권종의 기존 활성화 상태 가져오기
  useEffect(() => {
    if (Array.isArray(exchangeRates) && exchangeRates.length > 0 && formData.denomination) {
      const existingRate = exchangeRates.find((rate: ExchangeRate) => 
        rate.fromCurrency === formData.fromCurrency && 
        rate.toCurrency === formData.toCurrency &&
        rate.denomination === formData.denomination
      );
      
      if (existingRate) {
        setFormData(prev => ({
          ...prev,
          isActive: existingRate.isActive,
          goldShopRate: existingRate.goldShopRate || "",
          myBuyRate: existingRate.myBuyRate || "",
          mySellRate: existingRate.mySellRate || ""
        }));
      }
    }
  }, [formData.denomination, formData.fromCurrency, formData.toCurrency, exchangeRates]);

  // 환전상 시세 히스토리 조회
  const { data: rateHistory = [], isLoading: isLoadingHistory } = useQuery({
    queryKey: ["/api/exchange-rates/history"],
    enabled: activeTab === "history"
  });

  // 환전상 시세 저장/업데이트 mutation
  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/exchange-rates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "시세 저장에 실패했습니다.");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "환전상 시세 저장 완료",
        description: "시세가 성공적으로 저장되었습니다.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/exchange-rates"] });
      // 폼 초기화
      setFormData({
        fromCurrency: "USD",
        toCurrency: "VND",
        denomination: "",
        goldShopRate: "",
        myBuyRate: "",
        mySellRate: "",
        memo: "",
        isActive: "true"
      });
    },
    onError: (error: any) => {
      console.error("환전상 시세 저장 오류:", error);
      toast({
        variant: "destructive",
        title: "저장 실패",
        description: error?.response?.data?.error || "시세 저장에 실패했습니다.",
      });
    }
  });

  // 폼 제출 처리
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 필수 입력 검증
    if (!formData.fromCurrency || !formData.toCurrency) {
      toast({
        variant: "destructive",
        title: "입력 오류",
        description: "통화쌍을 선택하세요.",
      });
      return;
    }

    // 권종 필수 검증 - USD와 KRW의 경우 권종이 필수
    if ((formData.fromCurrency === 'USD' || formData.fromCurrency === 'KRW') && !formData.denomination) {
      toast({
        variant: "destructive",
        title: "입력 오류",
        description: `${formData.fromCurrency} 환율은 권종을 반드시 선택해야 합니다.`,
      });
      return;
    }

    // 필수 시세 입력 검증
    if (!formData.goldShopRate || !formData.myBuyRate || !formData.mySellRate) {
      toast({
        variant: "destructive",
        title: "입력 오류",
        description: "금은방 시세, 매입가, 매도가를 모두 입력하세요.",
      });
      return;
    }

    // 시세 논리 검증
    const goldShopRate = parseFloat(removeCommas(formData.goldShopRate));
    const buyRate = parseFloat(removeCommas(formData.myBuyRate));
    const sellRate = parseFloat(removeCommas(formData.mySellRate));

    // 1. 내 매입가 < 내 매도가 
    if (buyRate >= sellRate) {
      toast({
        variant: "destructive",
        title: "시세 오류",
        description: "내 매입가는 내 매도가보다 낮아야 합니다.",
      });
      return;
    }

    // 2. 내 매도가 <= 금은방 시세 (금은방 시세가 가장 높아야 함)
    if (sellRate > goldShopRate) {
      toast({
        variant: "destructive",
        title: "시세 오류", 
        description: "내 매도가는 금은방 시세보다 높을 수 없습니다.",
      });
      return;
    }

    // 데이터 저장 시 콤마 제거
    const cleanedFormData = {
      ...formData,
      goldShopRate: removeCommas(formData.goldShopRate),
      myBuyRate: removeCommas(formData.myBuyRate),
      mySellRate: removeCommas(formData.mySellRate)
    };

    saveMutation.mutate(cleanedFormData);
  };

  // 숫자 포맷팅 함수 (USD는 정수, KRW는 소숫점 2자리)
  const formatRate = (rate: string | null, currency: string = 'VND') => {
    if (!rate || rate === '') return "-";
    const num = parseFloat(rate);
    
    if (isNaN(num)) return "-";
    
    // USD 시세는 정수로 표시
    if (currency === 'USD') {
      return Math.round(num).toLocaleString('ko-KR');
    }
    
    // KRW는 소숫점 2자리로 제한하여 표시  
    if (currency === 'KRW') {
      return num.toLocaleString('ko-KR', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      });
    }
    
    // 기타 통화는 소숫점 2자리까지
    return num.toLocaleString('ko-KR', { maximumFractionDigits: 2 });
  };

  // 변동률 표시 함수
  const renderChangePercentage = (change: string | null) => {
    if (!change) return null;
    const percent = parseFloat(change);
    const isPositive = percent > 0;
    
    return (
      <Badge variant={isPositive ? "default" : "destructive"} className="text-xs">
        {isPositive ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
        {Math.abs(percent).toFixed(2)}%
      </Badge>
    );
  };

  // 권종 표시 포맷 함수 (통화별 기호 적용)
  const formatDenomination = (denomination: string | null, fromCurrency: string) => {
    if (!denomination) return "";
    
    const symbol = fromCurrency === 'KRW' ? '₩' : '$';
    const formattedDenom = denomination.replace(/_/g, ',');
    
    // KRW는 천단위 콤마 적용
    if (fromCurrency === 'KRW') {
      const numbers = formattedDenom.split(',').map(num => {
        const parsed = parseInt(num);
        return parsed >= 1000 ? parsed.toLocaleString('ko-KR') : num;
      });
      return symbol + numbers.join(',');
    }
    
    return symbol + formattedDenom;
  };

  // 권종별 정렬 우선순위 (고액권이 위에)
  const getDenominationValue = (denomination: string | null) => {
    if (!denomination) return 0;
    
    // 첫 번째 숫자를 기준으로 정렬 (100, 20, 5 순)
    const firstNumber = parseInt(denomination.split('_')[0]);
    return firstNumber || 0;
  };

  // 시세 활성화/비활성화 토글 mutation
  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string, isActive: boolean }) => {
      const response = await fetch(`/api/exchange-rates/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isActive: isActive.toString() }),
      });

      if (!response.ok) {
        throw new Error("시세 상태 변경에 실패했습니다.");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "시세 상태 변경 완료",
        description: "시세 활성화 상태가 변경되었습니다.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/exchange-rates"] });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "상태 변경 실패",
        description: error.message || "시세 상태 변경에 실패했습니다.",
      });
    }
  });

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <Globe className="w-6 h-6 text-blue-600" />
        <h2 className="text-2xl font-bold">환전상 시세 관리</h2>
      </div>

      {/* 탭 네비게이션 */}
      <div className="flex gap-4 border-b">
        <button
          onClick={() => setActiveTab("current")}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === "current"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <DollarSign className="w-4 h-4 mr-2 inline" />
          현재 시세
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === "history"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <TrendingUp className="w-4 h-4 mr-2 inline" />
          시세 히스토리
        </button>
      </div>

      {activeTab === "current" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 시세 입력 폼 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Banknote className="w-5 h-5" />
                새 시세 입력
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* 통화쌍 선택 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>기준통화</Label>
                    <Select 
                      value={formData.fromCurrency} 
                      onValueChange={(value) => {
                        // 기준통화 변경 시 목표통화가 동일하면 초기화
                        const newToCurrency = value === formData.toCurrency ? "" : formData.toCurrency;
                        setFormData({ 
                          ...formData, 
                          fromCurrency: value, 
                          toCurrency: newToCurrency,
                          denomination: "" 
                        });
                      }}
                    >
                      <SelectTrigger data-testid="select-from-currency">
                        <SelectValue placeholder="통화 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD (달러)</SelectItem>
                        <SelectItem value="KRW">KRW (원)</SelectItem>
                        <SelectItem value="VND">VND (동)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>목표통화</Label>
                    <Select 
                      value={formData.toCurrency} 
                      onValueChange={(value) => setFormData({ ...formData, toCurrency: value })}
                    >
                      <SelectTrigger data-testid="select-to-currency">
                        <SelectValue placeholder="통화 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        {/* 기준통화와 다른 통화만 표시 */}
                        {formData.fromCurrency !== "VND" && <SelectItem value="VND">VND (동)</SelectItem>}
                        {formData.fromCurrency !== "KRW" && <SelectItem value="KRW">KRW (원)</SelectItem>}
                        {formData.fromCurrency !== "USD" && <SelectItem value="USD">USD (달러)</SelectItem>}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* 권종 선택 */}
                <div>
                  <Label>
                    권종 
                    {(formData.fromCurrency === 'USD' || formData.fromCurrency === 'KRW') && 
                      <span className="text-red-500 ml-1">*</span>
                    }
                  </Label>
                  <Select 
                    value={formData.denomination} 
                    onValueChange={(value) => setFormData({ ...formData, denomination: value })}
                  >
                    <SelectTrigger data-testid="select-denomination">
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

                {/* 금은방 시세 */}
                <div>
                  <Label>금은방 시세 (참고용) <span className="text-red-500">*</span></Label>
                  <Input
                    type="text"
                    placeholder={formData.fromCurrency === 'KRW' ? "예: 19.20" : "예: 26,100"}
                    value={formatNumberInput(formData.goldShopRate, formData.fromCurrency)}
                    onChange={(e) => {
                      let value = e.target.value.replace(/,/g, ''); // 콤마 제거
                      if (formData.fromCurrency === 'USD') {
                        // USD는 정수만 허용
                        value = value.replace(/[^0-9]/g, '');
                      } else {
                        // KRW는 소숫점 2자리까지 허용
                        value = value.replace(/[^0-9.]/g, '');
                        
                        // 소숫점 2자리 제한
                        if (value.includes('.')) {
                          const parts = value.split('.');
                          if (parts[1] && parts[1].length > 2) {
                            value = parts[0] + '.' + parts[1].substring(0, 2);
                          }
                        }
                      }
                      setFormData({ ...formData, goldShopRate: value });
                    }}
                    data-testid="input-gold-shop-rate"
                  />
                </div>

                {/* 매입/매도 시세 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>내 매입가 (고객 → 나) <span className="text-red-500">*</span></Label>
                    <Input
                      type="text"
                      placeholder={formData.fromCurrency === 'KRW' ? "예: 19.00" : "예: 26,000"}
                      value={formatNumberInput(formData.myBuyRate, formData.fromCurrency)}
                      onChange={(e) => {
                        let value = e.target.value.replace(/,/g, ''); // 콤마 제거
                        if (formData.fromCurrency === 'USD') {
                          // USD는 정수만 허용
                          value = value.replace(/[^0-9]/g, '');
                        } else {
                          // KRW는 소숫점 2자리까지 허용
                          value = value.replace(/[^0-9.]/g, '');
                          
                          // 소숫점 2자리 제한
                          if (value.includes('.')) {
                            const parts = value.split('.');
                            if (parts[1] && parts[1].length > 2) {
                              value = parts[0] + '.' + parts[1].substring(0, 2);
                            }
                          }
                        }
                        setFormData({ ...formData, myBuyRate: value });
                      }}
                      data-testid="input-my-buy-rate"
                    />
                    {/* 실시간 환율 정보 표시 */}
                    {realTimeRates && (
                      <div className="mt-2 p-2 bg-blue-50 rounded-md border">
                        <div className="text-xs text-blue-600 font-medium mb-1">📊 오늘 시장 환율 (참고용)</div>
                        <div className="text-sm space-y-1">
                          {formData.fromCurrency === 'USD' && formData.toCurrency === 'VND' && realTimeRates['USD-VND'] && (
                            <div className="text-gray-700">
                              USD → VND: <span className="font-medium">{Math.round(realTimeRates['USD-VND']).toLocaleString('ko-KR')}</span>
                            </div>
                          )}
                          {formData.fromCurrency === 'KRW' && formData.toCurrency === 'VND' && realTimeRates['KRW-VND'] && (
                            <div className="text-gray-700">
                              KRW → VND: <span className="font-medium">{realTimeRates['KRW-VND'].toFixed(2)}</span>
                            </div>
                          )}
                          {formData.fromCurrency === 'USD' && formData.toCurrency === 'KRW' && realTimeRates['USD-KRW'] && (
                            <div className="text-gray-700">
                              USD → KRW: <span className="font-medium">{Math.round(realTimeRates['USD-KRW']).toLocaleString('ko-KR')}</span>
                            </div>
                          )}
                          {formData.fromCurrency === 'KRW' && formData.toCurrency === 'USD' && realTimeRates['KRW-USD'] && (
                            <div className="text-gray-700">
                              KRW → USD: <span className="font-medium">{realTimeRates['KRW-USD'].toFixed(4)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <div>
                    <Label>내 매도가 (나 → 고객) <span className="text-red-500">*</span></Label>
                    <Input
                      type="text"
                      placeholder={formData.fromCurrency === 'KRW' ? "예: 19.40" : "예: 26,200"}
                      value={formatNumberInput(formData.mySellRate, formData.fromCurrency)}
                      onChange={(e) => {
                        let value = e.target.value.replace(/,/g, ''); // 콤마 제거
                        if (formData.fromCurrency === 'USD') {
                          // USD는 정수만 허용
                          value = value.replace(/[^0-9]/g, '');
                        } else {
                          // KRW는 소숫점 2자리까지 허용
                          value = value.replace(/[^0-9.]/g, '');
                          
                          // 소숫점 2자리 제한
                          if (value.includes('.')) {
                            const parts = value.split('.');
                            if (parts[1] && parts[1].length > 2) {
                              value = parts[0] + '.' + parts[1].substring(0, 2);
                            }
                          }
                        }
                        setFormData({ ...formData, mySellRate: value });
                      }}
                      data-testid="input-my-sell-rate"
                    />
                  </div>
                </div>

                {/* 메모 */}
                <div>
                  <Label>메모 (선택사항)</Label>
                  <Textarea
                    placeholder="급변상황이나 특이사항 기록"
                    value={formData.memo}
                    onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
                    data-testid="textarea-memo"
                    rows={3}
                  />
                </div>



                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={saveMutation.isPending}
                  data-testid="button-save-rate"
                >
                  {saveMutation.isPending ? "저장 중..." : "시세 저장"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* 현재 시세 목록 - 통화쌍별로 분리 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                현재 운영 중인 시세
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingRates ? (
                <div className="text-center py-8">로딩 중...</div>
              ) : !Array.isArray(exchangeRates) || exchangeRates.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  등록된 시세가 없습니다.
                </div>
              ) : (
                <div className="space-y-6">
                  {/* 선택된 통화쌍의 시세만 표시 */}
                  {(() => {
                    // 현재 선택된 통화쌍에 해당하는 시세만 필터링
                    const selectedPairRates = exchangeRates.filter(rate => 
                      rate.fromCurrency === formData.fromCurrency && 
                      rate.toCurrency === formData.toCurrency
                    );
                    
                    if (selectedPairRates.length === 0) {
                      return (
                        <div className="text-center py-8 text-gray-500">
                          {formData.fromCurrency} → {formData.toCurrency} 시세가 없습니다.
                        </div>
                      );
                    }
                    
                    return (
                      <div className="border rounded-lg p-4 bg-gray-50">
                        <div className="flex items-center gap-2 mb-4">
                          <h3 className="text-lg font-semibold text-gray-800">
                            {formData.fromCurrency} → {formData.toCurrency}
                          </h3>
                          <Badge variant="secondary">{selectedPairRates.length}개 시세</Badge>
                        </div>
                        
                        <div className="space-y-3">
                          {selectedPairRates
                            .sort((a, b) => getDenominationValue(b.denomination) - getDenominationValue(a.denomination))
                            .map((rate: ExchangeRate) => (
                            <div 
                              key={rate.id} 
                              className={`p-3 border rounded-lg ${
                                rate.isActive === "false" ? "bg-gray-100 border-gray-300" : "bg-white border-gray-200"
                              }`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  {rate.denomination && (
                                    <Badge variant="outline">{formatDenomination(rate.denomination, rate.fromCurrency)}</Badge>
                                  )}
                                </div>
                                <span className="text-xs text-gray-500">
                                  {new Date(rate.updatedAt).toLocaleString("ko-KR")}
                                </span>
                              </div>
                              
                              <div className="grid grid-cols-3 gap-4 text-sm">
                                <div>
                                  <span className="text-gray-500">금은방</span>
                                  <div className="font-medium">{formatRate(rate.goldShopRate, rate.fromCurrency)}</div>
                                </div>
                                <div>
                                  <span className="text-gray-500">매입</span>
                                  <div className="font-medium text-green-600">{formatRate(rate.myBuyRate, rate.fromCurrency)}</div>
                                </div>
                                <div>
                                  <span className="text-gray-500">매도</span>
                                  <div className="font-medium text-red-600">{formatRate(rate.mySellRate, rate.fromCurrency)}</div>
                                </div>
                              </div>
                              
                              <div className="mt-3 flex justify-between items-center">
                                <div className="flex-1">
                                  {rate.memo && (
                                    <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded truncate inline-block max-w-[200px]" title={rate.memo}>
                                      {rate.memo.length > 20 ? `${rate.memo.substring(0, 20)}...` : rate.memo}
                                    </span>
                                  )}
                                </div>
                                <Button
                                  size="sm"
                                  variant={rate.isActive === "true" ? "destructive" : "default"}
                                  onClick={() => toggleMutation.mutate({ 
                                    id: rate.id, 
                                    isActive: rate.isActive !== "true" 
                                  })}
                                  disabled={toggleMutation.isPending && toggleMutation.variables?.id === rate.id}
                                  className="text-xs px-3 py-1 ml-2 flex-shrink-0"
                                >
                                  {(toggleMutation.isPending && toggleMutation.variables?.id === rate.id) ? "처리중..." : 
                                   rate.isActive === "true" ? "비활성화" : "활성화"}
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "history" && (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="w-5 h-5" />
              <span className="hidden sm:inline">환전상 시세 히스토리</span>
              <span className="sm:hidden">시세 히스토리</span>

            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            {isLoadingHistory ? (
              <div className="text-center py-8 sm:py-12">
                <div className="animate-pulse">로딩 중...</div>
              </div>
            ) : !Array.isArray(rateHistory) || 
                 rateHistory.filter(history => history.fromCurrency === formData.fromCurrency).length === 0 ? (
              <div className="text-center py-8 sm:py-12 text-gray-500">
                <TrendingUp className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <div className="text-base sm:text-lg font-medium mb-2">시세 히스토리가 없습니다</div>
                <div className="text-sm text-gray-400">
                  {formData.fromCurrency} → {formData.toCurrency} 환율을 먼저 저장해보세요
                </div>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {Array.isArray(rateHistory) && 
                  rateHistory
                    .filter(history => history.fromCurrency === formData.fromCurrency)
                    .map((history: ExchangeRateHistory) => (
                  <div key={history.id} className="p-4 border rounded-lg bg-white hover:shadow-sm transition-shadow">
                    {/* 모바일 최적화 헤더 - 한 줄 배치 */}
                    <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        <span className="font-semibold text-base whitespace-nowrap">
                          {history.fromCurrency} → {history.toCurrency}
                        </span>
                        {history.denomination && (
                          <Badge variant="outline" className="text-xs whitespace-nowrap">
                            {formatDenomination(history.denomination, history.fromCurrency)}
                          </Badge>
                        )}
                        {renderChangePercentage(history.changePercentage)}
                      </div>
                      <span className="text-xs text-gray-500 whitespace-nowrap flex-shrink-0">
                        {new Date(history.recordDate).toLocaleString("ko-KR", {
                          month: "short",
                          day: "numeric", 
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </span>
                    </div>
                    
                    {/* 모바일 최적화 환율 정보 */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                      <div className="flex justify-between sm:block">
                        <span className="text-gray-500 text-sm">금은방 시세</span>
                        <div className="font-semibold text-gray-800 sm:mt-1">
                          {formatRate(history.goldShopRate, history.fromCurrency)}
                        </div>
                      </div>
                      <div className="flex justify-between sm:block">
                        <span className="text-gray-500 text-sm">내 매입가</span>
                        <div className="font-semibold text-green-600 sm:mt-1">
                          {formatRate(history.myBuyRate, history.fromCurrency)}
                        </div>
                      </div>
                      <div className="flex justify-between sm:block">
                        <span className="text-gray-500 text-sm">내 매도가</span>
                        <div className="font-semibold text-red-600 sm:mt-1">
                          {formatRate(history.mySellRate, history.fromCurrency)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}