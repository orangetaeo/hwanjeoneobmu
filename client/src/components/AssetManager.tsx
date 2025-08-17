import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Edit, Trash2, Plus, Clock, Building, Coins, Banknote, CreditCard } from 'lucide-react';
import { CashAsset, BankAccount, ExchangeAsset, BinanceAsset, CURRENCY_SYMBOLS } from '@/types';
import { formatNumberWithCommas, formatCurrency } from '@/utils/helpers';

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

// Hook to manage button loading states
const useButtonLoading = () => {
  const [loadingButtons, setLoadingButtons] = useState<Set<string>>(new Set());
  
  const setButtonLoading = (buttonId: string, loading: boolean) => {
    setLoadingButtons(prev => {
      const newSet = new Set(prev);
      if (loading) {
        newSet.add(buttonId);
      } else {
        newSet.delete(buttonId);
      }
      return newSet;
    });
  };
  
  const isButtonLoading = (buttonId: string) => loadingButtons.has(buttonId);
  
  return { setButtonLoading, isButtonLoading };
};

export default function AssetManager({ data, onOpenModal, activeTab = "cash", onTabChange }: AssetManagerProps) {
  const { 
    cashAssets = [], 
    koreanAccounts = [], 
    vietnameseAccounts = [], 
    exchangeAssets = [], 
    binanceAssets = [] 
  } = data || {};
  
  const { setButtonLoading, isButtonLoading } = useButtonLoading();
  
  // Enhanced onOpenModal to handle loading states
  const handleOpenModal = (type: string, data?: any) => {
    const buttonId = `add-${type}`;
    if (isButtonLoading(buttonId)) return; // Prevent duplicate clicks
    
    setButtonLoading(buttonId, true);
    onOpenModal(type, data);
    
    // Reset loading state after a short delay
    setTimeout(() => {
      setButtonLoading(buttonId, false);
    }, 1000);
  };

  return (
    <div className="space-y-6">
      <Card>
        <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
          <div className="border-b border-gray-200">
            <TabsList className="grid w-full grid-cols-5 bg-transparent p-0 h-auto">
              <TabsTrigger 
                value="cash" 
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none py-4 text-sm sm:text-base font-medium"
                data-testid="tab-cash-assets"
              >
                현금 자산
              </TabsTrigger>
              <TabsTrigger 
                value="korean-banks"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none py-4 text-sm sm:text-base font-medium"
                data-testid="tab-korean-banks"
              >
                한국 은행
              </TabsTrigger>
              <TabsTrigger 
                value="vietnamese-banks"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none py-4 text-sm sm:text-base font-medium"
                data-testid="tab-vietnamese-banks"
              >
                베트남 은행
              </TabsTrigger>
              <TabsTrigger 
                value="exchanges"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none py-4 text-sm sm:text-base font-medium"
                data-testid="tab-exchanges"
              >
                거래소
              </TabsTrigger>
              <TabsTrigger 
                value="binance"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none py-4 text-sm sm:text-base font-medium"
                data-testid="tab-binance"
              >
                바이낸스
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="cash" className="p-6 space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <span className="text-xl mr-2">💰</span>
                현금 자산 관리
              </h3>
              <Button 
                onClick={() => handleOpenModal('addCashAsset')} 
                disabled={isButtonLoading('add-addCashAsset')}
                data-testid="button-add-cash-asset"
              >
                <Plus size={16} className="mr-2" />
                {isButtonLoading('add-addCashAsset') ? '처리중...' : '현금 증감'}
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {cashAssets
                .sort((a, b) => {
                  // KRW > VND > USD 순서로 정렬
                  const order = { 'KRW': 0, 'VND': 1, 'USD': 2 };
                  const aOrder = order[a.currency as keyof typeof order] ?? 999;
                  const bOrder = order[b.currency as keyof typeof order] ?? 999;
                  return aOrder - bOrder;
                })
                .map((asset: any) => (
                <Card key={asset.id} className="p-6 bg-gray-50 overflow-hidden">
                  <div className="flex justify-between items-start mb-4">
                    <div className="min-w-0 flex-1 mr-4">
                      <h4 className="font-semibold text-gray-900 flex items-center truncate">
                        <Banknote className="mr-2 flex-shrink-0" size={20} />
                        <span className="truncate">{asset.currency}</span>
                        <span className="ml-2 text-2xl flex-shrink-0">
                          {CURRENCY_SYMBOLS[asset.currency as keyof typeof CURRENCY_SYMBOLS]}
                        </span>
                      </h4>
                    </div>
                    <div className="flex space-x-2 flex-shrink-0">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => onOpenModal('editCashAsset', asset)}
                        data-testid={`button-edit-${asset.id}`}
                      >
                        <Edit size={16} />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => onOpenModal('deleteCashAsset', asset)}
                        data-testid={`button-delete-${asset.id}`}
                      >
                        <Trash2 size={16} className="text-red-600" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <p className="text-2xl font-bold text-gray-900 break-words">
                      {CURRENCY_SYMBOLS[asset.currency as keyof typeof CURRENCY_SYMBOLS]}{formatCurrency(asset.balance, asset.currency)}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h5 className="text-sm font-medium text-gray-700">지폐 구성</h5>
                    {(asset.denominations || asset.metadata?.denominations) && Object.entries(asset.denominations || asset.metadata?.denominations || {})
                      .sort(([a], [b]) => {
                        // Remove commas and convert to number for sorting
                        const numA = parseFloat(a.replace(/,/g, ''));
                        const numB = parseFloat(b.replace(/,/g, ''));
                        return numB - numA; // Sort descending (largest first)
                      })
                      .filter(([denom, count]) => Number(count) > 0) // Only show denominations with count > 0
                      .map(([denom, count]) => (
                      <div key={denom} className="flex justify-between text-sm">
                        <span className="text-gray-600">
                          {asset.currency === 'KRW' ? `${parseFloat(denom.replace(/,/g, '')).toLocaleString()}원권` :
                           asset.currency === 'USD' ? `$${denom}` :
                           asset.currency === 'VND' ? `${parseFloat(denom.replace(/,/g, '')).toLocaleString()}₫` : denom}
                        </span>
                        <span className="font-medium">{Number(count)}장</span>
                      </div>
                    ))}
                  </div>

                  {/* 현금 증감 내역 버튼 */}
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={() => onOpenModal('viewCashTransactions', asset)}
                      data-testid={`button-view-transactions-${asset.id}`}
                    >
                      <Clock size={16} className="mr-2" />
                      증감 내역 보기
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="korean-banks" className="p-6 space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <span className="text-xl mr-2">🇰🇷</span>
                한국 은행 계좌
              </h3>
              <Button 
                onClick={() => handleOpenModal('addKoreanAccount')} 
                disabled={isButtonLoading('add-addKoreanAccount')}
                data-testid="button-add-korean-account"
              >
                <Plus size={16} className="mr-2" />
                {isButtonLoading('add-addKoreanAccount') ? '처리중...' : '계좌 추가'}
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {koreanAccounts.map((account: any) => (
                <Card key={account.id} className="p-6 overflow-hidden">
                  <div className="flex justify-between items-start mb-4">
                    <div className="min-w-0 flex-1 mr-4">
                      <h4 className="font-semibold text-gray-900 flex items-center truncate">
                        <Building className="mr-2 flex-shrink-0" size={20} />
                        <span className="truncate">{account.bankName || account.metadata?.bank || account.name}</span>
                      </h4>
                      <p className="text-sm text-gray-600 truncate">{account.accountHolder || account.metadata?.accountHolder}</p>
                      <p className="text-sm text-gray-500 truncate">{account.accountNumber || account.metadata?.accountNumber}</p>
                    </div>
                    <div className="flex space-x-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => onOpenModal('editKoreanAccount', account)}
                        data-testid={`button-edit-account-${account.id}`}
                      >
                        <Edit size={16} />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => onOpenModal('deleteKoreanAccount', account)}
                        data-testid={`button-delete-account-${account.id}`}
                      >
                        <Trash2 size={16} className="text-red-600" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-xl font-bold text-blue-600 break-words">
                    ₩{formatCurrency(account.balance, 'KRW')}
                  </p>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="vietnamese-banks" className="p-6 space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <span className="text-xl mr-2">🇻🇳</span>
                베트남 은행 계좌
              </h3>
              <Button 
                onClick={() => handleOpenModal('addVietnameseAccount')} 
                disabled={isButtonLoading('add-addVietnameseAccount')}
                data-testid="button-add-vietnamese-account"
              >
                <Plus size={16} className="mr-2" />
                {isButtonLoading('add-addVietnameseAccount') ? '처리중...' : '계좌 추가'}
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {vietnameseAccounts.map((account: any) => (
                <Card key={account.id} className="p-6 overflow-hidden">
                  <div className="flex justify-between items-start mb-4">
                    <div className="min-w-0 flex-1 mr-4">
                      <h4 className="font-semibold text-gray-900 flex items-center truncate">
                        <span className="text-lg mr-2 flex-shrink-0">
                          {(() => {
                            const bankName = account.bankName || account.metadata?.bank || account.name;
                            if (bankName?.includes('BIDV')) return '🟢';
                            if (bankName?.includes('신한')) return '🔵';
                            if (bankName?.includes('우리')) return '🔷';
                            return '🏦';
                          })()}
                        </span>
                        <span className="truncate">{account.bankName || account.metadata?.bank || account.name}</span>
                      </h4>
                      <p className="text-sm text-gray-600 truncate">{account.accountHolder || account.metadata?.accountHolder}</p>
                      <p className="text-sm text-gray-500 truncate">{account.accountNumber || account.metadata?.accountNumber}</p>
                    </div>
                    <div className="flex space-x-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => onOpenModal('editVietnameseAccount', account)}
                        data-testid={`button-edit-account-${account.id}`}
                      >
                        <Edit size={16} />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => onOpenModal('deleteVietnameseAccount', account)}
                        data-testid={`button-delete-account-${account.id}`}
                      >
                        <Trash2 size={16} className="text-red-600" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-xl font-bold text-green-600 break-words">
                    ₫{formatCurrency(account.balance, 'VND')}
                  </p>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="exchanges" className="p-6 space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <span className="text-xl mr-2">₿</span>
                거래소 자산
              </h3>
              <Button 
                onClick={() => handleOpenModal('addExchangeAsset')} 
                disabled={isButtonLoading('add-addExchangeAsset')}
                data-testid="button-add-exchange-asset"
              >
                <Plus size={16} className="mr-2" />
                {isButtonLoading('add-addExchangeAsset') ? '처리중...' : '거래소/ 자산 추가'}
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {exchangeAssets.map((asset: any) => (
                <Card key={asset.id} className="p-6 overflow-hidden">
                  <div className="flex justify-between items-start mb-4">
                    <div className="min-w-0 flex-1 mr-4">
                      <h4 className="font-semibold text-gray-900 flex items-center truncate">
                        <Coins className="mr-2 flex-shrink-0" size={20} />
                        <span className="truncate">
                          {(() => {
                            const exchangeName = asset.metadata?.exchange || asset.name?.split(' ')[0] || 'Exchange';
                            // 거래소 이름을 한글로 매핑
                            const koreanNames: Record<string, string> = {
                              'Bithumb': '빗썸',
                              'Upbit': '업비트',
                              'Coinone': '코인원',
                              'Korbit': '코빗'
                            };
                            return koreanNames[exchangeName] || exchangeName;
                          })()}
                        </span>
                      </h4>
                      <p className="text-sm text-gray-600 truncate">{asset.currency}</p>
                    </div>
                    <div className="flex space-x-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => onOpenModal('editExchangeAsset', asset)}
                        data-testid={`button-edit-exchange-${asset.id}`}
                      >
                        <Edit size={16} />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => onOpenModal('deleteExchangeAsset', asset)}
                        data-testid={`button-delete-exchange-${asset.id}`}
                      >
                        <Trash2 size={16} className="text-red-600" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-xl font-bold text-purple-600 break-words">
                    {formatCurrency(asset.balance || asset.quantity, asset.currency)} {asset.currency}
                  </p>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="binance" className="p-6 space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <span className="text-xl mr-2">🟡</span>
                바이낸스 자산
              </h3>
              <Button 
                onClick={() => handleOpenModal('addBinanceAsset')} 
                disabled={isButtonLoading('add-addBinanceAsset')}
                data-testid="button-add-binance-asset"
              >
                <Plus size={16} className="mr-2" />
                {isButtonLoading('add-addBinanceAsset') ? '처리중...' : '자산 추가'}
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {binanceAssets.map((asset: any) => (
                <Card key={asset.id} className="p-6 overflow-hidden">
                  <div className="flex justify-between items-start mb-4">
                    <div className="min-w-0 flex-1 mr-4">
                      <h4 className="font-semibold text-gray-900 flex items-center truncate">
                        <Coins className="mr-2 flex-shrink-0" size={20} />
                        <span className="truncate">{asset.metadata?.exchange || 'Binance'}</span>
                      </h4>
                      <p className="text-sm text-gray-600 truncate">{asset.currency}</p>
                    </div>
                    <div className="flex space-x-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => onOpenModal('editBinanceAsset', asset)}
                        data-testid={`button-edit-binance-${asset.id}`}
                      >
                        <Edit size={16} />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => onOpenModal('deleteBinanceAsset', asset)}
                        data-testid={`button-delete-binance-${asset.id}`}
                      >
                        <Trash2 size={16} className="text-red-600" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-xl font-bold text-yellow-600 break-words">
                    {formatCurrency(asset.balance || asset.quantity, asset.currency)} {asset.currency}
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
