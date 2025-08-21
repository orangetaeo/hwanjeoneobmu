import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';
import { Transaction } from '@/types';
import { formatInputWithCommas } from '@/utils/helpers';
import { useQuery } from '@tanstack/react-query';

interface TransactionDetailModalProps {
  transaction: Transaction | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function TransactionDetailModal({ 
  transaction, 
  isOpen, 
  onClose 
}: TransactionDetailModalProps) {
  // 관련 거래들 조회 (같은 시간대의 cash_change 거래들)
  const { data: allTransactions } = useQuery({
    queryKey: ['/api/transactions'],
    enabled: isOpen && !!transaction
  });

  const getRelatedTransactions = () => {
    if (!transaction || !allTransactions || !Array.isArray(allTransactions)) return [];
    
    // 메인 거래와 같은 시간대(±30초)의 cash_change 거래들을 찾음
    const transactionTime = new Date(transaction.timestamp).getTime();
    const timeWindow = 30000; // 30초
    
    return allTransactions.filter((t: Transaction) => {
      if (t.id === transaction.id) return false; // 자기 자신 제외
      
      const tTime = new Date(t.timestamp).getTime();
      const timeDiff = Math.abs(transactionTime - tTime);
      
      return timeDiff <= timeWindow && t.type === 'cash_change';
    });
  };

  const relatedTransactions = getRelatedTransactions();

  const getTransactionTypeText = (type: string) => {
    switch (type) {
      case 'cash_exchange':
        return '현금 환전';
      case 'cash_to_krw_account':
        return '현금→KRW계좌';
      case 'cash_to_vnd_account':
        return '현금→VND계좌';
      case 'vnd_account_to_krw_account':
        return 'VND계좌→KRW계좌';
      case 'krw_account_to_vnd_account':
        return 'KRW계좌→VND계좌';
      case 'cash_change':
        return '현금 증감';
      default:
        return type;
    }
  };

  const formatDateTime = (timestamp: any) => {
    const date = new Date(timestamp);
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  if (!transaction) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader className="sticky top-0 bg-white dark:bg-gray-950 z-10 pb-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Badge variant="outline" className="px-2 py-1">
                {getTransactionTypeText(transaction.type)}
              </Badge>
              거래 상세
            </DialogTitle>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto">
          <div className="space-y-3 mt-3">
          {/* 메인 거래 정보 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">거래 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="space-y-1">
                  <div className="text-xs text-gray-500">거래 ID</div>
                  <div className="font-mono text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded">
                    {transaction.id}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-gray-500">거래 시간</div>
                  <div className="font-medium text-xs">
                    {formatDateTime(transaction.timestamp)}
                  </div>
                </div>
              </div>

              <Separator />

              {/* 출금 → 입금 → 환율을 한 줄에 표시 */}
              <div className="flex items-center justify-between py-1">
                <div className="text-center flex-1">
                  <div className="text-xs text-gray-500 mb-1">출금</div>
                  <div className="font-semibold text-sm">
                    {formatInputWithCommas(Math.floor(parseFloat(transaction.fromAmount.toString())).toString())} {transaction.fromAssetName.includes('KRW') ? '원' : transaction.fromAssetName.includes('VND') ? '동' : transaction.fromAssetName.includes('USD') ? '$' : ''}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {transaction.fromAssetName}
                  </div>
                </div>
                
                <div className="px-1">
                  <ArrowRight className="text-gray-400" size={14} />
                </div>
                
                <div className="text-center flex-1">
                  <div className="text-xs text-gray-500 mb-1">입금</div>
                  <div className="font-semibold text-sm">
                    {formatInputWithCommas(Math.floor(parseFloat(transaction.toAmount.toString())).toString())} {transaction.toAssetName.includes('KRW') ? '원' : transaction.toAssetName.includes('VND') ? '동' : transaction.toAssetName.includes('USD') ? '$' : ''}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {transaction.toAssetName}
                  </div>
                </div>

                {transaction.rate && parseFloat(transaction.rate.toString()) > 0 && (
                  <>
                    <div className="px-1">
                      <ArrowRight className="text-gray-400" size={14} />
                    </div>
                    <div className="text-center flex-1">
                      <div className="text-xs text-gray-500 mb-1">적용 환율</div>
                      <div className="font-semibold text-sm">
                        {(() => {
                          const rate = parseFloat(transaction.rate.toString());
                          // KRW→VND인 경우 소숫점 2자리 표시
                          if (transaction.fromAssetName.includes('KRW') && transaction.toAssetName.includes('VND')) {
                            return rate.toFixed(2);
                          }
                          // 다른 통화간은 정수 표시
                          return formatInputWithCommas(Math.floor(rate).toString());
                        })()}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {transaction.profit && parseFloat(transaction.profit.toString()) !== 0 && (
                <>
                  <Separator />
                  <div className="text-center">
                    <div className="text-sm text-gray-500 mb-1">수익</div>
                    <div className={`font-semibold text-lg flex items-center justify-center gap-1 ${
                      parseFloat(transaction.profit.toString()) > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {parseFloat(transaction.profit.toString()) > 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                      {formatInputWithCommas(Math.abs(parseFloat(transaction.profit.toString())).toString())} 원
                    </div>
                  </div>
                </>
              )}

              {transaction.memo && (
                <>
                  <Separator />
                  <div>
                    <div className="text-sm text-gray-500 mb-1">메모</div>
                    <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded text-sm">
                      {transaction.memo}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* 자산 변동 내역 */}
          {relatedTransactions.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">자산 변동 내역</CardTitle>
                <div className="text-sm text-gray-500">
                  이 거래로 인한 현금 자산 변동사항
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {relatedTransactions.map((relatedTx: Transaction) => (
                    <div key={relatedTx.id} className="border rounded-lg p-2 bg-gray-50 dark:bg-gray-800 relative">
                      {/* 중앙에 큰 금액 표시 */}
                      <div className="text-center py-2">
                        <div className={`font-bold text-xl ${
                          parseFloat(relatedTx.toAmount.toString()) > parseFloat(relatedTx.fromAmount.toString()) 
                            ? 'text-green-600' 
                            : 'text-red-600'
                        }`}>
                          {parseFloat(relatedTx.toAmount.toString()) > parseFloat(relatedTx.fromAmount.toString()) ? '+' : ''}
                          {formatInputWithCommas(Math.abs(parseFloat(relatedTx.toAmount.toString()) - parseFloat(relatedTx.fromAmount.toString())).toString())}
                          {relatedTx.toAssetName.includes('VND') ? '동' : '원'}
                        </div>
                        <div className="flex items-center justify-center gap-1 mt-1">
                          {parseFloat(relatedTx.toAmount.toString()) > parseFloat(relatedTx.fromAmount.toString()) ? (
                            <TrendingUp className="text-green-600 flex-shrink-0" size={14} />
                          ) : (
                            <TrendingDown className="text-red-600 flex-shrink-0" size={14} />
                          )}
                          <span className="font-medium text-xs text-gray-600">
                            {relatedTx.toAssetName}
                          </span>
                        </div>
                      </div>
                      
                      {relatedTx.metadata && typeof relatedTx.metadata === 'object' && relatedTx.metadata !== null && 'denominationChanges' in relatedTx.metadata && (
                        <div className="mt-1">
                          <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">권종별 변동:</div>
                          <div className="grid grid-cols-3 gap-1">
                            {Object.entries(relatedTx.metadata.denominationChanges as Record<string, number>)
                              .filter(([_, count]) => count !== 0)
                              .map(([denom, count]) => (
                                <div key={denom} className={`text-xs px-1 py-0.5 rounded border text-center ${
                                  count > 0 
                                    ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-600' 
                                    : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-600'
                                }`}>
                                  {formatInputWithCommas(denom)}{relatedTx.toAssetName.includes('VND') ? '동' : '원'} × {count > 0 ? '+' : ''}{count}
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                      
                      <div className="text-xs text-gray-500 mt-1 text-center">
                        {formatDateTime(relatedTx.timestamp)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}