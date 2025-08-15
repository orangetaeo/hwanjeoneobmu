import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Minus } from 'lucide-react';
import { Asset } from '@/types';
import { formatInputWithCommas, parseCommaFormattedNumber } from '@/utils/helpers';

interface TransactionFormProps {
  allAssets: Asset[];
  onTransactionSuccess: () => void;
  onOpenModal: (type: string, data?: any) => void;
}

export default function TransactionForm({ 
  allAssets, 
  onTransactionSuccess, 
  onOpenModal 
}: TransactionFormProps) {
  const [receivedAsset, setReceivedAsset] = useState('');
  const [givenAsset, setGivenAsset] = useState('VND 현금');
  const [receivedAmount, setReceivedAmount] = useState('');
  
  // VND 지폐 구성 상태 (고액권부터 정렬)
  const [vndDenominations, setVndDenominations] = useState({
    '500000': 0,
    '200000': 0, 
    '100000': 0,
    '50000': 0,
    '20000': 0,
    '10000': 0
  });

  // 고액권 우선 자동 계산 함수
  const calculateOptimalDenominations = (amount: number) => {
    const denomOrder = ['500000', '200000', '100000', '50000', '20000', '10000'];
    const newDenoms = { ...vndDenominations };
    let remaining = amount;

    // 모든 지폐 수량 초기화
    denomOrder.forEach(denom => {
      newDenoms[denom] = 0;
    });

    // 고액권부터 순서대로 계산
    denomOrder.forEach(denom => {
      const denomValue = parseInt(denom);
      if (remaining >= denomValue) {
        const count = Math.floor(remaining / denomValue);
        newDenoms[denom] = count;
        remaining = remaining % denomValue;
      }
    });

    setVndDenominations(newDenoms);
  };

  // VND 지폐별 수량 업데이트
  const updateVndDenomination = (denom: string, count: number) => {
    setVndDenominations(prev => ({
      ...prev,
      [denom]: Math.max(0, count)
    }));
  };

  // VND 총액 계산
  const calculateVndTotal = () => {
    return Object.entries(vndDenominations).reduce((total, [denom, count]) => {
      return total + (parseInt(denom) * count);
    }, 0);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = {
      receivedAsset,
      givenAsset,
      receivedAmount,
      vndDenominations,
      vndTotal: calculateVndTotal()
    };
    console.log('Transaction data:', formData);
    onTransactionSuccess();
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* 받은 자산 (TO / 입금) */}
            <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4">받은 자산 (TO / 입금)</h3>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>자산 선택</Label>
                  <Select value={receivedAsset} onValueChange={setReceivedAsset}>
                    <SelectTrigger>
                      <SelectValue placeholder="자산 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {allAssets.map(asset => (
                        <SelectItem key={asset.assetId} value={asset.assetId}>
                          {asset.displayName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>금액/수량 입력</Label>
                  <Input
                    type="text"
                    placeholder="0"
                    value={receivedAmount}
                    onChange={(e) => {
                      const value = e.target.value;
                      setReceivedAmount(value);
                      
                      // 숫자가 입력되고 내준 자산이 VND 현금일 때 자동 계산
                      const numericValue = parseFloat(value.replace(/,/g, ''));
                      if (!isNaN(numericValue) && numericValue > 0 && givenAsset === 'VND 현금') {
                        calculateOptimalDenominations(numericValue);
                      }
                    }}
                  />
                </div>

                <div className="text-center text-sm text-gray-600">
                  <div>총량 가능 최대: 30,790,000 VND</div>
                  <div className="text-green-600 font-medium">잠재:</div>
                </div>
              </div>
            </div>

            {/* 내준 자산 (FROM / 출금) */}
            <div className="bg-orange-50 p-6 rounded-lg border border-orange-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4">내준 자산 (FROM / 출금)</h3>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>자산 선택</Label>
                  <Select value={givenAsset} onValueChange={(value) => {
                    setGivenAsset(value);
                    
                    // VND 현금 선택 시 자동 계산
                    if (value === 'VND 현금' && receivedAmount) {
                      const numericValue = parseFloat(receivedAmount.replace(/,/g, ''));
                      if (!isNaN(numericValue) && numericValue > 0) {
                        calculateOptimalDenominations(numericValue);
                      }
                    }
                  }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="VND 현금">VND 현금</SelectItem>
                      {allAssets.map(asset => (
                        <SelectItem key={asset.assetId} value={asset.assetId}>
                          {asset.displayName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* VND 지폐별 입력 (고액권부터) */}
                <div className="space-y-3">
                  {Object.entries(vndDenominations)
                    .sort(([a], [b]) => parseInt(b) - parseInt(a)) // 고액권부터 정렬
                    .map(([denom, count]) => (
                    <div key={denom} className="flex items-center justify-between bg-white p-3 rounded border">
                      <span className="text-sm font-medium">
                        {parseInt(denom).toLocaleString()} ₫
                      </span>
                      <div className="flex items-center space-x-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => updateVndDenomination(denom, count - 1)}
                          className="h-8 w-8 p-0"
                        >
                          <Minus size={12} />
                        </Button>
                        <Input
                          type="number"
                          value={count}
                          onChange={(e) => updateVndDenomination(denom, parseInt(e.target.value) || 0)}
                          className="w-16 h-8 text-center text-sm"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => updateVndDenomination(denom, count + 1)}
                          className="h-8 w-8 p-0"
                        >
                          <Plus size={12} />
                        </Button>
                        <span className="text-xs text-gray-500 w-12">
                          (본수: {count})
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="text-right text-lg font-bold text-red-600">
                  합계: {calculateVndTotal().toLocaleString()} VND
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onTransactionSuccess()}
            >
              취소
            </Button>
            <Button type="submit">
              거래 실행
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
