import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { History, RefreshCw } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
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

  // 빗썸 실시간 USDT 데이터 조회 (잔고 + 거래내역)
  const { data: bithumbData, isLoading: isBithumbLoading, error: bithumbError, refetch } = useQuery({
    queryKey: ['/api/bithumb/usdt-data'],
    queryFn: async () => {
      const response = await fetch('/api/bithumb/usdt-data');
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
  const realTimeBalance = bithumbData?.balance || 0;
  const realTimeTransactions = bithumbData?.transactions || [];
  const allTransactions = [...realTimeTransactions, ...manualTrades];

  // 평균 단가 계산 (실시간 + 수동 입력)
  const totalCost = allTransactions.reduce((sum, trade) => {
    const cost = trade.totalCost || trade.amount || 0;
    return sum + (typeof cost === 'number' && !isNaN(cost) ? cost : 0);
  }, 0);
  
  const totalQuantity = allTransactions.reduce((sum, trade) => {
    const quantity = trade.usdtAmount || trade.quantity || 0;
    return sum + (typeof quantity === 'number' && !isNaN(quantity) ? quantity : 0);
  }, 0);
  
  const averageUsdtPrice = totalQuantity > 0 ? totalCost / totalQuantity : 0;

  const totalUsdtOwned = realTimeBalance > 0 ? realTimeBalance : (totalQuantity || 0);

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
    <div className="space-y-6">
      {/* API 연결 테스트 */}
      <Card className="p-4 mb-4 bg-blue-50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-blue-800">빗썸 API 연결 상태</h3>
            <p className="text-sm text-blue-600">
              {bithumbError ? '❌ API 연결 실패 (테스트 데이터 표시 중)' : '✅ API 연결 성공'}
            </p>
          </div>
          <div className="flex space-x-2">
            <Button
              onClick={() => refetch()}
              variant="outline"
              size="sm"
              className="text-blue-700 border-blue-300"
              disabled={isBithumbLoading}
            >
              {isBithumbLoading ? <RefreshCw className="mr-2" size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw className="mr-2" size={14} />}
              새로고침
            </Button>
            <Button
              onClick={async () => {
                try {
                  const response = await fetch('/api/bithumb/test');
                  const result = await response.json();
                  console.log('API 테스트 결과:', result);
                  toast({
                    title: result.success ? "API 연결 성공" : "API 연결 실패",
                    description: result.message,
                    variant: result.success ? "default" : "destructive"
                  });
                } catch (error) {
                  console.error('API 테스트 오류:', error);
                  toast({
                    title: "테스트 실패",
                    description: "API 테스트 중 오류가 발생했습니다",
                    variant: "destructive"
                  });
                }
              }}
              variant="outline"
              size="sm"
              className="text-blue-700 border-blue-300"
            >
              🔧 API 연결 테스트
            </Button>
          </div>
        </div>
      </Card>

      {/* 상단 통계 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <h3 className="text-sm font-medium text-gray-600 mb-2 flex items-center">
            보유 USDT 
            {isBithumbLoading && <span className="ml-2 text-xs text-blue-500">🔄</span>}
            {bithumbError && <span className="ml-2 text-xs text-orange-500">📊</span>}
          </h3>
          <p className="text-2xl font-bold text-blue-600">
            {(totalUsdtOwned || 0).toFixed(8)} USDT
          </p>
          {bithumbError ? (
            <p className="text-xs text-orange-500 mt-1">테스트 데이터</p>
          ) : realTimeBalance > 0 ? (
            <p className="text-xs text-green-500 mt-1">실시간 빗썸 잔고</p>
          ) : (
            <p className="text-xs text-gray-500 mt-1">수동 입력 합계</p>
          )}
        </Card>
        
        <Card className="p-4">
          <h3 className="text-sm font-medium text-gray-600 mb-2">평균 취득가</h3>
          <p className="text-2xl font-bold text-green-600">
            ₩{(averageUsdtPrice || 0).toFixed(2)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            총 {displayTransactions.length}회 거래
          </p>
        </Card>
        
        <Card className="p-4">
          <h3 className="text-sm font-medium text-gray-600 mb-2">총 투자금액</h3>
          <p className="text-2xl font-bold text-purple-600">
            {formatCurrency(displayTransactions.reduce((sum, trade) => {
              const cost = trade.totalCost || trade.amount || 0;
              return sum + (typeof cost === 'number' && !isNaN(cost) ? cost : 0);
            }, 0), 'KRW')}원
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {bithumbError ? '테스트 데이터' : '실제 투자'}
          </p>
        </Card>
      </div>

      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center">
          <History className="mr-2" size={20} />
          빗썸 거래 내역
        </h2>
        <Badge variant="outline" className="text-sm">
          {bithumbError ? '테스트 모드' : '실시간 API 연동'}
        </Badge>
      </div>

      {/* 거래 내역 */}
      <Card className="p-6">
        {bithumbError && (
          <div className="text-center py-4 text-orange-600 bg-orange-50 rounded-lg mb-4">
            <p className="font-medium">⚠️ 빗썸 API 연결 오류</p>
            <p className="text-sm mt-1">{bithumbError.message}</p>
            <p className="text-xs mt-2 text-gray-600">테스트 데이터를 표시합니다 (실제 거래 데이터가 아님)</p>
          </div>
        )}
        
        {displayTransactions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {isBithumbLoading ? '빗썸에서 데이터를 불러오는 중...' : '거래 내역이 없습니다.'}
          </div>
        ) : (
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
                  <TableCell>{new Date(trade.date).toLocaleDateString()}</TableCell>
                  <TableCell>{formatCurrency(trade.amount, 'KRW')}원</TableCell>
                  <TableCell className="text-blue-600 font-medium">
                    {(trade.quantity || 0).toFixed(8)} USDT
                  </TableCell>
                  <TableCell>
                    ₩{((trade.amount || 0) / (trade.quantity || 1)).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-red-600">
                    ₩{formatCurrency(trade.fee, 'KRW')}
                  </TableCell>
                  <TableCell>
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">🔄 실시간</span>
                  </TableCell>
                </TableRow>
              ))}
              
              {/* 수동 입력 거래 데이터 */}
              {!bithumbError && manualTrades.map((trade) => (
                <TableRow key={trade.id}>
                  <TableCell>{new Date(trade.date).toLocaleDateString()}</TableCell>
                  <TableCell>{formatCurrency(trade.krwAmount, 'KRW')}원</TableCell>
                  <TableCell className="text-blue-600 font-medium">
                    {(trade.usdtAmount || 0).toFixed(8)} USDT
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
                    {(trade.quantity || 0).toFixed(8)} USDT
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
        )}
      </Card>
    </div>
  );
}