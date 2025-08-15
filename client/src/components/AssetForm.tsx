import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Plus, Minus, X } from 'lucide-react';
import { formatInputWithCommas, parseCommaFormattedNumber } from '@/utils/helpers';

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

// 거래소 목록
const DEFAULT_EXCHANGES = ['Bithumb', 'Upbit', 'Coinone', 'Korbit', 'Binance', 'OKX'];

// 코인 목록  
const DEFAULT_COINS = ['BTC', 'ETH', 'XRP', 'ADA', 'DOT', 'USDT', 'USDC'];

export default function AssetForm({ type, editData, onSubmit, onCancel }: AssetFormProps) {
  const [denominations, setDenominations] = useState(() => {
    // editData가 있고 metadata.denomination이 있을 때
    if (editData?.metadata?.denomination) {
      return editData.metadata.denomination;
    }
    
    const defaultDenoms: Record<string, Record<string, number>> = {
      'KRW': { '50,000': 0, '10,000': 0, '5,000': 0, '1,000': 0 },
      'USD': { '100': 0, '50': 0, '20': 0, '10': 0, '5': 0, '2': 0, '1': 0 },
      'VND': { '500,000': 0, '200,000': 0, '100,000': 0, '50,000': 0, '20,000': 0, '10,000': 0, '5,000': 0, '2,000': 0, '1,000': 0 }
    };
    
    return type === 'cash' ? (defaultDenoms[editData?.currency] || defaultDenoms['KRW']) : {};
  });

  // 거래소 및 코인 관리 state
  const [exchanges, setExchanges] = useState(DEFAULT_EXCHANGES);
  const [coins, setCoins] = useState(DEFAULT_COINS);
  const [showExchangeInput, setShowExchangeInput] = useState(false);
  const [showCoinInput, setShowCoinInput] = useState(false);
  const [newExchange, setNewExchange] = useState('');
  const [newCoin, setNewCoin] = useState('');

  // 거래소 추가 함수
  const addExchange = () => {
    if (newExchange.trim() && !exchanges.includes(newExchange.trim())) {
      setExchanges([...exchanges, newExchange.trim()]);
      setNewExchange('');
      setShowExchangeInput(false);
    }
  };

  // 코인 추가 함수
  const addCoin = () => {
    if (newCoin.trim() && !coins.includes(newCoin.trim().toUpperCase())) {
      setCoins([...coins, newCoin.trim().toUpperCase()]);
      setNewCoin('');
      setShowCoinInput(false);
    }
  };

  // editData 변경 시 denominations 업데이트 (한 번만 실행)
  useEffect(() => {
    if (editData?.metadata?.denomination && type === 'cash') {
      setDenominations(editData.metadata.denomination);
    }
  }, [editData?.id, type]); // editData.id만 의존성으로 사용

  const getSchema = () => {
    switch (type) {
      case 'cash': return cashAssetSchema;
      case 'korean-account':
      case 'vietnamese-account': return accountSchema;
      case 'exchange':
      case 'binance': return cryptoAssetSchema;
      default: 
        console.warn(`Unknown asset type: ${type}, using basic schema`);
        return z.object({
          name: z.string().min(1, "이름을 입력해주세요"),
          balance: z.number().min(0, "잔액은 0 이상이어야 합니다")
        });
    }
  };

  const form = useForm({
    resolver: zodResolver(getSchema()),
    defaultValues: getFormValues()
  });

  function getFormValues() {
    if (editData) {
      // PostgreSQL 데이터 구조에 맞게 변환
      const formData: any = {};
      
      if (type === 'cash') {
        formData.currency = editData.currency;
        formData.balance = parseFloat(editData.balance) || 0;
        formData.denominations = editData.metadata?.denomination || {};
        
        // denominations state는 useEffect에서 처리
      } else if (type === 'korean-account' || type === 'vietnamese-account') {
        formData.bankName = editData.metadata?.bank || editData.name || '';
        formData.accountNumber = editData.metadata?.accountNumber || '';
        formData.accountHolder = editData.metadata?.accountHolder || '';
        formData.balance = parseFloat(editData.balance) || 0;
      } else if (type === 'exchange') {
        formData.exchangeName = editData.metadata?.exchange || '';
        formData.coinName = editData.currency || '';
        formData.quantity = parseFloat(editData.balance) || 0;
        formData.currency = editData.currency || 'USDT';
      } else if (type === 'binance') {
        formData.coinName = editData.currency || '';
        formData.quantity = parseFloat(editData.balance) || 0;
        formData.currency = editData.currency || 'USDT';
      }
      
      console.log('Edit form data:', formData); // 디버깅용
      return formData;
    }
    
    return getDefaultValues();
  }

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
        console.warn(`Unknown asset type: ${type}, using basic defaults`);
        return { name: '', balance: 0 };
    }
  }

  const handleFormSubmit = (data: any) => {
    try {
      if (type === 'cash') {
        // 수정 시에는 새로운 값으로 대체 (기존 + 추가가 아님)
        const finalDenominations = { ...denominations };
        
        // Validate denominations object
        if (typeof finalDenominations !== 'object' || finalDenominations === null) {
          throw new Error('Invalid denominations data');
        }
        
        data.denominations = finalDenominations;
        data.balance = Object.entries(finalDenominations).reduce((total, [denom, count]) => {
          // Remove commas from denomination string before parsing
          const denomValue = parseFloat(String(denom).replace(/,/g, ''));
          const countValue = typeof count === 'number' ? count : 0;
          
          if (isNaN(denomValue) || isNaN(countValue)) {
            console.warn(`Invalid denomination data: ${denom}=${count}`);
            return total;
          }
          
          return total + (denomValue * countValue);
        }, 0);
        
        // Ensure currency is set
        if (!data.currency) {
          data.currency = editData?.currency || 'KRW';
        }
        
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
    } catch (error) {
      console.error('Error in form submission:', error);
      // Handle error appropriately - could show a toast or alert
    }
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
    <Card className="bg-white rounded-lg shadow-xl overflow-y-auto max-h-[95vh] sm:max-h-none">
      <div className="p-4 sm:p-6">
        <div className="flex justify-between items-center mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900">{getTitle()}</h2>
          <Button variant="ghost" size="sm" onClick={onCancel} data-testid="button-close">
            <X size={20} />
          </Button>
        </div>
        
        <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 sm:space-y-6">
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
                        // 새로 추가할 때만 denominations 초기화
                        if (!editData) {
                          const defaultDenoms: Record<string, Record<string, number>> = {
                            'KRW': { '50,000': 0, '10,000': 0, '5,000': 0, '1,000': 0 },
                            'USD': { '100': 0, '50': 0, '20': 0, '10': 0, '5': 0, '2': 0, '1': 0 },
                            'VND': { '500,000': 0, '200,000': 0, '100,000': 0, '50,000': 0, '20,000': 0, '10,000': 0, '5,000': 0, '2,000': 0, '1,000': 0 }
                          };
                          setDenominations(defaultDenoms[value] || {});
                        }
                      }} 
                      value={field.value}
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
                <div className="space-y-6">
                  {/* 전체 합산 총계 - 셀렉터 위에 배치 */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 shadow-sm">
                    <div className="p-5">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <h4 className="font-bold text-blue-900 text-lg">전체 합산</h4>
                      </div>
                      <div className="space-y-3">
                        {!editData && (
                          <div className="bg-white/70 rounded-lg p-4 border border-blue-100">
                            <div className="flex justify-between items-center">
                              <span className="text-blue-800 font-medium">총 합계:</span>
                              <span className="text-2xl font-bold text-blue-900">
                                {form.watch('currency') === 'KRW' ? '₩' : 
                                 form.watch('currency') === 'USD' ? '$' : '₫'}
                                {Object.entries(denominations).reduce((total, [denom, count]) => {
                                  return total + (parseFloat(denom.replace(/,/g, '')) * ((typeof count === 'number' ? count : 0)));
                                }, 0).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        )}
                        {editData && (
                          <>
                            <div className="bg-white/70 rounded-lg p-3 border border-blue-100">
                              <div className="flex justify-between items-center text-sm">
                                <span className="text-blue-700">기존 총계:</span>
                                <span className="font-semibold text-blue-800">
                                  {form.watch('currency') === 'KRW' ? '₩' : 
                                   form.watch('currency') === 'USD' ? '$' : '₫'}
                                  {Object.entries(editData.denominations || {}).reduce((total, [denom, count]) => {
                                    return total + (parseFloat(denom.replace(/,/g, '')) * ((typeof count === 'number' ? count : 0)));
                                  }, 0).toLocaleString()}
                                </span>
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="inline-block w-8 h-0.5 bg-blue-300"></div>
                              <div className="text-xs text-blue-600 font-medium mt-1">수정 후</div>
                            </div>
                            <div className="bg-white rounded-lg p-4 border-2 border-blue-200 shadow-sm">
                              <div className="flex justify-between items-center">
                                <span className="text-blue-800 font-medium text-lg">새로운 총계:</span>
                                <span className="text-2xl font-bold text-blue-900">
                                  {form.watch('currency') === 'KRW' ? '₩' : 
                                   form.watch('currency') === 'USD' ? '$' : '₫'}
                                  {Object.entries(denominations).reduce((total, [denom, count]) => {
                                    return total + (parseFloat(denom.replace(/,/g, '')) * ((typeof count === 'number' ? count : 0)));
                                  }, 0).toLocaleString()}
                                </span>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <h3 className="font-medium text-gray-900">지폐 구성</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 gap-6">
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
                        <div key={denom} className="space-y-3 p-4 border border-gray-200 rounded-lg bg-gray-50 min-w-0">
                          <label className="text-xs font-semibold text-gray-800 block text-center">
                            {form.watch('currency') === 'KRW' ? `${parseFloat(denom.replace(/,/g, '')).toLocaleString()}원권` :
                             form.watch('currency') === 'USD' ? `$${denom}` :
                             `${parseFloat(denom.replace(/,/g, '')).toLocaleString()}₫`}
                          </label>
                          <div className="flex items-center space-x-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => updateDenomination(denom, countValue - 1)}
                              className="h-8 w-8 p-0 flex-shrink-0"
                              data-testid={`button-decrease-${denom}`}
                            >
                              <Minus size={14} />
                            </Button>
                            <Input
                              type="text"
                              value={formatInputWithCommas(countValue.toString())}
                              onChange={(e) => {
                                const numericValue = parseCommaFormattedNumber(e.target.value);
                                updateDenomination(denom, Math.floor(numericValue));
                              }}
                              className="text-center text-sm font-medium h-10 w-full max-w-full"
                              data-testid={`input-denom-${denom}`}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => updateDenomination(denom, countValue + 1)}
                              className="h-8 w-8 p-0 flex-shrink-0"
                              data-testid={`button-increase-${denom}`}
                            >
                              <Plus size={14} />
                            </Button>
                          </div>
                          <div className="text-xs text-gray-500 text-center space-y-1">
                            {!editData && (
                              <div>
                                총액: {form.watch('currency') === 'KRW' ? '₩' : 
                                      form.watch('currency') === 'USD' ? '$' : '₫'}{(parseFloat(denom.replace(/,/g, '')) * countValue).toLocaleString()}
                              </div>
                            )}
                            {editData && (
                              <div>
                                수정 후: {countValue}장
                                <br />
                                총액: {form.watch('currency') === 'KRW' ? '₩' : 
                                      form.watch('currency') === 'USD' ? '$' : '₫'}{(parseFloat(denom.replace(/,/g, '')) * countValue).toLocaleString()}
                              </div>
                            )}
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
                        type="text"
                        placeholder="0"
                        value={formatInputWithCommas(field.value?.toString() || '')}
                        onChange={(e) => {
                          // 은행 계좌는 정수만 허용 (소숫점 입력 방지)
                          const value = e.target.value.replace(/[^0-9,]/g, ''); // 숫자와 콤마만 허용
                          const numericValue = parseCommaFormattedNumber(value);
                          field.onChange(Math.floor(numericValue)); // 정수로 변환
                        }}
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
                      <div className="flex space-x-2">
                        <div className="flex-1">
                          <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-exchange">
                                <SelectValue placeholder="거래소를 선택하세요" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {exchanges.map(exchange => (
                                <SelectItem key={exchange} value={exchange}>{exchange}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setShowExchangeInput(!showExchangeInput)}
                          data-testid="button-add-exchange"
                        >
                          <Plus size={16} />
                        </Button>
                      </div>
                      {showExchangeInput && (
                        <div className="flex space-x-2 mt-2">
                          <Input
                            placeholder="새 거래소명"
                            value={newExchange}
                            onChange={(e) => setNewExchange(e.target.value)}
                            data-testid="input-new-exchange"
                          />
                          <Button type="button" onClick={addExchange} data-testid="button-confirm-exchange">
                            추가
                          </Button>
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => {
                              setShowExchangeInput(false);
                              setNewExchange('');
                            }}
                            data-testid="button-cancel-exchange"
                          >
                            취소
                          </Button>
                        </div>
                      )}
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
                    <div className="flex space-x-2">
                      <div className="flex-1">
                        <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-coin">
                              <SelectValue placeholder="코인을 선택하세요" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {coins.map(coin => (
                              <SelectItem key={coin} value={coin}>{coin}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setShowCoinInput(!showCoinInput)}
                        data-testid="button-add-coin"
                      >
                        <Plus size={16} />
                      </Button>
                    </div>
                    {showCoinInput && (
                      <div className="flex space-x-2 mt-2">
                        <Input
                          placeholder="새 코인명"
                          value={newCoin}
                          onChange={(e) => setNewCoin(e.target.value)}
                          data-testid="input-new-coin"
                        />
                        <Button type="button" onClick={addCoin} data-testid="button-confirm-coin">
                          추가
                        </Button>
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => {
                            setShowCoinInput(false);
                            setNewCoin('');
                          }}
                          data-testid="button-cancel-coin"
                        >
                          취소
                        </Button>
                      </div>
                    )}
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
                        type="text"
                        placeholder="0"
                        value={formatInputWithCommas(field.value?.toString() || '')}
                        onChange={(e) => {
                          const numericValue = parseCommaFormattedNumber(e.target.value);
                          field.onChange(numericValue);
                        }}
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