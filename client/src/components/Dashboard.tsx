import { useMemo, useState } from 'react';
import { 
  TrendingUp, 
  Plus, 
  ArrowRightLeft, 
  BarChart3,
  Wallet,
  Building,
  Coins,
  Bitcoin
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CashAsset, BankAccount, ExchangeAsset, BinanceAsset, Transaction, CURRENCY_SYMBOLS } from '@/types';
import { formatNumberWithCommas } from '@/utils/helpers';

interface DashboardProps {
  assets: {
    cashAssets: CashAsset[];
    koreanAccounts: BankAccount[];
    vietnameseAccounts: BankAccount[];
    exchangeAssets: ExchangeAsset[];
    binanceAssets: BinanceAsset[];
  };
  transactions: Transaction[];
  realTimeRates: Record<string, number>;
  cryptoRates: Record<string, { KRW?: number; USDT?: number; }>;
  isFetchingRates: boolean;
  onOpenModal: (type: string) => void;
}

export default function Dashboard({ 
  assets, 
  transactions, 
  realTimeRates, 
  cryptoRates, 
  isFetchingRates,
  onOpenModal 
}: DashboardProps) {
  const { cashAssets, koreanAccounts, vietnameseAccounts, exchangeAssets, binanceAssets } = assets;
  const [simpleView, setSimpleView] = useState(true);

  // Calculate total assets in KRW and VND
  const totalAssets = useMemo(() => {
    if (isFetchingRates || !realTimeRates['USD-KRW']) {
      return { krw: 0, vnd: 0 };
    }

    const all = [...cashAssets, ...koreanAccounts, ...vietnameseAccounts, ...exchangeAssets, ...binanceAssets];
    let totalKrw = 0;

    all.forEach(asset => {
      const balance = (asset as any).balance ?? (asset as any).quantity ?? 0;
      const currency = (asset as any).currency;
      const coinName = (asset as any).coinName;

      switch(currency) {
        case 'KRW': 
          if (coinName && cryptoRates && cryptoRates[coinName]?.KRW) {
            totalKrw += (balance * cryptoRates[coinName].KRW);
          } else {
            totalKrw += balance;
          }
          break;
        case 'VND': 
          totalKrw += balance * (realTimeRates['VND-KRW'] || 0); 
          break;
        case 'USD': 
          totalKrw += balance * (realTimeRates['USD-KRW'] || 0); 
          break;
        case 'USDT': 
          if (coinName && cryptoRates && cryptoRates[coinName]?.USDT) {
            totalKrw += (balance * cryptoRates[coinName].USDT) * (realTimeRates['USDT-KRW'] || 0);
          } else {
            totalKrw += balance * (realTimeRates['USDT-KRW'] || 0);
          }
          break;
        default: 
          if (coinName && cryptoRates && cryptoRates[coinName]?.KRW) {
            totalKrw += balance * cryptoRates[coinName].KRW;
          } else if (coinName && cryptoRates && cryptoRates[coinName]?.USDT) {
            totalKrw += (balance * cryptoRates[coinName].USDT) * (realTimeRates['USDT-KRW'] || 0);
          }
          break;
      }
    });

    return {
      krw: totalKrw,
      vnd: totalKrw * (realTimeRates['KRW-VND'] || 0)
    };
  }, [assets, realTimeRates, cryptoRates, isFetchingRates]);

  // Asset summary for simple view
  const assetSummary = useMemo(() => {
    const summary: Record<string, number> = {};
    cashAssets.forEach(a => summary[a.currency] = (summary[a.currency] || 0) + a.balance);
    koreanAccounts.forEach(a => summary['KRW'] = (summary['KRW'] || 0) + a.balance);
    vietnameseAccounts.forEach(a => summary['VND'] = (summary['VND'] || 0) + a.balance);
    exchangeAssets.forEach(a => summary[a.coinName] = (summary[a.coinName] || 0) + a.quantity);
    binanceAssets.forEach(a => summary[a.coinName] = (summary[a.coinName] || 0) + a.quantity);
    return summary;
  }, [assets]);

  return (
    <div className="space-y-6">
      {/* Total Asset Summary */}
      <Card className="p-6">
        <h2 className="text-lg font-bold mb-4">총 자산 요약</h2>
        {isFetchingRates ? (
          <p className="text-gray-500">환율 정보 로딩 중...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-center">
            <div>
              <p className="text-sm text-gray-500 mb-2">원화 환산</p>
              <p className="text-3xl font-bold text-blue-600">
                {CURRENCY_SYMBOLS.KRW} {formatNumberWithCommas(Math.round(totalAssets.krw))}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-2">동화 환산</p>
              <p className="text-3xl font-bold text-green-600">
                {CURRENCY_SYMBOLS.VND} {formatNumberWithCommas(Math.round(totalAssets.vnd))}
              </p>
            </div>
          </div>
        )}
      </Card>

      {/* View Toggle */}
      <div className="flex justify-end">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setSimpleView(!simpleView)}
          data-testid="button-toggle-view"
        >
          {simpleView ? '자세히 보기' : '간단히 보기'}
        </Button>
      </div>

      {simpleView ? (
        /* Simple View - Asset Summary Cards */
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(assetSummary).map(([currency, total]) => {
            let formattedTotal;
            if (currency === 'USDT') {
              const numberTotal = typeof total === 'number' ? total : parseFloat(total);
              formattedTotal = formatNumberWithCommas(numberTotal, 2);
            } else {
              formattedTotal = formatNumberWithCommas(total);
            }
            return (
              <Card key={currency} className="p-6">
                <h3 className="text-lg font-bold text-gray-600 mb-2">{currency}</h3>
                <p className="text-xl font-semibold text-gray-800">
                  {CURRENCY_SYMBOLS[currency as keyof typeof CURRENCY_SYMBOLS] || ''} {formattedTotal}
                </p>
              </Card>
            );
          })}
        </div>
      ) : (
        /* Detailed View - Asset Breakdown */
        <div className="space-y-6">
          {/* Cash Assets */}
          <Card className="p-6">
            <h2 className="text-lg font-bold mb-4 flex items-center">
              <Wallet className="mr-2" size={20} />
              현금 자산
            </h2>
            <div className="space-y-3">
              {cashAssets.map(asset => (
                <div key={asset.id} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <p className="font-semibold">{asset.name}</p>
                    <p className="font-mono text-gray-800">
                      {formatNumberWithCommas(asset.balance)} {asset.currency}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Korean Accounts */}
            <Card className="p-6">
              <h2 className="text-lg font-bold mb-4 flex items-center">
                <Building className="mr-2" size={20} />
                한국 계좌
              </h2>
              <div className="space-y-3">
                {koreanAccounts.map(acc => (
                  <div key={acc.id} className="p-4 bg-gray-50 rounded-lg">
                    <p className="font-semibold">
                      {acc.bankName} 
                      <span className="text-sm font-normal text-gray-600 ml-2">
                        ({acc.accountHolder})
                      </span>
                    </p>
                    <p className="text-sm text-gray-500">{acc.accountNumber}</p>
                    <p className="text-right font-mono text-blue-600 mt-2">
                      {formatNumberWithCommas(acc.balance)} KRW
                    </p>
                  </div>
                ))}
              </div>
            </Card>

            {/* Vietnamese Accounts */}
            <Card className="p-6">
              <h2 className="text-lg font-bold mb-4 flex items-center">
                <Building className="mr-2" size={20} />
                베트남 계좌
              </h2>
              <div className="space-y-3">
                {vietnameseAccounts.map(acc => (
                  <div key={acc.id} className="p-4 bg-gray-50 rounded-lg">
                    <p className="font-semibold">
                      {acc.bankName}
                      <span className="text-sm font-normal text-gray-600 ml-2">
                        ({acc.accountHolder})
                      </span>
                    </p>
                    <p className="text-sm text-gray-500">{acc.accountNumber}</p>
                    <p className="text-right font-mono text-green-600 mt-2">
                      {formatNumberWithCommas(acc.balance)} VND
                    </p>
                  </div>
                ))}
              </div>
            </Card>

            {/* Exchange Assets */}
            <Card className="p-6">
              <h2 className="text-lg font-bold mb-4 flex items-center">
                <Coins className="mr-2" size={20} />
                코인 거래소
              </h2>
              <div className="space-y-3">
                {exchangeAssets.map(asset => (
                  <div key={asset.id} className="p-4 bg-gray-50 rounded-lg">
                    <p className="font-semibold">{asset.exchangeName}</p>
                    <p className="text-sm text-gray-600">{asset.coinName}</p>
                    <p className="text-right font-mono text-purple-600 mt-2">
                      {formatNumberWithCommas(asset.quantity)} {asset.coinName}
                    </p>
                  </div>
                ))}
              </div>
            </Card>

            {/* Binance Assets */}
            <Card className="p-6">
              <h2 className="text-lg font-bold mb-4 flex items-center">
                <Bitcoin className="mr-2" size={20} />
                바이낸스
              </h2>
              <div className="space-y-3">
                {binanceAssets.map(asset => (
                  <div key={asset.id} className="p-4 bg-gray-50 rounded-lg">
                    <p className="font-semibold">{asset.coinName}</p>
                    <p className="text-right font-mono text-yellow-600 mt-2">
                      {formatNumberWithCommas(asset.quantity)} {asset.coinName}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Recent Transactions & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Transactions */}
        <Card className="lg:col-span-2">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">최근 거래</h3>
              <Button variant="ghost" size="sm" data-testid="button-view-all-transactions">
                전체 보기 <ArrowRightLeft className="ml-1" size={16} />
              </Button>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {transactions.slice(0, 5).map(transaction => (
                <div key={transaction.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-blue-100 rounded-full">
                      <ArrowRightLeft className="text-blue-600" size={20} />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {transaction.fromAssetName} → {transaction.toAssetName}
                      </p>
                      <p className="text-sm text-gray-500">
                        {transaction.timestamp?.toDate().toLocaleString('ko-KR')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      {formatNumberWithCommas(transaction.toAmount)}
                    </p>
                    <p className="text-sm text-gray-500">
                      @{formatNumberWithCommas(transaction.rate)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Quick Actions */}
        <Card>
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">빠른 작업</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <Button 
                variant="outline" 
                className="w-full justify-start h-12" 
                onClick={() => onOpenModal('addCash')}
                data-testid="button-add-cash"
              >
                <Plus className="mr-3 text-blue-600" size={20} />
                <span className="font-medium text-blue-700">현금 추가</span>
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full justify-start h-12"
                onClick={() => onOpenModal('exchange')}
                data-testid="button-exchange"
              >
                <ArrowRightLeft className="mr-3 text-green-600" size={20} />
                <span className="font-medium text-green-700">환전하기</span>
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full justify-start h-12"
                onClick={() => onOpenModal('transfer')}
                data-testid="button-transfer"
              >
                <TrendingUp className="mr-3 text-amber-600" size={20} />
                <span className="font-medium text-amber-700">이체하기</span>
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full justify-start h-12"
                onClick={() => onOpenModal('reports')}
                data-testid="button-reports"
              >
                <BarChart3 className="mr-3 text-gray-600" size={20} />
                <span className="font-medium text-gray-700">리포트 보기</span>
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
