import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, Filter, ArrowUpDown, X, TrendingUp, TrendingDown, Clock } from 'lucide-react';
import { Transaction, CashAsset } from '@/types';
import { formatCurrency } from '@/utils/helpers';

interface CashTransactionHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  cashAsset: CashAsset;
  transactions: Transaction[];
}

export default function CashTransactionHistory({ 
  isOpen, 
  onClose, 
  cashAsset, 
  transactions 
}: CashTransactionHistoryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('timestamp');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // 해당 현금 자산과 관련된 거래만 필터링
  const cashTransactions = transactions.filter(transaction => {
    const fromAssetMatches = transaction.fromAssetName?.includes(cashAsset.currency) && 
                           transaction.fromAssetName?.includes('현금');
    const toAssetMatches = transaction.toAssetName?.includes(cashAsset.currency) && 
                         transaction.toAssetName?.includes('현금');
    return fromAssetMatches || toAssetMatches;
  });

  const filteredTransactions = cashTransactions
    .filter(transaction => {
      const matchesSearch = 
        transaction.fromAssetName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.toAssetName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (transaction.memo && transaction.memo.toLowerCase().includes(searchTerm.toLowerCase()));
      
      return matchesSearch;
    })
    .sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'timestamp':
          aValue = new Date(a.timestamp).getTime();
          bValue = new Date(b.timestamp).getTime();
          break;
        case 'amount':
          // 현금 증감 금액 계산 (fromAmount 또는 toAmount 중 해당하는 것)
          aValue = a.fromAssetName?.includes(cashAsset.currency) ? a.fromAmount : a.toAmount;
          bValue = b.fromAssetName?.includes(cashAsset.currency) ? b.fromAmount : b.toAmount;
          break;
        default:
          return 0;
      }
      
      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    });

  const getTransactionAmount = (transaction: Transaction) => {
    // 현금 자산이 from인지 to인지에 따라 증가/감소 판단
    const isDecrease = transaction.fromAssetName?.includes(cashAsset.currency) && 
                      transaction.fromAssetName?.includes('현금');
    const amount = isDecrease ? transaction.fromAmount : transaction.toAmount;
    return { amount, isDecrease };
  };

  const getTransactionIcon = (isDecrease: boolean) => {
    return isDecrease ? (
      <TrendingDown className="text-red-500" size={16} />
    ) : (
      <TrendingUp className="text-green-500" size={16} />
    );
  };

  const getTransactionTypeText = (transaction: Transaction, isDecrease: boolean) => {
    if (isDecrease) {
      return '현금 감소';
    } else {
      return '현금 증가';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex justify-between items-center">
            <DialogTitle className="text-xl font-bold">
              {cashAsset.currency} 현금 증감 내역
            </DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X size={20} />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* 현금 자산 정보 */}
          <Card className="p-4 bg-gray-50">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-lg">{cashAsset.name}</h3>
                <p className="text-sm text-gray-600">현재 잔액</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(cashAsset.balance, cashAsset.currency)} {cashAsset.currency}
                </p>
              </div>
            </div>
          </Card>

          {/* 검색 및 정렬 */}
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
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="timestamp">시간순</SelectItem>
                    <SelectItem value="amount">금액순</SelectItem>
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
          <div className="space-y-3">
            {filteredTransactions.length === 0 ? (
              <Card className="p-8 text-center">
                <div className="text-gray-500">
                  <Clock size={48} className="mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">거래 내역이 없습니다</p>
                  <p className="text-sm">현금 증감 거래를 추가해보세요.</p>
                </div>
              </Card>
            ) : (
              filteredTransactions.map((transaction) => {
                const { amount, isDecrease } = getTransactionAmount(transaction);
                
                return (
                  <Card key={transaction.id} className="p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                      <div className="flex items-start space-x-3">
                        <div className="mt-1">
                          {getTransactionIcon(isDecrease)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="font-medium text-gray-900">
                              {getTransactionTypeText(transaction, isDecrease)}
                            </h4>
                          </div>
                          <p className="text-sm text-gray-600 mb-1">
                            {new Date(transaction.timestamp).toLocaleString('ko-KR')}
                          </p>
                          {transaction.memo && (
                            <p className="text-sm text-gray-500">
                              메모: {transaction.memo}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className={`text-lg font-bold ${
                          isDecrease ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {isDecrease ? '-' : '+'}
                          {formatCurrency(amount, cashAsset.currency)} {cashAsset.currency}
                        </p>
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}