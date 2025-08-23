import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { History, RefreshCw, Coins, Settings } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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

export default function BithumbTrading() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [transactionLimit, setTransactionLimit] = useState<number>(20);
  
  // 컴포넌트 마운트 시 캐시 무효화
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ['/api/assets'] });
  }, [queryClient]);

  // 빗썸 실시간 거래 내역 조회 (개수 선택 기능 포함)
  const { data: bithumbTransactions = [], isLoading: isBithumbLoading, error: bithumbError, refetch } = useQuery({
    queryKey: ['/api/bithumb/transactions-full', transactionLimit],
    queryFn: async () => {
      const response = await fetch(`/api/bithumb/transactions-full?limit=${transactionLimit}&currency=USDT`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || '빗썸 API 연결 실패');
      }
      return response.json();
    },
    refetchInterval: 30000, // 30초마다 자동 새로고침
    retry: 3,
    retryDelay: 5000
  });

  // 빗썸 잔고 조회
  const { data: bithumbBalance } = useQuery({
    queryKey: ['/api/bithumb/usdt-data'],
    queryFn: async () => {
      const response = await fetch('/api/bithumb/usdt-data');
      if (!response.ok) return [];
      return response.json();
    },
    refetchInterval: 30000,
    retry: 2
  });

  // 실제 자산 데이터베이스에서 빗썸 USDT 조회 (테스트 데이터 기준) - 캐시 갱신 강화
  const { data: assets = [] } = useQuery({
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
  
  const databaseUsdtBalance = bithumbUsdtAsset ? parseFloat(bithumbUsdtAsset.balance || '0') : 0;
  


  // 기존 데이터베이스 거래 내역도 유지 (수동 입력용)
  const { data: manualTrades = [] } = useQuery<BithumbTrade[]>({
    queryKey: ['/api/transactions', 'bithumb'],
    queryFn: async () => {
      const response = await fetch('/api/transactions?type=bithumb_usdt_buy');
      if (!response.ok) throw new Error('수동 거래 내역 조회 실패');
      return response.json();
    }
  });

  // 빗썸 실시간 데이터와 수동 입력 데이터를 결합
  const realTimeBalance = bithumbBalance?.[0]?.balance || 0;
  const realTimeTransactions = bithumbTransactions || [];
  const allTransactions = [...realTimeTransactions, ...manualTrades];

  // 평균 단가 계산 (실시간 + 수동 입력)
  const totalCost = allTransactions.reduce((sum, trade) => {
    const cost = trade.amount || trade.totalCost || 0;
    return sum + (typeof cost === 'number' && !isNaN(cost) ? parseFloat(cost.toString()) : 0);
  }, 0);
  
  const totalQuantity = allTransactions.reduce((sum, trade) => {
    const quantity = trade.units || trade.quantity || trade.usdtAmount || 0;
    return sum + (typeof quantity === 'number' && !isNaN(quantity) ? parseFloat(quantity.toString()) : 0);
  }, 0);
  
  const averageUsdtPrice = totalQuantity > 0 ? totalCost / totalQuantity : 0;

  // 테스트 데이터 기준: 데이터베이스 잔액 우선 사용
  const totalUsdtOwned = databaseUsdtBalance > 0 ? databaseUsdtBalance : (realTimeBalance > 0 ? parseFloat(realTimeBalance.toString()) : (totalQuantity || 0));

  // 테스트 데이터 생성 (API 연결 실패 시 표시용)
  const testTransactions = [
    {
      id: 'test-1',
      date: '2025-08-15',
      amount: 3498596,
      quantity: 2563.07363459,
      price: 1364.74,
      fee: 1399.43,
      totalCost: 3499995,
      source: 'test'
    },
    {
      id: 'test-2', 
      date: '2025-08-14',
      amount: 1500000,
      quantity: 1100.5,
      price: 1363.5,
      fee: 600,
      totalCost: 1500600,
      source: 'test'
    },
    {
      id: 'test-3',
      date: '2025-08-13', 
      amount: 2000000,
      quantity: 1465.8,
      price: 1364.8,
      fee: 800,
      totalCost: 2000800,
      source: 'test'
    }
  ];

  const displayTransactions = bithumbError ? testTransactions : allTransactions;

  return (
    <div className="space-y-3 sm:space-y-6">


      {/* 모바일 최적화 상단 통계 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <Card className="p-3 sm:p-4">
          <h3 className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 sm:mb-2">
            보유 USDT
          </h3>
          <p className="text-lg sm:text-2xl font-bold text-blue-600 dark:text-blue-400">
            {(totalUsdtOwned || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} 
            <span className="text-sm sm:text-base ml-1">USDT</span>
          </p>

        </Card>
        
        <Card className="p-3 sm:p-4">
          <h3 className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 sm:mb-2">평균 취득가</h3>
          <p className="text-lg sm:text-2xl font-bold text-green-600 dark:text-green-400">
            ₩{(averageUsdtPrice || 0).toFixed(2)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            총 {displayTransactions.length}회 거래
          </p>
        </Card>
        
        <Card className="p-3 sm:p-4 sm:col-span-2 lg:col-span-1">
          <h3 className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 sm:mb-2">총 투자금액</h3>
          <p className="text-lg sm:text-2xl font-bold text-purple-600 dark:text-purple-400">
            {formatCurrency(displayTransactions.reduce((sum, trade) => {
              const cost = trade.totalCost || trade.amount || 0;
              return sum + (typeof cost === 'number' && !isNaN(cost) ? cost : 0);
            }, 0), 'KRW')}원
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {bithumbError ? '테스트 데이터' : '실제 투자'}
          </p>
        </Card>
      </div>

      {/* 거래 내역 헤더 - 개수 선택 기능 추가 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
        <h2 className="text-lg sm:text-xl font-semibold flex items-center">
          <History className="mr-2" size={18} />
          빗썸 거래 내역
        </h2>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Settings size={16} />
            <span className="text-sm font-medium">개수:</span>
            <Select value={transactionLimit.toString()} onValueChange={(value) => setTransactionLimit(parseInt(value))}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10개</SelectItem>
                <SelectItem value="20">20개</SelectItem>
                <SelectItem value="30">30개</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Badge variant="outline" className="text-xs sm:text-sm">
            {bithumbError ? '테스트 모드' : '실시간 API 연동'}
          </Badge>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 모바일 최적화 거래 내역 */}
      <Card className="p-3 sm:p-6">
        {bithumbError && (
          <div className="text-center py-3 sm:py-4 text-orange-600 dark:text-orange-300 bg-orange-50 dark:bg-orange-900/20 rounded-lg mb-3 sm:mb-4">
            <p className="font-medium text-sm sm:text-base">빗썸 API 연결 오류</p>
            <p className="text-xs sm:text-sm mt-1">{bithumbError.message}</p>
            <p className="text-xs mt-2 text-gray-600 dark:text-gray-400">테스트 데이터를 표시합니다 (실제 거래 데이터가 아님)</p>
          </div>
        )}
        
        {displayTransactions.length === 0 ? (
          <div className="text-center py-6 sm:py-8 text-gray-500 dark:text-gray-400">
            {isBithumbLoading ? '빗썸에서 데이터를 불러오는 중...' : '거래 내역이 없습니다.'}
          </div>
        ) : (
          <div className="block sm:hidden">
            {/* 모바일 카드 형태 */}
            <div className="space-y-3">
              {/* 실시간 거래 데이터 */}
              {!bithumbError && realTimeTransactions.map((trade: any, index: number) => (
                <div key={`real-mobile-${index}`} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-800">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm font-medium">
                      {trade.transfer_date ? 
                        new Date(parseInt(trade.transfer_date.toString())).toLocaleDateString() :
                        '날짜 없음'
                      }
                    </span>
                    <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-2 py-1 rounded">
                      {trade.type === 'buy' ? '매수' : '매도'}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-xs text-gray-600 dark:text-gray-400">거래금액</span>
                      <span className="text-sm font-medium">{formatCurrency(parseFloat(trade.amount || '0'), 'KRW')}원</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-gray-600 dark:text-gray-400">USDT수량</span>
                      <span className="text-sm font-medium text-blue-600 dark:text-blue-400">{parseFloat(trade.units || '0').toFixed(8)} USDT</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-gray-600 dark:text-gray-400">평균단가</span>
                      <span className="text-sm">₩{parseFloat(trade.price || '0').toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-gray-600 dark:text-gray-400">수수료</span>
                      <span className="text-sm text-red-600 dark:text-red-400">₩{formatCurrency(parseFloat(trade.fee || '0'), 'KRW')}</span>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* 수동 입력 거래 데이터 */}
              {!bithumbError && manualTrades.map((trade) => (
                <div key={`manual-mobile-${trade.id}`} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-800">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm font-medium">{new Date(trade.date).toLocaleDateString()}</span>
                    <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-2 py-1 rounded">수동</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-xs text-gray-600 dark:text-gray-400">구매금액</span>
                      <span className="text-sm font-medium">{formatCurrency(trade.krwAmount, 'KRW')}원</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-gray-600 dark:text-gray-400">USDT수량</span>
                      <span className="text-sm font-medium text-blue-600 dark:text-blue-400">{(trade.usdtAmount || 0).toFixed(2)} USDT</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-gray-600 dark:text-gray-400">평균단가</span>
                      <span className="text-sm">₩{(trade.pricePerUsdt || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-gray-600 dark:text-gray-400">수수료</span>
                      <span className="text-sm text-red-600 dark:text-red-400">{formatCurrency(trade.tradeFee, 'KRW')}원</span>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* 테스트 데이터 */}
              {bithumbError && testTransactions.map((trade) => (
                <div key={`test-mobile-${trade.id}`} className="border border-orange-200 dark:border-orange-700 rounded-lg p-3 bg-orange-50 dark:bg-orange-900/20">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm font-medium">{new Date(trade.date).toLocaleDateString()}</span>
                    <span className="text-xs bg-orange-100 dark:bg-orange-900/50 text-orange-800 dark:text-orange-300 px-2 py-1 rounded">테스트</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-xs text-gray-600 dark:text-gray-400">구매금액</span>
                      <span className="text-sm font-medium">{formatCurrency(trade.amount, 'KRW')}원</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-gray-600 dark:text-gray-400">USDT수량</span>
                      <span className="text-sm font-medium text-blue-600 dark:text-blue-400">{(trade.quantity || 0).toFixed(2)} USDT</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-gray-600 dark:text-gray-400">평균단가</span>
                      <span className="text-sm">₩{((trade.amount || 0) / (trade.quantity || 1)).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-gray-600 dark:text-gray-400">수수료</span>
                      <span className="text-sm text-red-600 dark:text-red-400">₩{formatCurrency(trade.fee, 'KRW')}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* 데스크톱 테이블 */}
        {displayTransactions.length > 0 && (
          <div className="hidden sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>거래일시</TableHead>
                  <TableHead>구매금액</TableHead>
                  <TableHead>USDT수량</TableHead>
                  <TableHead>평균단가</TableHead>
                  <TableHead>수수료</TableHead>
                  <TableHead>출처</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
              {/* 실시간 거래 데이터 */}
              {!bithumbError && realTimeTransactions.map((trade: any, index: number) => (
                <TableRow key={`real-${index}`}>
                  <TableCell>
                    {trade.transfer_date ? 
                      new Date(parseInt(trade.transfer_date.toString())).toLocaleDateString() :
                      '날짜 없음'
                    }
                  </TableCell>
                  <TableCell>{formatCurrency(parseFloat(trade.amount || '0'), 'KRW')}원</TableCell>
                  <TableCell className="text-blue-600 font-medium">
                    {parseFloat(trade.units || '0').toFixed(8)} USDT
                  </TableCell>
                  <TableCell>
                    ₩{parseFloat(trade.price || '0').toLocaleString()}
                  </TableCell>
                  <TableCell className="text-red-600">
                    ₩{formatCurrency(parseFloat(trade.fee || '0'), 'KRW')}
                  </TableCell>
                  <TableCell>
                    <span className={`text-xs px-2 py-1 rounded ${
                      trade.type === 'buy' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {trade.type === 'buy' ? '💰 매수' : '💸 매도'}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
              
              {/* 수동 입력 거래 데이터 */}
              {!bithumbError && manualTrades.map((trade) => (
                <TableRow key={trade.id}>
                  <TableCell>{new Date(trade.date).toLocaleDateString()}</TableCell>
                  <TableCell>{formatCurrency(trade.krwAmount, 'KRW')}원</TableCell>
                  <TableCell className="text-blue-600 font-medium">
                    {(trade.usdtAmount || 0).toFixed(2)} USDT
                  </TableCell>
                  <TableCell>
                    ₩{(trade.pricePerUsdt || 0).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-red-600">
                    {formatCurrency(trade.tradeFee, 'KRW')}원
                  </TableCell>
                  <TableCell>
                    <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">✍️ 수동</span>
                  </TableCell>
                </TableRow>
              ))}
              
              {/* 테스트 데이터 (API 실패시) */}
              {bithumbError && testTransactions.map((trade) => (
                <TableRow key={trade.id}>
                  <TableCell>{new Date(trade.date).toLocaleDateString()}</TableCell>
                  <TableCell>{formatCurrency(trade.amount, 'KRW')}원</TableCell>
                  <TableCell className="text-blue-600 font-medium">
                    {(trade.quantity || 0).toFixed(2)} USDT
                  </TableCell>
                  <TableCell>
                    ₩{((trade.amount || 0) / (trade.quantity || 1)).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-red-600">
                    ₩{formatCurrency(trade.fee, 'KRW')}
                  </TableCell>
                  <TableCell>
                    <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">📊 테스트</span>
                  </TableCell>
                </TableRow>
              ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}