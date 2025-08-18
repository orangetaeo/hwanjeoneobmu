import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ExchangeRateManager from '@/components/ExchangeRateManager';
import { ExchangeRate, InsertExchangeRate } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';

export default function ExchangeRatesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // 환율 데이터 조회
  const { data: exchangeRates = [], isLoading } = useQuery({
    queryKey: ['/api/exchange-rates'],
    queryFn: async (): Promise<ExchangeRate[]> => {
      const response = await fetch('/api/exchange-rates');
      if (!response.ok) {
        throw new Error('Failed to fetch exchange rates');
      }
      return response.json();
    }
  });

  // 실시간 환율 데이터 (API에서 가져오기)
  const { data: realTimeRates = {} } = useQuery({
    queryKey: ['/api/rates'],
    queryFn: async (): Promise<Record<string, number>> => {
      try {
        const response = await fetch('/api/rates');
        if (!response.ok) {
          throw new Error('Failed to fetch real-time rates');
        }
        const data = await response.json();
        return data.allRates || {};
      } catch (error) {
        console.error('실시간 환율 조회 실패:', error);
        return {};
      }
    },
    refetchInterval: 30000, // 30초마다 자동 갱신
  });

  // 환율 생성 뮤테이션
  const createExchangeRateMutation = useMutation({
    mutationFn: async (data: InsertExchangeRate): Promise<ExchangeRate> => {
      const response = await fetch('/api/exchange-rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || '환율 저장에 실패했습니다');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/exchange-rates'] });
      toast({
        title: '환율 저장 완료',
        description: '환전상 시세가 성공적으로 저장되었습니다.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: '저장 실패',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // 환율 수정 뮤테이션
  const updateExchangeRateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertExchangeRate> }): Promise<ExchangeRate> => {
      const response = await fetch(`/api/exchange-rates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || '환율 수정에 실패했습니다');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/exchange-rates'] });
      toast({
        title: '환율 수정 완료',
        description: '환전상 시세가 성공적으로 수정되었습니다.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: '수정 실패',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const handleSave = async (rate: InsertExchangeRate) => {
    await createExchangeRateMutation.mutateAsync(rate);
  };

  const handleUpdate = async (id: string, rate: Partial<InsertExchangeRate>) => {
    await updateExchangeRateMutation.mutateAsync({ id, data: rate });
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
          <div className="space-y-4">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-48 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">환율/시세 관리</h1>
        <p className="text-gray-600 mt-1">
          금은방 시세 기반 환전상 관리 시스템 - 일일 시세 업데이트 및 급변상황 대응
        </p>
      </div>

      <ExchangeRateManager
        realTimeRates={realTimeRates}
      />
    </div>
  );
}