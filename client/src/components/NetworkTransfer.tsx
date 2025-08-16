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
  const [networkFee, setNetworkFee] = useState<string>('1.0'); // TRC20 기본값
  const [selectedNetwork, setSelectedNetwork] = useState<string>('TRC20');
  const [txHash, setTxHash] = useState<string>('');
  const [currentTab, setCurrentTab] = useState<'transfer' | 'history'>('transfer');

  // 사용자 설정 조회
  const { data: userSettings } = useQuery({
    queryKey: ['/api/settings'],
  });

  // 네트워크 이동 내역 조회 (실제 거래 내역에서 필터링)
  const { data: allTransactions = [] } = useQuery({
    queryKey: ['/api/transactions'],
    queryFn: async () => {
      const response = await fetch('/api/transactions');
      if (!response.ok) throw new Error('거래 내역 조회 실패');
      return response.json();
    }
  });
  
  // 네트워크 이동 관련 거래만 필터링
  const transfers = allTransactions.filter((tx: any) => 
    tx.type === 'exchange_transfer' || 
    tx.type === 'network_transfer' ||
    (tx.metadata && tx.metadata.platform === 'bithumb_to_binance')
  ).map((tx: any) => ({
    id: tx.id,
    date: tx.timestamp,
    usdtAmount: parseFloat(tx.toAmount) || 0,
    networkFee: parseFloat(tx.metadata?.networkFee) || 0,
    network: tx.metadata?.network || 'TRC20',
    txHash: tx.metadata?.txHash
  }));

  // 빗썸 USDT 보유량 조회 (직접 자산에서 조회)
  const { data: assets = [] } = useQuery<any[]>({
    queryKey: ['/api/assets']
  });

  // 빗썸 USDT 자산 직접 조회 (타입 통일: exchange만 사용)
  const bithumbUsdtAsset = (assets as any[]).find((asset: any) => 
    asset.type === 'exchange' && asset.currency === 'USDT' && asset.name === 'Bithumb USDT'
  );

  console.log('빗썸 USDT 자산 검색 결과:', bithumbUsdtAsset);

  // 사용 가능한 USDT 계산 (안전한 계산)
  const bithumbUsdtBalance = parseFloat(bithumbUsdtAsset?.balance || '0');
  const usedUsdt = transfers.reduce((sum: number, transfer: NetworkTransfer) => sum + (transfer.usdtAmount || 0), 0);
  const availableUsdt = Math.max(0, bithumbUsdtBalance - usedUsdt);
  
  console.log('네트워크 이동 USDT 계산 (통일된 자산):', {
    bithumbUsdtBalance,
    usedUsdt,
    availableUsdt,
    transfersCount: transfers.length,
    assetFound: !!bithumbUsdtAsset,
    assetType: bithumbUsdtAsset?.type
  });
  

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
        fromAssetType: 'exchange',
        fromAssetId: null,
        fromAssetName: 'Bithumb USDT',
        toAssetType: 'binance',
        toAssetId: null,
        toAssetName: 'Binance USDT',
        fromAmount: (amount + fee).toString(), // 문자열로 변환
        toAmount: amount.toString(), // 문자열로 변환
        rate: '1', // USDT to USDT이므로 1:1 환율
        fees: fee.toString(), // 수수료 문자열로
        memo: `${selectedNetwork} 네트워크 이동`,
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
      
      // 데이터 새로고침 - 거래내역과 자산잔액 모두 업데이트
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/assets'] });
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
            {availableUsdt.toFixed(8)} USDT
          </p>
          <p className="text-xs text-gray-500 mt-1">
            전체: {bithumbUsdtBalance.toFixed(8)} USDT
          </p>
        </Card>
        
        <Card className="p-4">
          <h3 className="text-sm font-medium text-gray-600 mb-2">총 이동 수량</h3>
          <p className="text-2xl font-bold text-green-600">
            {transfers.reduce((sum: number, transfer: NetworkTransfer) => sum + (transfer.usdtAmount || 0), 0)} USDT
          </p>
        </Card>
        
        <Card className="p-4">
          <h3 className="text-sm font-medium text-gray-600 mb-2">총 네트워크 수수료</h3>
          <p className="text-2xl font-bold text-red-600">
            {transfers.reduce((sum: number, transfer: NetworkTransfer) => sum + (transfer.networkFee || 0), 0)} USDT
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
                <div className="flex space-x-2">
                  <Input
                    value={usdtAmount}
                    onChange={(e) => setUsdtAmount(e.target.value)}
                    placeholder="이동할 USDT 수량"
                    type="number"
                    step="0.01"
                    max={availableUsdt > 0 ? availableUsdt : undefined}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setUsdtAmount(availableUsdt.toString())}
                    disabled={availableUsdt <= 0}
                    className="px-3 py-1 text-xs"
                  >
                    MAX
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  최대 이동 가능: {availableUsdt} USDT
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">네트워크 수수료 (USDT)</label>
                <Input
                  value={networkFee}
                  onChange={(e) => setNetworkFee(e.target.value)}
                  placeholder="네트워크 수수료 자동 입력됨"
                  type="number"
                  step="0.01"
                />
                <p className="text-xs text-gray-500 mt-1">
                  💡 네트워크 선택 시 자동으로 입력됩니다
                </p>
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
                {transfers.map((transfer: NetworkTransfer) => {
                  const usdtAmount = transfer.usdtAmount || 0;
                  const networkFee = transfer.networkFee || 0;
                  return (
                    <TableRow key={transfer.id}>
                      <TableCell>{new Date(transfer.date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{transfer.network || 'TRC20'}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {usdtAmount} USDT
                      </TableCell>
                      <TableCell className="text-red-600">
                        -{networkFee} USDT
                      </TableCell>
                      <TableCell className="text-green-600 font-medium">
                        {(usdtAmount - networkFee)} USDT
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
                  );
                })}
              </TableBody>
            </Table>
          )}
        </Card>
      )}
    </div>
  );
}