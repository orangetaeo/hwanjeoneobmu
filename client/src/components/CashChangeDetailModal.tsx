import { Transaction } from '@shared/schema';
import { CashAsset } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Banknote } from 'lucide-react';
import { formatInputWithCommas } from '@/utils/helpers';

interface CashChangeDetailModalProps {
  transaction: Transaction | null;
  isOpen: boolean;
  onClose: () => void;
  cashAsset: CashAsset;
}

export default function CashChangeDetailModal({ transaction, isOpen, onClose, cashAsset }: CashChangeDetailModalProps) {
  if (!transaction || (transaction.type !== 'cash_change' && (transaction.type as string) !== 'cash_exchange')) return null;

  const metadata = transaction.metadata as any;
  let denominationChanges = metadata?.denominationChanges || {};
  
  // cash_exchange 타입의 경우 현재 보고 있는 통화에 맞는 권종별 변화 데이터만 생성
  if ((transaction.type as string) === 'cash_exchange') {
    const denominationAmounts = metadata?.denominationAmounts || {};
    const vndBreakdown = metadata?.vndBreakdown || {};
    
    // 현재 보고 있는 현금 자산의 통화에 따라 해당 권종만 표시
    if (cashAsset.currency === 'KRW') {
      // KRW 현금 상세 페이지: denominationAmounts (KRW 증가)
      Object.entries(denominationAmounts).forEach(([denom, amount]) => {
        if (amount && parseFloat(amount as string) > 0) {
          denominationChanges[denom] = parseInt(amount as string); // KRW 증가
        }
      });
    } else if (cashAsset.currency === 'VND') {
      // VND 현금 상세 페이지: 거래 유형에 따라 증가/감소 판단
      const isVndIncrease = transaction.fromAssetName === cashAsset.name; // VND가 fromAsset이면 증가
      
      if (isVndIncrease) {
        // VND 증가인 경우: denominationAmounts 사용 (고객이 준 VND)
        Object.entries(denominationAmounts).forEach(([denom, amount]) => {
          if (amount && parseFloat(amount as string) > 0) {
            denominationChanges[denom] = parseInt(amount as string); // VND 증가
          }
        });
      } else {
        // VND 감소인 경우: vndBreakdown 사용
        if (Object.keys(vndBreakdown).length === 0) {
          // vndBreakdown이 없는 경우, VND 거래 금액으로 권종 자동 계산
          const vndAmount = parseFloat(transaction.toAmount.toString());
          // 50만동권과 10만동권으로 분해
          const count500k = Math.floor(vndAmount / 500000);
          if (count500k > 0) {
            denominationChanges['500000'] = -count500k;
          }
          const remaining = vndAmount % 500000;
          const count100k = Math.floor(remaining / 100000);
          if (count100k > 0) {
            denominationChanges['100000'] = -count100k;
          }
        } else {
          Object.entries(vndBreakdown).forEach(([denom, amount]) => {
            if (amount && (amount as number) > 0) {
              denominationChanges[denom] = -(amount as number); // VND 감소
            }
          });
        }
      }
    } else if (cashAsset.currency === 'USD') {
      // USD 현금 상세 페이지: usdBreakdown (USD 감소)
      const usdBreakdown = metadata?.usdBreakdown || {};
      Object.entries(usdBreakdown).forEach(([denom, amount]) => {
        if (amount && (amount as number) > 0) {
          denominationChanges[denom] = -(amount as number); // USD 감소
        }
      });
    }
  }
  
  // 통화별 지폐 단위 정의
  const getCurrencyDenominations = (currency: string) => {
    switch (currency) {
      case 'KRW':
        return ['50000', '10000', '5000', '1000'];
      case 'USD':
        return ['100', '50', '20', '10', '5', '2', '1'];
      case 'VND':
        return ['500000', '200000', '100000', '50000', '20000', '10000', '5000', '2000', '1000'];
      case 'MIXED': // 혼합된 경우 모든 권종
        return ['500000', '200000', '100000', '50000', '20000', '10000', '5000', '2000', '1000'];
      default:
        return [];
    }
  };

  // 통화 결정 - 전달받은 cashAsset의 통화 사용
  const getCurrency = () => {
    return cashAsset.currency; // 현재 보고 있는 현금 자산의 통화
  };

  const currency = getCurrency();
  const denominations = getCurrencyDenominations(currency);

  // 통화 기호
  const getCurrencySymbol = (currency: string) => {
    switch (currency) {
      case 'KRW': return '원';
      case 'USD': return '달러';
      case 'VND': return '동';
      default: return '';
    }
  };

  // 지폐 이름 - 혼합된 경우 권종 값으로 통화 판단
  const getDenominationName = (denomination: string, currency: string) => {
    const num = parseInt(denomination);
    
    if (currency === 'MIXED') {
      // 권종 값으로 통화 판단
      if (['1000', '5000', '10000', '50000'].includes(denomination)) {
        return `${num.toLocaleString()}원권`;
      } else {
        return `${num.toLocaleString()}동권`;
      }
    }
    
    switch (currency) {
      case 'KRW':
        return `${num.toLocaleString()}원권`;
      case 'USD':
        return `${num}달러권`;
      case 'VND':
        return `${num.toLocaleString()}동권`;
      default:
        return `${num}`;
    }
  };

  // 증가/감소 계산
  const getChangeInfo = () => {
    const increases: Array<{ denomination: string; change: number; value: number }> = [];
    const decreases: Array<{ denomination: string; change: number; value: number }> = [];

    denominations.forEach(denomination => {
      // 콤마가 있는 형식과 없는 형식 모두 확인
      const commaFormat = parseInt(denomination).toLocaleString();
      const noCommaFormat = denomination;
      
      const change = denominationChanges[commaFormat] || denominationChanges[noCommaFormat] || 0;
      
      if (change > 0) {
        increases.push({
          denomination,
          change,
          value: change * parseInt(denomination)
        });
      } else if (change < 0) {
        decreases.push({
          denomination,
          change: Math.abs(change),
          value: Math.abs(change) * parseInt(denomination)
        });
      }
    });

    return { increases, decreases };
  };

  const { increases, decreases } = getChangeInfo();
  const totalIncrease = increases.reduce((sum, item) => sum + item.value, 0);
  const totalDecrease = decreases.reduce((sum, item) => sum + item.value, 0);
  const netChange = totalIncrease - totalDecrease;

  const formatDateTime = (timestamp: string | Date) => {
    const date = new Date(timestamp);
    return {
      date: date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      time: date.toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit'
      })
    };
  };

  const { date, time } = formatDateTime(transaction.timestamp);

  // 환전 타입 텍스트 결정 - 현재 보고 있는 현금 자산에 맞춘 표기
  const getExchangeTypeText = (transaction: Transaction, currency: string) => {
    if ((transaction.type as string) !== 'cash_exchange') return '';
    
    const metadata = transaction.metadata as any;
    
    // 거래 유형에 따른 정확한 표기
    if (currency === 'KRW') {
      // KRW 현금 상세 페이지 - 사업자가 KRW를 받음 (수령)
      return 'KRW 현금 환전 수령';
    } else if (currency === 'VND') {
      // VND 현금 상세 페이지 - 거래 유형에 따라 수령/지급 판단
      const isVndIncrease = transaction.fromAssetName === cashAsset.name;
      
      if (isVndIncrease) {
        // VND→USD 환전: 사업자가 VND를 받음 (수령)
        const toCurrency = metadata?.toCurrency || 'USD';
        return `${toCurrency} 현금 지급 환전→ VND 수량 증가`;
      } else {
        // KRW→VND 환전: 사업자가 VND를 줌 (지급)
        return 'VND 현금 환전 지급';
      }
    } else if (currency === 'USD') {
      // USD 현금 상세 페이지 - 사업자가 USD를 줌 (지급)
      return 'USD 현금 환전 지급';
    }
    
    return '현금환전';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[95vh] w-[98vw] sm:w-[95vw] overflow-hidden flex flex-col p-3 sm:p-4 md:p-6">
        {/* 고정 헤더 - 모바일 최적화 */}
        <DialogHeader className="flex-shrink-0 pb-3 sm:pb-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Banknote size={18} className="sm:w-5 sm:h-5" />
            <span className="leading-tight">
              {(transaction.type as string) === 'cash_exchange' ? '현금 환전 상세 내역' : '현금 증감 상세 내역'}
            </span>
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm leading-tight">
            {(transaction.type as string) === 'cash_exchange' 
              ? `${getExchangeTypeText(transaction, currency)} - ${date} ${time}` 
              : `${transaction.toAssetName} - ${date} ${time}`}
          </DialogDescription>
        </DialogHeader>

        {/* 스크롤 가능한 내용 영역 - 모바일 최적화 */}
        <div className="flex-1 overflow-y-auto mt-3 sm:mt-4">
          <div className="space-y-3 sm:space-y-6">
          {/* 전체 요약 - 모바일 최적화 */}
          <Card className="p-3 sm:p-4">
            <div className="flex items-center justify-between gap-2 mb-3 sm:mb-4">
              <h3 className="text-base sm:text-lg font-semibold">변동 요약</h3>
              <Badge variant={netChange >= 0 ? "default" : "destructive"} className="flex items-center gap-1 w-fit">
                {netChange >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                <span className="text-xs sm:text-sm">{netChange >= 0 ? '증가' : '감소'}</span>
              </Badge>
            </div>
            
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
              <div className="p-2 sm:p-3 bg-green-50 rounded-lg text-center">
                <div className="text-xs sm:text-sm text-green-600 sm:mb-1">총 증가</div>
                <div className="font-bold text-green-800 text-xs sm:text-base break-words">
                  +{formatInputWithCommas(totalIncrease.toString())} {getCurrencySymbol(currency)}
                </div>
              </div>
              
              <div className="p-2 sm:p-3 bg-red-50 rounded-lg text-center">
                <div className="text-xs sm:text-sm text-red-600 sm:mb-1">총 감소</div>
                <div className="font-bold text-red-800 text-xs sm:text-base break-words">
                  -{formatInputWithCommas(totalDecrease.toString())} {getCurrencySymbol(currency)}
                </div>
              </div>
              
              <div className="p-2 sm:p-3 bg-blue-50 rounded-lg text-center">
                <div className="text-xs sm:text-sm text-blue-600 sm:mb-1">순 변동</div>
                <div className={`font-bold text-xs sm:text-base break-words ${netChange >= 0 ? 'text-blue-800' : 'text-red-800'}`}>
                  {netChange >= 0 ? '+' : ''}{formatInputWithCommas(netChange.toString())} {getCurrencySymbol(currency)}
                </div>
              </div>
            </div>
          </Card>

          {/* 증가한 지폐 - 모바일 최적화 */}
          {increases.length > 0 && (
            <Card className="p-3 sm:p-4">
              <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2 text-green-700 justify-center sm:justify-start">
                <TrendingUp size={16} className="sm:w-5 sm:h-5" />
                증가한 지폐
              </h3>
              <div className="space-y-2 sm:space-y-3">
                {increases.map((item) => (
                  <div key={item.denomination} className="flex items-center justify-between p-2 sm:p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                      <Banknote size={14} className="text-green-600 flex-shrink-0 sm:w-4 sm:h-4" />
                      <span className="font-medium text-sm sm:text-base truncate">{getDenominationName(item.denomination, currency)}</span>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="font-bold text-green-800 text-sm sm:text-base">+{item.change}장</div>
                      <div className="text-xs sm:text-sm text-green-600 break-words">
                        +{formatInputWithCommas(item.value.toString())} {getCurrencySymbol(currency)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* 감소한 지폐 - 모바일 최적화 */}
          {decreases.length > 0 && (
            <Card className="p-3 sm:p-4">
              <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2 text-red-700 justify-center sm:justify-start">
                <TrendingDown size={16} className="sm:w-5 sm:h-5" />
                감소한 지폐
              </h3>
              <div className="space-y-2 sm:space-y-3">
                {decreases.map((item) => (
                  <div key={item.denomination} className="flex items-center justify-between p-2 sm:p-3 bg-red-50 rounded-lg">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                      <Banknote size={14} className="text-red-600 flex-shrink-0 sm:w-4 sm:h-4" />
                      <span className="font-medium text-sm sm:text-base truncate">{getDenominationName(item.denomination, currency)}</span>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="font-bold text-red-800 text-sm sm:text-base">-{item.change}장</div>
                      <div className="text-xs sm:text-sm text-red-600 break-words">
                        -{formatInputWithCommas(item.value.toString())} {getCurrencySymbol(currency)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* 메모 - 모바일 최적화 */}
          {transaction.memo && (
            <Card className="p-3 sm:p-4">
              <h3 className="text-base sm:text-lg font-semibold mb-2 text-center sm:text-left">메모</h3>
              <p className="text-gray-700 text-sm sm:text-base leading-relaxed break-words">{transaction.memo}</p>
            </Card>
          )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}