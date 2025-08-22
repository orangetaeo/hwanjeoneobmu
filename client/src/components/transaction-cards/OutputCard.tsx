import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Trash2, ChevronDown, ChevronUp, ArrowDownRight, Percent } from 'lucide-react';
import { TransactionOutput } from '@/types/cardTransaction';
import { useTransactionCalculations } from '@/hooks/useTransactionCalculations';

interface OutputCardProps {
  output: TransactionOutput;
  assets: any[];
  totalInputAmount: number;
  onUpdate: (updates: Partial<TransactionOutput>) => void;
  onRemove: () => void;
  exchangeRates: any[];
}

export default function OutputCard({ 
  output, 
  assets, 
  totalInputAmount,
  onUpdate, 
  onRemove, 
  exchangeRates 
}: OutputCardProps) {
  const [showDenominations, setShowDenominations] = useState(false);
  const { CURRENCY_DENOMINATIONS, calculateVndDistribution } = useTransactionCalculations(exchangeRates);

  // 비율 변경 시 금액 자동 계산 (무한 루프 방지)
  useEffect(() => {
    if (totalInputAmount > 0) {
      const calculatedAmount = (totalInputAmount * output.percentage) / 100;
      if (Math.abs(output.amount - calculatedAmount) > 0.01) { // 오차 범위 내에서만 업데이트
        onUpdate({ amount: calculatedAmount });
      }
    }
  }, [output.percentage, totalInputAmount]);

  // 통화별 계좌 목록 필터링
  const getAccountsByCurrency = (currency: string) => {
    return assets.filter(asset => 
      asset.type === 'account' && asset.currency === currency
    );
  };

  // 비율 변경
  const handlePercentageChange = (percentage: number) => {
    const calculatedAmount = (totalInputAmount * percentage) / 100;
    onUpdate({ 
      percentage, 
      amount: calculatedAmount 
    });
  };

  // 계좌 선택 시
  const handleAccountSelect = (accountId: string) => {
    const selectedAccount = assets.find(asset => asset.id === accountId);
    if (selectedAccount) {
      onUpdate({
        accountId,
        accountName: selectedAccount.displayName || selectedAccount.name,
        currency: selectedAccount.currency as any
      });
    }
  };

  // VND 자동 분배
  const handleAutoDistributeVnd = () => {
    if (output.currency === 'VND' && output.amount > 0) {
      const distribution = calculateVndDistribution(output.amount);
      onUpdate({ denominations: distribution });
    }
  };

  // 권종별 수량 업데이트
  const updateDenomination = (denomination: string, count: string) => {
    console.log('updateDenomination called:', { denomination, count, outputId: output.id });
    
    const updatedDenominations = {
      ...output.denominations,
      [denomination]: parseInt(count) || 0
    };
    
    // 0인 권종은 제거
    if (updatedDenominations[denomination] === 0) {
      delete updatedDenominations[denomination];
    }

    // 권종별 총액 계산
    let totalAmount = 0;
    Object.entries(updatedDenominations).forEach(([denom, count]) => {
      const denomValue = parseInt(denom.replace(/,/g, ''));
      totalAmount += denomValue * count;
      console.log('Calculating denomination:', { denom, count, denomValue, totalAmount });
    });

    console.log('Final totalAmount:', totalAmount);
    
    // 총액을 숫자로 업데이트
    onUpdate({ 
      denominations: updatedDenominations, 
      amount: totalAmount 
    });
  };

  return (
    <Card className="border-l-4 border-l-green-500">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="text-sm font-medium flex items-center">
            <ArrowDownRight className="mr-2" size={16} />
            출금 #{output.id.split('_')[1]}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="text-red-500 hover:text-red-700"
            data-testid={`button-remove-output-${output.id}`}
          >
            <Trash2 size={16} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 출금 비율 설정 */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <Label>출금 비율</Label>
            <Badge variant="outline" className="flex items-center">
              <Percent className="mr-1" size={12} />
              {output.percentage}%
            </Badge>
          </div>
          <Slider
            value={[output.percentage]}
            onValueChange={([value]) => handlePercentageChange(value)}
            max={100}
            step={1}
            className="w-full"
            data-testid={`slider-percentage-${output.id}`}
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>

        {/* 출금 타입 선택 */}
        <div className="space-y-2">
          <Label>출금 방식</Label>
          <Select 
            value={output.type} 
            onValueChange={(value: 'cash' | 'account') => onUpdate({ type: value })}
          >
            <SelectTrigger data-testid={`select-output-type-${output.id}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cash">현금</SelectItem>
              <SelectItem value="account">계좌</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 통화 선택 */}
        <div className="space-y-2">
          <Label>통화</Label>
          <Select 
            value={output.currency} 
            onValueChange={(value: 'KRW' | 'VND' | 'USD') => onUpdate({ currency: value })}
          >
            <SelectTrigger data-testid={`select-output-currency-${output.id}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="KRW">KRW (원)</SelectItem>
              <SelectItem value="VND">VND (동)</SelectItem>
              <SelectItem value="USD">USD (달러)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 계좌 선택 (계좌 타입인 경우) */}
        {output.type === 'account' && (
          <div className="space-y-2">
            <Label>계좌 선택</Label>
            <Select value={output.accountId || ''} onValueChange={handleAccountSelect}>
              <SelectTrigger data-testid={`select-output-account-${output.id}`}>
                <SelectValue placeholder="계좌를 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {getAccountsByCurrency(output.currency).map(account => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.displayName || account.name} - {account.currency} {account.balance?.toLocaleString()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* 현금 출금의 경우 권종 분배 */}
        {output.type === 'cash' && (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label>권종별 분배</Label>
              <div className="flex space-x-2">
                {output.currency === 'VND' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAutoDistributeVnd}
                    data-testid={`button-auto-distribute-${output.id}`}
                  >
                    자동 분배
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDenominations(!showDenominations)}
                  data-testid={`button-toggle-denominations-${output.id}`}
                >
                  {showDenominations ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </Button>
              </div>
            </div>
            
            {showDenominations && (
              <div className="grid grid-cols-2 gap-2">
                {CURRENCY_DENOMINATIONS[output.currency]?.map(denom => (
                  <div key={denom.value} className="space-y-1">
                    <Label className="text-xs">{denom.label}</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={output.denominations?.[denom.value] || ''}
                      onChange={(e) => {
                        console.log('Input onChange triggered:', { denom: denom.value, value: e.target.value });
                        updateDenomination(denom.value, e.target.value);
                      }}
                      data-testid={`input-output-denomination-${output.id}-${denom.value}`}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 출금 금액 표시 */}
        <div className="pt-2 border-t">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">출금 금액:</span>
            <Badge variant="secondary" className="text-sm">
              {console.log('Rendering amount:', output.amount, 'type:', typeof output.amount)}
              {Number(output.amount || 0).toLocaleString()} {output.currency}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}