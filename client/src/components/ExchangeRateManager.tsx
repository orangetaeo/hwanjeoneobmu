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
import { formatCurrency } from "@/lib/utils";

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
  ]
};

const CURRENCY_PAIRS = [
  { from: "USD", to: "VND", label: "USD → VND" },
  { from: "KRW", to: "VND", label: "KRW → VND" }
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
    queryFn: () => apiRequest("/api/exchange-rates")
  });

  // 환전상 시세 히스토리 조회
  const { data: rateHistory = [], isLoading: isLoadingHistory } = useQuery({
    queryKey: ["/api/exchange-rates/history"],
    queryFn: () => apiRequest("/api/exchange-rates/history"),
    enabled: activeTab === "history"
  });

  // 환전상 시세 저장/업데이트 mutation
  const saveMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/exchange-rates", {
      method: "POST",
      body: JSON.stringify(data),
      headers: { "Content-Type": "application/json" }
    }),
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

    // 매입가 > 매도가 검증
    if (formData.myBuyRate && formData.mySellRate) {
      const buyRate = parseFloat(formData.myBuyRate);
      const sellRate = parseFloat(formData.mySellRate);
      if (buyRate > sellRate) {
        toast({
          variant: "destructive",
          title: "시세 오류",
          description: "매입가가 매도가보다 높습니다.",
        });
        return;
      }
    }

    saveMutation.mutate(formData);
  };

  // 숫자 포맷팅 함수
  const formatRate = (rate: string | null) => {
    if (!rate) return "-";
    const num = parseFloat(rate);
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
                        setFormData({ ...formData, fromCurrency: value, denomination: "" });
                      }}
                    >
                      <SelectTrigger data-testid="select-from-currency">
                        <SelectValue placeholder="통화 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD (달러)</SelectItem>
                        <SelectItem value="KRW">KRW (원)</SelectItem>
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
                        <SelectItem value="VND">VND (동)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* 권종 선택 */}
                <div>
                  <Label>권종</Label>
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
                  <Label>금은방 시세 (참고용)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="예: 26100"
                    value={formData.goldShopRate}
                    onChange={(e) => setFormData({ ...formData, goldShopRate: e.target.value })}
                    data-testid="input-gold-shop-rate"
                  />
                </div>

                {/* 매입/매도 시세 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>내 매입가 (고객 → 나)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="예: 26000"
                      value={formData.myBuyRate}
                      onChange={(e) => setFormData({ ...formData, myBuyRate: e.target.value })}
                      data-testid="input-my-buy-rate"
                    />
                  </div>
                  <div>
                    <Label>내 매도가 (나 → 고객)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="예: 26200"
                      value={formData.mySellRate}
                      onChange={(e) => setFormData({ ...formData, mySellRate: e.target.value })}
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

                {/* 시세 활성화 */}
                <div>
                  <Label>시세 활성화</Label>
                  <Select 
                    value={formData.isActive} 
                    onValueChange={(value) => setFormData({ ...formData, isActive: value })}
                  >
                    <SelectTrigger data-testid="select-is-active">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">활성화</SelectItem>
                      <SelectItem value="false">비활성화</SelectItem>
                    </SelectContent>
                  </Select>
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

          {/* 현재 시세 목록 */}
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
              ) : exchangeRates.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  등록된 시세가 없습니다.
                </div>
              ) : (
                <div className="space-y-4">
                  {exchangeRates.map((rate: ExchangeRate) => (
                    <div key={rate.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {rate.fromCurrency} → {rate.toCurrency}
                          </span>
                          {rate.denomination && (
                            <Badge variant="outline">{rate.denomination}</Badge>
                          )}
                          {rate.isActive === "false" && (
                            <Badge variant="destructive">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              비활성화
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(rate.updatedAt).toLocaleString("ko-KR")}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">금은방</span>
                          <div className="font-medium">{formatRate(rate.goldShopRate)}</div>
                        </div>
                        <div>
                          <span className="text-gray-500">매입</span>
                          <div className="font-medium text-green-600">{formatRate(rate.myBuyRate)}</div>
                        </div>
                        <div>
                          <span className="text-gray-500">매도</span>
                          <div className="font-medium text-red-600">{formatRate(rate.mySellRate)}</div>
                        </div>
                      </div>
                      
                      {rate.memo && (
                        <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                          {rate.memo}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "history" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              환전상 시세 히스토리
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingHistory ? (
              <div className="text-center py-8">로딩 중...</div>
            ) : rateHistory.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                시세 히스토리가 없습니다.
              </div>
            ) : (
              <div className="space-y-4">
                {rateHistory.map((history: ExchangeRateHistory) => (
                  <div key={history.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {history.fromCurrency} → {history.toCurrency}
                        </span>
                        {history.denomination && (
                          <Badge variant="outline">{history.denomination}</Badge>
                        )}
                        {renderChangePercentage(history.changePercentage)}
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(history.recordDate).toLocaleString("ko-KR")}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">금은방</span>
                        <div className="font-medium">{formatRate(history.goldShopRate)}</div>
                      </div>
                      <div>
                        <span className="text-gray-500">매입</span>
                        <div className="font-medium text-green-600">{formatRate(history.myBuyRate)}</div>
                      </div>
                      <div>
                        <span className="text-gray-500">매도</span>
                        <div className="font-medium text-red-600">{formatRate(history.mySellRate)}</div>
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