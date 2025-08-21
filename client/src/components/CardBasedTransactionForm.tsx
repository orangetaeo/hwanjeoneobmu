import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface CardBasedTransactionFormProps {
  onClose: () => void;
  assets: any[];
}

export default function CardBasedTransactionForm({ 
  onClose, 
  assets 
}: CardBasedTransactionFormProps) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setIsReady(true);
  }, []);

  if (!isReady) {
    return <div>로딩중...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-xl font-bold">복합 거래 (개발중)</CardTitle>
            <Button variant="ghost" onClick={onClose}>닫기</Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">
            복합 거래 기능이 개발 중입니다. 곧 사용하실 수 있습니다.
          </p>
          <div className="mt-4">
            <h4 className="font-semibold mb-2">예정 기능:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
              <li>다중 입금/출금 카드 지원</li>
              <li>비율 기반 자동 분배</li>
              <li>실시간 환율 적용</li>
              <li>권종별 자동 분배</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}