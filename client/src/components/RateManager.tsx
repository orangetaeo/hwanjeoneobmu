import { Card } from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { formatNumberWithCommas } from '@/utils/helpers';

interface RateManagerProps {
  realTimeRates: Record<string, number>;
  cryptoRates: Record<string, { KRW?: number; USDT?: number; }>;
  isFetchingRates: boolean;
}

export default function RateManager({ realTimeRates, cryptoRates, isFetchingRates }: RateManagerProps) {
  const fiatRates = [
    { pair: 'USD/KRW', value: realTimeRates['USD-KRW'], change: '+0.15%', changeValue: '+2.00' },
    { pair: 'USD/VND', value: realTimeRates['USD-VND'], change: '-0.08%', changeValue: '-20' },
    { pair: 'KRW/VND', value: realTimeRates['KRW-VND'], change: '+0.23%', changeValue: '+0.04' },
  ];

  const majorCryptos = ['BTC', 'ETH', 'USDT', 'ADA'];

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">실시간 환율 정보</h3>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <span>마지막 업데이트: {isFetchingRates ? '업데이트 중...' : '방금 전'}</span>
          </div>
        </div>

        {/* Fiat Exchange Rates */}
        <div className="mb-8">
          <h4 className="text-md font-semibold text-gray-900 mb-4">법정화폐 환율</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {fiatRates.map((rate) => (
              <Card key={rate.pair} className="p-4 bg-gray-50">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-gray-900">{rate.pair}</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {rate.value ? formatNumberWithCommas(rate.value, 2) : '로딩중...'}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className={`flex items-center text-sm ${rate.change.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                      {rate.change.startsWith('+') ? 
                        <TrendingUp size={16} className="mr-1" /> : 
                        <TrendingDown size={16} className="mr-1" />
                      }
                      <span>{rate.change}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{rate.changeValue}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Cryptocurrency Rates */}
        <div>
          <h4 className="text-md font-semibold text-gray-900 mb-4">암호화폐 시세</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {majorCryptos.map((crypto) => {
              const cryptoData = cryptoRates[crypto];
              return (
                <Card key={crypto} className="p-4 bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-900">{crypto}</span>
                    </div>
                    <div className="flex items-center text-sm text-green-600">
                      <TrendingUp size={16} className="mr-1" />
                      <span>+2.34%</span>
                    </div>
                  </div>
                  <p className="text-xl font-bold text-gray-900">
                    {cryptoData?.USDT ? `$${formatNumberWithCommas(cryptoData.USDT)}` : '로딩중...'}
                  </p>
                  <p className="text-sm text-gray-500">
                    {cryptoData?.KRW ? `₩${formatNumberWithCommas(cryptoData.KRW)}` : '로딩중...'}
                  </p>
                </Card>
              );
            })}
          </div>
        </div>
      </Card>
    </div>
  );
}
