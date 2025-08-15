import { useMemo, useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown,
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
import CurrencyIcon from '@/components/CurrencyIcon';
import { CashAsset, BankAccount, ExchangeAsset, BinanceAsset, Transaction, CURRENCY_SYMBOLS } from '@/types';
import { formatNumberWithCommas, formatCurrency } from '@/utils/helpers';

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
  const [yesterdayAssets, setYesterdayAssets] = useState<{ krw: number; vnd: number } | null>(null);

  // Calculate total assets in KRW and VND
  const totalAssets = useMemo(() => {
    if (isFetchingRates || !realTimeRates['USD-KRW']) {
      return { krw: 0, vnd: 0 };
    }

    const all = [...cashAssets, ...koreanAccounts, ...vietnameseAccounts, ...exchangeAssets, ...binanceAssets];
    let totalKrw = 0;

    all.forEach(asset => {
      try {
        const balance = Number((asset as any).balance ?? (asset as any).quantity ?? 0);
        const currency = (asset as any).currency;
        const coinName = (asset as any).coinName;

        // Validate numeric balance - support both balance and quantity fields
        const balanceValue = balance || ((asset as any).quantity);
        if (isNaN(balanceValue) || balanceValue < 0) {
          console.warn(`Invalid balance for asset ${(asset as any).name || 'unknown'}: ${balanceValue}`);
          return;
        }

        // Validate currency exists
        if (!currency) {
          console.warn(`Missing currency for asset ${(asset as any).name || 'unknown'}`);
          return;
        }

        console.log('Dashboard asset calculation:', { 
          name: (asset as any).name, 
          currency, 
          balanceValue, 
          coinName, 
          usdtRate: realTimeRates['USDT-KRW'],
          cryptoRates: cryptoRates
        });

        switch(currency) {
          case 'KRW': 
            if (coinName && cryptoRates && cryptoRates[coinName]?.KRW) {
              totalKrw += (balanceValue * cryptoRates[coinName].KRW);
            } else {
              totalKrw += balanceValue;
            }
            break;
          case 'VND': 
            totalKrw += balanceValue * (realTimeRates['VND-KRW'] || 0); 
            break;
          case 'USD': 
            totalKrw += balanceValue * (realTimeRates['USD-KRW'] || 0); 
            break;
          case 'USDT': 
            const usdtRate = realTimeRates['USDT-KRW'] || 0;
            console.log('USDT calculation:', { balanceValue, usdtRate, result: balanceValue * usdtRate });
            totalKrw += balanceValue * usdtRate;
            break;
          default: 
            if (coinName && cryptoRates && cryptoRates[coinName]?.KRW) {
              totalKrw += balanceValue * cryptoRates[coinName].KRW;
            } else if (coinName && cryptoRates && cryptoRates[coinName]?.USDT) {
              totalKrw += (balanceValue * cryptoRates[coinName].USDT) * (realTimeRates['USDT-KRW'] || 0);
            } else {
              console.warn(`Unknown currency or missing rate data for asset: ${currency}, coinName: ${coinName}`);
            }
            break;
        }
      } catch (error) {
        console.error('Error calculating asset value:', error, asset);
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
    
    // PostgreSQL 데이터 구조에 맞게 수정
    const allAssets = [...cashAssets, ...koreanAccounts, ...vietnameseAccounts, ...exchangeAssets, ...binanceAssets];
    
    allAssets.forEach(asset => {
      const assetData = asset as any;
      const currency = assetData.currency || 'Unknown';
      const balance = parseFloat(assetData.balance || assetData.quantity) || 0;
      
      console.log('Dashboard asset summary:', { asset: assetData.name, currency, balance, balance_field: assetData.balance, quantity_field: assetData.quantity });
      
      if (currency && balance > 0) {
        summary[currency] = (summary[currency] || 0) + balance;
      }
    });
    

    return summary;
  }, [cashAssets, koreanAccounts, vietnameseAccounts, exchangeAssets, binanceAssets]);

  // Save today's assets and load yesterday's data
  useEffect(() => {
    if (!isFetchingRates && totalAssets.krw > 0) {
      // PostgreSQL API를 통한 히스토리 데이터 처리로 변경 예정
      // 임시적으로 데모 데이터 사용
      setYesterdayAssets({
        krw: totalAssets.krw * 0.97, // 3% lower than today
        vnd: totalAssets.vnd * 0.97
      });
    }
  }, [totalAssets, isFetchingRates]);

  // Calculate change from yesterday
  const assetChange = useMemo(() => {
    if (!yesterdayAssets) return null;
    
    const krwChange = totalAssets.krw - yesterdayAssets.krw;
    const vndChange = totalAssets.vnd - yesterdayAssets.vnd;
    const krwPercentage = yesterdayAssets.krw > 0 ? (krwChange / yesterdayAssets.krw) * 100 : 0;
    const vndPercentage = yesterdayAssets.vnd > 0 ? (vndChange / yesterdayAssets.vnd) * 100 : 0;
    
    return {
      krw: krwChange,
      vnd: vndChange,
      krwPercentage,
      vndPercentage
    };
  }, [totalAssets, yesterdayAssets]);

  return (
    <div className="space-y-6">
      {/* Total Asset Summary */}
      <Card className="p-6">
        <h2 className="text-lg font-bold mb-4">총 자산 요약</h2>
        {isFetchingRates ? (
          <p className="text-gray-500">환율 정보 로딩 중...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="text-center">
              <p className="text-sm text-gray-500 mb-2">원화 환산</p>
              <p className="text-3xl font-bold text-blue-600">
                {CURRENCY_SYMBOLS.KRW} {formatCurrency(totalAssets.krw, 'KRW')}
              </p>
              {assetChange && (
                <div className={`flex items-center justify-center mt-2 text-sm ${assetChange.krw >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {assetChange.krw >= 0 ? <TrendingUp size={16} className="mr-1" /> : <TrendingDown size={16} className="mr-1" />}
                  <span>
                    {assetChange.krw >= 0 ? '+' : ''}{formatCurrency(Math.abs(assetChange.krw), 'KRW')} 
                    ({assetChange.krwPercentage >= 0 ? '+' : ''}{assetChange.krwPercentage.toFixed(2)}%)
                  </span>
                </div>
              )}
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500 mb-2">동화 환산</p>
              <p className="text-3xl font-bold text-green-600">
                {CURRENCY_SYMBOLS.VND} {formatCurrency(totalAssets.vnd, 'VND')}
              </p>
              {assetChange && (
                <div className={`flex items-center justify-center mt-2 text-sm ${assetChange.vnd >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {assetChange.vnd >= 0 ? <TrendingUp size={16} className="mr-1" /> : <TrendingDown size={16} className="mr-1" />}
                  <span>
                    {assetChange.vnd >= 0 ? '+' : ''}{formatCurrency(Math.abs(assetChange.vnd), 'VND')} 
                    ({assetChange.vndPercentage >= 0 ? '+' : ''}{assetChange.vndPercentage.toFixed(2)}%)
                  </span>
                </div>
              )}
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
          {Object.entries(assetSummary)
            .filter(([currency, total]) => currency && total > 0) // 유효한 데이터만 표시
            .map(([currency, total]) => {
              const formattedTotal = formatCurrency(total, currency);
              const currencySymbol = CURRENCY_SYMBOLS[currency as keyof typeof CURRENCY_SYMBOLS] || '';
              
              return (
                <Card key={currency} className="p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-center justify-center mb-3">
                    <CurrencyIcon currency={currency} size={40} />
                  </div>
                  <h3 className="text-lg font-bold text-gray-600 mb-2">{currency}</h3>
                  <p className="text-xl font-semibold text-gray-800">
                    {currencySymbol} {formattedTotal}
                  </p>
                  {/* 환율 정보 표시 */}
                  {currency === 'USDT' && realTimeRates['USDT-KRW'] && (
                    <p className="text-xs text-gray-500 mt-2">
                      ≈ ₩{formatCurrency(total * realTimeRates['USDT-KRW'], 'KRW')}
                    </p>
                  )}
                  {currency === 'USD' && realTimeRates['USD-KRW'] && (
                    <p className="text-xs text-gray-500 mt-2">
                      ≈ ₩{formatCurrency(total * realTimeRates['USD-KRW'], 'KRW')}
                    </p>
                  )}
                  {currency === 'VND' && realTimeRates['VND-KRW'] && (
                    <p className="text-xs text-gray-500 mt-2">
                      ≈ ₩{formatCurrency(total * realTimeRates['VND-KRW'], 'KRW')}
                    </p>
                  )}
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
                    <div className="flex items-center">
                      <CurrencyIcon currency={asset.currency} size={24} className="mr-3" />
                      <p className="font-semibold">{asset.name}</p>
                    </div>
                    <p className="font-mono text-gray-800">
                      {formatCurrency(asset.balance, asset.currency)} {asset.currency}
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
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <CurrencyIcon currency="KRW" size={24} className="mr-3" />
                        <div>
                          <p className="font-semibold">
                            {acc.bankName} 
                            <span className="text-sm font-normal text-gray-600 ml-2">
                              ({acc.accountHolder})
                            </span>
                          </p>
                          <p className="text-sm text-gray-500">{acc.accountNumber}</p>
                        </div>
                      </div>
                      <p className="font-mono text-blue-600">
                        {formatCurrency(acc.balance, 'KRW')} KRW
                      </p>
                    </div>
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
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <CurrencyIcon currency="VND" size={24} className="mr-3" />
                        <div>
                          <p className="font-semibold">
                            {acc.bankName}
                            <span className="text-sm font-normal text-gray-600 ml-2">
                              ({acc.accountHolder})
                            </span>
                          </p>
                          <p className="text-sm text-gray-500">{acc.accountNumber}</p>
                        </div>
                      </div>
                      <p className="font-mono text-green-600">
                        {formatCurrency(acc.balance, 'VND')} VND
                      </p>
                    </div>
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
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <CurrencyIcon currency={asset.coinName} size={24} className="mr-3" />
                        <div>
                          <p className="font-semibold">{asset.exchangeName}</p>
                          <p className="text-sm text-gray-600">{asset.coinName}</p>
                        </div>
                      </div>
                      <p className="font-mono text-purple-600">
                        {formatCurrency(asset.quantity, asset.coinName)} {asset.coinName}
                      </p>
                    </div>
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
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <CurrencyIcon currency={asset.coinName} size={24} className="mr-3" />
                        <p className="font-semibold">{asset.coinName}</p>
                      </div>
                      <p className="font-mono text-yellow-600">
                        {formatCurrency(asset.quantity, asset.coinName)} {asset.coinName}
                      </p>
                    </div>
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
                        {transaction.timestamp instanceof Date 
                          ? transaction.timestamp.toLocaleString('ko-KR')
                          : new Date(transaction.timestamp).toLocaleString('ko-KR')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      {formatCurrency(transaction.toAmount, transaction.toCurrency)}
                    </p>
                    <p className="text-sm text-gray-500">
                      @{formatCurrency(transaction.rate, transaction.toCurrency)}
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
