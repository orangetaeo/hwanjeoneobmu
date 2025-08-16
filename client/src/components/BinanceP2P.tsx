import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Coins, History, TrendingUp, Calculator } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/utils/helpers';
import { useExchangeRates } from '@/hooks/useExchangeRates';

interface BinanceP2P {
  id: string;
  date: string;
  usdtAmount: number;
  vndAmount: number;
  exchangeRate: number;
  sellerName?: string;
  paymentMethod: string;
}

export default function BinanceP2P() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { realTimeRates } = useExchangeRates();

  // 폼 상태
  const [usdtAmount, setUsdtAmount] = useState<string>('');
  const [vndAmount, setVndAmount] = useState<string>('');
  const [exchangeRate, setExchangeRate] = useState<string>('');
  const [currentTab, setCurrentTab] = useState<'p2p' | 'history'>('p2p');

  // P2P 거래 내역 조회
  const { data: p2pTrades = [] } = useQuery<BinanceP2P[]>({
    queryKey: ['/api/transactions', 'binance_p2p'],
    queryFn: async () => {
      const response = await fetch('/api/transactions?type=binance_p2p');
      if (!response.ok) throw new Error('P2P 거래 내역 조회 실패');
      return response.json();
    }
  });

  // 자산 조회
  const { data: assets = [] } = useQuery<any[]>({
    queryKey: ['/api/assets'],
  });

  // Binance USDT 자산 직접 조회
  const binanceUsdtAsset = (assets as any[]).find((asset: any) => 
    asset.type === 'binance' && asset.currency === 'USDT'
  );
  
  console.log('Binance USDT 자산 검색 결과:', binanceUsdtAsset);
  
  const binanceBalance = binanceUsdtAsset ? parseFloat(binanceUsdtAsset.balance || '0') : 0;
  const usedInP2P = p2pTrades.reduce((sum, trade) => sum + (trade.usdtAmount || 0), 0);
  const availableUsdt = Math.max(0, binanceBalance - usedInP2P);
  
  console.log('Binance P2P USDT 계산:', {
    binanceBalance,
    usedInP2P,
    availableUsdt,
    p2pTradesCount: p2pTrades.length,
    assetFound: !!binanceUsdtAsset
  });

  // VND 은행 계좌 자산 직접 조회 (P2P 거래용)
  const vndBankAsset = (assets as any[]).find((asset: any) => 
    asset.type === 'account' && asset.currency === 'VND' && 
    (asset.name.includes('신한은행') || asset.metadata?.bank === '신한은행' || 
     asset.name.includes('우리은행') || asset.metadata?.bank === '우리은행')
  );

  // 실시간 환율 계산
  const marketRate = realTimeRates['USDT-VND'] || 24500;

  // 환율 자동 계산
  const calculateFromUsdt = () => {
    if (usdtAmount && exchangeRate) {
      const usdt = parseFloat(usdtAmount);
      const rate = parseFloat(exchangeRate);
      const vnd = usdt * rate;
      setVndAmount(vnd.toString());
    }
  };

  // P2P 거래 처리
  const executeP2P = useMutation({
    mutationFn: async () => {
      const usdt = parseFloat(usdtAmount);
      const vnd = parseFloat(vndAmount.replace(/,/g, ''));
      const rate = parseFloat(exchangeRate);

      if (usdt > availableUsdt) {
        throw new Error('사용 가능한 USDT가 부족합니다.');
      }

      if (!vndBankAsset) {
        throw new Error('VND 우리은행 계좌를 찾을 수 없습니다.');
      }

      const p2pData = {
        type: 'binance_p2p',
        fromAssetType: 'binance',
        fromAssetId: binanceUsdtAsset?.id || null,
        fromAssetName: 'Binance USDT',
        toAssetType: 'account',
        toAssetId: vndBankAsset.id,
        toAssetName: vndBankAsset.name,
        fromAmount: usdt.toString(),
        toAmount: vnd.toString(),
        rate: (vnd / usdt).toString(),
        fees: '0',
        memo: `P2P 거래: ${usdt.toFixed(2)} USDT → ${formatCurrency(vnd, 'VND')} VND (우리은행)`,
        metadata: {
          platform: 'binance_p2p',
          paymentMethod: 'VND 우리은행 계좌',
          marketRate: marketRate,
          rateSpread: rate - marketRate,
          exchangeRate: rate,
          bankName: '우리은행'
        }
      };

      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(p2pData)
      });

      if (!response.ok) throw new Error('P2P 거래 기록 저장 실패');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "P2P 거래 완료",
        description: "바이낸스 P2P 거래가 성공적으로 기록되었습니다.",
      });
      
      // 폼 초기화
      setUsdtAmount('');
      setVndAmount('');
      setExchangeRate('');
      
      // 데이터 새로고침
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/assets'] });
    },
    onError: (error) => {
      toast({
        title: "거래 실패",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // 평균 환율 및 통계 계산
  const avgExchangeRate = p2pTrades.length > 0
    ? p2pTrades.reduce((sum, trade) => sum + trade.exchangeRate, 0) / p2pTrades.length
    : 0;

  const totalVndAcquired = p2pTrades.reduce((sum, trade) => sum + trade.vndAmount, 0);
  const totalUsdtUsed = p2pTrades.reduce((sum, trade) => sum + trade.usdtAmount, 0);

  const canExecuteP2P = usdtAmount && vndAmount && exchangeRate && vndBankAsset && 
                       parseFloat(usdtAmount) <= availableUsdt;

  return (
    <div className="space-y-6">
      {/* 상단 통계 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <h3 className="text-sm font-medium text-gray-600 mb-2">바이낸스 보유 USDT</h3>
          <p className="text-2xl font-bold text-blue-600">
            {(isNaN(availableUsdt) ? 0 : availableUsdt).toFixed(8)} USDT
          </p>
          <p className="text-xs text-gray-500 mt-1">
            전체: {(isNaN(binanceBalance) ? 0 : binanceBalance).toFixed(8)} USDT
          </p>
        </Card>
        
        <Card className="p-4">
          <h3 className="text-sm font-medium text-gray-600 mb-2">총 구매 VND</h3>
          <p className="text-2xl font-bold text-green-600">
            {formatCurrency(totalVndAcquired, 'VND')} đ
          </p>
        </Card>
        
        <Card className="p-4">
          <h3 className="text-sm font-medium text-gray-600 mb-2">평균 환율</h3>
          <p className="text-2xl font-bold text-purple-600">
            {avgExchangeRate.toFixed(0)} VND/USDT
          </p>
        </Card>

        <Card className="p-4">
          <h3 className="text-sm font-medium text-gray-600 mb-2">시장 환율</h3>
          <p className="text-2xl font-bold text-orange-600">
            {marketRate.toFixed(0)} VND/USDT
          </p>
        </Card>
      </div>

      {/* 탭 선택 */}
      <div className="flex space-x-4">
        <Button
          variant={currentTab === 'p2p' ? 'default' : 'outline'}
          onClick={() => setCurrentTab('p2p')}
          className="flex items-center"
        >
          <Coins className="mr-2" size={16} />
          P2P 거래
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

      {currentTab === 'p2p' && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <TrendingUp className="mr-2" size={20} />
            바이낸스 P2P: USDT → VND
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              {/* VND 입금 계좌 정보 (고정) */}
              <div className="p-3 bg-blue-50 rounded-lg">
                <h4 className="text-sm font-medium text-blue-900 mb-1">VND 입금 계좌</h4>
                <p className="text-sm text-blue-700">
                  {vndBankAsset ? `${vndBankAsset.name} (${formatCurrency(vndBankAsset.balance, 'VND')} VND)` : 'VND 우리은행 계좌 없음'}
                </p>
              </div>

              {/* USDT 수량 입력 (크게 만들고 위로 이동) */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">판매할 USDT 수량</label>
                <div className="flex space-x-2">
                  <Input
                    value={usdtAmount}
                    onChange={(e) => {
                      setUsdtAmount(e.target.value);
                      if (exchangeRate) {
                        setTimeout(calculateFromUsdt, 100);
                      }
                    }}
                    placeholder="판매할 USDT 수량을 입력하세요"
                    type="number"
                    step="0.01"
                    max={isNaN(availableUsdt) ? '0' : availableUsdt.toString()}
                    className="flex-1 text-lg py-3"
                    data-testid="input-usdt-amount"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const maxAmount = isNaN(availableUsdt) ? 0 : availableUsdt;
                      setUsdtAmount(maxAmount.toFixed(8));
                      if (exchangeRate) {
                        setTimeout(calculateFromUsdt, 100);
                      }
                    }}
                    className="shrink-0 px-4 py-3"
                    data-testid="button-max-usdt"
                    disabled={isNaN(availableUsdt) || availableUsdt <= 0}
                  >
                    최대
                  </Button>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  💡 사용 가능한 USDT: <strong>{(isNaN(availableUsdt) ? 0 : availableUsdt).toFixed(8)} USDT</strong>
                </p>
              </div>

              {/* VND 시세 입력 필드 */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">VND 환율 (VND/USDT)</label>
                <div className="flex space-x-2">
                  <Input
                    value={exchangeRate}
                    onChange={(e) => {
                      setExchangeRate(e.target.value);
                      if (usdtAmount) {
                        setTimeout(calculateFromUsdt, 100);
                      }
                    }}
                    placeholder="P2P 거래 환율을 입력하세요"
                    type="number"
                    step="1"
                    className="flex-1 text-lg py-3"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setExchangeRate(marketRate.toString());
                      if (usdtAmount) {
                        setTimeout(calculateFromUsdt, 100);
                      }
                    }}
                    className="shrink-0 px-4 py-3"
                  >
                    시장가 적용
                  </Button>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  📊 현재 시장 환율: <strong>{marketRate.toFixed(0)} VND/USDT</strong>
                </p>
              </div>

              {/* 계산된 VND 금액 표시 */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">받을 VND 금액</label>
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">
                    {vndAmount ? formatCurrency(parseFloat(vndAmount.replace(/,/g, '')), 'VND') : '0'} VND
                  </p>
                  <p className="text-sm text-green-700 mt-1">
                    💰 우리은행 계좌로 입금됩니다
                  </p>
                </div>
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
                    <span>지불 USDT:</span>
                    <span className="text-red-600">{usdtAmount || '0'} USDT</span>
                  </div>
                  <div className="flex justify-between">
                    <span>받을 VND:</span>
                    <span className="text-green-600">{vndAmount ? formatCurrency(parseFloat(vndAmount.replace(/,/g, '')), 'VND') : '0'} VND</span>
                  </div>
                  <div className="flex justify-between">
                    <span>적용 환율:</span>
                    <span>{exchangeRate || '0'} VND/USDT</span>
                  </div>
                  <div className="flex justify-between">
                    <span>시장 환율:</span>
                    <span>{marketRate.toFixed(0)} VND/USDT</span>
                  </div>
                  <hr />
                  <div className="flex justify-between font-medium">
                    <span>환율 차이:</span>
                    <span className={exchangeRate && parseFloat(exchangeRate) > marketRate ? 'text-green-600' : 'text-red-600'}>
                      {exchangeRate ? (parseFloat(exchangeRate) - marketRate).toFixed(0) : '0'} VND/USDT
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>입금 계좌:</span>
                    <Badge variant="outline">VND 우리은행</Badge>
                  </div>
                </div>
              </div>

              <Button
                onClick={() => executeP2P.mutate()}
                disabled={!canExecuteP2P || executeP2P.isPending}
                className="w-full"
                size="lg"
              >
                {executeP2P.isPending ? "처리 중..." : "P2P 거래 기록"}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {currentTab === 'history' && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <History className="mr-2" size={20} />
            바이낸스 P2P 거래 내역
          </h3>

          {p2pTrades.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              아직 P2P 거래 내역이 없습니다.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>거래일시</TableHead>
                  <TableHead>USDT</TableHead>
                  <TableHead>VND</TableHead>
                  <TableHead>환율</TableHead>
                  <TableHead>입금계좌</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {p2pTrades.map((trade) => (
                  <TableRow key={trade.id}>
                    <TableCell>{new Date(trade.date).toLocaleDateString()}</TableCell>
                    <TableCell className="text-red-600 font-medium">
                      -{trade.usdtAmount.toFixed(2)} USDT
                    </TableCell>
                    <TableCell className="text-green-600 font-medium">
                      +{formatCurrency(trade.vndAmount, 'VND')} VND
                    </TableCell>
                    <TableCell>
                      {trade.exchangeRate.toFixed(0)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">우리은행</Badge>
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