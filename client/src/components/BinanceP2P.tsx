import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  const [sellerName, setSellerName] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('Bank Transfer');
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

  // 네트워크 이동 내역에서 사용 가능한 USDT 계산
  const { data: networkTransfers = [] } = useQuery({
    queryKey: ['/api/transactions', 'network_transfer'],
    queryFn: async () => {
      const response = await fetch('/api/transactions?type=network_transfer');
      if (!response.ok) throw new Error('네트워크 이동 내역 조회 실패');
      return response.json();
    }
  });

  const availableUsdt = networkTransfers.reduce((sum: number, transfer: any) => 
    sum + (transfer.toAmount || 0), 0) - 
    p2pTrades.reduce((sum, trade) => sum + trade.usdtAmount, 0);

  // VND 현금 자산 조회
  const { data: assets = [] } = useQuery<any[]>({
    queryKey: ['/api/assets'],
  });

  const vndCashAssets = (assets as any[]).filter((asset: any) => 
    asset.type === 'cash' && asset.currency === 'VND'
  );

  const [selectedVndAsset, setSelectedVndAsset] = useState<string>('');

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

  const calculateFromVnd = () => {
    if (vndAmount && exchangeRate) {
      const vnd = parseFloat(vndAmount.replace(/,/g, ''));
      const rate = parseFloat(exchangeRate);
      const usdt = vnd / rate;
      setUsdtAmount(usdt.toFixed(2));
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

      if (!selectedVndAsset) {
        throw new Error('VND 현금 자산을 선택해주세요.');
      }

      const p2pData = {
        type: 'binance_p2p',
        fromAssetId: null, // 바이낸스 USDT
        toAssetId: selectedVndAsset, // VND 현금 자산
        fromAmount: usdt,
        toAmount: vnd,
        exchangeRate: rate,
        metadata: {
          platform: 'binance_p2p',
          sellerName: sellerName || null,
          paymentMethod: paymentMethod,
          marketRate: marketRate,
          rateSpread: rate - marketRate
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
      setSellerName('');
      setSelectedVndAsset('');
      
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

  const canExecuteP2P = usdtAmount && vndAmount && exchangeRate && selectedVndAsset && 
                       parseFloat(usdtAmount) <= availableUsdt;

  return (
    <div className="space-y-6">
      {/* 상단 통계 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <h3 className="text-sm font-medium text-gray-600 mb-2">바이낸스 보유 USDT</h3>
          <p className="text-2xl font-bold text-blue-600">
            {availableUsdt.toFixed(2)} USDT
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
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">VND 현금 자산</label>
                <Select value={selectedVndAsset} onValueChange={setSelectedVndAsset}>
                  <SelectTrigger>
                    <SelectValue placeholder="VND 현금 자산 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {vndCashAssets.map((asset: any) => (
                      <SelectItem key={asset.id} value={asset.id}>
                        {asset.name} - {formatCurrency(asset.balance, 'VND')} VND
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">USDT 수량</label>
                  <Input
                    value={usdtAmount}
                    onChange={(e) => {
                      setUsdtAmount(e.target.value);
                      if (exchangeRate) {
                        setTimeout(calculateFromUsdt, 100);
                      }
                    }}
                    placeholder="USDT"
                    type="number"
                    step="0.01"
                    max={availableUsdt}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    최대: {availableUsdt.toFixed(2)} USDT
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">VND 금액</label>
                  <Input
                    value={vndAmount}
                    onChange={(e) => {
                      setVndAmount(e.target.value);
                      if (exchangeRate) {
                        setTimeout(calculateFromVnd, 100);
                      }
                    }}
                    placeholder="VND"
                    type="text"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">환율 (VND/USDT)</label>
                <div className="flex space-x-2">
                  <Input
                    value={exchangeRate}
                    onChange={(e) => setExchangeRate(e.target.value)}
                    placeholder="환율"
                    type="number"
                    step="1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setExchangeRate(marketRate.toString())}
                    className="shrink-0"
                  >
                    시장가
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  시장 환율: {marketRate.toFixed(0)} VND/USDT
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">결제 방법</label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Bank Transfer">은행 송금</SelectItem>
                    <SelectItem value="Momo">MoMo</SelectItem>
                    <SelectItem value="ZaloPay">ZaloPay</SelectItem>
                    <SelectItem value="ViettelPay">ViettelPay</SelectItem>
                    <SelectItem value="Cash">현금</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">판매자 (선택사항)</label>
                <Input
                  value={sellerName}
                  onChange={(e) => setSellerName(e.target.value)}
                  placeholder="판매자 닉네임"
                  type="text"
                />
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
                    <span>결제 방법:</span>
                    <Badge variant="outline">{paymentMethod}</Badge>
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
                  <TableHead>결제방법</TableHead>
                  <TableHead>판매자</TableHead>
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
                      <Badge variant="outline">{trade.paymentMethod}</Badge>
                    </TableCell>
                    <TableCell>
                      {trade.sellerName || '-'}
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