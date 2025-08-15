import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Plus, Minus } from 'lucide-react';
// import { handleNumericInput, handleDecimalInput } from '@/utils/helpers';

const cashAssetSchema = z.object({
  name: z.string().min(1, "자산 이름을 입력해주세요"),
  currency: z.enum(['KRW', 'USD', 'VND'], { required_error: "통화를 선택해주세요" }),
  balance: z.number().min(0, "잔액은 0 이상이어야 합니다"),
  denominations: z.record(z.string(), z.number().min(0))
});

const accountSchema = z.object({
  bankName: z.string().min(1, "은행명을 입력해주세요"),
  accountNumber: z.string().min(1, "계좌번호를 입력해주세요"),
  accountHolder: z.string().min(1, "예금주를 입력해주세요"),
  balance: z.number().min(0, "잔액은 0 이상이어야 합니다")
});

const cryptoAssetSchema = z.object({
  exchangeName: z.string().optional(),
  coinName: z.string().min(1, "코인명을 입력해주세요"),
  quantity: z.number().min(0, "수량은 0 이상이어야 합니다"),
  currency: z.string().default('USDT')
});

interface AssetFormProps {
  type: 'cash' | 'korean-account' | 'vietnamese-account' | 'exchange' | 'binance';
  editData?: any;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

export default function AssetForm({ type, editData, onSubmit, onCancel }: AssetFormProps) {
  const [denominations, setDenominations] = useState(() => {
    if (editData?.denominations) return editData.denominations;
    
    const defaultDenoms: Record<string, Record<string, number>> = {
      'KRW': { '50000': 0, '10000': 0, '5000': 0, '1000': 0 },
      'USD': { '100': 0, '50': 0, '20': 0, '10': 0, '5': 0, '2': 0, '1': 0 },
      'VND': { '500000': 0, '200000': 0, '100000': 0, '50000': 0, '20000': 0, '10000': 0 }
    };
    
    return type === 'cash' ? (defaultDenoms[editData?.currency] || defaultDenoms['KRW']) : {};
  });

  const getSchema = () => {
    switch (type) {
      case 'cash': return cashAssetSchema;
      case 'korean-account':
      case 'vietnamese-account': return accountSchema;
      case 'exchange':
      case 'binance': return cryptoAssetSchema;
      default: return z.object({});
    }
  };

  const form = useForm({
    resolver: zodResolver(getSchema()),
    defaultValues: editData || getDefaultValues()
  });

  function getDefaultValues() {
    switch (type) {
      case 'cash':
        return { name: '', currency: 'KRW', balance: 0, denominations: {} };
      case 'korean-account':
      case 'vietnamese-account':
        return { bankName: '', accountNumber: '', accountHolder: '', balance: 0 };
      case 'exchange':
        return { exchangeName: '', coinName: '', quantity: 0, currency: 'USDT' };
      case 'binance':
        return { coinName: '', quantity: 0, currency: 'USDT' };
      default:
        return {};
    }
  }

  const handleFormSubmit = (data: any) => {
    if (type === 'cash') {
      data.denominations = denominations;
      data.balance = Object.entries(denominations).reduce((total, [denom, count]) => {
        return total + (parseFloat(denom) * count);
      }, 0);
    }
    onSubmit(data);
  };

  const updateDenomination = (denom: string, value: number) => {
    setDenominations((prev: Record<string, number>) => ({
      ...prev,
      [denom]: Math.max(0, value)
    }));
  };

  const getTitle = () => {
    const titles = {
      'cash': editData ? '현금 자산 수정' : '현금 자산 추가',
      'korean-account': editData ? '한국 계좌 수정' : '한국 계좌 추가',
      'vietnamese-account': editData ? '베트남 계좌 수정' : '베트남 계좌 추가',
      'exchange': editData ? '거래소 자산 수정' : '거래소 자산 추가',
      'binance': editData ? '바이낸스 자산 수정' : '바이낸스 자산 추가'
    };
    return titles[type];
  };

  return (
    <Card className="p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6">{getTitle()}</h2>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
          {type === 'cash' && (
            <>
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>자산명</FormLabel>
                    <FormControl>
                      <Input placeholder="예: KRW 현금" {...field} data-testid="input-asset-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>통화</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-currency">
                          <SelectValue placeholder="통화를 선택하세요" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="KRW">KRW (원화)</SelectItem>
                        <SelectItem value="USD">USD (달러)</SelectItem>
                        <SelectItem value="VND">VND (베트남 동)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {form.watch('currency') && (
                <div className="space-y-4">
                  <h3 className="font-medium text-gray-900">지폐 구성</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(denominations).map(([denom, count]) => {
                      const countValue = typeof count === 'number' ? count : 0;
                      return (
                        <div key={denom} className="space-y-2">
                          <label className="text-sm font-medium text-gray-700">
                            {form.watch('currency') === 'KRW' ? `${denom}원권` :
                             form.watch('currency') === 'USD' ? `$${denom}` :
                             `${denom}₫`}
                          </label>
                          <div className="flex items-center space-x-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => updateDenomination(denom, countValue - 1)}
                              data-testid={`button-decrease-${denom}`}
                            >
                              <Minus size={16} />
                            </Button>
                            <Input
                              type="number"
                              value={countValue.toString()}
                              onChange={(e) => updateDenomination(denom, parseInt(e.target.value) || 0)}
                              className="text-center"
                              min="0"
                              data-testid={`input-denom-${denom}`}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => updateDenomination(denom, countValue + 1)}
                              data-testid={`button-increase-${denom}`}
                            >
                              <Plus size={16} />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          {(type === 'korean-account' || type === 'vietnamese-account') && (
            <>
              <FormField
                control={form.control}
                name="bankName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>은행명</FormLabel>
                    <FormControl>
                      <Input placeholder="예: 신한은행" {...field} data-testid="input-bank-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="accountNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>계좌번호</FormLabel>
                    <FormControl>
                      <Input placeholder="예: 123-456-789" {...field} data-testid="input-account-number" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="accountHolder"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>예금주</FormLabel>
                    <FormControl>
                      <Input placeholder="예: 홍길동" {...field} data-testid="input-account-holder" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="balance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>잔액</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="any"
                        placeholder="0"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        data-testid="input-balance"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          )}

          {(type === 'exchange' || type === 'binance') && (
            <>
              {type === 'exchange' && (
                <FormField
                  control={form.control}
                  name="exchangeName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>거래소명</FormLabel>
                      <FormControl>
                        <Input placeholder="예: Bithumb" {...field} data-testid="input-exchange-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              <FormField
                control={form.control}
                name="coinName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>코인명</FormLabel>
                    <FormControl>
                      <Input placeholder="예: BTC" {...field} data-testid="input-coin-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>수량</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="any"
                        placeholder="0"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        data-testid="input-quantity"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          )}

          <div className="flex justify-end space-x-4">
            <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel">
              취소
            </Button>
            <Button type="submit" data-testid="button-submit">
              {editData ? '수정' : '추가'}
            </Button>
          </div>
        </form>
      </Form>
    </Card>
  );
}