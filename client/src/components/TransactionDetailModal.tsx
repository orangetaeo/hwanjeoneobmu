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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Badge variant="outline" className="px-2 py-1">
              {getTransactionTypeText(transaction.type)}
            </Badge>
            거래 상세
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* 메인 거래 정보 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">거래 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="text-sm text-gray-500">거래 ID</div>
                  <div className="font-mono text-xs bg-gray-100 p-2 rounded">
                    {transaction.id}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-gray-500">거래 시간</div>
                  <div className="font-medium">
                    {formatDateTime(transaction.timestamp)}
                  </div>
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-center py-4">
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <div className="text-sm text-gray-500 mb-1">출금</div>
                    <div className="font-semibold text-lg">
                      {formatInputWithCommas(transaction.fromAmount.toString())} {transaction.fromAssetName.includes('KRW') ? '원' : transaction.fromAssetName.includes('VND') ? '동' : transaction.fromAssetName.includes('USD') ? '$' : ''}
                    </div>
                    <div className="text-sm text-gray-600">
                      {transaction.fromAssetName}
                    </div>
                  </div>
                  <ArrowRight className="text-gray-400" size={24} />
                  <div className="text-center">
                    <div className="text-sm text-gray-500 mb-1">입금</div>
                    <div className="font-semibold text-lg">
                      {formatInputWithCommas(transaction.toAmount.toString())} {transaction.toAssetName.includes('KRW') ? '원' : transaction.toAssetName.includes('VND') ? '동' : transaction.toAssetName.includes('USD') ? '$' : ''}
                    </div>
                    <div className="text-sm text-gray-600">
                      {transaction.toAssetName}
                    </div>
                  </div>
                </div>
              </div>

              {transaction.rate && parseFloat(transaction.rate.toString()) > 0 && (
                <>
                  <Separator />
                  <div className="text-center">
                    <div className="text-sm text-gray-500 mb-1">적용 환율</div>
                    <div className="font-semibold text-lg">
                      {formatInputWithCommas(transaction.rate.toString())}
                    </div>
                  </div>
                </>
              )}

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
                    <div className="text-sm text-gray-500 mb-2">메모</div>
                    <div className="bg-gray-50 p-3 rounded text-sm">
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
              <CardHeader>
                <CardTitle className="text-lg">자산 변동 내역</CardTitle>
                <div className="text-sm text-gray-500">
                  이 거래로 인한 현금 자산 변동사항
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {relatedTransactions.map((relatedTx: Transaction) => (
                    <div key={relatedTx.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        {parseFloat(relatedTx.toAmount.toString()) > parseFloat(relatedTx.fromAmount.toString()) ? (
                          <TrendingUp className="text-green-600" size={20} />
                        ) : (
                          <TrendingDown className="text-red-600" size={20} />
                        )}
                        <div>
                          <div className="font-medium">
                            {relatedTx.toAssetName}
                          </div>
                          {relatedTx.metadata && typeof relatedTx.metadata === 'object' && relatedTx.metadata !== null && 'denominationChanges' in relatedTx.metadata && (
                            <div className="text-sm text-gray-500">
                              권종별: {Object.entries(relatedTx.metadata.denominationChanges as Record<string, number>)
                                .filter(([_, count]) => count !== 0)
                                .map(([denom, count]) => `${formatInputWithCommas(denom)}${relatedTx.toAssetName.includes('VND') ? '동' : '원'}×${count > 0 ? '+' : ''}${count}`)
                                .join(', ')
                              }
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-semibold ${
                          parseFloat(relatedTx.toAmount.toString()) > parseFloat(relatedTx.fromAmount.toString()) 
                            ? 'text-green-600' 
                            : 'text-red-600'
                        }`}>
                          {parseFloat(relatedTx.toAmount.toString()) > parseFloat(relatedTx.fromAmount.toString()) ? '+' : ''}
                          {formatInputWithCommas(Math.abs(parseFloat(relatedTx.toAmount.toString()) - parseFloat(relatedTx.fromAmount.toString())).toString())}
                          {relatedTx.toAssetName.includes('VND') ? '동' : '원'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatDateTime(relatedTx.timestamp)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}