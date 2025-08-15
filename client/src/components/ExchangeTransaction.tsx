import { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeftRight, Calculator, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/utils/helpers';
import { useExchangeRates } from '@/hooks/useExchangeRates';

interface Asset {
  id: string;
  name: string;
  type: string;
  currency: string;
  balance: number;
  metadata?: any;
}

interface ExchangeRate {
  id: string;
  fromCurrency: string;
  toCurrency: string;
  denomination: string;
  myBuyRate: string;
  mySellRate: string;
  goldShopRate: string;
  isActive: boolean;
}

interface DenominationCount {
  denomination: number;
  count: number;
  available: number;
}

export default function ExchangeTransaction() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { realTimeRates } = useExchangeRates();

  // 상태 관리
  const [receiveAssetId, setReceiveAssetId] = useState<string>('');
  const [receiveAmount, setReceiveAmount] = useState<string>('');
  const [giveAssetId, setGiveAssetId] = useState<string>('');
  const [giveDenominations, setGiveDenominations] = useState<DenominationCount[]>([]);
  const [exchangeRateUsed, setExchangeRateUsed] = useState<number>(0);
  const [profitAmount, setProfitAmount] = useState<number>(0);

  // 데이터 페치
  const { data: assets = [] } = useQuery<Asset[]>({
    queryKey: ['/api/assets'],
  });

  const { data: exchangeRates = [] } = useQuery<ExchangeRate[]>({
    queryKey: ['/api/exchange-rates'],
  });

  // VND 현금 자산과 지폐 정보 추출
  const vndCashAssets = useMemo(() => {
    return assets.filter(asset => 
      asset.type === 'cash' && asset.currency === 'VND'
    );
  }, [assets]);

  // 계좌 및 기타 자산 목록
  const availableAssets = useMemo(() => {
    return assets.filter(asset => 
      asset.type !== 'cash' || asset.currency !== 'VND'
    );
  }, [assets]);

  // 선택된 VND 현금 자산의 지폐 정보
  const selectedVndAsset = useMemo(() => {
    return vndCashAssets.find(asset => asset.id === giveAssetId);
  }, [vndCashAssets, giveAssetId]);

  // 지폐 denomination 초기화
  useEffect(() => {
    if (selectedVndAsset && selectedVndAsset.metadata?.denominations) {
      const denoms = Object.entries(selectedVndAsset.metadata.denominations).map(([denom, count]) => ({
        denomination: parseInt(denom),
        count: 0,
        available: count as number
      })).sort((a, b) => b.denomination - a.denomination);
      setGiveDenominations(denoms);
    }
  }, [selectedVndAsset]);

  // 자동 지폐 배분 함수
  const autoDistributeDenominations = (targetAmount: number) => {
    if (!selectedVndAsset || !giveDenominations.length) return;

    let remainingAmount = targetAmount;
    const newDenominations = [...giveDenominations];

    // 고액권부터 차례로 배분
    for (let i = 0; i < newDenominations.length; i++) {
      const denom = newDenominations[i];
      const maxPossible = Math.floor(remainingAmount / denom.denomination);
      const actualCount = Math.min(maxPossible, denom.available);
      
      newDenominations[i].count = actualCount;
      remainingAmount -= actualCount * denom.denomination;
    }

    setGiveDenominations(newDenominations);
    
    if (remainingAmount > 0) {
      toast({
        title: "지폐 부족",
        description: `현재 보유 지폐로는 ${formatCurrency(remainingAmount, 'VND')} VND가 부족합니다.`,
        variant: "destructive"
      });
    }
  };

  // 총 지급 금액 계산
  const totalGiveAmount = useMemo(() => {
    return giveDenominations.reduce((total, denom) => 
      total + (denom.denomination * denom.count), 0
    );
  }, [giveDenominations]);

  // 환율 계산 및 적용
  const calculateExchangeRate = (fromCurrency: string, toCurrency: string, amount: number) => {
    // 환율 관리에서 해당 거래에 맞는 환율 찾기
    const applicableRates = exchangeRates.filter(rate => 
      rate.fromCurrency === fromCurrency && 
      rate.toCurrency === toCurrency && 
      rate.isActive
    );

    if (applicableRates.length === 0) return 0;

    // 거래 금액에 따라 최적 환율 선택 (100달러 > 50달러 > 20/10달러 순)
    const ratesByDenom = applicableRates.sort((a, b) => {
      const aValue = getDenominationValue(a.denomination);
      const bValue = getDenominationValue(b.denomination);
      return bValue - aValue;
    });

    // 첫 번째(가장 높은 denomination) 환율 사용
    const selectedRate = ratesByDenom[0];
    
    // KRW를 주고 VND를 받는 경우: 매도 시세
    // VND를 주고 KRW를 받는 경우: 매입 시세
    const rateValue = fromCurrency === 'KRW' && toCurrency === 'VND' 
      ? parseFloat(selectedRate.mySellRate || '0')
      : parseFloat(selectedRate.myBuyRate || '0');

    return rateValue;
  };

  // Denomination 값 변환 (정렬용)
  const getDenominationValue = (denomination: string) => {
    const values: { [key: string]: number } = {
      '100': 100,
      '50': 50,
      '20_10': 30, // 20달러와 10달러를 합친 값
      '5_2_1': 8   // 5달러, 2달러, 1달러를 합친 값
    };
    return values[denomination] || 0;
  };

  // 수익률 계산
  const calculateProfit = (myRate: number, marketRate: number, amount: number) => {
    const rateDifference = myRate - marketRate;
    return (rateDifference * amount) / myRate;
  };

  // 받을 금액 변경 시 자동 지폐 배분
  useEffect(() => {
    if (receiveAmount && giveAssetId && exchangeRateUsed > 0) {
      const amount = parseFloat(receiveAmount.replace(/,/g, ''));
      if (!isNaN(amount)) {
        const requiredVnd = amount * exchangeRateUsed;
        autoDistributeDenominations(requiredVnd);
      }
    }
  }, [receiveAmount, giveAssetId, exchangeRateUsed]);

  // 환율 업데이트
  useEffect(() => {
    if (receiveAssetId && giveAssetId) {
      const receiveAsset = assets.find(a => a.id === receiveAssetId);
      const giveAsset = assets.find(a => a.id === giveAssetId);
      
      if (receiveAsset && giveAsset) {
        const rate = calculateExchangeRate(receiveAsset.currency, giveAsset.currency, parseFloat(receiveAmount || '0'));
        setExchangeRateUsed(rate);
        
        // 수익률 계산
        const marketRate = realTimeRates[`${receiveAsset.currency}-${giveAsset.currency}`] || 0;
        const profit = calculateProfit(rate, marketRate, parseFloat(receiveAmount || '0'));
        setProfitAmount(profit);
      }
    }
  }, [receiveAssetId, giveAssetId, receiveAmount, exchangeRates, realTimeRates]);

  // 거래 완료 처리
  const executeTransaction = useMutation({
    mutationFn: async () => {
      const receiveAsset = assets.find(a => a.id === receiveAssetId);
      const giveAsset = assets.find(a => a.id === giveAssetId);
      
      if (!receiveAsset || !giveAsset) throw new Error('자산을 찾을 수 없습니다.');

      const transactionData = {
        type: '환전거래',
        fromAssetId: receiveAssetId,
        toAssetId: giveAssetId,
        fromAmount: parseFloat(receiveAmount.replace(/,/g, '')),
        toAmount: totalGiveAmount,
        exchangeRate: exchangeRateUsed,
        profitAmount: profitAmount,
        metadata: {
          denominations: giveDenominations.reduce((acc, denom) => {
            if (denom.count > 0) {
              acc[denom.denomination] = denom.count;
            }
            return acc;
          }, {} as { [key: number]: number })
        }
      };

      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transactionData)
      });

      if (!response.ok) throw new Error('거래 저장에 실패했습니다.');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "거래 완료",
        description: "환전 거래가 성공적으로 완료되었습니다.",
      });
      
      // 상태 초기화
      setReceiveAssetId('');
      setReceiveAmount('');
      setGiveAssetId('');
      setGiveDenominations([]);
      
      // 데이터 새로고침
      queryClient.invalidateQueries({ queryKey: ['/api/assets'] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
    },
    onError: (error) => {
      toast({
        title: "거래 실패",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const canExecuteTransaction = receiveAssetId && giveAssetId && receiveAmount && totalGiveAmount > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center mb-6">
        <ArrowLeftRight className="mr-3 text-primary" size={24} />
        <h1 className="text-2xl font-bold">환전 거래</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 받을 자산 (TO / 입금) */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 text-green-600">받을 자산 (TO / 입금)</h3>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">자산 선택</label>
              <Select value={receiveAssetId} onValueChange={setReceiveAssetId}>
                <SelectTrigger>
                  <SelectValue placeholder="자산 선택" />
                </SelectTrigger>
                <SelectContent>
                  {availableAssets.map(asset => (
                    <SelectItem key={asset.id} value={asset.id}>
                      {asset.name} ({asset.currency})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">금액/수량 입력</label>
              <Input
                value={receiveAmount}
                onChange={(e) => setReceiveAmount(e.target.value)}
                placeholder="금액을 입력하세요"
                type="text"
              />
            </div>

            {receiveAssetId && (
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  선택된 자산: {assets.find(a => a.id === receiveAssetId)?.name}
                </p>
                <p className="text-lg font-bold text-green-600">
                  {receiveAmount ? `${receiveAmount} ${assets.find(a => a.id === receiveAssetId)?.currency}` : '0'}
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* 내준 자산 (FROM / 출급) */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 text-blue-600">내준 자산 (FROM / 출급)</h3>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">자산 선택</label>
              <Select value={giveAssetId} onValueChange={setGiveAssetId}>
                <SelectTrigger>
                  <SelectValue placeholder="VND 현금 선택" />
                </SelectTrigger>
                <SelectContent>
                  {vndCashAssets.map(asset => (
                    <SelectItem key={asset.id} value={asset.id}>
                      {asset.name} - 총 {formatCurrency(asset.balance, 'VND')} VND
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedVndAsset && (
              <>
                <div className="text-sm text-gray-600 mb-2">
                  출급 가능 최대: <span className="font-semibold text-green-600">
                    {formatCurrency(selectedVndAsset.balance, 'VND')} VND
                  </span>
                </div>

                <div className="space-y-3">
                  {giveDenominations.map((denom) => (
                    <div key={denom.denomination} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="font-medium">
                        {formatCurrency(denom.denomination, 'VND')} đ
                      </span>
                      <div className="flex items-center space-x-2">
                        <Input
                          type="number"
                          value={denom.count}
                          onChange={(e) => {
                            const newCount = Math.min(parseInt(e.target.value) || 0, denom.available);
                            setGiveDenominations(prev => 
                              prev.map(d => d.denomination === denom.denomination 
                                ? { ...d, count: newCount }
                                : d
                              )
                            );
                          }}
                          max={denom.available}
                          min={0}
                          className="w-20"
                        />
                        <span className="text-sm text-gray-500">
                          (보유: {denom.available}장)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-lg font-bold text-blue-600">
                    합계: {formatCurrency(totalGiveAmount, 'VND')} VND
                  </p>
                </div>
              </>
            )}
          </div>
        </Card>
      </div>

      {/* 환율 정보 및 수익률 */}
      {receiveAssetId && giveAssetId && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Calculator className="mr-2" size={20} />
            거래 정보
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-yellow-50 rounded-lg">
              <p className="text-sm text-gray-600">적용 환율</p>
              <p className="text-xl font-bold text-yellow-600">
                {exchangeRateUsed.toFixed(2)}
              </p>
            </div>
            
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-gray-600">예상 수익</p>
              <p className="text-xl font-bold text-green-600">
                {formatCurrency(profitAmount, assets.find(a => a.id === receiveAssetId)?.currency || 'KRW')}
              </p>
            </div>
            
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-600">수익률</p>
              <p className="text-xl font-bold text-blue-600">
                {receiveAmount ? ((profitAmount / parseFloat(receiveAmount.replace(/,/g, ''))) * 100).toFixed(2) : 0}%
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* 거래 실행 버튼 */}
      <div className="flex justify-center">
        <Button
          onClick={() => executeTransaction.mutate()}
          disabled={!canExecuteTransaction || executeTransaction.isPending}
          className="px-8 py-3 text-lg"
          size="lg"
        >
          {executeTransaction.isPending ? (
            "처리 중..."
          ) : (
            <>
              <CheckCircle className="mr-2" size={20} />
              환전 거래 완료
            </>
          )}
        </Button>
      </div>
    </div>
  );
}