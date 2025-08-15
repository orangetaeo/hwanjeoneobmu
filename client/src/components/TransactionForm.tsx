import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Asset } from '@/types';

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
  const [formData, setFormData] = useState({
    fromAsset: '',
    toAsset: '',
    fromAmount: '',
    toAmount: '',
    rate: '',
    type: 'exchange'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement transaction submission
    console.log('Transaction data:', formData);
    onTransactionSuccess();
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">새 거래</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="fromAsset">보내는 자산</Label>
              <Select 
                value={formData.fromAsset} 
                onValueChange={(value) => setFormData({...formData, fromAsset: value})}
              >
                <SelectTrigger data-testid="select-from-asset">
                  <SelectValue placeholder="자산을 선택하세요" />
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
              <Label htmlFor="toAsset">받는 자산</Label>
              <Select 
                value={formData.toAsset} 
                onValueChange={(value) => setFormData({...formData, toAsset: value})}
              >
                <SelectTrigger data-testid="select-to-asset">
                  <SelectValue placeholder="자산을 선택하세요" />
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label htmlFor="fromAmount">보내는 금액</Label>
              <Input
                id="fromAmount"
                type="number"
                step="any"
                placeholder="0"
                value={formData.fromAmount}
                onChange={(e) => setFormData({...formData, fromAmount: e.target.value})}
                data-testid="input-from-amount"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rate">환율</Label>
              <Input
                id="rate"
                type="number"
                step="any"
                placeholder="0"
                value={formData.rate}
                onChange={(e) => setFormData({...formData, rate: e.target.value})}
                data-testid="input-rate"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="toAmount">받는 금액</Label>
              <Input
                id="toAmount"
                type="number"
                step="any"
                placeholder="0"
                value={formData.toAmount}
                onChange={(e) => setFormData({...formData, toAmount: e.target.value})}
                data-testid="input-to-amount"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onTransactionSuccess()}
              data-testid="button-cancel"
            >
              취소
            </Button>
            <Button 
              type="submit"
              data-testid="button-submit-transaction"
            >
              거래 실행
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
