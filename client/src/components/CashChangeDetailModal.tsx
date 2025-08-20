import { Transaction, CashAsset } from '@/types';
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
      // KRW 현금 상세 페이지에서 환전 거래 처리
      const isKrwIncrease = transaction.fromAssetName === cashAsset.name; // KRW가 fromAsset이면 증가
      
      if (isKrwIncrease) {
        // KRW→다른통화: denominationAmounts는 KRW 권종 (KRW 증가)
        Object.entries(denominationAmounts).forEach(([denom, amount]) => {
          if (amount && parseFloat(amount as string) > 0) {
            denominationChanges[denom] = parseInt(amount as string); // KRW 증가
          }
        });
      } else {
        // 다른통화→KRW: KRW 금액을 권종으로 분해해서 표시 (KRW 감소)
        const krwAmount = parseFloat(transaction.toAmount.toString());
        
        // 104,000원 예시: 50,000원×2 + 4,000원
        // 4,000원은 1,000원×4로 분해
        const count50k = Math.floor(krwAmount / 50000);
        const remaining50k = krwAmount % 50000;
        
        const count10k = Math.floor(remaining50k / 10000);
        const remaining10k = remaining50k % 10000;
        
        const count5k = Math.floor(remaining10k / 5000);
        const remaining5k = remaining10k % 5000;
        
        const count1k = Math.floor(remaining5k / 1000);
        
        if (count50k > 0) denominationChanges['50000'] = -count50k;
        if (count10k > 0) denominationChanges['10000'] = -count10k;
        if (count5k > 0) denominationChanges['5000'] = -count5k;
        if (count1k > 0) denominationChanges['1000'] = -count1k;
      }
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
        // VND 감소인 경우: 실제 VND 분배 계산
        const vndAmount = parseFloat(transaction.toAmount.toString());
        // VND 분배 계산 (1,798,000 VND)
        let remaining = vndAmount;
        const vndDenoms = [500000, 200000, 100000, 50000, 20000, 10000, 5000, 1000];
        
        vndDenoms.forEach(denom => {
          if (remaining >= denom) {
            const count = Math.floor(remaining / denom);
            if (count > 0) {
              denominationChanges[denom.toString()] = -count;
              remaining -= count * denom;
            }
          }
        });
      }
    } else if (cashAsset.currency === 'USD') {
      // USD 현금 상세 페이지: denominationAmounts가 USD 권종이므로 항상 증가로 처리
      // 실제로는 VND→USD 환전에서 USD를 받은 것 (사업자 관점에서 USD 증가)
      Object.entries(denominationAmounts).forEach(([denom, amount]) => {
        if (amount && parseFloat(amount as string) > 0) {
          // 20_10 권종 처리
          if (denom === '20_10') {
            denominationChanges['20/10'] = parseInt(amount as string); // 표시용으로 20/10 사용
          } else {
            denominationChanges[denom] = parseInt(amount as string); // USD 증가
          }
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
    // USD 특수 케이스 처리
    if (denomination === '20/10') {
      return '20/10달러권';
    }
    
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

    // denominationChanges에 저장된 모든 키를 순회
    Object.entries(denominationChanges).forEach(([denom, change]) => {
      const changeNum = typeof change === 'number' ? change : parseInt(change as string) || 0;
      
      if (changeNum && Math.abs(changeNum) > 0) {
        // 권종별 값 계산
        let denomValue = 0;
        if (denom === '20/10') {
          denomValue = 20; // 20/10달러는 20달러 가치로 계산
        } else {
          denomValue = parseInt(denom.replace(/,/g, '')); // 콤마 제거 후 숫자 변환
        }
        
        if (changeNum > 0) {
          increases.push({
            denomination: denom,
            change: changeNum,
            value: changeNum * denomValue
          });
        } else {
          decreases.push({
            denomination: denom,
            change: Math.abs(changeNum),
            value: Math.abs(changeNum) * denomValue
          });
        }
      }
    });

    // VND의 경우 고액권부터 정렬
    if (cashAsset.currency === 'VND') {
      increases.sort((a, b) => {
        const aValue = parseInt(a.denomination.replace(/,/g, ''));
        const bValue = parseInt(b.denomination.replace(/,/g, ''));
        return bValue - aValue; // 내림차순 정렬 (고액권 먼저)
      });
      
      decreases.sort((a, b) => {
        const aValue = parseInt(a.denomination.replace(/,/g, ''));
        const bValue = parseInt(b.denomination.replace(/,/g, ''));
        return bValue - aValue; // 내림차순 정렬 (고액권 먼저)
      });
    }

    return { increases, decreases };
  };

  const { increases, decreases } = getChangeInfo();
  const totalIncrease = increases.reduce((sum, item) => sum + item.value, 0);
  const totalDecrease = decreases.reduce((sum, item) => sum + item.value, 0);
  const netChange = totalIncrease - totalDecrease; // 증가 - 감소 = 순변동

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
                  {netChange >= 0 ? '+' : '-'}{formatInputWithCommas(Math.abs(netChange).toString())} {getCurrencySymbol(currency)}
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