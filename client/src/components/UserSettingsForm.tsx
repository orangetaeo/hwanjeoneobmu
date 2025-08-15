import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings, Save } from 'lucide-react';
import { useUserSettings, useUpdateUserSettings } from '@/hooks/useUserSettings';
import { useToast } from '@/hooks/use-toast';

interface UserSettingsFormProps {
  onClose: () => void;
}

export default function UserSettingsForm({ onClose }: UserSettingsFormProps) {
  const { data: userSettings, isLoading } = useUserSettings();
  const updateSettingsMutation = useUpdateUserSettings();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    bithumbFeeRate: '0.0004',
    bithumbGrade: 'white',
  });

  useEffect(() => {
    if (userSettings) {
      setFormData({
        bithumbFeeRate: (userSettings as any)?.bithumbFeeRate || '0.0004',
        bithumbGrade: (userSettings as any)?.bithumbGrade || 'white',
      });
    }
  }, [userSettings]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    updateSettingsMutation.mutate({
      bithumbFeeRate: formData.bithumbFeeRate,
      bithumbGrade: formData.bithumbGrade,
    }, {
      onSuccess: () => {
        toast({
          title: "설정 저장됨",
          description: "사용자 설정이 성공적으로 업데이트되었습니다.",
        });
        onClose();
      },
      onError: () => {
        toast({
          title: "저장 실패",
          description: "설정 저장 중 오류가 발생했습니다.",
          variant: "destructive",
        });
      }
    });
  };

  const handleFeeRateChange = (value: string) => {
    setFormData(prev => ({ ...prev, bithumbFeeRate: (parseFloat(value) / 100).toString() }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">설정을 불러오는 중...</div>
      </div>
    );
  }

  return (
    <Card className="p-6 max-w-md mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900 flex items-center">
          <Settings className="mr-2" size={20} />
          거래 설정
        </h2>
        <Button variant="ghost" onClick={onClose}>닫기</Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-900">빗썸 거래 설정</h3>
          
          <div className="space-y-2">
            <Label>회원 등급</Label>
            <Select value={formData.bithumbGrade} onValueChange={(value) => setFormData(prev => ({ ...prev, bithumbGrade: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="등급을 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="white">화이트 (White) - 0.15%</SelectItem>
                <SelectItem value="gold">골드 (Gold) - 0.10%</SelectItem>
                <SelectItem value="platinum">플래티넘 (Platinum) - 0.08%</SelectItem>
                <SelectItem value="diamond">다이아몬드 (Diamond) - 0.06%</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>현재 적용 수수료율 (%)</Label>
            <Input
              type="text"
              placeholder="0.04"
              value={(parseFloat(formData.bithumbFeeRate) * 100).toFixed(4)}
              onChange={(e) => handleFeeRateChange(e.target.value)}
            />
            <div className="text-xs text-gray-500">
              쿠폰 적용 또는 특별 할인이 있는 경우 실제 적용되는 수수료율을 입력하세요.
            </div>
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded">
            <div className="text-sm text-blue-700">
              <strong>기본 등급별 수수료율:</strong>
              <ul className="mt-1 space-y-1">
                <li>• 화이트: 0.15%</li>
                <li>• 골드: 0.10%</li>
                <li>• 플래티넘: 0.08%</li>
                <li>• 다이아몬드: 0.06%</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <Button type="button" variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button 
            type="submit" 
            disabled={updateSettingsMutation.isPending}
            className="flex items-center"
          >
            <Save className="mr-2" size={16} />
            {updateSettingsMutation.isPending ? '저장 중...' : '저장'}
          </Button>
        </div>
      </form>
    </Card>
  );
}