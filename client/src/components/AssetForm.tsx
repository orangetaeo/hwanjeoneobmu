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
      'KRW': { '50,000': 0, '10,000': 0, '5,000': 0, '1,000': 0 },
      'USD': { '100': 0, '50': 0, '20': 0, '10': 0, '5': 0, '2': 0, '1': 0 },
      'VND': { '500,000': 0, '200,000': 0, '100,000': 0, '50,000': 0, '20,000': 0, '10,000': 0 }
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
        return { currency: 'KRW', balance: 0, denominations: {} };
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
      // 수정 시에는 기존 수량에 추가
      const finalDenominations = { ...denominations };
      if (editData?.denominations) {
        Object.entries(editData.denominations).forEach(([denom, existingCount]) => {
          const existingAmount = typeof existingCount === 'number' ? existingCount : 0;
          const addAmount = finalDenominations[denom] || 0;
          finalDenominations[denom] = existingAmount + addAmount;
        });
      }
      
      data.denominations = finalDenominations;
      data.balance = Object.entries(finalDenominations).reduce((total, [denom, count]) => {
        // Remove commas from denomination string before parsing
        const denomValue = parseFloat(denom.replace(/,/g, ''));
        const countValue = typeof count === 'number' ? count : 0;
        return total + (denomValue * countValue);
      }, 0);
      // Generate name based on selected currency
      data.name = `${data.currency} 현금`;
      data.type = 'cash';
      // Generate unique ID if not editing
      if (!editData) {
        data.id = Date.now().toString();
      } else {
        data.id = editData.id;
      }
    } else {
      // For other asset types, generate ID if not editing
      if (!editData) {
        data.id = Date.now().toString();
      } else {
        data.id = editData.id;
      }
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
    <Card className="bg-white rounded-lg shadow-xl">
      <div className="p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">{getTitle()}</h2>
        
        <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
          {type === 'cash' && (
            <>
              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>통화</FormLabel>
                    <Select 
                      onValueChange={(value) => {
                        field.onChange(value);
                        // Update denominations based on selected currency
                        const defaultDenoms: Record<string, Record<string, number>> = {
                          'KRW': { '50,000': 0, '10,000': 0, '5,000': 0, '1,000': 0 },
                          'USD': { '100': 0, '50': 0, '20': 0, '10': 0, '5': 0, '2': 0, '1': 0 },
                          'VND': { '500,000': 0, '200,000': 0, '100,000': 0, '50,000': 0, '20,000': 0, '10,000': 0 }
                        };
                        setDenominations(defaultDenoms[value] || {});
                      }} 
                      defaultValue={field.value}
                      disabled={!!editData} // 수정 시 통화 변경 불가
                    >
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
                    {editData && <p className="text-xs text-gray-500 mt-1">수정 시 통화는 변경할 수 없습니다.</p>}
                    <FormMessage />
                  </FormItem>
                )}
              />

              {form.watch('currency') && (
                <div className="space-y-4">
                  <h3 className="font-medium text-gray-900">지폐 구성</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {Object.entries(denominations)
                      .sort(([a], [b]) => {
                        // Remove commas and convert to number for sorting
                        const numA = parseFloat(a.replace(/,/g, ''));
                        const numB = parseFloat(b.replace(/,/g, ''));
                        return numB - numA; // Sort descending (largest first)
                      })
                      .map(([denom, count]) => {
                      const countValue = typeof count === 'number' ? count : 0;
                      return (
                        <div key={denom} className="space-y-3 p-4 border border-gray-200 rounded-lg bg-gray-50">
                          <label className="text-sm font-semibold text-gray-800 block text-center">
                            {form.watch('currency') === 'KRW' ? `${denom}원권` :
                             form.watch('currency') === 'USD' ? `$${denom}` :
                             `${denom}₫`}
                          </label>
                          <div className="flex items-center space-x-3">
                            <Button
                              type="button"
                              variant="outline"
                              size="default"
                              onClick={() => updateDenomination(denom, countValue - 1)}
                              className="h-10 w-10 p-0 flex-shrink-0"
                              data-testid={`button-decrease-${denom}`}
                            >
                              <Minus size={18} />
                            </Button>
                            <Input
                              type="number"
                              value={countValue.toString()}
                              onChange={(e) => updateDenomination(denom, parseInt(e.target.value) || 0)}
                              className="text-center text-lg font-medium h-12 flex-1 min-w-0"
                              min="0"
                              data-testid={`input-denom-${denom}`}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="default"
                              onClick={() => updateDenomination(denom, countValue + 1)}
                              className="h-10 w-10 p-0 flex-shrink-0"
                              data-testid={`button-increase-${denom}`}
                            >
                              <Plus size={18} />
                            </Button>
                          </div>
                          <div className="text-xs text-gray-500 text-center space-y-1">
                            {editData && (
                              <div>
                                기존: {editData.denominations?.[denom] || 0}장 →
                                추가: {countValue}장 =
                                소계: {(editData.denominations?.[denom] || 0) + countValue}장
                              </div>
                            )}
                            <div>
                              총액: {form.watch('currency') === 'KRW' ? '₩' : 
                                    form.watch('currency') === 'USD' ? '$' : '₫'}{(parseFloat(denom.replace(/,/g, '')) * countValue).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* 전체 합산 총계 */}
                  <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 className="font-semibold text-blue-900 mb-2">전체 합산</h4>
                    <div className="space-y-1 text-sm">
                      {editData && (
                        <>
                          <div className="flex justify-between">
                            <span>기존 총계:</span>
                            <span className="font-medium">
                              {form.watch('currency') === 'KRW' ? '₩' : 
                               form.watch('currency') === 'USD' ? '$' : '₫'}
                              {Object.entries(editData.denominations || {}).reduce((total, [denom, count]) => {
                                return total + (parseFloat(denom.replace(/,/g, '')) * ((typeof count === 'number' ? count : 0)));
                              }, 0).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>추가 입력:</span>
                            <span className="font-medium">
                              {form.watch('currency') === 'KRW' ? '₩' : 
                               form.watch('currency') === 'USD' ? '$' : '₫'}
                              {Object.entries(denominations).reduce((total, [denom, count]) => {
                                return total + (parseFloat(denom.replace(/,/g, '')) * ((typeof count === 'number' ? count : 0)));
                              }, 0).toLocaleString()}
                            </span>
                          </div>
                          <hr className="border-blue-300" />
                        </>
                      )}
                      <div className="flex justify-between text-lg font-bold text-blue-900">
                        <span>총 합계:</span>
                        <span>
                          {form.watch('currency') === 'KRW' ? '₩' : 
                           form.watch('currency') === 'USD' ? '$' : '₫'}
                          {(Object.entries(denominations).reduce((total, [denom, count]) => {
                            const addAmount = parseFloat(denom.replace(/,/g, '')) * ((typeof count === 'number' ? count : 0));
                            const existingAmount = editData?.denominations ? parseFloat(denom.replace(/,/g, '')) * ((editData.denominations[denom] || 0)) : 0;
                            return total + addAmount + existingAmount;
                          }, 0)).toLocaleString()}
                        </span>
                      </div>
                    </div>
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

          {/* Modal Action Buttons */}
          <div className="flex justify-end space-x-4 mt-8 pt-6 border-t border-gray-200">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCancel} 
              className="px-6 py-2"
              data-testid="button-cancel"
            >
              취소
            </Button>
            <Button 
              type="submit"
              className="px-6 py-2"
              data-testid="button-submit"
            >
              {editData ? '수정' : '추가'}
            </Button>
          </div>
        </form>
        </Form>
      </div>
    </Card>
  );
}