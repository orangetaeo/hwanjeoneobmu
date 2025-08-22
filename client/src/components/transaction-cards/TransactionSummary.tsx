import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calculator, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import { TransactionInput, TransactionOutput } from '@/types/cardTransaction';

interface TransactionSummaryProps {
  inputs: TransactionInput[];
  outputs: TransactionOutput[];
  totalInputAmount: number;
  totalOutputAmount: number;
}

export default function TransactionSummary({
  inputs,
  outputs,
  totalInputAmount,
  totalOutputAmount
}: TransactionSummaryProps) {
  // 총 비율 계산
  const totalPercentage = outputs.reduce((sum, output) => sum + output.percentage, 0);
  
  // 차액 계산
  const difference = totalOutputAmount - totalInputAmount;
  const isBalanced = Math.abs(difference) < 1; // 1원 이하 차이는 허용

  // 통화별 입금/출금 요약
  const inputSummary = inputs.reduce((acc, input) => {
    acc[input.currency] = (acc[input.currency] || 0) + input.amount;
    return acc;
  }, {} as Record<string, number>);

  const outputSummary = outputs.reduce((acc, output) => {
    acc[output.currency] = (acc[output.currency] || 0) + output.amount;
    return acc;
  }, {} as Record<string, number>);

  const allCurrencies = Array.from(new Set([...Object.keys(inputSummary), ...Object.keys(outputSummary)]));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center text-lg">
          <Calculator className="mr-2" size={20} />
          거래 요약
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 입력/출력 요약 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 입금 요약 */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-gray-600">입금 요약</h4>
            {inputs.length === 0 ? (
              <p className="text-sm text-gray-400">입금 정보가 없습니다</p>
            ) : (
              <div className="space-y-1">
                {inputs.map((input, index) => (
                  <div key={input.id} className="flex justify-between items-center bg-green-50 px-2 py-1 rounded">
                    <span className="text-sm font-medium text-green-700">
                      💰 {input.type === 'cash' ? '현금' : '계좌'}카드
                    </span>
                    <Badge variant="outline" className="bg-green-100 text-green-800">
                      {input.amount.toLocaleString()} {input.currency === 'USD' ? '달러' : input.currency === 'KRW' ? '원' : input.currency === 'VND' ? '동' : input.currency}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 출금 요약 */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-gray-600">출금 요약</h4>
            {outputs.length === 0 ? (
              <p className="text-sm text-gray-400">출금 정보가 없습니다</p>
            ) : (
              <div className="space-y-1">
                {(() => {
                  const normalCards = outputs.filter(output => !output.isCompensation);
                  const compensationCards = outputs.filter(output => output.isCompensation);
                  
                  return (
                    <>
                      {normalCards.map((output, index) => (
                        <div key={output.id} className="flex justify-between items-center bg-blue-50 px-2 py-1 rounded">
                          <span className="text-sm font-medium text-blue-700">💳 출금카드</span>
                          <Badge variant="outline" className="bg-blue-100 text-blue-800">
                            {output.amount.toLocaleString()} {output.currency === 'USD' ? '달러' : output.currency === 'KRW' ? '원' : output.currency === 'VND' ? '동' : output.currency}
                          </Badge>
                        </div>
                      ))}
                      {compensationCards.map((output, index) => (
                        <div key={output.id} className="flex justify-between items-center bg-yellow-50 px-2 py-1 rounded">
                          <span className="text-sm font-medium text-yellow-700">🔄 보상카드</span>
                          <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                            {output.amount.toLocaleString()} {output.currency === 'USD' ? '달러' : output.currency === 'KRW' ? '원' : output.currency === 'VND' ? '동' : output.currency}
                          </Badge>
                        </div>
                      ))}
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        </div>

        {/* 통화별 요약 */}
        {allCurrencies.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-gray-600">통화별 요약</h4>
            <div className="grid grid-cols-1 gap-2">
              {allCurrencies.map(currency => (
                <div key={currency} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <span className="font-medium">{currency}</span>
                  <div className="flex space-x-4 text-sm">
                    <span className="text-blue-600">
                      입금: {(inputSummary[currency] || 0).toLocaleString()}
                    </span>
                    <span className="text-green-600 text-lg font-bold">
                      출금: {(outputSummary[currency] || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 비율 검증 */}
        {outputs.length > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">총 출금 비율:</span>
              <Badge 
                variant={totalPercentage === 100 ? "default" : "destructive"}
                className="flex items-center"
              >
                {totalPercentage === 100 ? (
                  <CheckCircle className="mr-1" size={12} />
                ) : (
                  <AlertTriangle className="mr-1" size={12} />
                )}
                {totalPercentage}%
              </Badge>
            </div>
            
            {totalPercentage !== 100 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  출금 비율의 합이 100%가 되어야 합니다. 현재 {totalPercentage}%입니다.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* 환율 및 수수료 정보 */}
        {inputs.length > 0 && outputs.length > 0 && (
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">거래 준비 상태:</span>
              {isBalanced && totalPercentage === 100 && inputs.length > 0 && outputs.length > 0 ? (
                <Badge variant="default" className="bg-green-600">
                  <CheckCircle className="mr-1" size={12} />
                  거래 가능
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <AlertTriangle className="mr-1" size={12} />
                  설정 필요
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}