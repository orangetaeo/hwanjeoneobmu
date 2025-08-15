import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ChevronDown, Save, TrendingUp } from 'lucide-react';
import { useFirebaseAuth } from '@/hooks/useFirebaseAuth';

// 환율 그룹 정의
const RATE_GROUPS = {
  USD: [
    { label: '100', denoms: ['100'] },
    { label: '50', denoms: ['50'] },
    { label: '20, 10', denoms: ['20', '10'] },
    { label: '5, 2, 1', denoms: ['5', '2', '1'] },
  ],
  KRW: [
    { label: '50,000', denoms: ['50000'] },
    { label: '10,000', denoms: ['10000'] },
    { label: '5,000, 1,000', denoms: ['5000', '1000'] },
  ],
  USDT: [
    { label: 'USDT', denoms: ['USDT']}
  ]
};

interface RateManagerProps {
  realTimeRates: Record<string, number>;
  cryptoRates: Record<string, any>;
  isFetchingRates: boolean;
}

interface Modal {
  title: string;
  message: string;
  type: 'success' | 'error';
  onCancel: () => void;
}

export default function RateManager({ realTimeRates, cryptoRates, isFetchingRates }: RateManagerProps) {
  const { user } = useFirebaseAuth();
  const [view, setView] = useState('transaction');
  const [transactionRates, setTransactionRates] = useState<Record<string, Record<string, string>>>({});
  const [goldsmithRates, setGoldsmithRates] = useState<Record<string, Record<string, string>>>({});
  const [transactionRateHistory, setTransactionRateHistory] = useState<any[]>([]);
  const [goldsmithRateHistory, setGoldsmithRateHistory] = useState<any[]>([]);
  const [isInputOpen, setIsInputOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [modalInfo, setModalInfo] = useState<Modal | null>(null);

  const initialFilters = {
    startDate: '', endDate: '', category: '', denomination: '',
    buyRate: '', sellRate: '', rate: '', user: ''
  };
  const [searchFilters, setSearchFilters] = useState(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState(initialFilters);

  const filteredHistory = useMemo(() => {
    const history = view === 'transaction' ? transactionRateHistory : goldsmithRateHistory;
    return history.filter((item: any) => {
      const itemDate = new Date(item.timestamp);
      if (appliedFilters.startDate && itemDate < new Date(appliedFilters.startDate)) return false;
      if (appliedFilters.endDate) {
        const endDate = new Date(appliedFilters.endDate);
        endDate.setHours(23, 59, 59, 999);
        if (itemDate > endDate) return false;
      }
      if (appliedFilters.category && item.fromCurrency !== appliedFilters.category) return false;
      if (appliedFilters.denomination && !item.toCurrency?.includes(appliedFilters.denomination)) return false;
      return true;
    });
  }, [transactionRateHistory, goldsmithRateHistory, appliedFilters, view]);

  // PostgreSQL 기반 데이터 로딩
  useEffect(() => {
    if (!user?.uid) return;
    
    const loadRateData = async () => {
      try {
        const ratesResponse = await fetch('/api/rates');
        if (ratesResponse.ok) {
          const rates = await ratesResponse.json();
          setTransactionRateHistory(rates);
          setGoldsmithRateHistory(rates);
        }
      } catch (error) {
        console.error('Failed to load rate data:', error);
      }
    };

    loadRateData();
  }, [user?.uid]);

  // 환율 저장 (PostgreSQL API 사용)
  const saveRates = async (currency: string) => {
    if (!user?.uid) return;
    
    setIsSaving(true);
    try {
      const currentRates = view === 'transaction' ? transactionRates : goldsmithRates;
      const rateData = currentRates[currency];
      
      if (!rateData) return;

      // PostgreSQL에 환율 데이터 저장
      const response = await fetch('/api/rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromCurrency: currency,
          toCurrency: 'KRW',
          rate: Object.values(rateData)[0] || '0',
          source: view === 'transaction' ? 'transaction' : 'goldsmith'
        })
      });

      if (response.ok) {
        setModalInfo({
          title: '저장 완료',
          message: `${currency} 환율이 성공적으로 저장되었습니다.`,
          type: 'success',
          onCancel: () => setModalInfo(null)
        });
      } else {
        throw new Error('저장 실패');
      }
    } catch (error) {
      setModalInfo({
        title: '저장 실패',
        message: '환율 저장 중 오류가 발생했습니다.',
        type: 'error',
        onCancel: () => setModalInfo(null)
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRateChange = (currency: string, denomination: string, value: string) => {
    const currentRates = view === 'transaction' ? transactionRates : goldsmithRates;
    const setRates = view === 'transaction' ? setTransactionRates : setGoldsmithRates;
    
    setRates(prev => ({
      ...prev,
      [currency]: {
        ...prev[currency],
        [denomination]: value
      }
    }));
  };

  const clearFilters = () => {
    setSearchFilters(initialFilters);
    setAppliedFilters(initialFilters);
  };

  const applyFilters = () => {
    setAppliedFilters(searchFilters);
  };

  const formatDate = (timestamp: any) => {
    const date = new Date(timestamp);
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* 실시간 환율 표시 */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="text-blue-600" size={20} />
          <h3 className="text-lg font-semibold">실시간 환율 정보</h3>
          {isFetchingRates && <span className="text-sm text-gray-500">업데이트 중...</span>}
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-3 rounded">
            <div className="text-sm text-gray-600">USD/KRW</div>
            <div className="text-lg font-bold">
              {realTimeRates['USD-KRW'] ? realTimeRates['USD-KRW'].toLocaleString() : 
               isFetchingRates ? '로딩 중...' : '데이터 없음'}
            </div>
          </div>
          
          <div className="bg-green-50 p-3 rounded">
            <div className="text-sm text-gray-600">VND/KRW</div>
            <div className="text-lg font-bold">
              {realTimeRates['VND-KRW'] ? realTimeRates['VND-KRW'].toFixed(4) : 
               isFetchingRates ? '로딩 중...' : '데이터 없음'}
            </div>
          </div>
          
          <div className="bg-yellow-50 p-3 rounded">
            <div className="text-sm text-gray-600">USDT/KRW</div>
            <div className="text-lg font-bold">
              {realTimeRates['USDT-KRW'] ? realTimeRates['USDT-KRW'].toLocaleString() : 
               isFetchingRates ? '로딩 중...' : '데이터 없음'}
            </div>
          </div>
          
          <div className="bg-purple-50 p-3 rounded">
            <div className="text-sm text-gray-600">BTC/KRW</div>
            <div className="text-lg font-bold">
              {cryptoRates?.BTC?.KRW ? 
                `${Math.round(cryptoRates.BTC.KRW / 1000000)}M` : 
                isFetchingRates ? '로딩 중...' : '데이터 없음'}
            </div>
          </div>
        </div>
      </Card>

      {/* 환율 히스토리 */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">환율 기록</h3>
        
        <div className="space-y-4">
          {filteredHistory.length > 0 ? (
            filteredHistory.slice(0, 10).map((record, index) => (
              <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <div>
                  <span className="font-medium">{record.fromCurrency} → {record.toCurrency}</span>
                  <span className="text-sm text-gray-500 ml-2">
                    {formatDate(record.timestamp)}
                  </span>
                </div>
                <div className="text-lg font-bold">
                  {parseFloat(record.rate).toLocaleString()}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-gray-500 py-8">
              환율 기록이 없습니다.
            </div>
          )}
        </div>
      </Card>

      {/* 모달 */}
      {modalInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold mb-2">{modalInfo.title}</h3>
            <p className="text-gray-600 mb-4">{modalInfo.message}</p>
            <Button onClick={modalInfo.onCancel} className="w-full">
              확인
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}