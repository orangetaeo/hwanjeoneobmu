import { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  ArrowRightLeft,
  BarChart3,
  Eye
} from 'lucide-react';
import { formatInputWithCommas } from '@/utils/helpers';

interface Asset {
  id: string;
  name: string;
  currency: string;
  balance: number;
  type: string;
}

interface Transaction {
  id: string;
  fromAssetName: string;
  toAssetName: string;
  fromAmount: number;
  rate: number;
  timestamp: Date;
}

export default function OriginalHomePage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Fetch assets from API
        const assetsResponse = await fetch('/api/assets');
        if (assetsResponse.ok) {
          const assetsData = await assetsResponse.json();
          setAssets(assetsData);
        }

        // Fetch transactions from API
        const transactionsResponse = await fetch('/api/transactions');
        if (transactionsResponse.ok) {
          const transactionsData = await transactionsResponse.json();
          setTransactions(transactionsData);
        }

        setLoading(false);
      } catch (error) {
        console.error('Error loading data:', error);
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Calculate totals
  const totals = useMemo(() => {
    const krwTotal = assets
      .filter(asset => asset.currency === 'KRW')
      .reduce((sum, asset) => sum + parseFloat(asset.balance.toString()), 0);

    const usdTotal = assets
      .filter(asset => asset.currency === 'USD')
      .reduce((sum, asset) => sum + parseFloat(asset.balance.toString()), 0);

    const vndTotal = assets
      .filter(asset => asset.currency === 'VND')
      .reduce((sum, asset) => sum + parseFloat(asset.balance.toString()), 0);

    const usdtTotal = assets
      .filter(asset => asset.currency === 'USDT')
      .reduce((sum, asset) => sum + parseFloat(asset.balance.toString()), 0);

    const btcTotal = assets
      .filter(asset => asset.currency === 'BTC')
      .reduce((sum, asset) => sum + parseFloat(asset.balance.toString()), 0);

    // Estimate total in KRW (simplified conversion)
    const estimatedKrwTotal = krwTotal + (usdTotal * 1350) + (vndTotal * 0.055) + (usdtTotal * 1350) + (btcTotal * 65000000);
    const estimatedVndTotal = (krwTotal * 18) + (usdTotal * 24300) + vndTotal + (usdtTotal * 24300) + (btcTotal * 1170000000);

    return {
      krw: estimatedKrwTotal,
      vnd: estimatedVndTotal,
      individual: { krw: krwTotal, usd: usdTotal, vnd: vndTotal, usdt: usdtTotal, btc: btcTotal }
    };
  }, [assets]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* 총 자산 요약 */}
        <Card className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">총 자산 요약</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-2">
              <div className="text-sm text-gray-600">원화 환산</div>
              <div className="text-3xl font-bold text-gray-900">
                ₩ {formatInputWithCommas(Math.round(totals.krw).toString())}
              </div>
              <div className="flex items-center text-green-600">
                <TrendingUp size={16} className="mr-1" />
                <span className="text-sm">+345,591(+3.09%)</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="text-sm text-gray-600">동화 환산</div>
              <div className="text-3xl font-bold text-gray-900">
                ₫ {formatInputWithCommas(Math.round(totals.vnd).toString())}
              </div>
              <div className="flex items-center text-green-600">
                <TrendingUp size={16} className="mr-1" />
                <span className="text-sm">+6,510,997(+3.09%)</span>
              </div>
            </div>
          </div>

          <Button variant="outline" className="w-full">
            <Eye size={16} className="mr-2" />
            자세히 보기
          </Button>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* 통화별 자산 */}
          <Card className="p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">통화별 자산</h3>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b">
                <div className="font-medium">KRW</div>
                <div className="text-right">
                  <div className="font-bold">₩ {formatInputWithCommas(Math.round(totals.individual.krw).toString())}</div>
                </div>
              </div>
              
              <div className="flex justify-between items-center py-2 border-b">
                <div className="font-medium">USD</div>
                <div className="text-right">
                  <div className="font-bold">$ {formatInputWithCommas(totals.individual.usd.toFixed(0))}</div>
                </div>
              </div>
              
              <div className="flex justify-between items-center py-2 border-b">
                <div className="font-medium">VND</div>
                <div className="text-right">
                  <div className="font-bold">₫ {formatInputWithCommas(Math.round(totals.individual.vnd).toString())}</div>
                </div>
              </div>
              
              <div className="flex justify-between items-center py-2 border-b">
                <div className="font-medium">USDT</div>
                <div className="text-right">
                  <div className="font-bold">₮ {formatInputWithCommas(totals.individual.usdt.toFixed(2))}</div>
                </div>
              </div>
              
              <div className="flex justify-between items-center py-2 border-b">
                <div className="font-medium">Bitcoin</div>
                <div className="text-right">
                  <div className="font-bold">{totals.individual.btc.toFixed(3)}</div>
                </div>
              </div>
              
              <div className="flex justify-between items-center py-2">
                <div className="font-medium">BTC</div>
                <div className="text-right">
                  <div className="font-bold">{totals.individual.btc.toFixed(3)}</div>
                </div>
              </div>
            </div>
          </Card>

          {/* 최근 거래 */}
          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">최근 거래</h3>
              <Button variant="outline" size="sm">전체 보기</Button>
            </div>
            
            <div className="space-y-4">
              {transactions.slice(0, 2).map((transaction) => (
                <div key={transaction.id} className="border-b pb-4 last:border-b-0">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium text-gray-900">
                        {transaction.fromAssetName} → {transaction.toAssetName}
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(transaction.timestamp).toLocaleString('ko-KR')}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">{formatInputWithCommas(transaction.fromAmount.toString())}</div>
                      <div className="text-sm text-gray-500">@{formatInputWithCommas(transaction.rate.toString())}</div>
                    </div>
                  </div>
                </div>
              ))}
              
              {transactions.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  거래 내역이 없습니다
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* 빠른 작업 */}
        <Card className="p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">빠른 작업</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button variant="outline" className="h-20 flex flex-col items-center justify-center space-y-2">
              <Plus size={24} />
              <span className="text-sm">현금 추가</span>
            </Button>
            
            <Button variant="outline" className="h-20 flex flex-col items-center justify-center space-y-2">
              <ArrowRightLeft size={24} />
              <span className="text-sm">환전하기</span>
            </Button>
            
            <Button variant="outline" className="h-20 flex flex-col items-center justify-center space-y-2">
              <TrendingUp size={24} />
              <span className="text-sm">이체하기</span>
            </Button>
            
            <Button variant="outline" className="h-20 flex flex-col items-center justify-center space-y-2">
              <BarChart3 size={24} />
              <span className="text-sm">리포트 보기</span>
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}