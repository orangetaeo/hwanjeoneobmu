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
  const [typeFilter, setTypeFilter] = useState<'all' | 'increase' | 'decrease' | 'direct' | 'exchange'>('all');
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
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm || 
        transaction.customerName?.toLowerCase().includes(searchLower) ||
        transaction.memo?.toLowerCase().includes(searchLower);

      // Date filter
      const transactionDate = new Date(transaction.timestamp);
      const matchesDateRange = (!startDate || transactionDate >= new Date(startDate)) &&
                             (!endDate || transactionDate <= new Date(endDate + 'T23:59:59'));

      // Type filter
      if (typeFilter === 'all') return matchesSearch && matchesDateRange;
      
      const isDecrease = isDecreaseTransaction(transaction);
      const isDirect = transaction.type === 'cash_change';
      const isExchange = (transaction.type as string) === 'cash_exchange';
      
      const matchesType = typeFilter === 'increase' ? !isDecrease :
                         typeFilter === 'decrease' ? isDecrease :
                         typeFilter === 'direct' ? isDirect :
                         typeFilter === 'exchange' ? isExchange : true;

      return matchesSearch && matchesDateRange && matchesType;
    })
    .sort((a, b) => {
      if (sortBy === 'timestamp') {
        const dateA = new Date(a.timestamp).getTime();
        const dateB = new Date(b.timestamp).getTime();
        return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
      } else if (sortBy === 'amount') {
        const amountA = getTransactionAmount(a);
        const amountB = getTransactionAmount(b);
        return sortOrder === 'desc' ? amountB - amountA : amountA - amountB;
      }
      return 0;
    });

  const displayedTransactions = filteredTransactions.slice(0, displayCount);

  // 거래 타입별 금액 계산
  function getTransactionAmount(transaction: Transaction): number {
    if (transaction.type === 'cash_change') {
      return Math.abs(transaction.amount || 0);
    } else if ((transaction.type as string) === 'cash_exchange') {
      // 환전 거래의 경우 해당 현금 자산과 연관된 금액 반환
      if (transaction.fromAssetName === cashAsset.name || 
          (transaction.fromAssetName?.includes(cashAsset.currency) && transaction.fromAssetName?.includes('현금'))) {
        return transaction.fromAmount || 0;
      } else if (transaction.toAssetName === cashAsset.name || 
                (transaction.toAssetName?.includes(cashAsset.currency) && transaction.toAssetName?.includes('현금'))) {
        return transaction.toAmount || 0;
      }
    }
    return 0;
  }

  // 거래가 감소인지 확인
  function isDecreaseTransaction(transaction: Transaction): boolean {
    if (transaction.type === 'cash_change') {
      return (transaction.amount || 0) < 0;
    } else if ((transaction.type as string) === 'cash_exchange') {
      // 환전 거래에서 현재 자산이 출금(from) 자산인 경우 감소
      return transaction.fromAssetName === cashAsset.name || 
             (transaction.fromAssetName?.includes(cashAsset.currency) && transaction.fromAssetName?.includes('현금'));
    }
    return false;
  }

  // 거래 타입 텍스트 생성
  function getTransactionTypeText(transaction: Transaction, isDecrease: boolean): string {
    if (transaction.type === 'cash_change') {
      return isDecrease ? `${cashAsset.currency} 현금 직접 감소` : `${cashAsset.currency} 현금 직접 증가`;
    } else if ((transaction.type as string) === 'cash_exchange') {
      if (isDecrease) {
        return `${cashAsset.currency} 현금 환전 지급`;
      } else {
        return `${cashAsset.currency} 현금 환전 수령`;
      }
    }
    return '기타 거래';
  }

  const handleTransactionClick = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setIsCashDetailModalOpen(true);
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[98vw] sm:w-[95vw] md:w-[90vw] lg:w-[85vw] xl:w-[80vw] max-w-6xl h-[95vh] flex flex-col p-3 sm:p-4 md:p-6">
        {/* 고정 헤더 */}
        <div className="flex-shrink-0">
          <DialogHeader>
            <DialogTitle 
              ref={titleRef}
              tabIndex={-1}
              className="text-lg sm:text-xl font-bold outline-none text-center sm:text-left"
            >
              {cashAsset.currency} 현금 증감 내역
            </DialogTitle>
          </DialogHeader>

          {/* 현금 자산 정보 - PC/모바일 통합 */}
          <Card className="p-2 sm:p-3 md:p-4 bg-gray-50 mt-2 sm:mt-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-sm sm:text-base md:text-lg">{cashAsset.name}</h3>
                <p className="text-xs text-gray-600">현재 잔액</p>
              </div>
              <div className="text-right">
                <p className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 break-words">
                  {formatCurrency(cashAsset.balance, cashAsset.currency)} {cashAsset.currency}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* 검색 및 필터 - 고정 영역 */}
        <div className="flex-shrink-0 mt-2 sm:mt-4">
          <Card className="p-2 sm:p-3 md:p-4">
            <div className="space-y-2 sm:space-y-3">
              {/* 필터 및 정렬 - 모바일 최적화 */}
              <div className="space-y-2 sm:space-y-3">
                {/* 날짜 필터 - 모바일에서 세로 배치 */}
                <div className="space-y-2">
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <Calendar size={14} />
                    <span>기간</span>
                  </div>
                  <div className="flex gap-2 items-center">
                    <Input
                      type="date"
                      placeholder="시작일"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="flex-1 text-xs sm:text-sm h-9 sm:h-9"
                      data-testid="input-start-date"
                    />
                    <span className="text-gray-500 text-sm px-1">~</span>
                    <Input
                      type="date"
                      placeholder="종료일"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="flex-1 text-xs sm:text-sm h-9 sm:h-9"
                      data-testid="input-end-date"
                    />
                  </div>
                </div>

                {/* 타입 필터 및 정렬 - 모바일 한 줄 배치 */}
                <div className="flex gap-2">
                  <Select value={typeFilter} onValueChange={(value: 'all' | 'increase' | 'decrease' | 'direct' | 'exchange') => setTypeFilter(value)}>
                    <SelectTrigger className="w-1/3 h-9 text-xs sm:text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체</SelectItem>
                      <SelectItem value="increase">증가</SelectItem>
                      <SelectItem value="decrease">감소</SelectItem>
                      <SelectItem value="direct">직접 증감</SelectItem>
                      <SelectItem value="exchange">환전 거래</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="flex-1 h-9 text-xs sm:text-sm">
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
                    className="px-2 sm:px-3 h-9"
                  >
                    <ArrowUpDown size={14} />
                  </Button>
                </div>

                {/* 검색어 입력 - 하단 이동 */}
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                    <Input
                      placeholder="거래내역 검색"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8 sm:pl-9 text-sm h-10 sm:h-9"
                      data-testid="input-search-transactions"
                      autoFocus={false}
                    />
                  </div>
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
        </div>

        {/* 스크롤 가능한 내용 영역 */}
        <div className="flex-1 overflow-y-auto mt-2 sm:mt-4">
          <div className="space-y-3 sm:space-y-4">

            {/* 거래 내역 헤더 - PC/모바일 통합 한 줄 배치 */}
            <div className="flex justify-between items-center">
              <h3 className="text-sm sm:text-lg font-semibold text-gray-900">최근 거래 내역</h3>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600">표시:</span>
                <Select value={displayCount.toString()} onValueChange={(value) => setDisplayCount(parseInt(value))}>
                  <SelectTrigger className="w-16 sm:w-20 text-xs sm:text-sm h-8 sm:h-9">
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

            {/* 거래내역 리스트 - 모바일 최적화 */}
            <div className="space-y-2 sm:space-y-3">
              {displayedTransactions.length === 0 ? (
                <Card className="p-3 sm:p-4 text-center">
                  <p className="text-gray-500 text-sm">해당 조건의 거래내역이 없습니다.</p>
                </Card>
              ) : (
                displayedTransactions.map((transaction) => {
                  const isDecrease = isDecreaseTransaction(transaction);
                  const amount = getTransactionAmount(transaction);
                  
                  return (
                    <Card 
                      key={transaction.id} 
                      className="p-2 sm:p-3 md:p-4 cursor-pointer hover:bg-gray-50 transition-colors active:scale-98 active:bg-gray-100"
                      onClick={() => handleTransactionClick(transaction)}
                      data-testid={`card-transaction-${transaction.id}`}
                    >
                      <div className="flex items-start justify-between gap-2 sm:gap-3">
                        <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0">
                          <div className={`p-1.5 sm:p-2 rounded-full flex-shrink-0 ${
                            isDecrease ? 'bg-red-100' : 'bg-green-100'
                          }`}>
                            {isDecrease ? (
                              <TrendingDown className="w-3 h-3 sm:w-4 sm:h-4 text-red-600" />
                            ) : (
                              <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
                            )}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-xs sm:text-sm md:text-base text-gray-900 mb-1 leading-tight">
                              {getTransactionTypeText(transaction, isDecrease)}
                            </h4>
                            <p className="text-xs text-gray-600 mb-1">
                              {new Date(transaction.timestamp).toLocaleString('ko-KR', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                            {transaction.memo && (
                              <p className="text-xs text-gray-500 line-clamp-2 leading-tight">
                                메모: {transaction.memo}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        <div className="text-right flex-shrink-0 min-w-0">
                          <p className={`text-sm sm:text-base md:text-lg font-bold break-words ${
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
        cashAsset={cashAsset}
      />
    </Dialog>
  );
}