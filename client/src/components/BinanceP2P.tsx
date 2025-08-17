import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Coins, History, TrendingUp, Calculator } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, formatInputWithCommas, parseCommaFormattedNumber } from '@/utils/helpers';
import { useExchangeRates } from '@/hooks/useExchangeRates';
import { CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';

interface BinanceP2P {
  id: string;
  date: string;
  usdtAmount: number;
  vndAmount: number;
  exchangeRate: number;
  sellerName?: string;
  paymentMethod: string;
  status?: string;
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

  // 모든 거래 내역 조회 후 P2P만 필터링
  const { data: allTransactions = [] } = useQuery<any[]>({
    queryKey: ['/api/transactions'],
  });
  
  // P2P 거래만 필터링하고 BinanceP2P 형식으로 변환
  const p2pTrades: BinanceP2P[] = allTransactions
    .filter((tx: any) => tx.type === 'binance_p2p' || tx.type === 'p2p_trade')
    .map((tx: any) => ({
      id: tx.id,
      date: tx.timestamp,
      usdtAmount: parseFloat(tx.fromAmount),
      vndAmount: parseFloat(tx.toAmount),
      exchangeRate: tx.metadata?.exchangeRate || (parseFloat(tx.toAmount) / parseFloat(tx.fromAmount)),
      paymentMethod: tx.metadata?.paymentMethod || 'VND 은행계좌',
      sellerName: tx.metadata?.sellerName,
      status: tx.status || 'confirmed'
    }));
    
  console.log('P2P 거래 내역:', { allTransactions, p2pTrades });

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
  // 실제 자산 잔액을 기준으로 사용 가능한 USDT 계산 (테스트 데이터 기준)
  const availableUsdt = binanceBalance;
  
  console.log('Binance P2P USDT 계산:', {
    binanceBalance,
    availableUsdt,
    p2pTradesCount: p2pTrades.length,
    assetFound: !!binanceUsdtAsset
  });

  // VND 은행 계좌 자산 직접 조회 (P2P 거래용) - 우리은행 김학태 계좌만 사용
  const vndBankAsset = (assets as any[]).find((asset: any) => 
    asset.type === 'account' && asset.currency === 'VND' && 
    asset.name.includes('우리은행') && 
    asset.metadata?.accountHolder === '김학태'
  );

  console.log('VND 우리은행 계좌 검색:', {
    allVndAssets: (assets as any[]).filter((asset: any) => asset.type === 'account' && asset.currency === 'VND'),
    foundAsset: vndBankAsset,
    searchCriteria: '우리은행 + 김학태'
  });


  // 환율 자동 계산 - 간단하고 확실한 방법
  const calculateFromUsdt = (usdtValue?: string, rateValue?: string) => {
    const usdtToUse = usdtValue || usdtAmount;
    const rateToUse = rateValue || exchangeRate;
    
    if (usdtToUse && rateToUse) {
      const usdt = parseFloat(usdtToUse);
      const rate = parseFloat(rateToUse.replace(/,/g, ''));
      console.log('계산 입력값:', { usdt, rate, usdtToUse, rateToUse });
      
      if (!isNaN(usdt) && !isNaN(rate) && rate > 0 && usdt > 0) {
        const vnd = usdt * rate;
        console.log('계산 결과:', { usdt, rate, vnd });
        setVndAmount(vnd.toFixed(2));
      } else {
        console.log('계산 실패 - 잘못된 값:', { usdt, rate });
        setVndAmount('');
      }
    } else {
      setVndAmount('');
    }
  };

  // 거래 상태 변경 처리
  const updateTransactionStatus = useMutation({
    mutationFn: async ({ transactionId, status }: { transactionId: string; status: string }) => {
      const response = await fetch(`/api/transactions/${transactionId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      
      if (!response.ok) throw new Error('거래 상태 변경 실패');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "상태 변경 완료",
        description: "거래 상태가 성공적으로 변경되었습니다.",
      });
      
      // 데이터 새로고침
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/assets'] });
    },
    onError: (error) => {
      toast({
        title: "상태 변경 실패",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // P2P 거래 처리
  const executeP2P = useMutation({
    mutationFn: async () => {
      const usdt = parseFloat(usdtAmount);
      const vnd = parseFloat(vndAmount.replace(/,/g, ''));
      const rate = parseCommaFormattedNumber(exchangeRate);

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

  // 확인된 거래만 필터링 (취소된 거래 제외)
  const confirmedTrades = p2pTrades.filter(trade => trade.status === 'confirmed');
  
  // 평균 환율 및 통계 계산 (확인된 거래만 포함)
  const avgExchangeRate = confirmedTrades.length > 0
    ? confirmedTrades.reduce((sum, trade) => sum + trade.exchangeRate, 0) / confirmedTrades.length
    : 0;

  const totalVndAcquired = confirmedTrades.reduce((sum, trade) => sum + trade.vndAmount, 0);
  const totalUsdtUsed = confirmedTrades.reduce((sum, trade) => sum + trade.usdtAmount, 0);

  const canExecuteP2P = usdtAmount && vndAmount && exchangeRate && vndBankAsset && 
                       parseFloat(usdtAmount) <= availableUsdt;

  return (
    <div className="space-y-3 sm:space-y-6">
      {/* 모바일 최적화 상단 통계 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-3 sm:p-4">
          <h3 className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 sm:mb-2">바이낸스 보유 USDT</h3>
          <p className="text-lg sm:text-2xl font-bold text-blue-600 dark:text-blue-400">
            {(isNaN(availableUsdt) ? 0 : availableUsdt).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            <span className="text-sm sm:text-base ml-1">USDT</span>
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            전체: {binanceUsdtAsset ? parseFloat(binanceUsdtAsset.balance || '0').toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'} USDT
          </p>
        </Card>
        
        <Card className="p-3 sm:p-4">
          <h3 className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 sm:mb-2">총 구매 VND</h3>
          <p className="text-lg sm:text-2xl font-bold text-green-600 dark:text-green-400">
            {formatCurrency(totalVndAcquired, 'VND')}
            <span className="text-sm sm:text-base ml-1">đ</span>
          </p>
        </Card>
        
        <Card className="p-3 sm:p-4">
          <h3 className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 sm:mb-2">평균 환율</h3>
          <p className="text-lg sm:text-2xl font-bold text-purple-600 dark:text-purple-400">
            {avgExchangeRate.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            <span className="text-sm sm:text-base ml-1">VND/USDT</span>
          </p>
        </Card>

        <Card className="p-3 sm:p-4 sm:col-span-2 lg:col-span-1">
          <h3 className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 sm:mb-2">사용한 USDT</h3>
          <p className="text-lg sm:text-2xl font-bold text-orange-600 dark:text-orange-400">
            {totalUsdtUsed.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            <span className="text-sm sm:text-base ml-1">USDT</span>
          </p>
        </Card>
      </div>

      {/* 탭 선택 - 디자인 통일화 */}
      <div className="flex space-x-2 sm:space-x-4">
        <Button
          variant={currentTab === 'p2p' ? 'default' : 'outline'}
          onClick={() => setCurrentTab('p2p')}
          className="flex items-center flex-1 sm:flex-none text-sm sm:text-base py-2 sm:py-2"
        >
          <Coins className="mr-1 sm:mr-2" size={16} />
          P2P 거래
        </Button>
        <Button
          variant={currentTab === 'history' ? 'default' : 'outline'}
          onClick={() => setCurrentTab('history')}
          className="flex items-center flex-1 sm:flex-none text-sm sm:text-base py-2 sm:py-2"
        >
          <History className="mr-1 sm:mr-2" size={16} />
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
                <label className="text-base font-medium text-gray-700 mb-2 block">판매할 USDT 수량</label>
                <div className="flex space-x-2">
                  <Input
                    value={formatInputWithCommas(usdtAmount)}
                    onChange={(e) => {
                      const inputValue = e.target.value;
                      const rawValue = inputValue.replace(/,/g, '');
                      // 더 정확한 소숫점 허용: 최대 8자리까지
                      if (rawValue === '' || /^\d*\.?\d{0,8}$/.test(rawValue)) {
                        setUsdtAmount(rawValue);
                        calculateFromUsdt(rawValue, exchangeRate);
                      }
                    }}
                    onPaste={(e) => {
                      // 붙여넣기 이벤트 처리
                      e.preventDefault();
                      const pastedText = e.clipboardData.getData('text');
                      const rawValue = pastedText.replace(/[^0-9.]/g, '');
                      if (rawValue === '' || /^\d*\.?\d{0,8}$/.test(rawValue)) {
                        setUsdtAmount(rawValue);
                        calculateFromUsdt(rawValue, exchangeRate);
                      }
                    }}
                    placeholder="판매할 USDT 수량을 입력하세요"
                    type="text"
                    inputMode="decimal"
                    className="flex-1 text-lg py-3"
                    data-testid="input-usdt-amount"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const maxAmount = isNaN(availableUsdt) ? 0 : availableUsdt;
                      const maxAmountStr = maxAmount.toString();
                      setUsdtAmount(maxAmountStr);
                      calculateFromUsdt(maxAmountStr, exchangeRate);
                    }}
                    className="shrink-0 px-4 py-3 text-sm font-medium"
                    data-testid="button-max-usdt"
                    disabled={isNaN(availableUsdt) || availableUsdt <= 0}
                  >
                    max
                  </Button>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  💡 사용 가능한 USDT: <strong>{(isNaN(availableUsdt) ? 0 : availableUsdt).toLocaleString('en-US', { minimumFractionDigits: 8, maximumFractionDigits: 8 })} USDT</strong>
                </p>
              </div>

              {/* VND 시세 입력 필드 */}
              <div>
                <label className="text-base font-medium text-gray-700 mb-2 block">VND 환율 (VND/USDT)</label>
                <div className="flex space-x-2">
                  <Input
                    value={formatInputWithCommas(exchangeRate)}
                    onChange={(e) => {
                      const inputValue = e.target.value;
                      const rawValue = inputValue.replace(/,/g, '');
                      
                      // 숫자와 소수점만 허용
                      if (rawValue === '' || /^\d*\.?\d*$/.test(rawValue)) {
                        setExchangeRate(rawValue);
                        calculateFromUsdt(usdtAmount, rawValue);
                      }
                    }}
                    onInput={(e) => {
                      // 입력 이벤트에서도 처리 (복사-붙여넣기 포함)
                      const inputValue = (e.target as HTMLInputElement).value;
                      const rawValue = inputValue.replace(/,/g, '');
                      
                      if (rawValue === '' || /^\d*\.?\d*$/.test(rawValue)) {
                        setExchangeRate(rawValue);
                        calculateFromUsdt(usdtAmount, rawValue);
                      }
                    }}
                    placeholder="P2P 거래 환율을 입력하세요 (예: 26,346)"
                    type="text"
                    inputMode="numeric"
                    className="flex-1 text-lg py-3"
                  />
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  💡 환율을 입력하면 자동으로 VND 금액이 계산됩니다
                </p>
              </div>

              {/* 계산된 VND 금액 표시 */}
              <div>
                <label className="text-base font-medium text-gray-700 mb-2 block">받을 VND 금액</label>
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">
                    {vndAmount ? formatCurrency(parseFloat(vndAmount), 'VND') : '0'} VND
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
                    <span className="text-red-600">{usdtAmount ? parseFloat(usdtAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'} USDT</span>
                  </div>
                  <div className="flex justify-between">
                    <span>받을 VND:</span>
                    <span className="text-green-600">{vndAmount ? formatCurrency(parseFloat(vndAmount), 'VND') : '0'} VND</span>
                  </div>
                  <div className="flex justify-between">
                    <span>적용 환율:</span>
                    <span>{exchangeRate ? parseFloat(exchangeRate.replace(/,/g, '')).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '0'} VND/USDT</span>
                  </div>
                  <hr />
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
        <Card className="p-3 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center">
            <History className="mr-2" size={18} />
            바이낸스 P2P 거래 내역
          </h3>

          {p2pTrades.length === 0 ? (
            <div className="text-center py-6 sm:py-8 text-gray-500 dark:text-gray-400 text-sm sm:text-base">
              아직 P2P 거래 내역이 없습니다.
            </div>
          ) : (
            <>
              {/* 데스크톱 테이블 */}
              <div className="hidden sm:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>거래일시</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead>USDT</TableHead>
                      <TableHead>VND</TableHead>
                      <TableHead>환율</TableHead>
                      <TableHead>입금계좌</TableHead>
                      <TableHead>관리</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {p2pTrades.map((trade) => (
                      <TableRow key={trade.id}>
                        <TableCell>{new Date(trade.date).toLocaleDateString()}</TableCell>
                        <TableCell>
                          {trade.status === 'pending' && (
                            <Badge variant="outline" className="text-yellow-600 border-yellow-300">
                              <Clock className="mr-1" size={12} />
                              대기중
                            </Badge>
                          )}
                          {trade.status === 'confirmed' && (
                            <Badge variant="outline" className="text-green-600 border-green-300">
                              <CheckCircle className="mr-1" size={12} />
                              확인됨
                            </Badge>
                          )}
                          {trade.status === 'cancelled' && (
                            <Badge variant="outline" className="text-red-600 border-red-300">
                              <XCircle className="mr-1" size={12} />
                              취소됨
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-red-600 font-medium">
                          -{trade.usdtAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
                        </TableCell>
                        <TableCell className="text-green-600 font-medium">
                          +{formatCurrency(trade.vndAmount, 'VND')} VND
                        </TableCell>
                        <TableCell>
                          {trade.exchangeRate.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">우리은행</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-1">
                            {trade.status === 'pending' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-green-600 border-green-300 hover:bg-green-50"
                                  onClick={() => updateTransactionStatus.mutate({ transactionId: trade.id, status: 'confirmed' })}
                                  disabled={updateTransactionStatus.isPending}
                                >
                                  <CheckCircle size={14} />
                                  입금 확인
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-red-600 border-red-300 hover:bg-red-50"
                                  onClick={() => updateTransactionStatus.mutate({ transactionId: trade.id, status: 'cancelled' })}
                                  disabled={updateTransactionStatus.isPending}
                                >
                                  <XCircle size={14} />
                                  취소
                                </Button>
                              </>
                            )}
                            {trade.status === 'confirmed' && (
                              <span className="text-xs text-green-600">완료됨</span>
                            )}
                            {trade.status === 'cancelled' && (
                              <span className="text-xs text-gray-500">취소됨</span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* 모바일 카드 리스트 */}
              <div className="block sm:hidden space-y-3">
                {p2pTrades.map((trade) => (
                  <div key={trade.id} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border">
                    {/* 상단: 날짜와 상태 */}
                    <div className="flex justify-between items-center mb-2">
                      <div className="text-sm font-medium">
                        {new Date(trade.date).toLocaleDateString('ko-KR', { 
                          month: 'short', 
                          day: 'numeric',
                          weekday: 'short'
                        })}
                      </div>
                      <div>
                        {trade.status === 'pending' && (
                          <Badge variant="outline" className="text-yellow-600 border-yellow-300 text-xs">
                            <Clock className="mr-1" size={10} />
                            대기중
                          </Badge>
                        )}
                        {trade.status === 'confirmed' && (
                          <Badge variant="outline" className="text-green-600 border-green-300 text-xs">
                            <CheckCircle className="mr-1" size={10} />
                            확인됨
                          </Badge>
                        )}
                        {trade.status === 'cancelled' && (
                          <Badge variant="outline" className="text-red-600 border-red-300 text-xs">
                            <XCircle className="mr-1" size={10} />
                            취소됨
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* 중간: 거래 금액 (가장 중요한 정보) */}
                    <div className="mb-2">
                      <div className="flex justify-between items-center">
                        <div className="text-base font-bold text-red-600 dark:text-red-400">
                          -{trade.usdtAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
                        </div>
                        <div className="text-base font-bold text-green-600 dark:text-green-400">
                          +{formatCurrency(trade.vndAmount, 'VND')} VND
                        </div>
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        환율: {trade.exchangeRate.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} VND/USDT
                      </div>
                    </div>

                    {/* 하단: 계좌 정보와 관리 버튼 */}
                    <div className="flex justify-between items-center">
                      <Badge variant="outline" className="text-xs">우리은행</Badge>
                      <div className="flex space-x-1">
                        {trade.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-600 border-green-300 hover:bg-green-50 text-xs px-2 py-1"
                              onClick={() => updateTransactionStatus.mutate({ transactionId: trade.id, status: 'confirmed' })}
                              disabled={updateTransactionStatus.isPending}
                            >
                              <CheckCircle size={12} />
                              확인
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 border-red-300 hover:bg-red-50 text-xs px-2 py-1"
                              onClick={() => updateTransactionStatus.mutate({ transactionId: trade.id, status: 'cancelled' })}
                              disabled={updateTransactionStatus.isPending}
                            >
                              <XCircle size={12} />
                              취소
                            </Button>
                          </>
                        )}
                        {trade.status === 'confirmed' && (
                          <span className="text-xs text-green-600 dark:text-green-400">완료됨</span>
                        )}
                        {trade.status === 'cancelled' && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">취소됨</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      )}
    </div>
  );
}