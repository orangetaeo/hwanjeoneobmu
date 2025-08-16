import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, TrendingUp, Calculator, History } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/utils/helpers';

interface BithumbTrade {
  id: string;
  date: string;
  krwAmount: number;
  usdtAmount: number;
  pricePerUsdt: number;
  tradeFee: number;
  totalCost: number;
  feeRate: number;
}

interface UserSettings {
  bithumbMemberLevel: string;
  bithumbFeeRate: number;
}

export default function BithumbTrading() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // 폼 상태
  const [krwAmount, setKrwAmount] = useState<string>('');
  const [usdtPrice, setUsdtPrice] = useState<string>('');
  const [usdtAmount, setUsdtAmount] = useState<string>('');
  const [currentTab, setCurrentTab] = useState<'buy' | 'history'>('buy');

  // 사용자 설정 조회
  const { data: userSettings } = useQuery<UserSettings>({
    queryKey: ['/api/settings'],
  });

  // 빗썸 거래 내역 조회
  const { data: bithumbTrades = [] } = useQuery<BithumbTrade[]>({
    queryKey: ['/api/transactions', 'bithumb'],
    queryFn: async () => {
      const response = await fetch('/api/transactions?type=bithumb_usdt_buy');
      if (!response.ok) throw new Error('거래 내역 조회 실패');
      return response.json();
    }
  });

  // 내 계좌 자산 조회 (KRW)
  const { data: assets = [] } = useQuery<any[]>({
    queryKey: ['/api/assets'],
  });

  const krwAccounts = (assets as any[]).filter((asset: any) => 
    asset.currency === 'KRW' && (asset.type === 'korean_account' || asset.type === 'cash')
  );

  const [selectedAccount, setSelectedAccount] = useState<string>('');

  // 평균 단가 자동 계산 (구매 금액과 수량이 입력되면 평균 단가 계산)
  useEffect(() => {
    if (krwAmount && usdtAmount) {
      const krw = parseFloat(krwAmount.replace(/,/g, ''));
      const usdt = parseFloat(usdtAmount);
      if (!isNaN(krw) && !isNaN(usdt) && usdt > 0) {
        // 평균 체결가 역산: 구매금액 ÷ 수량
        const avgPrice = krw / usdt;
        setUsdtPrice(avgPrice.toFixed(2));
      }
    }
  }, [krwAmount, usdtAmount]);

  // 숫자에 콤마 추가 함수
  const formatNumberWithCommas = (value: string) => {
    const number = value.replace(/,/g, '');
    if (isNaN(parseFloat(number))) return value;
    return parseFloat(number).toLocaleString('ko-KR');
  };

  // USDT 구매 처리
  const buyUsdt = useMutation({
    mutationFn: async () => {
      const krw = parseFloat(krwAmount.replace(/,/g, ''));
      const usdt = parseFloat(usdtAmount);
      const price = parseFloat(usdtPrice.replace(/,/g, ''));
      const feeRate = (userSettings?.bithumbFeeRate || 4) / 100; // 기본 수수료율 0.04 (쿠폰 적용)
      
      // 실제 받은 수량에서 수수료 공제 전 수량 역산
      const netQuantity = usdt; // 실제 받은 수량
      const grossQuantity = netQuantity / (1 - feeRate); // 수수료 공제 전 수량 역산
      const tradeFeeUsdt = grossQuantity - netQuantity; // 차감된 수수료
      const totalCost = krw; // 전체 금액 사용

      const tradeData = {
        type: 'bithumb_usdt_buy',
        fromAssetId: selectedAccount,
        toAssetId: null, // USDT는 별도 자산으로 관리
        fromAmount: totalCost,
        toAmount: usdt, // 실제 받은 수량 기록
        exchangeRate: price,
        metadata: {
          platform: 'bithumb',
          tradeFeeUsdt: tradeFeeUsdt,
          feeRate: feeRate,
          pricePerUsdt: price,
          grossQuantity: grossQuantity,
          netQuantity: usdt,
          avgPrice: price
        }
      };

      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tradeData)
      });

      if (!response.ok) throw new Error('거래 저장 실패');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "USDT 구매 완료",
        description: "빗썸 USDT 구매가 성공적으로 기록되었습니다.",
      });
      
      // 폼 초기화
      setKrwAmount('');
      setUsdtPrice('');
      setUsdtAmount('');
      setSelectedAccount('');
      
      // 데이터 새로고침
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/assets'] });
    },
    onError: (error) => {
      toast({
        title: "구매 실패",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // 평균 단가 계산
  const averageUsdtPrice = bithumbTrades.length > 0
    ? bithumbTrades.reduce((sum, trade) => sum + trade.totalCost, 0) / 
      bithumbTrades.reduce((sum, trade) => sum + trade.usdtAmount, 0)
    : 0;

  const totalUsdtOwned = bithumbTrades.reduce((sum, trade) => sum + trade.usdtAmount, 0);

  const canBuyUsdt = selectedAccount && krwAmount && usdtAmount && usdtPrice && 
                     parseFloat(usdtAmount) > 0 && parseFloat(usdtPrice.replace(/,/g, '')) > 0;

  return (
    <div className="space-y-6">
      {/* 상단 통계 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <h3 className="text-sm font-medium text-gray-600 mb-2">보유 USDT</h3>
          <p className="text-2xl font-bold text-blue-600">
            {totalUsdtOwned.toFixed(2)} USDT
          </p>
        </Card>
        
        <Card className="p-4">
          <h3 className="text-sm font-medium text-gray-600 mb-2">평균 취득가</h3>
          <p className="text-2xl font-bold text-green-600">
            ₩{averageUsdtPrice.toFixed(2)}
          </p>
        </Card>
        
        <Card className="p-4">
          <h3 className="text-sm font-medium text-gray-600 mb-2">총 투자금액</h3>
          <p className="text-2xl font-bold text-purple-600">
            {formatCurrency(bithumbTrades.reduce((sum, trade) => sum + trade.totalCost, 0), 'KRW')}원
          </p>
        </Card>
      </div>

      {/* 탭 선택 */}
      <div className="flex space-x-4">
        <Button
          variant={currentTab === 'buy' ? 'default' : 'outline'}
          onClick={() => setCurrentTab('buy')}
          className="flex items-center"
        >
          <Plus className="mr-2" size={16} />
          USDT 구매
        </Button>
        <Button
          variant={currentTab === 'history' ? 'default' : 'outline'}
          onClick={() => setCurrentTab('history')}
          className="flex items-center"
        >
          <History className="mr-2" size={16} />
          거래 내역
        </Button>
      </div>

      {currentTab === 'buy' && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <TrendingUp className="mr-2" size={20} />
            빗썸 USDT 구매
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">출금 계좌</label>
                <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                  <SelectTrigger>
                    <SelectValue placeholder="KRW 계좌 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {krwAccounts.map((account: any) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name} - {formatCurrency(account.balance, 'KRW')}원
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">구매 금액 (KRW)</label>
                <Input
                  value={krwAmount}
                  onChange={(e) => {
                    const value = e.target.value.replace(/,/g, '');
                    if (value === '' || !isNaN(parseFloat(value))) {
                      setKrwAmount(value === '' ? '' : formatNumberWithCommas(value));
                    }
                  }}
                  placeholder="구매할 원화 금액"
                  type="text"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">실제 받은 수량 (USDT)</label>
                <Input
                  value={usdtAmount}
                  onChange={(e) => setUsdtAmount(e.target.value)}
                  placeholder="빗써에서 체결된 수량 입력"
                  type="number"
                  step="0.00000001"
                />
                <p className="text-xs text-gray-500 mt-1">
                  ℹ️ 빗써 거래 내역에서 확인한 수량을 입력해주세요
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">평균 체결가 (KRW/USDT)</label>
                <Input
                  value={usdtPrice}
                  onChange={(e) => {
                    const value = e.target.value.replace(/,/g, '');
                    if (value === '' || !isNaN(parseFloat(value))) {
                      setUsdtPrice(value === '' ? '' : formatNumberWithCommas(value));
                    }
                  }}
                  placeholder="자동 계산됨"
                  type="text"
                  readOnly
                  className="bg-gray-50"
                />
                <p className="text-xs text-gray-500 mt-1">
                  구매금액 ÷ 수량으로 자동 계산
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-3 flex items-center">
                  <Calculator className="mr-2" size={16} />
                  거래 정보
                </h4>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>구매 금액:</span>
                    <span>{krwAmount ? formatCurrency(parseFloat(krwAmount.replace(/,/g, '')), 'KRW') : '0'}원</span>
                  </div>
                  <div className="flex justify-between">
                    <span>실제 받은 수량:</span>
                    <span className="text-blue-600 font-medium">{usdtAmount || '0'} USDT</span>
                  </div>
                  <div className="flex justify-between">
                    <span>평균 체결가:</span>
                    <span>{usdtPrice ? parseFloat(usdtPrice.replace(/,/g, '')).toLocaleString() : '0'}원/USDT</span>
                  </div>
                  <hr />
                  <div className="flex justify-between text-green-600">
                    <span>수수료 공제 전 추정 수량:</span>
                    <span>
                      {usdtAmount ? (() => {
                        const netQuantity = parseFloat(usdtAmount);
                        const feeRate = (userSettings?.bithumbFeeRate || 4) / 100;
                        const grossQuantity = netQuantity / (1 - feeRate);
                        return grossQuantity.toFixed(8);
                      })() : '0'} USDT
                    </span>
                  </div>
                  <div className="flex justify-between text-red-600">
                    <span>차감된 수수료:</span>
                    <span>
                      {usdtAmount ? (() => {
                        const netQuantity = parseFloat(usdtAmount);
                        const feeRate = (userSettings?.bithumbFeeRate || 4) / 100;
                        const grossQuantity = netQuantity / (1 - feeRate);
                        const fee = grossQuantity - netQuantity;
                        return fee.toFixed(8);
                      })() : '0'} USDT
                    </span>
                  </div>
                </div>
              </div>

              <Button
                onClick={() => buyUsdt.mutate()}
                disabled={!canBuyUsdt || buyUsdt.isPending}
                className="w-full"
                size="lg"
              >
                {buyUsdt.isPending ? "처리 중..." : "USDT 구매 기록"}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {currentTab === 'history' && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <History className="mr-2" size={20} />
            빗썸 거래 내역
          </h3>

          {bithumbTrades.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              아직 거래 내역이 없습니다.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>거래일시</TableHead>
                  <TableHead>구매금액</TableHead>
                  <TableHead>수수료</TableHead>
                  <TableHead>총비용</TableHead>
                  <TableHead>USDT수량</TableHead>
                  <TableHead>단가</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bithumbTrades.map((trade) => (
                  <TableRow key={trade.id}>
                    <TableCell>{new Date(trade.date).toLocaleDateString()}</TableCell>
                    <TableCell>{formatCurrency(trade.krwAmount, 'KRW')}원</TableCell>
                    <TableCell className="text-red-600">
                      {formatCurrency(trade.tradeFee, 'KRW')}원
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(trade.totalCost, 'KRW')}원
                    </TableCell>
                    <TableCell className="text-blue-600 font-medium">
                      {trade.usdtAmount.toFixed(2)} USDT
                    </TableCell>
                    <TableCell>
                      ₩{trade.pricePerUsdt.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      )}
    </div>
  );
}