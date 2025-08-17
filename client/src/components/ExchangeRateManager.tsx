import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Save, AlertTriangle, TrendingUp, DollarSign, Globe, Banknote } from 'lucide-react';
import { ExchangeRate, InsertExchangeRate } from '@shared/schema';
import { formatCurrency } from '@/utils/helpers';

interface ExchangeRateManagerProps {
  rates: ExchangeRate[];
  onSave: (rate: InsertExchangeRate) => Promise<void>;
  onUpdate: (id: string, rate: Partial<InsertExchangeRate>) => Promise<void>;
  realTimeRates: Record<string, number>;
}

interface RateFormData {
  fromCurrency: string;
  toCurrency: string;
  denomination: string;
  goldShopRate: string;
  myBuyRate: string;
  mySellRate: string;
  memo: string;
  isActive: string;
}

const initialFormData: RateFormData = {
  fromCurrency: 'USD',
  toCurrency: 'VND',
  denomination: '100',
  goldShopRate: '',
  myBuyRate: '',
  mySellRate: '',
  memo: '',
  isActive: 'true'
};

export default function ExchangeRateManager({ 
  rates, 
  onSave, 
  onUpdate,
  realTimeRates 
}: ExchangeRateManagerProps) {
  const [formData, setFormData] = useState<RateFormData>(initialFormData);
  const [editingId, setEditingId] = useState<string | null>(null);

  // 실시간 환율 정보 표시용
  const getCurrentRate = (from: string, to: string) => {
    const key = `${from}-${to}`;
    return realTimeRates[key] || 0;
  };

  const handleInputChange = (field: keyof RateFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const rateData: InsertExchangeRate = {
      userId: 'dev-user-1',
      fromCurrency: formData.fromCurrency,
      toCurrency: formData.toCurrency,
      denomination: formData.denomination,
      goldShopRate: formData.goldShopRate ? formData.goldShopRate : null,
      myBuyRate: formData.myBuyRate ? formData.myBuyRate : null,
      mySellRate: formData.mySellRate ? formData.mySellRate : null,
      memo: formData.memo || null,
      isActive: formData.isActive
    };

    try {
      if (editingId) {
        await onUpdate(editingId, rateData);
        setEditingId(null);
      } else {
        await onSave(rateData);
      }
      setFormData(initialFormData);
    } catch (error) {
      console.error('환율 저장 실패:', error);
    }
  };

  const handleEdit = (rate: ExchangeRate) => {
    setFormData({
      fromCurrency: rate.fromCurrency,
      toCurrency: rate.toCurrency,
      denomination: rate.denomination || '100',
      goldShopRate: rate.goldShopRate || '',
      myBuyRate: rate.myBuyRate || '',
      mySellRate: rate.mySellRate || '',
      memo: rate.memo || '',
      isActive: rate.isActive || 'true'
    });
    setEditingId(rate.id);
  };

  const cancelEdit = () => {
    setFormData(initialFormData);
    setEditingId(null);
  };

  // 환율별로 그룹화
  const groupedRates = rates.reduce((acc, rate) => {
    const key = `${rate.fromCurrency}_${rate.toCurrency}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(rate);
    return acc;
  }, {} as Record<string, ExchangeRate[]>);

  return (
    <div className="space-y-6">
      {/* 실시간 환율 정보 */}
      <Card className="p-6">
        <h3 className="text-lg font-bold mb-4 flex items-center">
          <TrendingUp className="mr-2" size={20} />
          실시간 환율 정보 (참고용)
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-center mb-2">
              <Globe className="mr-2 text-blue-600" size={20} />
              <span className="font-semibold">USD → VND</span>
            </div>
            <p className="text-xl font-bold text-blue-600">
              {formatCurrency(getCurrentRate('USD', 'VND'), 'VND')}
            </p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="flex items-center justify-center mb-2">
              <Globe className="mr-2 text-green-600" size={20} />
              <span className="font-semibold">KRW → VND</span>
            </div>
            <p className="text-xl font-bold text-green-600">
              {getCurrentRate('KRW', 'VND').toFixed(2)}
            </p>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="flex items-center justify-center mb-2">
              <Globe className="mr-2 text-purple-600" size={20} />
              <span className="font-semibold">USDT → KRW</span>
            </div>
            <p className="text-xl font-bold text-purple-600">
              {formatCurrency(getCurrentRate('USDT', 'KRW'), 'KRW')}
            </p>
          </div>
          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <div className="flex items-center justify-center mb-2">
              <Globe className="mr-2 text-orange-600" size={20} />
              <span className="font-semibold">USD → KRW</span>
            </div>
            <p className="text-xl font-bold text-orange-600">
              {formatCurrency(getCurrentRate('USD', 'KRW'), 'KRW')}
            </p>
          </div>
        </div>
      </Card>

      {/* 금은방 시세 입력 폼 */}
      <Card className="p-6">
        <h3 className="text-lg font-bold mb-4 flex items-center">
          <DollarSign className="mr-2" size={20} />
          {editingId ? '시세 수정' : '금은방 시세 (참고용)'}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="fromCurrency">환전 통화</Label>
              <select
                id="fromCurrency"
                value={formData.fromCurrency}
                onChange={(e) => handleInputChange('fromCurrency', e.target.value)}
                className="w-full p-2 border rounded-md"
                data-testid="select-from-currency"
              >
                <option value="USD">USD (달러)</option>
                <option value="KRW">KRW (원화)</option>
              </select>
            </div>
            <div>
              <Label htmlFor="toCurrency">목표 통화</Label>
              <select
                id="toCurrency"
                value={formData.toCurrency}
                onChange={(e) => handleInputChange('toCurrency', e.target.value)}
                className="w-full p-2 border rounded-md"
                data-testid="select-to-currency"
              >
                <option value="VND">VND (베트남돈)</option>
              </select>
            </div>
            <div>
              <Label htmlFor="denomination">권종/금액</Label>
              <select
                id="denomination"
                value={formData.denomination}
                onChange={(e) => handleInputChange('denomination', e.target.value)}
                className="w-full p-2 border rounded-md"
                data-testid="select-denomination"
              >
                {formData.fromCurrency === 'USD' ? (
                  <>
                    <option value="100">100달러</option>
                    <option value="50">50달러</option>
                    <option value="20_10">20, 10달러</option>
                    <option value="5_2_1">5, 2, 1달러</option>
                  </>
                ) : (
                  <>
                    <option value="50000">50,000원</option>
                    <option value="10000">10,000원</option>
                    <option value="5000_1000">5,000, 1,000원</option>
                  </>
                )}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="goldShopRate" className="text-orange-600">금은방 시세 (참고)</Label>
              <Input
                id="goldShopRate"
                type="number"
                step="0.01"
                value={formData.goldShopRate}
                onChange={(e) => handleInputChange('goldShopRate', e.target.value)}
                placeholder="25500"
                className="border-orange-200 focus:border-orange-400"
                data-testid="input-gold-shop-rate"
              />
            </div>
            <div>
              <Label htmlFor="myBuyRate" className="text-green-600">내가 사는 가격</Label>
              <Input
                id="myBuyRate"
                type="number"
                step="0.01"
                value={formData.myBuyRate}
                onChange={(e) => handleInputChange('myBuyRate', e.target.value)}
                placeholder="25400"
                className="border-green-200 focus:border-green-400"
                data-testid="input-my-buy-rate"
              />
            </div>
            <div>
              <Label htmlFor="mySellRate" className="text-blue-600">내가 파는 가격</Label>
              <Input
                id="mySellRate"
                type="number"
                step="0.01"
                value={formData.mySellRate}
                onChange={(e) => handleInputChange('mySellRate', e.target.value)}
                placeholder="25450"
                className="border-blue-200 focus:border-blue-400"
                data-testid="input-my-sell-rate"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="memo">급변상황 메모</Label>
            <Textarea
              id="memo"
              value={formData.memo}
              onChange={(e) => handleInputChange('memo', e.target.value)}
              placeholder="달러 급락 주의, USDT 변동성 감안 등..."
              rows={2}
              data-testid="textarea-memo"
            />
          </div>

          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive === 'true'}
                onChange={(e) => handleInputChange('isActive', e.target.checked ? 'true' : 'false')}
                data-testid="checkbox-is-active"
              />
              <Label htmlFor="isActive">활성 상태</Label>
            </div>
            <div className="flex space-x-2">
              {editingId && (
                <Button type="button" variant="outline" onClick={cancelEdit} data-testid="button-cancel">
                  취소
                </Button>
              )}
              <Button type="submit" data-testid="button-save-rate">
                <Save className="mr-2" size={16} />
                {editingId ? '수정' : '저장'}
              </Button>
            </div>
          </div>
        </form>
      </Card>

      {/* 저장된 환율 목록 */}
      <div className="space-y-4">
        {Object.entries(groupedRates).map(([currencyPair, rateList]) => {
          const [from, to] = currencyPair.split('_');
          return (
            <Card key={currencyPair} className="p-6">
              <h4 className="text-md font-bold mb-4 flex items-center">
                <Banknote className="mr-2 text-primary" size={20} />
                <span className="mr-2">{from} → {to}</span>
                <Badge variant="secondary">{rateList.length}개 설정</Badge>
              </h4>
              
              <div className="grid gap-4">
                {rateList.map((rate) => (
                  <div key={rate.id} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-1">
                        <div>
                          <p className="text-sm text-gray-500">권종/금액</p>
                          <p className="font-semibold">{rate.denomination}</p>
                        </div>
                        <div>
                          <p className="text-sm text-orange-500">금은방 시세</p>
                          <p className="font-mono text-orange-600">
                            {rate.goldShopRate ? formatCurrency(parseFloat(rate.goldShopRate), to) : '-'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-green-500">사는 가격</p>
                          <p className="font-mono text-green-600">
                            {rate.myBuyRate ? formatCurrency(parseFloat(rate.myBuyRate), to) : '-'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-blue-500">파는 가격</p>
                          <p className="font-mono text-blue-600">
                            {rate.mySellRate ? formatCurrency(parseFloat(rate.mySellRate), to) : '-'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 ml-4">
                        {rate.isActive === 'false' && (
                          <Badge variant="destructive" className="text-xs">
                            <AlertTriangle size={12} className="mr-1" />
                            비활성
                          </Badge>
                        )}
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleEdit(rate)}
                          data-testid={`button-edit-rate-${rate.id}`}
                        >
                          수정
                        </Button>
                      </div>
                    </div>
                    
                    {rate.memo && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="text-sm text-gray-600">
                          <AlertTriangle size={14} className="inline mr-1 text-yellow-500" />
                          {rate.memo}
                        </p>
                      </div>
                    )}
                    
                    <div className="mt-2 text-xs text-gray-400">
                      업데이트: {new Date(rate.updatedAt).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}