import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Calculator, User } from 'lucide-react';

interface CardBasedTransactionFormProps {
  onClose: () => void;
  assets: any[];
}

export default function CardBasedTransactionForm({ 
  onClose, 
  assets 
}: CardBasedTransactionFormProps) {
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
      amount: 0
    };
    setInputCards([...inputCards, newCard]);
  };

  const addOutputCard = () => {
    const newCard = {
      id: Date.now(),
      type: 'cash', 
      currency: 'KRW',
      amount: 0,
      percentage: 100
    };
    setOutputCards([...outputCards, newCard]);
  };

  const removeInputCard = (id: number) => {
    setInputCards(inputCards.filter(card => card.id !== id));
  };

  const removeOutputCard = (id: number) => {
    setOutputCards(outputCards.filter(card => card.id !== id));
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
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-medium">입금 #{card.id}</span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => removeInputCard(card.id)}
                  >
                    삭제
                  </Button>
                </div>
                <p className="text-sm text-gray-600">
                  유형: {card.type} | 통화: {card.currency}
                </p>
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
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-medium">출금 #{card.id}</span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => removeOutputCard(card.id)}
                  >
                    삭제
                  </Button>
                </div>
                <p className="text-sm text-gray-600">
                  유형: {card.type} | 통화: {card.currency} | 비율: {card.percentage}%
                </p>
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
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">입금 카드 수:</span>
              <span className="ml-2 font-medium">{inputCards.length}개</span>
            </div>
            <div>
              <span className="text-gray-600">출금 카드 수:</span>
              <span className="ml-2 font-medium">{outputCards.length}개</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 실행 버튼 */}
      <div className="flex justify-end space-x-2">
        <Button variant="outline" onClick={onClose}>
          취소
        </Button>
        <Button 
          data-testid="button-submit-transaction"
          disabled={inputCards.length === 0 || outputCards.length === 0}
        >
          거래 실행
        </Button>
      </div>
    </div>
  );
}