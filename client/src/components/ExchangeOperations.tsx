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

  console.log('🔍 ExchangeOperations 컴포넌트가 렌더링되고 있습니다!');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Coins className="mr-3 text-primary" size={24} />
          <h1 className="text-2xl font-bold">거래소 운영 시스템</h1>
        </div>
        <Badge variant="outline" className="text-sm">
          KRW → USDT → VND 프로세스 관리
        </Badge>
      </div>

      {/* 프로세스 플로우 표시 */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">거래 프로세스</h3>
        <div className="flex items-center justify-center space-x-4 text-sm">
          <div className="flex flex-col items-center p-3 bg-blue-50 rounded-lg">
            <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold mb-2">1</div>
            <span className="font-medium">빗썸</span>
            <span className="text-gray-600">KRW → USDT</span>
          </div>
          
          <ArrowRightLeft className="text-gray-400" size={20} />
          
          <div className="flex flex-col items-center p-3 bg-yellow-50 rounded-lg">
            <div className="w-8 h-8 bg-yellow-500 text-white rounded-full flex items-center justify-center font-bold mb-2">2</div>
            <span className="font-medium">네트워크 이동</span>
            <span className="text-gray-600">빗썸 → 바이낸스</span>
          </div>
          
          <ArrowRightLeft className="text-gray-400" size={20} />
          
          <div className="flex flex-col items-center p-3 bg-green-50 rounded-lg">
            <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center font-bold mb-2">3</div>
            <span className="font-medium">바이낸스 P2P</span>
            <span className="text-gray-600">USDT → VND</span>
          </div>
        </div>
      </Card>

      {/* 탭 메뉴 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="bithumb" className="flex items-center">
            <TrendingUp className="mr-2" size={16} />
            빗썸 거래
          </TabsTrigger>
          <TabsTrigger value="transfer" className="flex items-center">
            <ArrowRightLeft className="mr-2" size={16} />
            네트워크 이동
          </TabsTrigger>
          <TabsTrigger value="binance" className="flex items-center">
            <Coins className="mr-2" size={16} />
            바이낸스 P2P
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bithumb" className="mt-6">
          <BithumbTrading />
        </TabsContent>

        <TabsContent value="transfer" className="mt-6">
          <NetworkTransfer />
        </TabsContent>

        <TabsContent value="binance" className="mt-6">
          <BinanceP2P />
        </TabsContent>
      </Tabs>
    </div>
  );
}