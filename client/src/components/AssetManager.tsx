import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Edit, Trash2, Plus } from 'lucide-react';
import { CashAsset, BankAccount, ExchangeAsset, BinanceAsset, CURRENCY_SYMBOLS } from '@/types';
import { formatNumberWithCommas } from '@/utils/helpers';

interface AssetManagerProps {
  data: {
    cashAssets: CashAsset[];
    koreanAccounts: BankAccount[];
    vietnameseAccounts: BankAccount[];
    exchangeAssets: ExchangeAsset[];
    binanceAssets: BinanceAsset[];
  };
  onOpenModal: (type: string, data?: any) => void;
  activeTab?: string;
  onTabChange?: (value: string) => void;
}

export default function AssetManager({ data, onOpenModal, activeTab = "cash", onTabChange }: AssetManagerProps) {
  const { cashAssets, koreanAccounts, vietnameseAccounts, exchangeAssets, binanceAssets } = data;

  return (
    <div className="space-y-6">
      <Card>
        <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
          <div className="border-b border-gray-200">
            <TabsList className="grid w-full grid-cols-5 bg-transparent p-0 h-auto">
              <TabsTrigger 
                value="cash" 
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none py-4"
                data-testid="tab-cash-assets"
              >
                현금 자산
              </TabsTrigger>
              <TabsTrigger 
                value="korean-banks"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none py-4"
                data-testid="tab-korean-banks"
              >
                한국 은행
              </TabsTrigger>
              <TabsTrigger 
                value="vietnamese-banks"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none py-4"
                data-testid="tab-vietnamese-banks"
              >
                베트남 은행
              </TabsTrigger>
              <TabsTrigger 
                value="exchanges"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none py-4"
                data-testid="tab-exchanges"
              >
                거래소
              </TabsTrigger>
              <TabsTrigger 
                value="binance"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none py-4"
                data-testid="tab-binance"
              >
                바이낸스
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="cash" className="p-6 space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">현금 자산 관리</h3>
              <Button onClick={() => onOpenModal('addCashAsset')} data-testid="button-add-cash-asset">
                <Plus size={16} className="mr-2" />
                현금 추가
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {cashAssets.map(asset => (
                <Card key={asset.id} className="p-6 bg-gray-50">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="font-semibold text-gray-900 flex items-center">
                        <span>{asset.currency}</span>
                        <span className="ml-2 text-2xl">
                          {CURRENCY_SYMBOLS[asset.currency as keyof typeof CURRENCY_SYMBOLS]}
                        </span>
                      </h4>
                      <p className="text-sm text-gray-600">{asset.name}</p>
                    </div>
                    <div className="flex space-x-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => onOpenModal('editAsset', asset)}
                        data-testid={`button-edit-${asset.id}`}
                      >
                        <Edit size={16} />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => onOpenModal('deleteAsset', asset)}
                        data-testid={`button-delete-${asset.id}`}
                      >
                        <Trash2 size={16} className="text-red-600" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <p className="text-2xl font-bold text-gray-900">
                      {CURRENCY_SYMBOLS[asset.currency as keyof typeof CURRENCY_SYMBOLS]}{formatNumberWithCommas(asset.balance)}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h5 className="text-sm font-medium text-gray-700">지폐 구성</h5>
                    {Object.entries(asset.denominations)
                      .sort(([a], [b]) => {
                        // Remove commas and convert to number for sorting
                        const numA = parseFloat(a.replace(/,/g, ''));
                        const numB = parseFloat(b.replace(/,/g, ''));
                        return numB - numA; // Sort descending (largest first)
                      })
                      .filter(([denom, count]) => count > 0) // Only show denominations with count > 0
                      .map(([denom, count]) => (
                      <div key={denom} className="flex justify-between text-sm">
                        <span className="text-gray-600">
                          {asset.currency === 'KRW' ? `${formatNumberWithCommas(denom)}원권` :
                           asset.currency === 'USD' ? `$${denom}` :
                           asset.currency === 'VND' ? `${formatNumberWithCommas(denom)}₫` : denom}
                        </span>
                        <span className="font-medium">{count}장</span>
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="korean-banks" className="p-6 space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">한국 은행 계좌</h3>
              <Button onClick={() => onOpenModal('addKoreanAccount')} data-testid="button-add-korean-account">
                <Plus size={16} className="mr-2" />
                계좌 추가
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {koreanAccounts.map(account => (
                <Card key={account.id} className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="font-semibold text-gray-900">{account.bankName}</h4>
                      <p className="text-sm text-gray-600">{account.accountHolder}</p>
                      <p className="text-sm text-gray-500">{account.accountNumber}</p>
                    </div>
                    <div className="flex space-x-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => onOpenModal('editAccount', account)}
                        data-testid={`button-edit-account-${account.id}`}
                      >
                        <Edit size={16} />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => onOpenModal('deleteAccount', account)}
                        data-testid={`button-delete-account-${account.id}`}
                      >
                        <Trash2 size={16} className="text-red-600" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-xl font-bold text-blue-600">
                    ₩{formatNumberWithCommas(account.balance)}
                  </p>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="vietnamese-banks" className="p-6 space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">베트남 은행 계좌</h3>
              <Button onClick={() => onOpenModal('addVietnameseAccount')} data-testid="button-add-vietnamese-account">
                <Plus size={16} className="mr-2" />
                계좌 추가
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {vietnameseAccounts.map(account => (
                <Card key={account.id} className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="font-semibold text-gray-900">{account.bankName}</h4>
                      <p className="text-sm text-gray-600">{account.accountHolder}</p>
                      <p className="text-sm text-gray-500">{account.accountNumber}</p>
                    </div>
                    <div className="flex space-x-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => onOpenModal('editAccount', account)}
                        data-testid={`button-edit-account-${account.id}`}
                      >
                        <Edit size={16} />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => onOpenModal('deleteAccount', account)}
                        data-testid={`button-delete-account-${account.id}`}
                      >
                        <Trash2 size={16} className="text-red-600" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-xl font-bold text-green-600">
                    ₫{formatNumberWithCommas(account.balance)}
                  </p>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="exchanges" className="p-6 space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">거래소 자산</h3>
              <Button onClick={() => onOpenModal('addExchangeAsset')} data-testid="button-add-exchange-asset">
                <Plus size={16} className="mr-2" />
                거래소/ 자산 추가
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {exchangeAssets.map(asset => (
                <Card key={asset.id} className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="font-semibold text-gray-900">{asset.exchangeName}</h4>
                      <p className="text-sm text-gray-600">{asset.coinName}</p>
                    </div>
                    <div className="flex space-x-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => onOpenModal('editAsset', asset)}
                        data-testid={`button-edit-exchange-${asset.id}`}
                      >
                        <Edit size={16} />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => onOpenModal('deleteAsset', asset)}
                        data-testid={`button-delete-exchange-${asset.id}`}
                      >
                        <Trash2 size={16} className="text-red-600" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-xl font-bold text-purple-600">
                    {formatNumberWithCommas(asset.quantity)} {asset.coinName}
                  </p>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="binance" className="p-6 space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">바이낸스 자산</h3>
              <Button onClick={() => onOpenModal('addBinanceAsset')} data-testid="button-add-binance-asset">
                <Plus size={16} className="mr-2" />
                자산 추가
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {binanceAssets.map(asset => (
                <Card key={asset.id} className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="font-semibold text-gray-900">{asset.coinName}</h4>
                    </div>
                    <div className="flex space-x-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => onOpenModal('editAsset', asset)}
                        data-testid={`button-edit-binance-${asset.id}`}
                      >
                        <Edit size={16} />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => onOpenModal('deleteAsset', asset)}
                        data-testid={`button-delete-binance-${asset.id}`}
                      >
                        <Trash2 size={16} className="text-red-600" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-xl font-bold text-yellow-600">
                    {formatNumberWithCommas(asset.quantity)} {asset.coinName}
                  </p>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
