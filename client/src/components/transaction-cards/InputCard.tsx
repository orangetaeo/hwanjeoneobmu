import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Trash2, ChevronDown, ChevronUp, Calculator, Banknote } from 'lucide-react';
import { TransactionInput } from '@/types/cardTransaction';
import { useTransactionCalculations } from '@/hooks/useTransactionCalculations';

interface InputCardProps {
  input: TransactionInput;
  assets: any[];
  onUpdate: (updates: Partial<TransactionInput>) => void;
  onRemove: () => void;
  exchangeRates: any[];
}

export default function InputCard({ 
  input, 
  assets, 
  onUpdate, 
  onRemove, 
  exchangeRates 
}: InputCardProps) {
  const [showDenominations, setShowDenominations] = useState(false);
  const { CURRENCY_DENOMINATIONS, calculateTotalFromAmount } = useTransactionCalculations(exchangeRates);

  // 통화별 계좌 목록 필터링
  const getAccountsByCurrency = (currency: string) => {
    return assets.filter(asset => 
      asset.type === 'account' && asset.currency === currency
    );
  };

  // 권종별 수량 업데이트
  const updateDenomination = (denomination: string, count: string) => {
    const updatedDenominations = {
      ...input.denominations,
      [denomination]: parseInt(count) || 0
    };
    
    // 0인 권종은 제거
    if (updatedDenominations[denomination] === 0) {
      delete updatedDenominations[denomination];
    }

    const totalAmount = calculateTotalFromAmount(
      Object.fromEntries(
        Object.entries(updatedDenominations).map(([denom, qty]) => [denom, qty.toString()])
      )
    );

    console.log('🔸 InputCard - Updating amount:', { totalAmount, typeof: typeof totalAmount, denominations: updatedDenominations });
    
    onUpdate({
      denominations: updatedDenominations,
      amount: totalAmount
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

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="text-sm font-medium flex items-center">
            <Banknote className="mr-2" size={16} />
            입금 #{input.id.split('_')[1]}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="text-red-500 hover:text-red-700"
            data-testid={`button-remove-input-${input.id}`}
          >
            <Trash2 size={16} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 입금 타입 선택 */}
        <div className="space-y-2">
          <Label>입금 방식</Label>
          <Select 
            value={input.type} 
            onValueChange={(value: 'cash' | 'account') => onUpdate({ type: value })}
          >
            <SelectTrigger data-testid={`select-input-type-${input.id}`}>
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
            value={input.currency} 
            onValueChange={(value: 'KRW' | 'VND' | 'USD') => onUpdate({ currency: value })}
          >
            <SelectTrigger data-testid={`select-input-currency-${input.id}`}>
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
        {input.type === 'account' && (
          <div className="space-y-2">
            <Label>계좌 선택</Label>
            <Select value={input.accountId || ''} onValueChange={handleAccountSelect}>
              <SelectTrigger data-testid={`select-input-account-${input.id}`}>
                <SelectValue placeholder="계좌를 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {getAccountsByCurrency(input.currency).map(account => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.displayName || account.name} - {account.currency} {account.balance?.toLocaleString()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* 금액 입력 (계좌) 또는 권종 입력 (현금) */}
        {input.type === 'account' ? (
          <div className="space-y-2">
            <Label>입금 금액</Label>
            <Input
              type="number"
              placeholder="0"
              value={input.amount || ''}
              onChange={(e) => onUpdate({ amount: parseFloat(e.target.value) || 0 })}
              data-testid={`input-amount-${input.id}`}
            />
          </div>
        ) : (
          <div className="space-y-2">
            {/* 권종별 입력 */}
            <div className="flex justify-between items-center">
              <Label>권종별 수량</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDenominations(!showDenominations)}
                data-testid={`button-toggle-denominations-${input.id}`}
              >
                {showDenominations ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </Button>
            </div>
            
            {showDenominations && (
              <div className="grid grid-cols-2 gap-2">
                {CURRENCY_DENOMINATIONS[input.currency]?.map(denom => (
                  <div key={denom.value} className="space-y-1">
                    <Label className="text-xs">{denom.label}</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={input.denominations?.[denom.value] || ''}
                      onChange={(e) => updateDenomination(denom.value, e.target.value)}
                      data-testid={`input-denomination-${input.id}-${denom.value}`}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* 총 금액 표시 */}
            <div className="pt-2 border-t">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">총 입금 금액:</span>
                <Badge variant="secondary" className="text-sm">
                  {input.amount.toLocaleString()} {input.currency}
                </Badge>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}