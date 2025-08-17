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
      {/* 모바일 최적화 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0 mb-3 sm:mb-6">
        <div className="flex items-center">
          <Coins className="mr-2 sm:mr-3 text-primary" size={20} />
          <h1 className="text-xl sm:text-2xl font-bold">거래소 운영</h1>
        </div>
        <Badge variant="outline" className="text-xs sm:text-sm self-start sm:self-center">
          KRW → USDT → VND 프로세스
        </Badge>
      </div>

      {/* 모바일 최적화 프로세스 플로우 */}
      <Card className="p-3 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">거래 프로세스</h3>
        <div className="flex flex-col sm:flex-row items-center justify-center space-y-3 sm:space-y-0 sm:space-x-4 text-xs sm:text-sm">
          {/* 1단계 */}
          <div className="flex flex-col items-center p-2 sm:p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg w-full sm:w-auto">
            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold mb-1 sm:mb-2 text-xs sm:text-sm">1</div>
            <span className="font-medium text-xs sm:text-sm">빗썸</span>
            <span className="text-gray-600 dark:text-gray-400 text-xs">KRW → USDT</span>
          </div>
          
          {/* 화살표 - 모바일에서는 세로, 데스크톱에서는 가로 */}
          <ArrowRightLeft className="text-gray-400 rotate-90 sm:rotate-0" size={16} />
          
          {/* 2단계 */}
          <div className="flex flex-col items-center p-2 sm:p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg w-full sm:w-auto">
            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-yellow-500 text-white rounded-full flex items-center justify-center font-bold mb-1 sm:mb-2 text-xs sm:text-sm">2</div>
            <span className="font-medium text-xs sm:text-sm">네트워크 이동</span>
            <span className="text-gray-600 dark:text-gray-400 text-xs">빗썸 → 바이낸스</span>
          </div>
          
          <ArrowRightLeft className="text-gray-400 rotate-90 sm:rotate-0" size={16} />
          
          {/* 3단계 */}
          <div className="flex flex-col items-center p-2 sm:p-3 bg-green-50 dark:bg-green-900/20 rounded-lg w-full sm:w-auto">
            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-green-500 text-white rounded-full flex items-center justify-center font-bold mb-1 sm:mb-2 text-xs sm:text-sm">3</div>
            <span className="font-medium text-xs sm:text-sm">바이낸스 P2P</span>
            <span className="text-gray-600 dark:text-gray-400 text-xs">USDT → VND</span>
          </div>
        </div>
      </Card>

      {/* 모바일 최적화 탭 메뉴 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-auto p-1">
          <TabsTrigger value="bithumb" className="flex flex-col sm:flex-row items-center justify-center py-3 px-2 text-sm sm:text-base">
            <TrendingUp className="mb-1 sm:mb-0 sm:mr-2" size={16} />
            <span className="hidden xs:inline sm:inline">빗썸 거래</span>
            <span className="xs:hidden sm:hidden">빗썸</span>
          </TabsTrigger>
          <TabsTrigger value="transfer" className="flex flex-col sm:flex-row items-center justify-center py-3 px-2 text-sm sm:text-base">
            <ArrowRightLeft className="mb-1 sm:mb-0 sm:mr-2" size={16} />
            <span className="hidden xs:inline sm:inline">네트워크 이동</span>
            <span className="xs:hidden sm:hidden">이동</span>
          </TabsTrigger>
          <TabsTrigger value="binance" className="flex flex-col sm:flex-row items-center justify-center py-3 px-2 text-sm sm:text-base">
            <Coins className="mb-1 sm:mb-0 sm:mr-2" size={16} />
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