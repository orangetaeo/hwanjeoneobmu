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
      const matchesSearch = 
        transaction.fromAssetName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.toAssetName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (transaction.memo && transaction.memo.toLowerCase().includes(searchTerm.toLowerCase()));
      
      // Date filter
      const transactionDate = new Date(transaction.timestamp);
      const matchesDateRange = 
        (!startDate || transactionDate >= new Date(startDate)) &&
        (!endDate || transactionDate <= new Date(endDate + 'T23:59:59'));
      
      // Type filter - 거래 방식과 증감 유형 모두 고려
      let isDecrease = false;
      let isIncrease = false;
      let isExchange = (transaction.type as string) === 'cash_exchange';
      let isDirect = transaction.type === 'cash_change';
      
      if ((transaction.type as string) === 'cash_exchange') {
        // cash_exchange 비즈니스 로직:
        // fromAssetName = 고객이 준 돈 = 사업자가 받음(증가)
        // toAssetName = 고객이 받은 돈 = 사업자가 줌(감소)
        if (transaction.fromAssetName === cashAsset.name) {
          isIncrease = true; // 고객이 준 돈을 사업자가 받음 (증가)
        } else if (transaction.toAssetName === cashAsset.name) {
          isDecrease = true; // 고객이 받은 돈을 사업자가 줌 (감소)
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
        (typeFilter === 'decrease' && isDecrease) ||
        (typeFilter === 'direct' && isDirect) ||
        (typeFilter === 'exchange' && isExchange);
      

      
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
          // 현금 증감 금액 계산 - cash_exchange와 cash_change 모두 고려
          if ((a.type as string) === 'cash_exchange') {
            aValue = a.fromAssetName === cashAsset.name ? parseFloat(a.fromAmount.toString()) : parseFloat(a.toAmount.toString());
          } else {
            aValue = a.fromAssetName?.includes(cashAsset.currency) ? parseFloat(a.fromAmount.toString()) : parseFloat(a.toAmount.toString());
          }
          
          if ((b.type as string) === 'cash_exchange') {
            bValue = b.fromAssetName === cashAsset.name ? parseFloat(b.fromAmount.toString()) : parseFloat(b.toAmount.toString());
          } else {
            bValue = b.fromAssetName?.includes(cashAsset.currency) ? parseFloat(b.fromAmount.toString()) : parseFloat(b.toAmount.toString());
          }
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
      // cash_exchange 비즈니스 로직: 고객이 KRW를 주고 VND를 받아감
      // fromAssetName = 고객이 준 돈 = 사업자가 받음(증가)
      // toAssetName = 고객이 받은 돈 = 사업자가 줌(감소)
      if (transaction.fromAssetName === cashAsset.name) {
        isIncrease = true; // 고객이 준 돈을 사업자가 받음 (증가)
        amount = parseFloat(transaction.fromAmount.toString());
      } else if (transaction.toAssetName === cashAsset.name) {
        isDecrease = true; // 고객이 받은 돈을 사업자가 줌 (감소)
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
      const metadata = transaction.metadata as any;
      
      // 현재 현금 자산의 증감에 따른 상세한 설명
      if (transaction.fromAssetName === cashAsset.name) {
        // 고객이 준 돈 = 사업자가 받은 돈 (증가)
        const toCurrency = metadata?.toCurrency || '외화';
        return `${toCurrency} 환전 수령 → ${cashAsset.currency} 현금 증가`;
      } else if (transaction.toAssetName === cashAsset.name) {
        // 고객이 받은 돈 = 사업자가 준 돈 (감소)
        const fromCurrency = metadata?.fromCurrency || '외화';
        return `${fromCurrency} 환전 지급 → ${cashAsset.currency} 현금 감소`;
      }
      
      return '현금 환전';
    } else {
      // cash_change 타입: 직접 증감
      if (isDecrease) {
        return `직접 증감 → ${cashAsset.currency} 현금 감소`;
      } else {
        return `직접 증감 → ${cashAsset.currency} 현금 증가`;
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-4xl max-h-[95vh] w-[98vw] sm:w-[95vw] sm:max-w-4xl overflow-hidden flex flex-col p-2 sm:p-4 md:p-6"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {/* 고정 헤더 영역 - 모바일 최적화 */}
        <div className="flex-shrink-0 space-y-2 sm:space-y-4 pb-3 sm:pb-4 border-b">
          <DialogHeader>
            <DialogTitle 
              ref={titleRef}
              tabIndex={-1}
              className="text-lg sm:text-xl font-bold outline-none text-center sm:text-left"
            >
              {cashAsset.currency} 현금 증감 내역
            </DialogTitle>
          </DialogHeader>

          {/* 현금 자산 정보 - 모바일 최적화 */}
          <Card className="p-2 sm:p-3 md:p-4 bg-gray-50">
            <div className="flex flex-col gap-1 sm:gap-2">
              <div className="text-center sm:text-left">
                <h3 className="font-semibold text-sm sm:text-base md:text-lg">{cashAsset.name}</h3>
                <p className="text-xs text-gray-600">현재 잔액</p>
              </div>
              <div className="text-center sm:text-right">
                <p className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 break-words">
                  {formatCurrency(cashAsset.balance, cashAsset.currency)} {cashAsset.currency}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* 스크롤 가능한 내용 영역 */}
        <div className="flex-1 overflow-y-auto mt-2 sm:mt-4">
          <div className="space-y-3 sm:space-y-4">

          {/* 검색 및 필터 - 모바일 최적화 */}
          <Card className="p-2 sm:p-3 md:p-4">
            <div className="space-y-2 sm:space-y-3">
              {/* 검색어 입력 */}
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

                {/* 타입 필터 및 정렬 - 모바일 최적화 */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <Select value={typeFilter} onValueChange={(value: 'all' | 'increase' | 'decrease' | 'direct' | 'exchange') => setTypeFilter(value)}>
                    <SelectTrigger className="w-full sm:flex-1 h-9 text-xs sm:text-sm">
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
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center">
            <h3 className="text-sm sm:text-lg font-semibold text-gray-900 text-center sm:text-left">최근 거래 내역</h3>
            <div className="flex items-center justify-center sm:justify-end gap-2">
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

          {/* 거래 내역 리스트 - 모바일 최적화 */}
          <div className="space-y-2 sm:space-y-3">
            {filteredTransactions.length === 0 ? (
              <Card className="p-6 sm:p-8 text-center">
                <div className="text-gray-500">
                  <Clock size={32} className="mx-auto mb-3 opacity-50 sm:w-12 sm:h-12" />
                  <p className="text-sm sm:text-lg font-medium mb-1 sm:mb-2">거래 내역이 없습니다</p>
                  <p className="text-xs sm:text-sm">현금 증감 거래를 추가해보세요.</p>
                </div>
              </Card>
            ) : (
              filteredTransactions.map((transaction) => {
                const { amount, isDecrease } = getTransactionAmount(transaction);
                
                return (
                  <Card 
                    key={transaction.id} 
                    className="p-3 sm:p-4 hover:shadow-md transition-all duration-200 cursor-pointer active:scale-[0.98] sm:active:scale-100"
                    onClick={() => {
                      setSelectedTransaction(transaction);
                      setIsCashDetailModalOpen(true);
                    }}
                    data-testid={`transaction-${transaction.id}`}
                  >
                    <div className="flex justify-between items-start gap-2 sm:gap-3">
                      <div className="flex items-start space-x-2 flex-1 min-w-0">
                        <div className="mt-0.5 flex-shrink-0">
                          {getTransactionIcon(isDecrease)}
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