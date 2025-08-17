import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowRightLeft, History, Send, Calculator } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, formatInputWithCommas, parseCommaFormattedNumber } from '@/utils/helpers';

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
  
  // 컴포넌트 마운트 시 캐시 무효화
  React.useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ['/api/assets'] });
  }, [queryClient]);

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

  // 빗썸 USDT 보유량 조회 (직접 자산에서 조회) - 캐시 갱신 강화
  const { data: assets = [], refetch: refetchAssets } = useQuery<any[]>({
    queryKey: ['/api/assets'],
    staleTime: 0, // 즉시 갱신
    refetchOnMount: 'always', // 마운트 시 항상 갱신
    refetchOnWindowFocus: true // 포커스 시 갱신
  });

  // 빗썸 USDT 자산 직접 조회 - 이름 매칭 개선
  const bithumbUsdtAsset = (assets as any[]).find((asset: any) => 
    asset.type === 'exchange' && asset.currency === 'USDT' && 
    (asset.name === 'Bithumb' || asset.name === 'Bithumb USDT' || asset.name.includes('Bithumb'))
  );

  console.log('빗썸 USDT 자산 검색 결과:', bithumbUsdtAsset);
  console.log('전체 자산 목록:', (assets as any[]).map((a: any) => ({ name: a.name, type: a.type, currency: a.currency })));

  // 사용 가능한 USDT 계산 - 실제 자산 잔액 기준 (테스트 데이터 기준)
  const bithumbUsdtBalance = parseFloat(bithumbUsdtAsset?.balance || '0');
  const availableUsdt = bithumbUsdtBalance;
  
  console.log('네트워크 이동 USDT 계산 (통일된 자산):', {
    bithumbUsdtBalance,
    availableUsdt,
    transfersCount: transfers.length,
    assetFound: !!bithumbUsdtAsset,
    assetType: bithumbUsdtAsset?.type,
    totalAssets: (assets as any[]).length
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
        fromAmount: (amount + fee).toString(), // 빗썸에서 총 차감 금액 (이동 수량 + 네트워크 수수료)
        toAmount: amount.toString(), // 바이낸스에 실제 도착하는 금액 (이동 수량만)
        rate: '1', // USDT to USDT이므로 1:1 환율
        fees: fee.toString(), // 네트워크 수수료만
        memo: `${selectedNetwork} 네트워크 이동 (수수료: ${fee} USDT)`,
        metadata: {
          platform: 'bithumb_to_binance',
          network: selectedNetwork,
          networkFee: fee,
          txHash: txHash || null,
          grossAmount: amount + fee, // 총 차감된 금액
          netAmount: amount // 실제 도착 금액
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
    <div className="space-y-3 sm:space-y-6">
      {/* 모바일 최적화 상단 통계 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <Card className="p-3 sm:p-4">
          <h3 className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 sm:mb-2">빗썸 보유 USDT</h3>
          <p className="text-lg sm:text-2xl font-bold text-blue-600 dark:text-blue-400">
            {availableUsdt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} 
            <span className="text-sm sm:text-base ml-1">USDT</span>
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            전체: {bithumbUsdtBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
          </p>
        </Card>
        
        <Card className="p-3 sm:p-4">
          <h3 className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 sm:mb-2">총 이동 수량</h3>
          <p className="text-lg sm:text-2xl font-bold text-green-600 dark:text-green-400">
            {transfers.reduce((sum: number, transfer: NetworkTransfer) => sum + (transfer.usdtAmount || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} 
            <span className="text-sm sm:text-base ml-1">USDT</span>
          </p>
        </Card>
        
        <Card className="p-3 sm:p-4 sm:col-span-2 lg:col-span-1">
          <h3 className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 sm:mb-2">총 네트워크 수수료</h3>
          <p className="text-lg sm:text-2xl font-bold text-red-600 dark:text-red-400">
            {transfers.reduce((sum: number, transfer: NetworkTransfer) => sum + (transfer.networkFee || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} 
            <span className="text-sm sm:text-base ml-1">USDT</span>
          </p>
        </Card>
      </div>

      {/* 탭 선택 - 디자인 통일화 */}
      <div className="flex space-x-2 sm:space-x-4">
        <Button
          variant={currentTab === 'transfer' ? 'default' : 'outline'}
          onClick={() => setCurrentTab('transfer')}
          className="flex items-center flex-1 sm:flex-none text-sm sm:text-base py-2 sm:py-2"
        >
          <Send className="mr-1 sm:mr-2" size={16} />
          USDT 이동
        </Button>
        <Button
          variant={currentTab === 'history' ? 'default' : 'outline'}
          onClick={() => setCurrentTab('history')}
          className="flex items-center flex-1 sm:flex-none text-sm sm:text-base py-2 sm:py-2"
        >
          <History className="mr-1 sm:mr-2" size={16} />
          이동 내역
        </Button>
      </div>

      {currentTab === 'transfer' && (
        <Card className="p-3 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center">
            <ArrowRightLeft className="mr-2" size={18} />
            빗썸 → 바이낸스 USDT 이동
          </h3>

          <div className="space-y-4 sm:grid sm:grid-cols-1 lg:grid-cols-2 sm:gap-6 sm:space-y-0">
            <div className="space-y-3 sm:space-y-4">
              <div>
                <label className="text-sm sm:text-base font-medium text-gray-700 dark:text-gray-300 mb-2 block">네트워크 선택</label>
                <Select value={selectedNetwork} onValueChange={(value) => {
                  setSelectedNetwork(value);
                  setNetworkFee(networkFeePresets[value as keyof typeof networkFeePresets].toString());
                }}>
                  <SelectTrigger className="text-xs sm:text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TRC20">
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs sm:text-sm">TRC20 (Tron)</span>
                        <Badge variant="secondary" className="ml-2 text-xs">~1 USDT</Badge>
                      </div>
                    </SelectItem>
                    <SelectItem value="ERC20">
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs sm:text-sm">ERC20 (Ethereum)</span>
                        <Badge variant="destructive" className="ml-2 text-xs">~15 USDT</Badge>
                      </div>
                    </SelectItem>
                    <SelectItem value="BSC">
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs sm:text-sm">BSC (Binance Smart Chain)</span>
                        <Badge variant="secondary" className="ml-2 text-xs">~0.8 USDT</Badge>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm sm:text-base font-medium text-gray-700 dark:text-gray-300 mb-2 block">이동 수량 (USDT)</label>
                <div className="flex space-x-2">
                  <Input
                    value={formatInputWithCommas(usdtAmount)}
                    onChange={(e) => {
                      const inputValue = e.target.value;
                      const rawValue = inputValue.replace(/,/g, '');
                      if (rawValue === '' || /^\d*\.?\d*$/.test(rawValue)) {
                        setUsdtAmount(rawValue);
                      }
                    }}
                    placeholder="이동할 USDT 수량"
                    type="text"
                    inputMode="numeric"
                    className="flex-1 text-xs sm:text-sm"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const maxMovable = Math.max(0, availableUsdt - parseFloat(networkFee || '0'));
                      setUsdtAmount(maxMovable.toString());
                    }}
                    disabled={availableUsdt <= parseFloat(networkFee || '0')}
                    className="px-2 sm:px-3 py-1 text-xs"
                  >
                    max
                  </Button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  최대 이동 가능: {formatInputWithCommas(Math.max(0, availableUsdt - parseFloat(networkFee || '0')).toString())} USDT
                </p>
              </div>

              <div>
                <label className="text-sm sm:text-base font-medium text-gray-700 dark:text-gray-300 mb-2 block">네트워크 수수료 (USDT)</label>
                <Input
                  value={formatInputWithCommas(networkFee)}
                  onChange={(e) => {
                    const inputValue = e.target.value;
                    const rawValue = inputValue.replace(/,/g, '');
                    if (rawValue === '' || /^\d*\.?\d*$/.test(rawValue)) {
                      setNetworkFee(rawValue);
                    }
                  }}
                  placeholder="네트워크 수수료"
                  type="text"
                  inputMode="numeric"
                  className="text-xs sm:text-sm"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  네트워크 선택 시 자동으로 입력됩니다
                </p>
              </div>

              <div>
                <label className="text-sm sm:text-base font-medium text-gray-700 dark:text-gray-300 mb-2 block">트랜잭션 해시 (선택사항)</label>
                <Input
                  value={txHash}
                  onChange={(e) => setTxHash(e.target.value)}
                  placeholder="0x... 또는 트랜잭션 ID"
                  type="text"
                  className="text-xs sm:text-sm"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  블록체인 거래 완료 후 받는 고유 번호입니다
                </p>
              </div>
            </div>

            <div className="space-y-3 sm:space-y-4">
              <div className="p-3 sm:p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <h4 className="font-medium mb-2 sm:mb-3 flex items-center text-sm sm:text-base">
                  <Calculator className="mr-2" size={14} />
                  이동 정보
                </h4>
                
                <div className="space-y-1 sm:space-y-2 text-xs sm:text-sm">
                  <div className="flex justify-between">
                    <span>이동 수량:</span>
                    <span>{formatInputWithCommas(usdtAmount || '0')} USDT</span>
                  </div>
                  <div className="flex justify-between">
                    <span>네트워크 수수료:</span>
                    <span className="text-red-600 dark:text-red-400">-{networkFee ? parseFloat(networkFee).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'} USDT</span>
                  </div>
                  <div className="flex justify-between">
                    <span>네트워크:</span>
                    <Badge variant="outline" className="text-xs">{selectedNetwork}</Badge>
                  </div>
                  <hr className="my-2" />
                  <div className="flex justify-between font-medium">
                    <span>총 차감 수량:</span>
                    <span className="text-red-600 dark:text-red-400">
                      {usdtAmount && networkFee 
                        ? formatInputWithCommas((parseFloat(usdtAmount) + parseFloat(networkFee)).toString())
                        : '0'} USDT
                    </span>
                  </div>
                  <div className="flex justify-between font-medium text-green-600 dark:text-green-400">
                    <span>바이낸스 도착 예정:</span>
                    <span>{formatInputWithCommas(usdtAmount || '0')} USDT</span>
                  </div>
                </div>
              </div>

              <Button
                onClick={() => transferUsdt.mutate()}
                disabled={!canTransfer || transferUsdt.isPending}
                className="w-full text-sm sm:text-base"
                size="sm"
              >
                {transferUsdt.isPending ? "처리 중..." : "USDT 이동 기록"}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {currentTab === 'history' && (
        <Card className="p-3 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center">
            <History className="mr-2" size={18} />
            네트워크 이동 내역
          </h3>

          {transfers.length === 0 ? (
            <div className="text-center py-6 sm:py-8 text-gray-500 dark:text-gray-400 text-sm sm:text-base">
              아직 이동 내역이 없습니다.
            </div>
          ) : (
            <>
              {/* 데스크톱 테이블 */}
              <div className="hidden sm:block">
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
                          <TableCell>{new Date(transfer.date).toLocaleString('ko-KR', { 
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                            hour12: false
                          })}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{transfer.network || 'TRC20'}</Badge>
                          </TableCell>
                          <TableCell className="font-medium">
                            {usdtAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
                          </TableCell>
                          <TableCell className="text-red-600">
                            -{networkFee.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
                          </TableCell>
                          <TableCell className="text-green-600 font-medium">
                            {usdtAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
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
              </div>

              {/* 모바일 카드 리스트 */}
              <div className="block sm:hidden space-y-3">
                {transfers.map((transfer: NetworkTransfer) => {
                  const usdtAmount = transfer.usdtAmount || 0;
                  const networkFee = transfer.networkFee || 0;
                  return (
                    <div key={transfer.id} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border">
                      {/* 상단: 날짜와 네트워크 */}
                      <div className="flex justify-between items-center mb-2">
                        <div className="text-sm font-medium">
                          <div>{new Date(transfer.date).toLocaleDateString('ko-KR', { 
                            month: 'short', 
                            day: 'numeric',
                            weekday: 'short'
                          })}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(transfer.date).toLocaleTimeString('ko-KR', {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                              hour12: false
                            })}
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {transfer.network || 'TRC20'}
                        </Badge>
                      </div>

                      {/* 중간: 이동 수량 (가장 중요한 정보) */}
                      <div className="mb-2">
                        <div className="text-base font-bold text-blue-600 dark:text-blue-400">
                          {usdtAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">바이낸스로 이동</div>
                      </div>

                      {/* 하단: 수수료와 트랜잭션 정보 */}
                      <div className="flex justify-between items-center text-xs">
                        <div className="text-red-600 dark:text-red-400">
                          수수료: -{networkFee.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
                        </div>
                        <div>
                          {transfer.txHash ? (
                            <span className="font-mono text-gray-500 dark:text-gray-400">
                              {transfer.txHash.substring(0, 6)}...
                            </span>
                          ) : (
                            <span className="text-gray-400">TX 없음</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </Card>
      )}
    </div>
  );
}