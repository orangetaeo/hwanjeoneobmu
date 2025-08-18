import React, { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, Filter, ArrowUpDown, X, TrendingUp, TrendingDown, Clock, Calendar } from 'lucide-react';
import { Transaction, CashAsset } from '@/types';
import CashChangeDetailModal from '@/components/CashChangeDetailModal';
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
  const [typeFilter, setTypeFilter] = useState<'all' | 'increase' | 'decrease'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [displayCount, setDisplayCount] = useState<number>(5);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isCashDetailModalOpen, setIsCashDetailModalOpen] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);

  // 모달이 열릴 때 포커스 관리
  useEffect(() => {
    if (isOpen) {
      // 모든 input 요소에서 포커스 제거
      const inputs = document.querySelectorAll('input');
      inputs.forEach(input => input.blur());
      
      // 제목에 포커스 주기
      setTimeout(() => {
        titleRef.current?.focus();
      }, 150);
    }
  }, [isOpen]);

  // 해당 현금 자산과 관련된 거래만 필터링
  const cashTransactions = transactions.filter(transaction => {
    // cash_change 또는 cash_exchange 타입 거래 필터링
    const isCashTransaction = transaction.type === 'cash_change' || (transaction.type as string) === 'cash_exchange';
    
    // 현금 자산명이 정확히 일치하거나 통화가 일치하는 경우
    const fromAssetMatches = transaction.fromAssetName === cashAsset.name || 
                           (transaction.fromAssetName?.includes(cashAsset.currency) && 
                           transaction.fromAssetName?.includes('현금'));
    const toAssetMatches = transaction.toAssetName === cashAsset.name || 
                         (transaction.toAssetName?.includes(cashAsset.currency) && 
                         transaction.toAssetName?.includes('현금'));
    
    // 메타데이터에 해당 자산 ID가 있는지 확인
    const hasMatchingAssetId = transaction.metadata?.assetId === cashAsset.id;
    
    return isCashTransaction && (fromAssetMatches || toAssetMatches || hasMatchingAssetId);
  });

  const filteredTransactions = cashTransactions
    .filter(transaction => {
      // Search filter
      const matchesSearch = 
        transaction.fromAssetName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.toAssetName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (transaction.memo && transaction.memo.toLowerCase().includes(searchTerm.toLowerCase()));
      
      // Date filter
      const transactionDate = new Date(transaction.timestamp);
      const matchesDateRange = 
        (!startDate || transactionDate >= new Date(startDate)) &&
        (!endDate || transactionDate <= new Date(endDate + 'T23:59:59'));
      
      // Type filter (increase/decrease) - cash_exchange 타입도 고려
      let isDecrease = false;
      let isIncrease = false;
      
      if ((transaction.type as string) === 'cash_exchange') {
        // cash_exchange의 경우 fromAsset이면 증가(고객이 준 돈), toAsset이면 감소(고객에게 준 돈)
        if (transaction.fromAssetName === cashAsset.name) {
          isIncrease = true; // 고객이 준 돈
        } else if (transaction.toAssetName === cashAsset.name) {
          isDecrease = true; // 고객에게 준 돈
        }
      } else {
        // cash_change의 경우 기존 로직 유지
        isDecrease = transaction.fromAssetName?.includes('현금') && 
                    !transaction.fromAssetName?.includes('증가');
        isIncrease = !isDecrease;
      }
      
      const matchesType = 
        typeFilter === 'all' ||
        (typeFilter === 'increase' && isIncrease) ||
        (typeFilter === 'decrease' && isDecrease);
      
      return matchesSearch && matchesDateRange && matchesType;
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
    })
    .slice(0, displayCount); // 선택한 개수만 표시

  const getTransactionAmount = (transaction: Transaction) => {
    let isDecrease = false;
    let isIncrease = false;
    let amount = 0;
    
    if ((transaction.type as string) === 'cash_exchange') {
      // cash_exchange의 경우 fromAsset이면 증가, toAsset이면 감소
      if (transaction.fromAssetName === cashAsset.name) {
        isIncrease = true;
        amount = parseFloat(transaction.fromAmount.toString());
      } else if (transaction.toAssetName === cashAsset.name) {
        isDecrease = true;
        amount = parseFloat(transaction.toAmount.toString());
      }
    } else {
      // cash_change의 경우 기존 로직 유지
      isDecrease = transaction.fromAssetName?.includes('현금') && 
                  !transaction.fromAssetName?.includes('증가');
      isIncrease = transaction.toAssetName?.includes('현금') && 
                  !transaction.toAssetName?.includes('감소');
      
      amount = isIncrease ? parseFloat(transaction.toAmount.toString()) : parseFloat(transaction.fromAmount.toString());
    }
    
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
    if ((transaction.type as string) === 'cash_exchange') {
      // 비즈니스 규칙에 따른 정확한 표기
      // KRW→VND 거래에서: KRW 증가 = "KRW 현금 환전 수령", VND 증가 = "VND 현금 환전 지급"
      
      // 현재 자산이 KRW인지 VND인지 확인하여 정확한 표기
      if (cashAsset.currency === 'KRW') {
        // KRW 자산의 경우
        if (transaction.toAssetName === cashAsset.name) {
          return 'KRW 현금 환전 수령'; // KRW 증가는 수령
        } else {
          return 'KRW 현금 환전 지급'; // KRW 감소는 지급
        }
      } else if (cashAsset.currency === 'VND') {
        // VND 자산의 경우
        if (transaction.toAssetName === cashAsset.name) {
          return 'VND 현금 환전 지급'; // VND 증가는 지급
        } else {
          return 'VND 현금 환전 수령'; // VND 감소는 수령
        }
      }
      
      return '현금 환전';
    } else {
      if (isDecrease) {
        return '현금 감소';
      } else {
        return '현금 증가';
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-4xl max-h-[90vh] w-[95vw] sm:max-w-4xl overflow-y-auto p-3 sm:p-6"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle 
            ref={titleRef}
            tabIndex={-1}
            className="text-xl font-bold outline-none"
          >
            {cashAsset.currency} 현금 증감 내역
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 현금 자산 정보 - 모바일 최적화 */}
          <Card className="p-3 sm:p-4 bg-gray-50">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
              <div>
                <h3 className="font-semibold text-base sm:text-lg">{cashAsset.name}</h3>
                <p className="text-xs sm:text-sm text-gray-600">현재 잔액</p>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-xl sm:text-2xl font-bold text-gray-900 break-all">
                  {formatCurrency(cashAsset.balance, cashAsset.currency)} {cashAsset.currency}
                </p>
              </div>
            </div>
          </Card>

          {/* 검색 및 필터 - 모바일 최적화 */}
          <Card className="p-3 sm:p-4">
            <div className="space-y-3 sm:space-y-4">
              {/* 검색어 입력 */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
                  <Input
                    placeholder="거래내역 검색 (메모, 거래명)"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 text-sm h-10 sm:h-9"
                    data-testid="input-search-transactions"
                    autoFocus={false}
                  />
                </div>
              </div>

              {/* 필터 및 정렬 - 모바일 최적화 */}
              <div className="space-y-3">
                {/* 날짜 필터 */}
                <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <Calendar size={14} />
                    <span>기간</span>
                  </div>
                  <div className="flex gap-2 items-center flex-1">
                    <Input
                      type="date"
                      placeholder="시작일"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="flex-1 min-w-0 text-sm h-10 sm:h-9"
                      data-testid="input-start-date"
                    />
                    <span className="text-gray-500 text-sm">~</span>
                    <Input
                      type="date"
                      placeholder="종료일"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="flex-1 min-w-0 text-sm h-10 sm:h-9"
                      data-testid="input-end-date"
                    />
                  </div>
                </div>

                {/* 타입 필터 및 정렬 */}
                <div className="flex gap-2">
                  <Select value={typeFilter} onValueChange={(value: 'all' | 'increase' | 'decrease') => setTypeFilter(value)}>
                    <SelectTrigger className="flex-1 h-10 sm:h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체</SelectItem>
                      <SelectItem value="increase">증가</SelectItem>
                      <SelectItem value="decrease">감소</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="flex-1 h-10 sm:h-9 text-sm">
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
                    data-testid="button-sort-order"
                    className="px-3 h-10 sm:h-9"
                  >
                    <ArrowUpDown size={14} />
                  </Button>
                </div>
              </div>

              {/* 필터 초기화 버튼 */}
              {(searchTerm || startDate || endDate || typeFilter !== 'all') && (
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchTerm('');
                      setStartDate('');
                      setEndDate('');
                      setTypeFilter('all');
                    }}
                    data-testid="button-clear-filters"
                  >
                    <X size={16} className="mr-2" />
                    필터 초기화
                  </Button>
                </div>
              )}
            </div>
          </Card>

          {/* 거래 내역 헤더 - 모바일 최적화 */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">최근 거래 내역</h3>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm text-gray-600">표시 개수:</span>
              <Select value={displayCount.toString()} onValueChange={(value) => setDisplayCount(parseInt(value))}>
                <SelectTrigger className="w-20 sm:w-24 text-sm h-10 sm:h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5개</SelectItem>
                  <SelectItem value="10">10개</SelectItem>
                  <SelectItem value="15">15개</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

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
                  <Card 
                    key={transaction.id} 
                    className="p-3 sm:p-4 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => {
                      setSelectedTransaction(transaction);
                      setIsCashDetailModalOpen(true);
                    }}
                    data-testid={`transaction-${transaction.id}`}
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex items-start space-x-2 sm:space-x-3 flex-1 min-w-0">
                        <div className="mt-0.5 sm:mt-1 flex-shrink-0">
                          {getTransactionIcon(isDecrease)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="font-medium text-sm sm:text-base text-gray-900 truncate">
                              {getTransactionTypeText(transaction, isDecrease)}
                            </h4>
                          </div>
                          <p className="text-xs sm:text-sm text-gray-600 mb-1">
                            {new Date(transaction.timestamp).toLocaleString('ko-KR', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                          {transaction.memo && (
                            <p className="text-xs sm:text-sm text-gray-500 break-words">
                              메모: {transaction.memo}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-right flex-shrink-0">
                        <p className={`text-sm sm:text-lg font-bold break-all ${
                          isDecrease ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {isDecrease ? '-' : '+'}
                          {formatCurrency(amount, cashAsset.currency)}
                        </p>
                        <p className="text-xs text-gray-500">{cashAsset.currency}</p>
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      </DialogContent>
      
      {/* Cash Change Detail Modal */}
      <CashChangeDetailModal
        transaction={selectedTransaction as any}
        isOpen={isCashDetailModalOpen}
        onClose={() => {
          setIsCashDetailModalOpen(false);
          setSelectedTransaction(null);
        }}
      />
    </Dialog>
  );
}