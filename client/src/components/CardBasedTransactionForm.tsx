import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Calculator, User, Trash2, Wallet, Banknote, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface CardBasedTransactionFormProps {
  onClose: () => void;
  assets: any[];
}

export default function CardBasedTransactionForm({ 
  onClose, 
  assets 
}: CardBasedTransactionFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // 환율 데이터 조회
  const { data: exchangeRates = [] } = useQuery<any[]>({
    queryKey: ["/api/exchange-rates"],
  });

  // 기본 폼 상태
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [memo, setMemo] = useState('');
  const [inputCards, setInputCards] = useState<any[]>([]);
  const [outputCards, setOutputCards] = useState<any[]>([]);

  // 카드 추가 함수들
  const addInputCard = () => {
    const newCard = {
      id: Date.now(),
      type: 'cash',
      currency: 'VND',
      amount: '',
      accountId: '',
      denominations: {}
    };
    setInputCards([...inputCards, newCard]);
  };

  const addOutputCard = () => {
    const newCard = {
      id: Date.now(),
      type: 'cash', 
      currency: 'KRW',
      amount: '',
      accountId: '',
      denominations: {}
    };
    setOutputCards([...outputCards, newCard]);
  };

  const removeInputCard = (id: number) => {
    setInputCards(inputCards.filter(card => card.id !== id));
  };

  const removeOutputCard = (id: number) => {
    setOutputCards(outputCards.filter(card => card.id !== id));
  };

  // 카드 업데이트 함수들
  const updateInputCard = (id: number, field: string, value: any) => {
    setInputCards(prev => prev.map(card => 
      card.id === id ? { ...card, [field]: value } : card
    ));
  };

  const updateOutputCard = (id: number, field: string, value: any) => {
    setOutputCards(prev => prev.map(card => 
      card.id === id ? { ...card, [field]: value } : card
    ));
  };

  // 총 입금 금액 계산
  const totalInputAmount = inputCards.reduce((sum, card) => {
    const amount = parseFloat(card.amount) || 0;
    return sum + amount;
  }, 0);

  // 환율 조회 함수
  const getExchangeRate = (fromCurrency: string, toCurrency: string): number => {
    if (fromCurrency === toCurrency) return 1;
    
    // 환율 데이터에서 해당 통화 쌍 찾기
    const rate = exchangeRates.find(rate => 
      rate.fromCurrency === fromCurrency && 
      rate.toCurrency === toCurrency &&
      rate.isActive
    );
    
    if (rate) {
      // 매매시세 사용 (기존 TransactionForm과 동일한 로직)
      return parseFloat(rate.myBuyRate) || parseFloat(rate.goldShopRate) || 1;
    }
    
    // 역방향 환율 확인
    const reverseRate = exchangeRates.find(rate => 
      rate.fromCurrency === toCurrency && 
      rate.toCurrency === fromCurrency &&
      rate.isActive
    );
    
    if (reverseRate) {
      const sellRate = parseFloat(reverseRate.mySellRate) || parseFloat(reverseRate.goldShopRate) || 1;
      return 1 / sellRate;
    }
    
    return 1; // 기본값
  };

  // 총 출금 금액 계산
  const totalOutputAmount = outputCards.reduce((sum, card) => {
    const amount = parseFloat(card.amount) || 0;
    return sum + amount;
  }, 0);

  // 통화별 계좌 필터링
  const getAccountsByCurrency = (currency: string) => {
    return assets.filter(asset => 
      asset.type === 'bank_account' && 
      asset.currency === currency
    );
  };

  // 거래 유효성 검증
  const validateTransaction = () => {
    const errors: string[] = [];

    if (!customerName.trim()) {
      errors.push('고객명을 입력해주세요');
    }

    if (inputCards.length === 0) {
      errors.push('최소 1개의 입금 카드가 필요합니다');
    }

    if (outputCards.length === 0) {
      errors.push('최소 1개의 출금 카드가 필요합니다');
    }

    // 입금 카드 검증
    inputCards.forEach((card, index) => {
      if (!card.amount || parseFloat(card.amount) <= 0) {
        errors.push(`입금 카드 ${index + 1}: 금액을 입력해주세요`);
      }
      if (card.type === 'account' && !card.accountId) {
        errors.push(`입금 카드 ${index + 1}: 계좌를 선택해주세요`);
      }
    });

    // 출금 카드 검증
    outputCards.forEach((card, index) => {
      if (!card.amount || parseFloat(card.amount) <= 0) {
        errors.push(`출금 카드 ${index + 1}: 금액을 입력해주세요`);
      }
      if (card.type === 'account' && !card.accountId) {
        errors.push(`출금 카드 ${index + 1}: 계좌를 선택해주세요`);
      }
    });

    return errors;
  };

  // VND 권종별 분배 계산
  const calculateVNDDenominations = (amount: number) => {
    const denominations: Record<number, number> = {
      500000: 0, 200000: 0, 100000: 0, 50000: 0, 
      20000: 0, 10000: 0, 5000: 0, 2000: 0, 1000: 0
    };

    let remaining = Math.floor(amount);
    const denoms = [500000, 200000, 100000, 50000, 20000, 10000, 5000, 2000, 1000];

    for (const denom of denoms) {
      if (remaining >= denom) {
        denominations[denom] = Math.floor(remaining / denom);
        remaining = remaining % denom;
      }
    }

    return denominations;
  };

  // 복합 거래를 단일 거래들로 분해 (개선된 버전)
  const decomposeComplexTransaction = () => {
    const transactions: any[] = [];

    // 입금/출금 카드가 각각 1개인 간단한 케이스
    if (inputCards.length === 1 && outputCards.length === 1) {
      const inputCard = inputCards[0];
      const outputCard = outputCards[0];
      const inputAmount = parseFloat(inputCard.amount) || 0;
      const outputAmount = parseFloat(outputCard.amount) || 0;

      if (inputAmount > 0 && outputAmount > 0) {
        // 거래 타입 결정
        let transactionType = '';
        if (inputCard.type === 'cash' && outputCard.type === 'cash') {
          transactionType = 'cash_exchange';
        } else if (inputCard.type === 'cash' && outputCard.type === 'account') {
          transactionType = outputCard.currency === 'KRW' ? 'cash_to_krw_account' : 'cash_to_vnd_account';
        } else if (inputCard.type === 'account' && outputCard.type === 'cash') {
          transactionType = inputCard.currency === 'KRW' ? 'krw_account_to_cash' : 'vnd_account_to_cash';
        } else if (inputCard.type === 'account' && outputCard.type === 'account') {
          if (inputCard.currency === 'VND' && outputCard.currency === 'KRW') {
            transactionType = 'vnd_account_to_krw_account';
          } else if (inputCard.currency === 'KRW' && outputCard.currency === 'VND') {
            transactionType = 'krw_account_to_vnd_account';
          } else {
            transactionType = 'account_to_account';
          }
        }

        // 환율 계산
        const exchangeRate = getExchangeRate(inputCard.currency, outputCard.currency);

        // VND 권종 분배 (출금이 VND 현금인 경우)
        let denominations = {};
        if (outputCard.type === 'cash' && outputCard.currency === 'VND') {
          denominations = calculateVNDDenominations(outputAmount);
        }

        transactions.push({
          type: transactionType,
          fromCurrency: inputCard.currency,
          toCurrency: outputCard.currency,
          fromAmount: Math.floor(inputAmount),
          toAmount: Math.floor(outputAmount),
          exchangeRate: exchangeRate,
          customerName,
          customerPhone,
          memo: memo || `복합거래 (${inputCard.currency}→${outputCard.currency})`,
          fromAccountId: inputCard.accountId || null,
          toAccountId: outputCard.accountId || null,
          denominations
        });
      }
    } else {
      // 복잡한 케이스: 여러 입금/출금 조합
      // 각 출금 카드별로 거래 생성 (입금은 첫 번째 카드 기준)
      const primaryInputCard = inputCards[0];
      
      outputCards.forEach((outputCard) => {
        const outputAmount = parseFloat(outputCard.amount) || 0;
        const inputAmount = parseFloat(primaryInputCard.amount) || 0;
        
        // 출금 비율에 따른 입금 할당
        const outputRatio = outputAmount / totalOutputAmount;
        const allocatedInputAmount = inputAmount * outputRatio;

        if (allocatedInputAmount > 0 && outputAmount > 0) {
          // 거래 타입 결정
          let transactionType = '';
          if (primaryInputCard.type === 'cash' && outputCard.type === 'cash') {
            transactionType = 'cash_exchange';
          } else if (primaryInputCard.type === 'cash' && outputCard.type === 'account') {
            transactionType = outputCard.currency === 'KRW' ? 'cash_to_krw_account' : 'cash_to_vnd_account';
          } else if (primaryInputCard.type === 'account' && outputCard.type === 'cash') {
            transactionType = primaryInputCard.currency === 'KRW' ? 'krw_account_to_cash' : 'vnd_account_to_cash';
          } else if (primaryInputCard.type === 'account' && outputCard.type === 'account') {
            transactionType = 'account_to_account';
          }

          // 환율 계산
          const exchangeRate = getExchangeRate(primaryInputCard.currency, outputCard.currency);

          // VND 권종 분배
          let denominations = {};
          if (outputCard.type === 'cash' && outputCard.currency === 'VND') {
            denominations = calculateVNDDenominations(outputAmount);
          }

          transactions.push({
            type: transactionType,
            fromCurrency: primaryInputCard.currency,
            toCurrency: outputCard.currency,
            fromAmount: Math.floor(allocatedInputAmount),
            toAmount: Math.floor(outputAmount),
            exchangeRate: exchangeRate,
            customerName,
            customerPhone,
            memo: memo || `복합거래 ${outputCard.currency} 출금`,
            fromAccountId: primaryInputCard.accountId || null,
            toAccountId: outputCard.accountId || null,
            denominations
          });
        }
      });
    }

    return transactions;
  };

  // 거래 처리 mutation
  const processTransactionMutation = useMutation({
    mutationFn: async (transactionData: any) => {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transactionData),
      });
      if (!response.ok) {
        throw new Error('거래 처리 실패');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/assets'] });
    },
  });

  // 거래 실행
  const handleSubmit = async () => {
    const validationErrors = validateTransaction();
    
    if (validationErrors.length > 0) {
      toast({
        title: "입력 오류",
        description: validationErrors[0],
        variant: "destructive",
      });
      return;
    }

    try {
      const transactions = decomposeComplexTransaction();
      
      // 각 거래를 순차적으로 처리
      for (const transaction of transactions) {
        await processTransactionMutation.mutateAsync(transaction);
      }

      toast({
        title: "거래 완료",
        description: `${transactions.length}개의 거래가 성공적으로 처리되었습니다.`,
      });

      // 폼 초기화
      setCustomerName('');
      setCustomerPhone('');
      setMemo('');
      setInputCards([]);
      setOutputCards([]);

      // 잠시 후 홈으로 이동
      setTimeout(() => {
        onClose();
      }, 2000);

    } catch (error) {
      console.error('거래 처리 실패:', error);
      toast({
        title: "거래 실패",
        description: "거래 처리 중 오류가 발생했습니다. 다시 시도해주세요.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-xl font-bold flex items-center">
              <Calculator className="mr-2" size={24} />
              복합 거래
            </CardTitle>
            <Button variant="ghost" onClick={onClose}>닫기</Button>
          </div>
        </CardHeader>
      </Card>

      {/* 고객 정보 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-lg">
            <User className="mr-2" size={20} />
            고객 정보
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customerName">고객명 *</Label>
              <Input
                id="customerName"
                placeholder="고객명을 입력하세요"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                data-testid="input-customer-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customerPhone">연락처</Label>
              <Input
                id="customerPhone"
                placeholder="연락처를 입력하세요"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                data-testid="input-customer-phone"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="memo">메모</Label>
            <Textarea
              id="memo"
              placeholder="거래 관련 메모를 입력하세요"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              data-testid="textarea-memo"
            />
          </div>
        </CardContent>
      </Card>

      {/* 카드 섹션 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 입금 섹션 */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">입금</h3>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={addInputCard}
              data-testid="button-add-input"
            >
              <Plus className="mr-1" size={16} />
              추가
            </Button>
          </div>
          
          {inputCards.map((card) => (
            <Card key={card.id} className="border-2">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    {card.type === 'cash' ? <Banknote className="mr-2" size={16} /> : <Wallet className="mr-2" size={16} />}
                    <span className="font-medium">입금 카드</span>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => removeInputCard(card.id)}
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* 유형 선택 */}
                <div className="space-y-2">
                  <Label>유형</Label>
                  <Select value={card.type} onValueChange={(value) => updateInputCard(card.id, 'type', value)}>
                    <SelectTrigger>
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
                  <Select value={card.currency} onValueChange={(value) => updateInputCard(card.id, 'currency', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="KRW">원 (KRW)</SelectItem>
                      <SelectItem value="VND">동 (VND)</SelectItem>
                      <SelectItem value="USD">달러 (USD)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 계좌 선택 (계좌 유형인 경우) */}
                {card.type === 'account' && (
                  <div className="space-y-2">
                    <Label>계좌</Label>
                    <Select value={card.accountId} onValueChange={(value) => updateInputCard(card.id, 'accountId', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="계좌를 선택하세요" />
                      </SelectTrigger>
                      <SelectContent>
                        {getAccountsByCurrency(card.currency).map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.accountName} ({account.balance?.toLocaleString() || 0} {card.currency})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* 금액 입력 */}
                <div className="space-y-2">
                  <Label>금액</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={card.amount}
                    onChange={(e) => updateInputCard(card.id, 'amount', e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
          
          {inputCards.length === 0 && (
            <Card className="border-dashed border-2 border-gray-300">
              <CardContent className="flex items-center justify-center py-8">
                <p className="text-gray-500">입금 카드를 추가하세요</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* 출금 섹션 */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">출금</h3>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={addOutputCard}
              data-testid="button-add-output"
            >
              <Plus className="mr-1" size={16} />
              추가
            </Button>
          </div>
          
          {outputCards.map((card) => (
            <Card key={card.id} className="border-2">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    {card.type === 'cash' ? <Banknote className="mr-2" size={16} /> : <Wallet className="mr-2" size={16} />}
                    <span className="font-medium">출금 카드</span>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => removeOutputCard(card.id)}
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* 유형 선택 */}
                <div className="space-y-2">
                  <Label>유형</Label>
                  <Select value={card.type} onValueChange={(value) => updateOutputCard(card.id, 'type', value)}>
                    <SelectTrigger>
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
                  <Select value={card.currency} onValueChange={(value) => updateOutputCard(card.id, 'currency', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="KRW">원 (KRW)</SelectItem>
                      <SelectItem value="VND">동 (VND)</SelectItem>
                      <SelectItem value="USD">달러 (USD)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 계좌 선택 (계좌 유형인 경우) */}
                {card.type === 'account' && (
                  <div className="space-y-2">
                    <Label>계좌</Label>
                    <Select value={card.accountId} onValueChange={(value) => updateOutputCard(card.id, 'accountId', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="계좌를 선택하세요" />
                      </SelectTrigger>
                      <SelectContent>
                        {getAccountsByCurrency(card.currency).map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.accountName} ({account.balance?.toLocaleString() || 0} {card.currency})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* 금액 입력 */}
                <div className="space-y-2">
                  <Label>금액</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={card.amount}
                    onChange={(e) => updateOutputCard(card.id, 'amount', e.target.value)}
                  />
                </div>

                {/* 환율 정보 표시 */}
                {inputCards.length > 0 && inputCards[0].currency !== card.currency && (
                  <div className="text-xs text-gray-500 mt-1">
                    환율: {inputCards[0].currency} → {card.currency} = {getExchangeRate(inputCards[0].currency, card.currency).toFixed(2)}
                  </div>
                )}

                {/* VND 권종 분배 미리보기 */}
                {card.type === 'cash' && card.currency === 'VND' && card.amount && parseFloat(card.amount) > 0 && (
                  <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                    <div className="font-medium text-blue-800 mb-1">VND 권종 분배</div>
                    <div className="text-blue-700">
                      {(() => {
                        const denoms = calculateVNDDenominations(parseFloat(card.amount));
                        const parts: string[] = [];
                        Object.entries(denoms).forEach(([denom, count]) => {
                          if (count > 0) {
                            parts.push(`${parseInt(denom).toLocaleString()}×${count}`);
                          }
                        });
                        return parts.length > 0 ? parts.join(', ') : '분배 없음';
                      })()}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          
          {outputCards.length === 0 && (
            <Card className="border-dashed border-2 border-gray-300">
              <CardContent className="flex items-center justify-center py-8">
                <p className="text-gray-500">출금 카드를 추가하세요</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* 요약 정보 */}
      <Card>
        <CardHeader>
          <CardTitle>거래 요약</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-600">입금 카드:</span>
              <span className="ml-2 font-medium">{inputCards.length}개</span>
            </div>
            <div>
              <span className="text-gray-600">출금 카드:</span>
              <span className="ml-2 font-medium">{outputCards.length}개</span>
            </div>
            <div>
              <span className="text-gray-600">총 입금:</span>
              <span className="ml-2 font-medium">{totalInputAmount.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-gray-600">총 출금:</span>
              <span className="ml-2 font-medium">{totalOutputAmount.toLocaleString()}</span>
            </div>
          </div>
          
          {/* 환율 정보 */}
          {inputCards.length > 0 && outputCards.length > 0 && (
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
              <div className="text-sm font-medium text-blue-800 mb-2">적용된 환율</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-blue-700">
                {outputCards.map((output, index) => {
                  const inputCurrency = inputCards[0]?.currency || 'VND';
                  if (inputCurrency === output.currency) return null;
                  const rate = getExchangeRate(inputCurrency, output.currency);
                  return (
                    <div key={index}>
                      {inputCurrency} → {output.currency}: {rate.toFixed(2)}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 금액 차이 표시 */}
          {inputCards.length > 0 && outputCards.length > 0 && totalInputAmount !== totalOutputAmount && (
            <div className="mt-3 p-2 bg-orange-50 border border-orange-200 rounded text-orange-800 text-sm">
              💰 입출금 차액: {(totalInputAmount - totalOutputAmount).toLocaleString()} 
              {totalInputAmount > totalOutputAmount ? ' (잔액)' : ' (부족)'}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 실행 버튼 */}
      <div className="flex justify-end space-x-2">
        <Button variant="outline" onClick={onClose}>
          취소
        </Button>
        <Button 
          onClick={handleSubmit}
          disabled={
            inputCards.length === 0 || 
            outputCards.length === 0 || 
            processTransactionMutation.isPending
          }
          data-testid="button-submit-transaction"
        >
          {processTransactionMutation.isPending ? (
            <>
              <CheckCircle className="mr-2 h-4 w-4 animate-spin" />
              처리중...
            </>
          ) : (
            '거래 실행'
          )}
        </Button>
      </div>
    </div>
  );
}