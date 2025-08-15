import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRightLeft, Search, Filter, Calendar } from 'lucide-react';
import { Transaction } from '@/types';
import { formatNumberWithCommas } from '@/utils/helpers';

interface TransactionHistoryProps {
  transactions: Transaction[];
}

export default function TransactionHistory({ transactions }: TransactionHistoryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('date');

  const filteredAndSortedTransactions = useMemo(() => {
    let filtered = transactions.filter(transaction => {
      const matchesSearch = 
        transaction.fromAssetName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.toAssetName.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesFilter = filterType === 'all' || transaction.type === filterType;
      
      return matchesSearch && matchesFilter;
    });

    // Sort transactions
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.timestamp?.toDate() || 0).getTime() - new Date(a.timestamp?.toDate() || 0).getTime();
        case 'amount':
          return b.toAmount - a.toAmount;
        case 'profit':
          return (b.profit || 0) - (a.profit || 0);
        default:
          return 0;
      }
    });

    return filtered;
  }, [transactions, searchTerm, filterType, sortBy]);

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h2 className="text-xl font-bold text-gray-900">거래 내역</h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="자산명 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full sm:w-64"
                data-testid="input-search-transactions"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full sm:w-40" data-testid="select-filter-type">
                <Filter size={16} className="mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 거래</SelectItem>
                <SelectItem value="exchange">환전</SelectItem>
                <SelectItem value="transfer">이체</SelectItem>
                <SelectItem value="deposit">입금</SelectItem>
                <SelectItem value="withdrawal">출금</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full sm:w-40" data-testid="select-sort-by">
                <Calendar size={16} className="mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">날짜순</SelectItem>
                <SelectItem value="amount">금액순</SelectItem>
                <SelectItem value="profit">수익순</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-4">
          {filteredAndSortedTransactions.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <ArrowRightLeft size={48} className="mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">거래 내역이 없습니다</p>
              <p className="text-sm">새로운 거래를 시작해보세요</p>
            </div>
          ) : (
            filteredAndSortedTransactions.map((transaction) => (
              <Card key={transaction.id} className="p-4 bg-gray-50">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-white rounded-full shadow-sm">
                      <ArrowRightLeft size={20} className="text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-gray-900">{transaction.fromAssetName}</span>
                        <ArrowRightLeft size={16} className="text-gray-400" />
                        <span className="font-semibold text-gray-900">{transaction.toAssetName}</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {transaction.timestamp?.toDate().toLocaleString('ko-KR', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                      <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                        <span>거래유형: {transaction.type === 'exchange' ? '환전' : '이체'}</span>
                        <span>환율: {formatNumberWithCommas(transaction.rate)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="grid grid-cols-2 gap-4 md:block">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">보낸 금액</p>
                        <p className="font-mono text-red-600">
                          -{formatNumberWithCommas(transaction.fromAmount)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">받은 금액</p>
                        <p className="font-mono text-green-600">
                          +{formatNumberWithCommas(transaction.toAmount)}
                        </p>
                      </div>
                    </div>
                    {transaction.profit !== undefined && transaction.profit !== 0 && (
                      <div className="mt-2">
                        <p className="text-xs text-gray-500">수익</p>
                        <p className={`font-mono text-sm ${transaction.profit > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {transaction.profit > 0 ? '+' : ''}{formatNumberWithCommas(transaction.profit)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

        {filteredAndSortedTransactions.length > 0 && (
          <div className="flex justify-center mt-6">
            <Button variant="outline" data-testid="button-load-more">
              더 보기
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}