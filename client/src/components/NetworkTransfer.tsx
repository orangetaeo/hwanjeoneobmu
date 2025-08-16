import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowRightLeft, History, Send, Calculator } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/utils/helpers';

interface NetworkTransfer {
  id: string;
  date: string;
  usdtAmount: number;
  networkFee: number;
  network: string;
  txHash?: string;
}

export default function NetworkTransfer() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // 폼 상태
  const [usdtAmount, setUsdtAmount] = useState<string>('');
  const [networkFee, setNetworkFee] = useState<string>('');
  const [selectedNetwork, setSelectedNetwork] = useState<string>('TRC20');
  const [txHash, setTxHash] = useState<string>('');
  const [currentTab, setCurrentTab] = useState<'transfer' | 'history'>('transfer');

  // 사용자 설정 조회
  const { data: userSettings } = useQuery({
    queryKey: ['/api/settings'],
  });

  // 네트워크 이동 내역 조회
  const { data: transfers = [] } = useQuery<NetworkTransfer[]>({
    queryKey: ['/api/transactions', 'network_transfer'],
    queryFn: async () => {
      const response = await fetch('/api/transactions?type=network_transfer');
      if (!response.ok) throw new Error('이동 내역 조회 실패');
      return response.json();
    }
  });

  // 빗썸 거래 내역에서 사용 가능한 USDT 계산
  const { data: bithumbTrades = [] } = useQuery({
    queryKey: ['/api/transactions', 'bithumb'],
    queryFn: async () => {
      const response = await fetch('/api/transactions?type=bithumb_usdt_buy');
      if (!response.ok) throw new Error('빗썸 거래 내역 조회 실패');
      return response.json();
    }
  });

  const availableUsdt = bithumbTrades.reduce((sum: number, trade: any) => sum + trade.toAmount, 0) -
                      transfers.reduce((sum, transfer) => sum + transfer.usdtAmount, 0);

  // 네트워크 수수료 프리셋
  const networkFeePresets = {
    TRC20: 1.0, // 1 USDT
    ERC20: 15.0, // 15 USDT (가스비 높음)
    BSC: 0.8, // 0.8 USDT
  };

  // 네트워크 이동 처리
  const transferUsdt = useMutation({
    mutationFn: async () => {
      const amount = parseFloat(usdtAmount);
      const fee = parseFloat(networkFee);

      if (amount > availableUsdt) {
        throw new Error('사용 가능한 USDT가 부족합니다.');
      }

      const transferData = {
        type: 'network_transfer',
        fromAssetId: null, // 빗썸 USDT
        toAssetId: null, // 바이낸스 USDT
        fromAmount: amount + fee,
        toAmount: amount,
        metadata: {
          platform: 'bithumb_to_binance',
          network: selectedNetwork,
          networkFee: fee,
          txHash: txHash || null,
          grossAmount: amount,
          netAmount: amount - fee
        }
      };

      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transferData)
      });

      if (!response.ok) throw new Error('이동 기록 저장 실패');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "네트워크 이동 완료",
        description: "USDT 네트워크 이동이 성공적으로 기록되었습니다.",
      });
      
      // 폼 초기화
      setUsdtAmount('');
      setNetworkFee('');
      setTxHash('');
      
      // 데이터 새로고침
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
    },
    onError: (error) => {
      toast({
        title: "이동 실패",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const canTransfer = usdtAmount && networkFee && parseFloat(usdtAmount) <= availableUsdt;

  return (
    <div className="space-y-6">
      {/* 상단 통계 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <h3 className="text-sm font-medium text-gray-600 mb-2">빗썸 보유 USDT</h3>
          <p className="text-2xl font-bold text-blue-600">
            {availableUsdt.toFixed(2)} USDT
          </p>
        </Card>
        
        <Card className="p-4">
          <h3 className="text-sm font-medium text-gray-600 mb-2">총 이동 수량</h3>
          <p className="text-2xl font-bold text-green-600">
            {transfers.reduce((sum, transfer) => sum + transfer.usdtAmount, 0).toFixed(2)} USDT
          </p>
        </Card>
        
        <Card className="p-4">
          <h3 className="text-sm font-medium text-gray-600 mb-2">총 네트워크 수수료</h3>
          <p className="text-2xl font-bold text-red-600">
            {transfers.reduce((sum, transfer) => sum + transfer.networkFee, 0).toFixed(2)} USDT
          </p>
        </Card>
      </div>

      {/* 탭 선택 */}
      <div className="flex space-x-4">
        <Button
          variant={currentTab === 'transfer' ? 'default' : 'outline'}
          onClick={() => setCurrentTab('transfer')}
          className="flex items-center"
        >
          <Send className="mr-2" size={16} />
          USDT 이동
        </Button>
        <Button
          variant={currentTab === 'history' ? 'default' : 'outline'}
          onClick={() => setCurrentTab('history')}
          className="flex items-center"
        >
          <History className="mr-2" size={16} />
          이동 내역
        </Button>
      </div>

      {currentTab === 'transfer' && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <ArrowRightLeft className="mr-2" size={20} />
            빗썸 → 바이낸스 USDT 이동
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">네트워크 선택</label>
                <Select value={selectedNetwork} onValueChange={(value) => {
                  setSelectedNetwork(value);
                  setNetworkFee(networkFeePresets[value as keyof typeof networkFeePresets].toString());
                }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TRC20">
                      <div className="flex items-center justify-between w-full">
                        <span>TRC20 (Tron)</span>
                        <Badge variant="secondary" className="ml-2">~1 USDT</Badge>
                      </div>
                    </SelectItem>
                    <SelectItem value="ERC20">
                      <div className="flex items-center justify-between w-full">
                        <span>ERC20 (Ethereum)</span>
                        <Badge variant="destructive" className="ml-2">~15 USDT</Badge>
                      </div>
                    </SelectItem>
                    <SelectItem value="BSC">
                      <div className="flex items-center justify-between w-full">
                        <span>BSC (Binance Smart Chain)</span>
                        <Badge variant="secondary" className="ml-2">~0.8 USDT</Badge>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">이동 수량 (USDT)</label>
                <Input
                  value={usdtAmount}
                  onChange={(e) => setUsdtAmount(e.target.value)}
                  placeholder="이동할 USDT 수량"
                  type="number"
                  step="0.01"
                  max={availableUsdt}
                />
                <p className="text-xs text-gray-500 mt-1">
                  최대 이동 가능: {availableUsdt.toFixed(2)} USDT
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">네트워크 수수료 (USDT)</label>
                <Input
                  value={networkFee}
                  onChange={(e) => setNetworkFee(e.target.value)}
                  placeholder="네트워크 수수료"
                  type="number"
                  step="0.01"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">트랜잭션 해시 (선택사항)</label>
                <Input
                  value={txHash}
                  onChange={(e) => setTxHash(e.target.value)}
                  placeholder="0x... 또는 트랜잭션 ID"
                  type="text"
                />
                <p className="text-xs text-gray-500 mt-1">
                  💡 블록체인 거래 완료 후 받는 고유 번호입니다. 나중에 거래 상태를 추적하는 데 사용됩니다.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-3 flex items-center">
                  <Calculator className="mr-2" size={16} />
                  이동 정보
                </h4>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>이동 수량:</span>
                    <span>{usdtAmount || '0'} USDT</span>
                  </div>
                  <div className="flex justify-between">
                    <span>네트워크 수수료:</span>
                    <span className="text-red-600">-{networkFee || '0'} USDT</span>
                  </div>
                  <div className="flex justify-between">
                    <span>네트워크:</span>
                    <Badge variant="outline">{selectedNetwork}</Badge>
                  </div>
                  <hr />
                  <div className="flex justify-between font-medium">
                    <span>총 차감 수량:</span>
                    <span className="text-red-600">
                      {usdtAmount && networkFee 
                        ? (parseFloat(usdtAmount) + parseFloat(networkFee)).toFixed(2) 
                        : '0'} USDT
                    </span>
                  </div>
                  <div className="flex justify-between font-medium text-green-600">
                    <span>바이낸스 도착 예정:</span>
                    <span>{usdtAmount || '0'} USDT</span>
                  </div>
                </div>
              </div>

              <Button
                onClick={() => transferUsdt.mutate()}
                disabled={!canTransfer || transferUsdt.isPending}
                className="w-full"
                size="lg"
              >
                {transferUsdt.isPending ? "처리 중..." : "USDT 이동 기록"}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {currentTab === 'history' && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <History className="mr-2" size={20} />
            네트워크 이동 내역
          </h3>

          {transfers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              아직 이동 내역이 없습니다.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>이동일시</TableHead>
                  <TableHead>네트워크</TableHead>
                  <TableHead>이동수량</TableHead>
                  <TableHead>네트워크수수료</TableHead>
                  <TableHead>실제도착</TableHead>
                  <TableHead>트랜잭션</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transfers.map((transfer) => (
                  <TableRow key={transfer.id}>
                    <TableCell>{new Date(transfer.date).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{transfer.network}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {transfer.usdtAmount.toFixed(2)} USDT
                    </TableCell>
                    <TableCell className="text-red-600">
                      -{transfer.networkFee.toFixed(2)} USDT
                    </TableCell>
                    <TableCell className="text-green-600 font-medium">
                      {(transfer.usdtAmount - transfer.networkFee).toFixed(2)} USDT
                    </TableCell>
                    <TableCell>
                      {transfer.txHash ? (
                        <span className="text-xs font-mono">
                          {transfer.txHash.substring(0, 8)}...
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
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