import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ChevronDown, Save, TrendingUp } from 'lucide-react';
import { useFirebaseAuth } from '@/hooks/useFirebaseAuth';
import { collection, onSnapshot, doc, runTransaction, query, orderBy, limit, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';

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
      const itemDate = item.timestamp?.toDate();
      if (appliedFilters.startDate && itemDate < new Date(appliedFilters.startDate)) return false;
      if (appliedFilters.endDate) {
        const endDate = new Date(appliedFilters.endDate);
        endDate.setHours(23, 59, 59, 999);
        if (itemDate > endDate) return false;
      }
      if (appliedFilters.category && item.category !== appliedFilters.category) return false;
      if (appliedFilters.denomination && item.denomination !== appliedFilters.denomination) return false;
      if (appliedFilters.user && !item.userId.toLowerCase().includes(appliedFilters.user.toLowerCase())) return false;
      if (view === 'transaction') {
        if (appliedFilters.buyRate && item.buyRate < parseFloat(appliedFilters.buyRate)) return false;
        if (appliedFilters.sellRate && item.sellRate < parseFloat(appliedFilters.sellRate)) return false;
      } else {
        if (appliedFilters.rate && item.rate < parseFloat(appliedFilters.rate)) return false;
      }
      return true;
    });
  }, [view, transactionRateHistory, goldsmithRateHistory, appliedFilters]);

  // Firebase 구독 설정
  useEffect(() => {
    if (!user?.uid) return;

    const dataPath = `users/${user.uid}`;

    const unsubTransactionHistory = onSnapshot(
      query(collection(db, `${dataPath}/transaction_rate_history`), orderBy('timestamp', 'desc'), limit(50)),
      (snapshot) => {
        setTransactionRateHistory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }
    );

    const unsubGoldsmithHistory = onSnapshot(
      query(collection(db, `${dataPath}/goldsmith_rate_history`), orderBy('timestamp', 'desc'), limit(50)),
      (snapshot) => {
        setGoldsmithRateHistory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }
    );

    // 기존 환율 데이터 로드
    const unsubTransactionRates = onSnapshot(doc(db, `${dataPath}/rates`, 'transaction_rates'), (doc) => {
      if (doc.exists()) {
        setTransactionRates(doc.data());
      }
    });

    const unsubGoldsmithRates = onSnapshot(doc(db, `${dataPath}/rates`, 'goldsmith_rates'), (doc) => {
      if (doc.exists()) {
        setGoldsmithRates(doc.data());
      }
    });

    return () => {
      unsubTransactionHistory();
      unsubGoldsmithHistory();
      unsubTransactionRates();
      unsubGoldsmithRates();
    };
  }, [user?.uid]);

  useEffect(() => {
    setIsInputOpen(false);
  }, [view]);

  const formatNumberWithCommas = (value: string | number) => {
    if (value === null || value === undefined || value === '') return '';
    const num = typeof value === 'number' ? value : parseFloat(value);
    if (isNaN(num)) return '';
    return num.toLocaleString();
  };

  const parseNumberWithCommas = (value: string) => {
    if (typeof value !== 'string') return value;
    const parsed = parseFloat(value.replace(/,/g, ''));
    return isNaN(parsed) ? 0 : parsed;
  };

  const handleRateChange = (setter: any, currency: string, groupKey: string, field: string, value: string) => {
    const sanitizedValue = value.replace(/[^0-9.]/g, '');
    const parts = sanitizedValue.split('.');
    if (parts.length > 2) return;
    
    let rateKey = field ? `${groupKey}_${field}` : groupKey;

    setter((prev: any) => ({
      ...prev,
      [currency]: {
        ...prev[currency],
        [rateKey]: sanitizedValue
      }
    }));
  };

  const handleSaveTransactionRates = async () => {
    if (!user?.uid) return;
    
    setIsSaving(true);
    const batch = writeBatch(db);
    const dataPath = `users/${user.uid}`;
    const ratesRef = doc(db, `${dataPath}/rates`, 'transaction_rates');
    const historyCol = collection(db, `${dataPath}/transaction_rate_history`);
    
    for (const currency of Object.keys(RATE_GROUPS)) {
      for (const group of RATE_GROUPS[currency as keyof typeof RATE_GROUPS]) {
        const groupKey = group.denoms.join('_');
        const newBuyRate = parseNumberWithCommas(transactionRates[currency]?.[`${groupKey}_buy`] || '0');
        const newSellRate = parseNumberWithCommas(transactionRates[currency]?.[`${groupKey}_sell`] || '0');

        if (newBuyRate > 0 || newSellRate > 0) {
          batch.set(doc(historyCol), {
            timestamp: serverTimestamp(),
            category: `${currency} ⇆ ${currency === 'USDT' ? 'USD' : 'VND'}`,
            denomination: group.label,
            buyRate: newBuyRate,
            sellRate: newSellRate,
            userId: user.uid
          });
        }
      }
    }

    try {
      batch.set(ratesRef, transactionRates);
      await batch.commit();
      setModalInfo({ title: "성공", message: "금일 환율이 저장되었습니다.", type: 'success', onCancel: () => setModalInfo(null) });
    } catch (error) {
      console.error("금일 환율 저장 오류: ", error);
      setModalInfo({ title: "오류", message: "저장 중 오류가 발생했습니다.", type: 'error', onCancel: () => setModalInfo(null) });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveGoldsmith = async () => {
    if (!user?.uid) return;
    
    setIsSaving(true);
    const batch = writeBatch(db);
    const dataPath = `users/${user.uid}`;
    const ratesRef = doc(db, `${dataPath}/rates`, 'goldsmith_rates');
    const historyCol = collection(db, `${dataPath}/goldsmith_rate_history`);

    for (const currency of Object.keys(goldsmithRates)) {
      for (const groupKey in goldsmithRates[currency]) {
        const newRate = parseNumberWithCommas(goldsmithRates[currency][groupKey] || '0');

        if (newRate > 0) {
          const group = RATE_GROUPS[currency as keyof typeof RATE_GROUPS]?.find(g => g.denoms.join('_') === groupKey);
          batch.set(doc(historyCol), {
            timestamp: serverTimestamp(),
            category: `${currency} → VND`,
            denomination: group ? group.label : groupKey,
            rate: newRate,
            userId: user.uid
          });
        }
      }
    }
    
    try {
      batch.set(ratesRef, goldsmithRates);
      await batch.commit();
      setModalInfo({ title: "성공", message: "금은방 시세가 저장되었습니다.", type: 'success', onCancel: () => setModalInfo(null) });
    } catch (error) {
      console.error("금은방 시세 저장 오류: ", error);
      setModalInfo({ title: "오류", message: "저장 중 오류가 발생했습니다.", type: 'error', onCancel: () => setModalInfo(null) });
    } finally {
      setIsSaving(false);
    }
  };

  const renderRealTimeRates = () => {
    const formatRate = (rate: number) => {
      if (!rate && rate !== 0) return 'N/A';
      if (rate < 0.1) return rate.toFixed(4);
      if (rate < 100) return rate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      return rate.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    };

    const getChangePercentage = () => {
      // 임시 데이터 - 실제로는 전날 대비 계산
      return Math.random() > 0.5 ? '+0.15%' : '-0.08%';
    };

    const getChangeAmount = () => {
      // 임시 데이터 - 실제로는 전날 대비 계산
      return Math.random() > 0.5 ? '+2.00' : '-20';
    };

    return (
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">실시간 환율 정보</h2>
          <span className="text-sm text-gray-500">마지막 업데이트: 방금 전</span>
        </div>

        <div className="space-y-6">
          {/* 법정화폐 환율 */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">법정화폐 환율</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-4 bg-white border border-gray-200">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-sm font-medium text-gray-600">USD/KRW</span>
                  <div className="flex items-center text-xs text-green-600">
                    <TrendingUp size={12} className="mr-1" />
                    <span>+0.15%</span>
                  </div>
                </div>
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  {realTimeRates['USD-KRW'] ? formatRate(realTimeRates['USD-KRW']) : '1,387.69'}
                </div>
                <div className="text-xs text-gray-500">+2.00</div>
              </Card>

              <Card className="p-4 bg-white border border-gray-200">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-sm font-medium text-gray-600">USD/VND</span>
                  <div className="flex items-center text-xs text-red-600">
                    <TrendingUp size={12} className="mr-1 rotate-180" />
                    <span>-0.08%</span>
                  </div>
                </div>
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  {realTimeRates['USD-VND'] ? formatRate(realTimeRates['USD-VND']) : '26,144.38'}
                </div>
                <div className="text-xs text-gray-500">-20</div>
              </Card>

              <Card className="p-4 bg-white border border-gray-200">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-sm font-medium text-gray-600">KRW/VND</span>
                  <div className="flex items-center text-xs text-green-600">
                    <TrendingUp size={12} className="mr-1" />
                    <span>+0.23%</span>
                  </div>
                </div>
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  {realTimeRates['KRW-VND'] ? formatRate(realTimeRates['KRW-VND']) : '18.84'}
                </div>
                <div className="text-xs text-gray-500">+0.04</div>
              </Card>
            </div>
          </div>

          {/* 암호화폐 시세 */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">암호화폐 시세</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {['BTC', 'ETH', 'USDT', 'ADA'].map((coin) => {
                const coinData = cryptoRates[coin];
                return (
                  <Card key={coin} className="p-4 bg-white border border-gray-200">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm font-medium text-gray-600">{coin}</span>
                      <div className="flex items-center text-xs text-green-600">
                        <TrendingUp size={12} className="mr-1" />
                        <span>+2.34%</span>
                      </div>
                    </div>
                    <div className="text-lg font-bold text-gray-900 mb-1">
                      {coinData?.USDT ? `$${formatNumberWithCommas(coinData.USDT)}` : 
                       coin === 'BTC' ? '$118,927.54' :
                       coin === 'ETH' ? '$4,631.61' :
                       coin === 'USDT' ? '로딩중...' :
                       coin === 'ADA' ? '$0.9306' : 'N/A'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {coinData?.KRW ? `₩${formatNumberWithCommas(coinData.KRW)}` :
                       coin === 'BTC' ? '₩165,600,000' :
                       coin === 'ETH' ? '₩6,449,000' :
                       coin === 'USDT' ? '₩1,392' :
                       coin === 'ADA' ? '₩1,296' : 'N/A'}
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderTransactionRateInputs = (currency: string) => {
    return (
      <div className="space-y-4">
        {RATE_GROUPS[currency as keyof typeof RATE_GROUPS].map((group) => {
          const groupKey = group.denoms.join('_');
          const buyRate = transactionRates[currency]?.[`${groupKey}_buy`] || '';
          const sellRate = transactionRates[currency]?.[`${groupKey}_sell`] || '';
          
          return (
            <div key={groupKey} className="grid grid-cols-3 gap-4 items-center">
              <div className="text-right font-medium">{group.label}</div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">내가 살때</label>
                <Input
                  type="text"
                  value={formatNumberWithCommas(buyRate)}
                  onChange={(e) => handleRateChange(setTransactionRates, currency, groupKey, 'buy', e.target.value.replace(/,/g, ''))}
                  placeholder="매입가"
                  className="text-center"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">내가 팔때</label>
                <Input
                  type="text"
                  value={formatNumberWithCommas(sellRate)}
                  onChange={(e) => handleRateChange(setTransactionRates, currency, groupKey, 'sell', e.target.value.replace(/,/g, ''))}
                  placeholder="매도가"
                  className="text-center"
                />
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderGoldsmithInputs = (currency: string) => {
    return (
      <div className="space-y-4">
        {RATE_GROUPS[currency as keyof typeof RATE_GROUPS].map((group) => {
          const groupKey = group.denoms.join('_');
          const rate = goldsmithRates[currency]?.[groupKey] || '';
          
          return (
            <div key={groupKey} className="grid grid-cols-2 gap-4 items-center">
              <div className="text-right font-medium">{group.label}</div>
              <div>
                <Input
                  type="text"
                  value={formatNumberWithCommas(rate)}
                  onChange={(e) => handleRateChange(setGoldsmithRates, currency, groupKey, '', e.target.value.replace(/,/g, ''))}
                  placeholder="환율"
                  className="text-center"
                />
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderHistoryTable = (history: any[], columns: string[]) => {
    if (history.length === 0) {
      return <div className="text-center text-gray-500 py-4">변경 내역이 없습니다.</div>;
    }

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((col) => (
                <th key={col} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {history.map((item: any, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                  {item.timestamp?.toDate().toLocaleDateString('ko-KR')}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{item.category}</td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{item.denomination}</td>
                {view === 'transaction' ? (
                  <>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                      {formatNumberWithCommas(item.buyRate)}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                      {formatNumberWithCommas(item.sellRate)}
                    </td>
                  </>
                ) : (
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                    {formatNumberWithCommas(item.rate)}
                  </td>
                )}
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{item.userId}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderTransactionRateSection = () => (
    <div>
      <div 
        onClick={() => setIsInputOpen(!isInputOpen)} 
        className="flex justify-between items-center cursor-pointer mb-4 p-2 rounded-md hover:bg-gray-100"
      >
        <h2 className="text-xl font-bold">금일 환율 설정 (거래 계산용)</h2>
        <ChevronDown className={`w-6 h-6 transition-transform text-gray-500 ${isInputOpen ? 'rotate-180' : ''}`} />
      </div>
      {isInputOpen && (
        <div className="mb-6">
          <div className="space-y-6">
            <Card className="p-4 bg-gray-50">
              <h3 className="font-semibold text-lg mb-3 text-blue-700">USD ⇆ VND</h3>
              {renderTransactionRateInputs('USD')}
            </Card>
            <Card className="p-4 bg-gray-50">
              <h3 className="font-semibold text-lg mb-3 text-green-700">KRW ⇆ VND</h3>
              {renderTransactionRateInputs('KRW')}
            </Card>
            <Card className="p-4 bg-gray-50">
              <h3 className="font-semibold text-lg mb-3 text-yellow-600">USDT ⇆ USD</h3>
              {renderTransactionRateInputs('USDT')}
            </Card>
          </div>
          <Button 
            onClick={handleSaveTransactionRates} 
            disabled={isSaving} 
            className="w-full mt-6 bg-blue-600 hover:bg-blue-700" 
            size="lg"
          >
            {isSaving ? '저장 중...' : (
              <>
                <Save className="mr-2" size={16} />
                금일 환율 저장
              </>
            )}
          </Button>
        </div>
      )}
      <div className="mt-8">
        <h3 className="text-lg font-bold mb-4">변경 내역</h3>
        {renderHistoryTable(filteredHistory, ['거래일', '구분', '권별', '내가 살때', '내가 팔때', '사용자'])}
      </div>
    </div>
  );
  
  const renderGoldsmithRateSection = () => (
    <div>
      <div 
        onClick={() => setIsInputOpen(!isInputOpen)} 
        className="flex justify-between items-center cursor-pointer mb-4 p-2 rounded-md hover:bg-gray-100"
      >
        <h2 className="text-xl font-bold">금은방 시세 (참고용)</h2>
        <ChevronDown className={`w-6 h-6 transition-transform text-gray-500 ${isInputOpen ? 'rotate-180' : ''}`} />
      </div>
      {isInputOpen && (
        <div className="mb-6">
          <Card className="p-4 bg-gray-50 space-y-6">
            <div>
              <h3 className="font-semibold text-lg mb-2 text-blue-700">USD → VND</h3>
              {renderGoldsmithInputs('USD')}
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2 text-green-700">KRW → VND</h3>
              {renderGoldsmithInputs('KRW')}
            </div>
          </Card>
          <Button 
            onClick={handleSaveGoldsmith} 
            disabled={isSaving} 
            className="w-full mt-4 bg-gray-600 hover:bg-gray-700" 
            size="lg"
          >
            {isSaving ? '저장 중...' : (
              <>
                <Save className="mr-2" size={16} />
                금은방 시세 저장
              </>
            )}
          </Button>
        </div>
      )}
      <div className="mt-8">
        <h3 className="text-lg font-bold mb-4">변경 내역</h3>
        {renderHistoryTable(filteredHistory, ['거래일', '구분', '권별', '시세', '사용자'])}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {renderRealTimeRates()}
      
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        <Button
          onClick={() => setView('transaction')}
          variant={view === 'transaction' ? 'default' : 'ghost'}
          className="flex-1"
          data-testid="tab-transaction-rates"
        >
          금일 환율 설정
        </Button>
        <Button
          onClick={() => setView('goldsmith')}
          variant={view === 'goldsmith' ? 'default' : 'ghost'}
          className="flex-1"
          data-testid="tab-goldsmith-rates"
        >
          금은방 시세
        </Button>
      </div>

      {view === 'transaction' && renderTransactionRateSection()}
      {view === 'goldsmith' && renderGoldsmithRateSection()}

      {/* Modal */}
      {modalInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <Card className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full">
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-2">{modalInfo.title}</h3>
              <p className="text-sm text-gray-600 mb-6">{modalInfo.message}</p>
              <Button onClick={modalInfo.onCancel} className="w-full">
                닫기
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}