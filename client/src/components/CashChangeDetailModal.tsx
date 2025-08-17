import { Transaction } from '@/types';
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
}

export default function CashChangeDetailModal({ transaction, isOpen, onClose }: CashChangeDetailModalProps) {
  if (!transaction || transaction.type !== 'cash_change') return null;

  const metadata = transaction.metadata as any;
  const denominationChanges = metadata?.denominationChanges || {};
  
  // 디버깅을 위한 로그
  console.log('CashChangeDetailModal - denominationChanges:', denominationChanges);
  console.log('CashChangeDetailModal - metadata:', metadata);
  
  // 통화별 지폐 단위 정의
  const getCurrencyDenominations = (currency: string) => {
    switch (currency) {
      case 'KRW':
        return ['50000', '10000', '5000', '1000'];
      case 'USD':
        return ['100', '50', '20', '10', '5', '2', '1'];
      case 'VND':
        return ['500000', '200000', '100000', '50000', '20000', '10000'];
      default:
        return [];
    }
  };

  // 통화 결정 (자산 이름에서 추출)
  const getCurrency = () => {
    if (transaction.toAssetName.includes('KRW') || transaction.toAssetName.includes('원')) return 'KRW';
    if (transaction.toAssetName.includes('USD') || transaction.toAssetName.includes('달러')) return 'USD';
    if (transaction.toAssetName.includes('VND') || transaction.toAssetName.includes('동')) return 'VND';
    return 'KRW'; // 기본값
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

  // 지폐 이름
  const getDenominationName = (denomination: string, currency: string) => {
    const num = parseInt(denomination);
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
      
      console.log(`Checking denomination ${denomination}: commaFormat=${commaFormat}, noCommaFormat=${noCommaFormat}, change=${change}`);
      
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Banknote size={20} />
            현금 증감 상세 내역
          </DialogTitle>
          <DialogDescription>
            {transaction.toAssetName} - {date} {time}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* 전체 요약 */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">변동 요약</h3>
              <Badge variant={netChange >= 0 ? "default" : "destructive"} className="flex items-center gap-1">
                {netChange >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                {netChange >= 0 ? '증가' : '감소'}
              </Badge>
            </div>
            
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 bg-green-50 rounded-lg">
                <div className="text-sm text-green-600 mb-1">총 증가</div>
                <div className="font-bold text-green-800">
                  +{formatInputWithCommas(totalIncrease.toString())} {getCurrencySymbol(currency)}
                </div>
              </div>
              
              <div className="p-3 bg-red-50 rounded-lg">
                <div className="text-sm text-red-600 mb-1">총 감소</div>
                <div className="font-bold text-red-800">
                  -{formatInputWithCommas(totalDecrease.toString())} {getCurrencySymbol(currency)}
                </div>
              </div>
              
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="text-sm text-blue-600 mb-1">순 변동</div>
                <div className={`font-bold ${netChange >= 0 ? 'text-blue-800' : 'text-red-800'}`}>
                  {netChange >= 0 ? '+' : ''}{formatInputWithCommas(netChange.toString())} {getCurrencySymbol(currency)}
                </div>
              </div>
            </div>
          </Card>

          {/* 증가한 지폐 */}
          {increases.length > 0 && (
            <Card className="p-4">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-green-700">
                <TrendingUp size={18} />
                증가한 지폐
              </h3>
              <div className="space-y-3">
                {increases.map((item) => (
                  <div key={item.denomination} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Banknote size={16} className="text-green-600" />
                      <span className="font-medium">{getDenominationName(item.denomination, currency)}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-green-800">+{item.change}장</div>
                      <div className="text-sm text-green-600">
                        +{formatInputWithCommas(item.value.toString())} {getCurrencySymbol(currency)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* 감소한 지폐 */}
          {decreases.length > 0 && (
            <Card className="p-4">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-red-700">
                <TrendingDown size={18} />
                감소한 지폐
              </h3>
              <div className="space-y-3">
                {decreases.map((item) => (
                  <div key={item.denomination} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Banknote size={16} className="text-red-600" />
                      <span className="font-medium">{getDenominationName(item.denomination, currency)}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-red-800">-{item.change}장</div>
                      <div className="text-sm text-red-600">
                        -{formatInputWithCommas(item.value.toString())} {getCurrencySymbol(currency)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* 메모 */}
          {transaction.memo && (
            <Card className="p-4">
              <h3 className="text-lg font-semibold mb-2">메모</h3>
              <p className="text-gray-700">{transaction.memo}</p>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}