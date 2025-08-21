import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowUpDown, Calendar, Filter, Search, TrendingDown, TrendingUp, Clock, ArrowRight } from 'lucide-react';
import { Transaction } from '@/types';
import { formatInputWithCommas, formatTransactionAmount, formatExchangeRateByTransaction, formatExchangeRate } from '@/utils/helpers';
import TransactionDetailModal from './TransactionDetailModal';

interface TransactionHistoryProps {
  transactions: Transaction[];
  onTransactionClick?: (transaction: Transaction) => void;
}

export default function TransactionHistory({ transactions, onTransactionClick }: TransactionHistoryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('timestamp');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const handleTransactionClick = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setIsDetailModalOpen(true);
    if (onTransactionClick) {
      onTransactionClick(transaction);
    }
  };

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
      case 'exchange':
        return '환전';
      case 'transfer':
        return '이체';
      default:
        return type;
    }
  };

  // 메인 거래 타입 확인 함수
  const isMainTransaction = (type: string) => {
    const mainTransactionTypes = [
      'cash_exchange',
      'cash_to_krw_account', 
      'cash_to_vnd_account',
      'vnd_account_to_krw_account',
      'krw_account_to_vnd_account',
      'bank_to_exchange',
      'exchange_purchase',
      'exchange_transfer',
      'p2p_trade'
    ];
    return mainTransactionTypes.includes(type);
  };

  // 메인 거래만 필터링
  const mainTransactions = transactions.filter(transaction => isMainTransaction(transaction.type));

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

  const filteredTransactions = mainTransactions
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
          aValue = parseFloat(a.fromAmount.toString());
          bValue = parseFloat(b.fromAmount.toString());
          break;
        case 'toAmount':
          aValue = parseFloat(a.toAmount.toString());
          bValue = parseFloat(b.toAmount.toString());
          break;
        case 'profit':
          aValue = parseFloat((a.profit || '0').toString());
          bValue = parseFloat((b.profit || '0').toString());
          break;
        default:
          return 0;
      }
      
      return sortOrder === 'asc' ? (aValue < bValue ? -1 : 1) : (bValue < aValue ? -1 : 1);
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
    <div className="space-y-6 overflow-x-hidden">
      {/* 필터 및 검색 - 모바일 최적화 */}
      <Card className="p-3 sm:p-4">
        <div className="space-y-3 sm:space-y-0 sm:flex sm:gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <Input
                placeholder="거래내역 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-9 sm:h-10 text-sm sm:text-base"
              />
            </div>
          </div>
          
          <div className="flex gap-2 overflow-x-auto">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-28 sm:w-40 h-9 sm:h-10 text-xs sm:text-sm flex-shrink-0">
                <Filter size={14} className="mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 거래</SelectItem>
                <SelectItem value="bank_to_exchange">은행→거래소</SelectItem>
                <SelectItem value="exchange_purchase">코인 구매</SelectItem>
                <SelectItem value="exchange_transfer">거래소 이동</SelectItem>
                <SelectItem value="p2p_trade">P2P 거래</SelectItem>
                <SelectItem value="cash_change">현금 증감</SelectItem>
                <SelectItem value="exchange">환전</SelectItem>
                <SelectItem value="transfer">이체</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-20 sm:w-32 h-9 sm:h-10 text-xs sm:text-sm flex-shrink-0">
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
              className="px-2 sm:px-3 h-9 sm:h-10 flex-shrink-0"
            >
              <ArrowUpDown size={14} />
            </Button>
          </div>
        </div>
      </Card>

      {/* 거래 내역 리스트 - 모바일 최적화 */}
      <div className="space-y-2 sm:space-y-4">
        {filteredTransactions.length === 0 ? (
          <Card className="p-6 sm:p-8 text-center">
            <div className="text-gray-500">
              <Clock size={36} className="sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 opacity-50" />
              <p className="text-base sm:text-lg font-medium mb-2">거래 내역이 없습니다</p>
              <p className="text-xs sm:text-sm">새로운 거래를 추가해보세요.</p>
            </div>
          </Card>
        ) : (
          filteredTransactions.map((transaction) => {
            const { date, time } = formatDateTime(transaction.timestamp);
            const profitRate = calculateProfitRate(transaction);
            
            return (
              <Card 
                key={transaction.id} 
                className="p-2 sm:p-4 hover:shadow-md transition-shadow cursor-pointer overflow-hidden"
                onClick={() => handleTransactionClick(transaction)}
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    {/* 헤더 정보 - 모바일 최적화 */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                      <Badge className={`${getTransactionTypeColor(transaction.type)} flex items-center gap-1 text-xs sm:text-sm px-2 py-1 whitespace-nowrap`}>
                        {getTransactionIcon(transaction.type)}
                        <span>{getTransactionTypeText(transaction.type)}</span>
                      </Badge>
                      
                      <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                        {date} {time}
                      </div>
                    </div>

                    {/* 모바일 최적화된 자산명 표시 */}
                    <div className="flex items-center gap-2 mb-2 overflow-hidden">
                      <span className="font-medium text-sm sm:text-base truncate">{transaction.fromAssetName}</span>
                      <ArrowRight size={14} className="text-gray-400 flex-shrink-0" />
                      <span className="font-medium text-sm sm:text-base truncate">{transaction.toAssetName}</span>
                    </div>

                    {/* 모바일 최적화된 거래 정보 */}
                    <div className="space-y-2 sm:space-y-0">
                      {/* 모바일: 세로 배치, 데스크톱: 그리드 */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 text-sm">
                        <div className="flex justify-between sm:block">
                          <span className="text-gray-500 text-xs sm:text-sm">보낸 금액</span>
                          <span className="font-medium text-sm sm:text-base">
                            {formatTransactionAmount(transaction.fromAmount, transaction.fromCurrency, transaction.fromAssetName)}
                          </span>
                        </div>
                        
                        <div className="flex justify-between sm:block">
                          <span className="text-gray-500 text-xs sm:text-sm">받은 금액</span>
                          <span className="font-medium text-sm sm:text-base">
                            {formatTransactionAmount(transaction.toAmount, transaction.toCurrency, transaction.toAssetName)}
                          </span>
                        </div>
                        
                        <div className="flex justify-between sm:block">
                          <span className="text-gray-500 text-xs sm:text-sm">환율/가격</span>
                          <span className="font-medium text-sm sm:text-base">
                            {formatExchangeRateByTransaction(transaction.rate, transaction.fromCurrency, transaction.toCurrency, transaction.type)}
                          </span>
                        </div>

                        {transaction.fees !== undefined && transaction.fees > 0 && (
                          <div className="flex justify-between sm:block">
                            <span className="text-gray-500 text-xs sm:text-sm">수수료</span>
                            <span className="font-medium text-red-600 text-sm sm:text-base">
                              {formatTransactionAmount(transaction.fees, transaction.fromCurrency, transaction.fromAssetName)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 고급 거래 정보 - 모바일 최적화 */}
                    {(transaction.customPrice || transaction.marketPrice) && (
                      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4 text-sm">
                          {transaction.marketPrice && (
                            <div className="flex justify-between sm:block">
                              <span className="text-gray-500 text-xs sm:text-sm">시장 가격</span>
                              <span className="font-medium text-sm sm:text-base">
                                ₩{formatExchangeRate(transaction.marketPrice, transaction.fromCurrency, 'KRW')}
                              </span>
                            </div>
                          )}
                          
                          {transaction.customPrice && (
                            <div className="flex justify-between sm:block">
                              <span className="text-gray-500 text-xs sm:text-sm">거래 가격</span>
                              <span className="font-medium text-sm sm:text-base">
                                ₩{formatExchangeRate(transaction.customPrice, transaction.fromCurrency, 'KRW')}
                              </span>
                            </div>
                          )}

                          {profitRate !== null && (
                            <div className="flex justify-between sm:block">
                              <span className="text-gray-500 text-xs sm:text-sm mb-1">수익률</span>
                              <span className={`
                                font-bold text-sm sm:text-base px-2 py-1 rounded-md border
                                ${profitRate >= 0 
                                  ? 'text-green-700 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-900/30 dark:border-green-600' 
                                  : 'text-red-700 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-900/30 dark:border-red-600'
                                }
                              `}>
                                {profitRate >= 0 ? '+' : ''}{profitRate.toFixed(2)}%
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* 메모 - 모바일 최적화 */}
                    {transaction.memo && (
                      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                        <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                          <strong>메모:</strong> {transaction.memo}
                        </div>
                      </div>
                    )}

                    {/* 메타데이터 - 모바일 최적화 */}
                    {transaction.metadata && Object.keys(transaction.metadata).length > 0 && (
                      <div className="mt-2">
                        <div className="flex flex-wrap gap-1 sm:gap-2">
                          {transaction.metadata.exchangeName && (
                            <Badge variant="outline" className="text-xs h-6 px-2">
                              {transaction.metadata.exchangeName}
                            </Badge>
                          )}
                          {transaction.metadata.p2pPlatform && (
                            <Badge variant="outline" className="text-xs h-6 px-2">
                              {transaction.metadata.p2pPlatform}
                            </Badge>
                          )}
                          {transaction.metadata.networkType && (
                            <Badge variant="outline" className="text-xs h-6 px-2">
                              {transaction.metadata.networkType === 'TRC20' ? 'TRC20 (무료)' : 
                               transaction.metadata.networkType === 'ERC20' ? 'ERC20' :
                               transaction.metadata.networkType === 'BSC' ? 'BSC' : transaction.metadata.networkType}
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 수익 표시 - 눈에 띄는 디자인 */}
                  {transaction.profit !== 0 && (
                    <div className="text-left sm:text-right flex-shrink-0">
                      <div className="text-xs sm:text-sm text-gray-500 mb-1">수익</div>
                      <div className={`
                        font-bold text-lg sm:text-xl px-3 py-2 rounded-lg border-2 shadow-md
                        ${transaction.profit >= 0 
                          ? 'text-green-700 bg-green-50 border-green-200 shadow-green-100 dark:text-green-400 dark:bg-green-900/30 dark:border-green-600 dark:shadow-green-900/20' 
                          : 'text-red-700 bg-red-50 border-red-200 shadow-red-100 dark:text-red-400 dark:bg-red-900/30 dark:border-red-600 dark:shadow-red-900/20'
                        }
                      `}>
                        {transaction.profit >= 0 ? '+' : ''}₩{formatInputWithCommas(Math.round(transaction.profit).toString())}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* 통계 요약 - 모바일 최적화 */}
      {filteredTransactions.length > 0 && (
        <Card className="p-3 sm:p-4">
          <h3 className="font-semibold mb-2 sm:mb-3 text-sm sm:text-base">거래 요약</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 text-xs sm:text-sm">
            <div>
              <div className="text-gray-500 text-xs sm:text-sm">총 거래 수</div>
              <div className="font-bold text-sm sm:text-lg">{filteredTransactions.length}</div>
            </div>
            
            <div>
              <div className="text-gray-500 text-xs sm:text-sm">총 거래량</div>
              <div className="font-bold text-sm sm:text-lg">
                ₩{formatInputWithCommas(
                  filteredTransactions
                    .reduce((sum, t) => sum + t.fromAmount, 0)
                    .toString()
                )}
              </div>
            </div>
            
            <div>
              <div className="text-gray-500 text-xs sm:text-sm">총 수수료</div>
              <div className="font-bold text-sm sm:text-lg text-red-600">
                ₩{formatInputWithCommas(
                  filteredTransactions
                    .reduce((sum, t) => sum + (t.fees || 0), 0)
                    .toString()
                )}
              </div>
            </div>
            
            <div>
              <div className="text-gray-500 text-xs sm:text-sm mb-2">총 수익</div>
              <div className={`
                font-bold text-lg sm:text-xl px-4 py-3 rounded-xl border-2 shadow-lg text-center
                ${filteredTransactions.reduce((sum, t) => sum + t.profit, 0) >= 0 
                  ? 'text-green-800 bg-gradient-to-r from-green-50 to-green-100 border-green-300 shadow-green-200 dark:text-green-300 dark:from-green-900/40 dark:to-green-800/40 dark:border-green-500 dark:shadow-green-900/30' 
                  : 'text-red-800 bg-gradient-to-r from-red-50 to-red-100 border-red-300 shadow-red-200 dark:text-red-300 dark:from-red-900/40 dark:to-red-800/40 dark:border-red-500 dark:shadow-red-900/30'
                }
              `}>
                {filteredTransactions.reduce((sum, t) => sum + t.profit, 0) >= 0 ? '+' : ''}
                ₩{formatInputWithCommas(
                  Math.round(filteredTransactions
                    .reduce((sum, t) => sum + t.profit, 0))
                    .toString()
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* 거래 상세 모달 */}
      <TransactionDetailModal
        transaction={selectedTransaction}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
      />
    </div>
  );
}