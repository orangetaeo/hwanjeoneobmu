import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowRight, Calculator, Clock, TrendingUp } from 'lucide-react';
import { formatInputWithCommas, parseCommaFormattedNumber } from '@/utils/helpers';
import { Asset, Transaction } from '@/types';

interface AdvancedTransactionFormProps {
  allAssets: Asset[];
  onTransactionSuccess: (transaction: Transaction) => void;
  onCancel: () => void;
}

export default function AdvancedTransactionForm({ 
  allAssets, 
  onTransactionSuccess, 
  onCancel 
}: AdvancedTransactionFormProps) {
  const [activeTab, setActiveTab] = useState('bank_to_exchange');
  const [formData, setFormData] = useState({
    fromAsset: '',
    toAsset: '',
    fromAmount: '',
    toAmount: '',
    rate: '',
    customPrice: '',
    marketPrice: '',
    fees: '',
    memo: '',
    exchangeName: '',
    p2pPlatform: ''
  });

  const handleFormDataChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const calculateToAmount = () => {
    const amount = parseCommaFormattedNumber(formData.fromAmount);
    const rate = parseCommaFormattedNumber(formData.rate);
    if (amount && rate) {
      const calculated = (amount / rate).toString();
      handleFormDataChange('toAmount', calculated);
    }
  };

  const calculateFromAmount = () => {
    const amount = parseCommaFormattedNumber(formData.toAmount);
    const rate = parseCommaFormattedNumber(formData.rate);
    if (amount && rate) {
      const calculated = (amount * rate).toString();
      handleFormDataChange('fromAmount', calculated);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const transaction: Transaction = {
      id: Date.now().toString(),
      type: activeTab as any,
      fromAssetName: formData.fromAsset,
      toAssetName: formData.toAsset,
      fromAmount: parseCommaFormattedNumber(formData.fromAmount),
      toAmount: parseCommaFormattedNumber(formData.toAmount),
      rate: parseCommaFormattedNumber(formData.rate),
      customPrice: formData.customPrice ? parseCommaFormattedNumber(formData.customPrice) : undefined,
      marketPrice: formData.marketPrice ? parseCommaFormattedNumber(formData.marketPrice) : undefined,
      fees: formData.fees ? parseCommaFormattedNumber(formData.fees) : 0,
      profit: 0, // 계산 필요
      memo: formData.memo,
      metadata: {
        exchangeName: formData.exchangeName,
        p2pPlatform: formData.p2pPlatform
      },
      timestamp: new Date()
    };
    
    onTransactionSuccess(transaction);
  };

  const getFormTitle = () => {
    switch (activeTab) {
      case 'bank_to_exchange':
        return '은행에서 거래소로 송금';
      case 'exchange_purchase':
        return '거래소에서 코인 구매';
      case 'exchange_transfer':
        return '거래소 간 자산 이동';
      case 'p2p_trade':
        return 'P2P 거래';
      default:
        return '새 거래';
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">{getFormTitle()}</h2>
          <Button variant="ghost" onClick={onCancel}>닫기</Button>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="bank_to_exchange">은행→거래소</TabsTrigger>
            <TabsTrigger value="exchange_purchase">코인 구매</TabsTrigger>
            <TabsTrigger value="exchange_transfer">거래소 이동</TabsTrigger>
            <TabsTrigger value="p2p_trade">P2P 거래</TabsTrigger>
          </TabsList>

          <form onSubmit={handleSubmit} className="mt-6 space-y-6">
            
            {/* 은행에서 거래소로 송금 */}
            <TabsContent value="bank_to_exchange" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 flex items-center">
                    <Clock className="mr-2" size={16} />
                    보내는 자산
                  </h3>
                  
                  <div className="space-y-2">
                    <Label>은행 계좌</Label>
                    <Select value={formData.fromAsset} onValueChange={(value) => handleFormDataChange('fromAsset', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="은행 계좌를 선택하세요" />
                      </SelectTrigger>
                      <SelectContent>
                        {allAssets.filter(asset => asset.type === 'account').map(asset => (
                          <SelectItem key={asset.assetId} value={asset.displayName}>
                            {asset.displayName} - ₩{asset.balance?.toLocaleString()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>송금 금액 (KRW)</Label>
                    <Input
                      type="text"
                      placeholder="0"
                      value={formatInputWithCommas(formData.fromAmount)}
                      onChange={(e) => handleFormDataChange('fromAmount', parseCommaFormattedNumber(e.target.value).toString())}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 flex items-center">
                    <ArrowRight className="mr-2" size={16} />
                    받는 거래소
                  </h3>
                  
                  <div className="space-y-2">
                    <Label>거래소명</Label>
                    <Select value={formData.exchangeName} onValueChange={(value) => handleFormDataChange('exchangeName', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="거래소를 선택하세요" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Bithumb">빗썸 (Bithumb)</SelectItem>
                        <SelectItem value="Upbit">업비트 (Upbit)</SelectItem>
                        <SelectItem value="Coinone">코인원 (Coinone)</SelectItem>
                        <SelectItem value="Korbit">코빗 (Korbit)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>수수료 (KRW)</Label>
                    <Input
                      type="text"
                      placeholder="0"
                      value={formatInputWithCommas(formData.fees)}
                      onChange={(e) => handleFormDataChange('fees', parseCommaFormattedNumber(e.target.value).toString())}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* 거래소에서 코인 구매 */}
            <TabsContent value="exchange_purchase" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900">구매 정보</h3>
                  
                  <div className="space-y-2">
                    <Label>거래소</Label>
                    <Select value={formData.exchangeName} onValueChange={(value) => handleFormDataChange('exchangeName', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="거래소 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Bithumb">빗썸</SelectItem>
                        <SelectItem value="Upbit">업비트</SelectItem>
                        <SelectItem value="Coinone">코인원</SelectItem>
                        <SelectItem value="Korbit">코빗</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>구매할 코인</Label>
                    <Select value={formData.toAsset} onValueChange={(value) => handleFormDataChange('toAsset', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="코인 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USDT">USDT</SelectItem>
                        <SelectItem value="BTC">Bitcoin (BTC)</SelectItem>
                        <SelectItem value="ETH">Ethereum (ETH)</SelectItem>
                        <SelectItem value="XRP">Ripple (XRP)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>사용 금액 (KRW)</Label>
                    <Input
                      type="text"
                      placeholder="0"
                      value={formatInputWithCommas(formData.fromAmount)}
                      onChange={(e) => handleFormDataChange('fromAmount', parseCommaFormattedNumber(e.target.value).toString())}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 flex items-center">
                    <TrendingUp className="mr-2" size={16} />
                    시세 정보
                  </h3>
                  
                  <div className="space-y-2">
                    <Label>시장 가격 (KRW)</Label>
                    <Input
                      type="text"
                      placeholder="현재 시장 가격"
                      value={formatInputWithCommas(formData.marketPrice)}
                      onChange={(e) => handleFormDataChange('marketPrice', parseCommaFormattedNumber(e.target.value).toString())}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>구매 가격 (KRW)</Label>
                    <Input
                      type="text"
                      placeholder="실제 구매한 가격"
                      value={formatInputWithCommas(formData.customPrice)}
                      onChange={(e) => handleFormDataChange('customPrice', parseCommaFormattedNumber(e.target.value).toString())}
                    />
                  </div>

                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={calculateToAmount}
                    className="w-full"
                  >
                    <Calculator className="mr-2" size={16} />
                    수량 계산
                  </Button>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900">결과</h3>
                  
                  <div className="space-y-2">
                    <Label>구매 수량</Label>
                    <Input
                      type="text"
                      placeholder="0"
                      value={formatInputWithCommas(formData.toAmount)}
                      onChange={(e) => handleFormDataChange('toAmount', parseCommaFormattedNumber(e.target.value).toString())}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>거래 수수료</Label>
                    <Input
                      type="text"
                      placeholder="0"
                      value={formatInputWithCommas(formData.fees)}
                      onChange={(e) => handleFormDataChange('fees', parseCommaFormattedNumber(e.target.value).toString())}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* 거래소 간 이동 */}
            <TabsContent value="exchange_transfer" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900">보내는 거래소</h3>
                  
                  <div className="space-y-2">
                    <Label>출금 거래소</Label>
                    <Select value={formData.fromAsset} onValueChange={(value) => handleFormDataChange('fromAsset', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="거래소를 선택하세요" />
                      </SelectTrigger>
                      <SelectContent>
                        {allAssets.filter(asset => asset.type === 'crypto' && asset.exchangeName).map(asset => (
                          <SelectItem key={asset.assetId} value={asset.displayName}>
                            {asset.displayName} - {asset.quantity?.toLocaleString()} {asset.currency}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>이동 수량</Label>
                    <Input
                      type="text"
                      placeholder="0"
                      value={formatInputWithCommas(formData.fromAmount)}
                      onChange={(e) => handleFormDataChange('fromAmount', parseCommaFormattedNumber(e.target.value).toString())}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900">받는 거래소</h3>
                  
                  <div className="space-y-2">
                    <Label>입금 거래소</Label>
                    <Select value={formData.toAsset} onValueChange={(value) => handleFormDataChange('toAsset', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="목적지를 선택하세요" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Binance USDT">바이낸스 (Binance)</SelectItem>
                        <SelectItem value="OKX USDT">OKX</SelectItem>
                        <SelectItem value="Bybit USDT">Bybit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>네트워크 수수료</Label>
                    <Input
                      type="text"
                      placeholder="0"
                      value={formatInputWithCommas(formData.fees)}
                      onChange={(e) => handleFormDataChange('fees', parseCommaFormattedNumber(e.target.value).toString())}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* P2P 거래 */}
            <TabsContent value="p2p_trade" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900">거래 정보</h3>
                  
                  <div className="space-y-2">
                    <Label>P2P 플랫폼</Label>
                    <Select value={formData.p2pPlatform} onValueChange={(value) => handleFormDataChange('p2pPlatform', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="플랫폼 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Binance P2P">바이낸스 P2P</SelectItem>
                        <SelectItem value="Huobi P2P">후오비 P2P</SelectItem>
                        <SelectItem value="OKX P2P">OKX P2P</SelectItem>
                        <SelectItem value="Direct Trade">직거래</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>거래 타입</Label>
                    <Select value={formData.exchangeName} onValueChange={(value) => handleFormDataChange('exchangeName', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="거래 타입 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Buy">구매 (Buy)</SelectItem>
                        <SelectItem value="Sell">판매 (Sell)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>거래 수량 (USDT)</Label>
                    <Input
                      type="text"
                      placeholder="0"
                      value={formatInputWithCommas(formData.fromAmount)}
                      onChange={(e) => handleFormDataChange('fromAmount', parseCommaFormattedNumber(e.target.value).toString())}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900">가격 정보</h3>
                  
                  <div className="space-y-2">
                    <Label>시장 가격 (KRW)</Label>
                    <Input
                      type="text"
                      placeholder="현재 USDT 시장 가격"
                      value={formatInputWithCommas(formData.marketPrice)}
                      onChange={(e) => handleFormDataChange('marketPrice', parseCommaFormattedNumber(e.target.value).toString())}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>거래 가격 (KRW)</Label>
                    <Input
                      type="text"
                      placeholder="실제 거래한 가격"
                      value={formatInputWithCommas(formData.customPrice)}
                      onChange={(e) => handleFormDataChange('customPrice', parseCommaFormattedNumber(e.target.value).toString())}
                    />
                  </div>

                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={calculateFromAmount}
                    className="w-full"
                  >
                    <Calculator className="mr-2" size={16} />
                    총액 계산
                  </Button>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900">결과</h3>
                  
                  <div className="space-y-2">
                    <Label>총 거래액 (KRW)</Label>
                    <Input
                      type="text"
                      placeholder="0"
                      value={formatInputWithCommas(formData.toAmount)}
                      onChange={(e) => handleFormDataChange('toAmount', parseCommaFormattedNumber(e.target.value).toString())}
                      className="font-bold text-blue-600"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>수수료</Label>
                    <Input
                      type="text"
                      placeholder="0"
                      value={formatInputWithCommas(formData.fees)}
                      onChange={(e) => handleFormDataChange('fees', parseCommaFormattedNumber(e.target.value).toString())}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* 공통 메모 섹션 */}
            <div className="space-y-2">
              <Label>거래 메모</Label>
              <Textarea
                placeholder="거래에 대한 추가 정보를 입력하세요..."
                value={formData.memo}
                onChange={(e) => handleFormDataChange('memo', e.target.value)}
                rows={3}
              />
            </div>

            {/* 액션 버튼 */}
            <div className="flex justify-end space-x-4 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onCancel}>
                취소
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                거래 기록 저장
              </Button>
            </div>
          </form>
        </Tabs>
      </Card>
    </div>
  );
}