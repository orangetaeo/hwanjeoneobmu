import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowUpDown, Calendar, Filter, Search, TrendingDown, TrendingUp, Clock, ArrowRight } from 'lucide-react';
import { Transaction } from '@/types';
import { formatInputWithCommas } from '@/utils/helpers';

interface TransactionHistoryProps {
  transactions: Transaction[];
  onTransactionClick?: (transaction: Transaction) => void;
}

export default function TransactionHistory({ transactions, onTransactionClick }: TransactionHistoryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('timestamp');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const getTransactionTypeText = (type: string) => {
    switch (type) {
      case 'bank_to_exchange':
        return '은행→거래소';
      case 'exchange_purchase':
        return '코인 구매';
      case 'exchange_transfer':
        return '거래소 이동';
      case 'p2p_trade':
        return 'P2P 거래';
      case 'exchange':
        return '환전';
      case 'transfer':
        return '이체';
      default:
        return type;
    }
  };

  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case 'bank_to_exchange':
        return 'bg-blue-100 text-blue-800';
      case 'exchange_purchase':
        return 'bg-green-100 text-green-800';
      case 'exchange_transfer':
        return 'bg-purple-100 text-purple-800';
      case 'p2p_trade':
        return 'bg-orange-100 text-orange-800';
      case 'exchange':
        return 'bg-indigo-100 text-indigo-800';
      case 'transfer':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'bank_to_exchange':
      case 'exchange_transfer':
        return <ArrowRight size={16} />;
      case 'exchange_purchase':
        return <TrendingUp size={16} />;
      case 'p2p_trade':
        return <ArrowUpDown size={16} />;
      default:
        return <Clock size={16} />;
    }
  };

  const filteredTransactions = transactions
    .filter(transaction => {
      const matchesSearch = 
        transaction.fromAssetName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.toAssetName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (transaction.memo && transaction.memo.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesFilter = filterType === 'all' || transaction.type === filterType;
      
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'timestamp':
          aValue = new Date(a.timestamp).getTime();
          bValue = new Date(b.timestamp).getTime();
          break;
        case 'fromAmount':
          aValue = a.fromAmount;
          bValue = b.fromAmount;
          break;
        case 'toAmount':
          aValue = a.toAmount;
          bValue = b.toAmount;
          break;
        case 'profit':
          aValue = a.profit;
          bValue = b.profit;
          break;
        default:
          return 0;
      }
      
      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    });

  const formatDateTime = (timestamp: any) => {
    const date = new Date(timestamp);
    return {
      date: date.toLocaleDateString('ko-KR'),
      time: date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
    };
  };

  const calculateProfitRate = (transaction: Transaction) => {
    if (transaction.marketPrice && transaction.customPrice) {
      const profitRate = ((transaction.customPrice - transaction.marketPrice) / transaction.marketPrice) * 100;
      return profitRate;
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* 필터 및 검색 */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <Input
                placeholder="거래내역 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-40">
                <Filter size={16} />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 거래</SelectItem>
                <SelectItem value="bank_to_exchange">은행→거래소</SelectItem>
                <SelectItem value="exchange_purchase">코인 구매</SelectItem>
                <SelectItem value="exchange_transfer">거래소 이동</SelectItem>
                <SelectItem value="p2p_trade">P2P 거래</SelectItem>
                <SelectItem value="exchange">환전</SelectItem>
                <SelectItem value="transfer">이체</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="timestamp">시간순</SelectItem>
                <SelectItem value="fromAmount">금액순</SelectItem>
                <SelectItem value="profit">수익순</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            >
              <ArrowUpDown size={16} />
            </Button>
          </div>
        </div>
      </Card>

      {/* 거래 내역 리스트 */}
      <div className="space-y-4">
        {filteredTransactions.length === 0 ? (
          <Card className="p-8 text-center">
            <div className="text-gray-500">
              <Clock size={48} className="mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">거래 내역이 없습니다</p>
              <p className="text-sm">새로운 거래를 추가해보세요.</p>
            </div>
          </Card>
        ) : (
          filteredTransactions.map((transaction) => {
            const { date, time } = formatDateTime(transaction.timestamp);
            const profitRate = calculateProfitRate(transaction);
            
            return (
              <Card 
                key={transaction.id} 
                className="p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => onTransactionClick?.(transaction)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge className={`${getTransactionTypeColor(transaction.type)} flex items-center gap-1`}>
                        {getTransactionIcon(transaction.type)}
                        {getTransactionTypeText(transaction.type)}
                      </Badge>
                      
                      <div className="text-sm text-gray-500">
                        {date} {time}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium">{transaction.fromAssetName}</span>
                      <ArrowRight size={16} className="text-gray-400" />
                      <span className="font-medium">{transaction.toAssetName}</span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="text-gray-500">보낸 금액</div>
                        <div className="font-medium">
                          {formatInputWithCommas(transaction.fromAmount.toString())}
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-gray-500">받은 금액</div>
                        <div className="font-medium">
                          {formatInputWithCommas(transaction.toAmount.toString())}
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-gray-500">환율/가격</div>
                        <div className="font-medium">
                          {formatInputWithCommas(transaction.rate.toString())}
                        </div>
                      </div>

                      {transaction.fees !== undefined && transaction.fees > 0 && (
                        <div>
                          <div className="text-gray-500">수수료</div>
                          <div className="font-medium text-red-600">
                            {formatInputWithCommas(transaction.fees.toString())}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 고급 거래 정보 */}
                    {(transaction.customPrice || transaction.marketPrice) && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                          {transaction.marketPrice && (
                            <div>
                              <div className="text-gray-500">시장 가격</div>
                              <div className="font-medium">
                                ₩{formatInputWithCommas(transaction.marketPrice.toString())}
                              </div>
                            </div>
                          )}
                          
                          {transaction.customPrice && (
                            <div>
                              <div className="text-gray-500">거래 가격</div>
                              <div className="font-medium">
                                ₩{formatInputWithCommas(transaction.customPrice.toString())}
                              </div>
                            </div>
                          )}

                          {profitRate !== null && (
                            <div>
                              <div className="text-gray-500">수익률</div>
                              <div className={`font-medium ${profitRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {profitRate >= 0 ? '+' : ''}{profitRate.toFixed(2)}%
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* 메모 */}
                    {transaction.memo && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <div className="text-sm text-gray-600">
                          <strong>메모:</strong> {transaction.memo}
                        </div>
                      </div>
                    )}

                    {/* 메타데이터 */}
                    {transaction.metadata && Object.keys(transaction.metadata).length > 0 && (
                      <div className="mt-2">
                        <div className="flex flex-wrap gap-2">
                          {transaction.metadata.exchangeName && (
                            <Badge variant="outline" className="text-xs">
                              {transaction.metadata.exchangeName}
                            </Badge>
                          )}
                          {transaction.metadata.p2pPlatform && (
                            <Badge variant="outline" className="text-xs">
                              {transaction.metadata.p2pPlatform}
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 수익 표시 */}
                  {transaction.profit !== 0 && (
                    <div className="text-right">
                      <div className="text-sm text-gray-500">수익</div>
                      <div className={`font-bold ${transaction.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {transaction.profit >= 0 ? '+' : ''}₩{formatInputWithCommas(transaction.profit.toString())}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* 통계 요약 */}
      {filteredTransactions.length > 0 && (
        <Card className="p-4">
          <h3 className="font-semibold mb-3">거래 요약</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-gray-500">총 거래 수</div>
              <div className="font-bold text-lg">{filteredTransactions.length}</div>
            </div>
            
            <div>
              <div className="text-gray-500">총 거래량</div>
              <div className="font-bold text-lg">
                ₩{formatInputWithCommas(
                  filteredTransactions
                    .reduce((sum, t) => sum + t.fromAmount, 0)
                    .toString()
                )}
              </div>
            </div>
            
            <div>
              <div className="text-gray-500">총 수수료</div>
              <div className="font-bold text-lg text-red-600">
                ₩{formatInputWithCommas(
                  filteredTransactions
                    .reduce((sum, t) => sum + (t.fees || 0), 0)
                    .toString()
                )}
              </div>
            </div>
            
            <div>
              <div className="text-gray-500">총 수익</div>
              <div className={`font-bold text-lg ${
                filteredTransactions.reduce((sum, t) => sum + t.profit, 0) >= 0 
                  ? 'text-green-600' 
                  : 'text-red-600'
              }`}>
                {filteredTransactions.reduce((sum, t) => sum + t.profit, 0) >= 0 ? '+' : ''}
                ₩{formatInputWithCommas(
                  filteredTransactions
                    .reduce((sum, t) => sum + t.profit, 0)
                    .toString()
                )}
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}