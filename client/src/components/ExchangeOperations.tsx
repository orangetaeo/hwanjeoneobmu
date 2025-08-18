import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, ArrowRightLeft, Coins } from 'lucide-react';
import BithumbTrading from './BithumbTrading';
import NetworkTransfer from './NetworkTransfer';
import BinanceP2P from './BinanceP2P';

export default function ExchangeOperations() {
  const [activeTab, setActiveTab] = useState('bithumb');

  return (
    <div className="space-y-3 sm:space-y-6 px-2 sm:px-0">
      {/* 헤더 - 다른 페이지와 통일된 디자인 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0 mb-3 sm:mb-6">
        <div className="flex items-center">
          <span className="text-2xl mr-3">🔄</span>
          <h1 className="text-xl sm:text-2xl font-bold">거래소 운영</h1>
        </div>
        <Badge variant="outline" className="text-xs sm:text-sm self-start sm:self-center">
          KRW → USDT → VND 프로세스
        </Badge>
      </div>



      {/* 탭 메뉴 - 디자인 통일화 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-auto p-1">
          <TabsTrigger value="bithumb" className="flex flex-col sm:flex-row items-center justify-center py-3 px-2 text-sm sm:text-base">
            <span className="text-lg mb-1 sm:mb-0 sm:mr-2">🔵</span>
            <span className="hidden xs:inline sm:inline">빗썸 거래</span>
            <span className="xs:hidden sm:hidden">빗썸</span>
          </TabsTrigger>
          <TabsTrigger value="transfer" className="flex flex-col sm:flex-row items-center justify-center py-3 px-2 text-sm sm:text-base">
            <span className="text-lg mb-1 sm:mb-0 sm:mr-2">🔄</span>
            <span className="hidden xs:inline sm:inline">네트워크 이동</span>
            <span className="xs:hidden sm:hidden">이동</span>
          </TabsTrigger>
          <TabsTrigger value="binance" className="flex flex-col sm:flex-row items-center justify-center py-3 px-2 text-sm sm:text-base">
            <span className="text-lg mb-1 sm:mb-0 sm:mr-2">🟡</span>
            <span className="hidden xs:inline sm:inline">바이낸스 P2P</span>
            <span className="xs:hidden sm:hidden">P2P</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bithumb" className="mt-3 sm:mt-6">
          <BithumbTrading />
        </TabsContent>

        <TabsContent value="transfer" className="mt-3 sm:mt-6">
          <NetworkTransfer />
        </TabsContent>

        <TabsContent value="binance" className="mt-3 sm:mt-6">
          <BinanceP2P />
        </TabsContent>
      </Tabs>
    </div>
  );
}