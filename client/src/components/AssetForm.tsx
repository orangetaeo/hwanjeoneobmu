import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Plus, Minus, X } from 'lucide-react';
import { formatInputWithCommas, parseCommaFormattedNumber } from '@/utils/helpers';

const cashAssetSchema = z.object({
  currency: z.enum(['KRW', 'USD', 'VND'], { required_error: "통화를 선택해주세요" }),
  balance: z.number().min(0, "잔액은 0 이상이어야 합니다"),
  denominations: z.record(z.string(), z.number().min(0)),
  operation: z.enum(['increase', 'decrease']).optional(),
  memo: z.string().optional()
});

const accountSchema = z.object({
  bankName: z.string().min(1, "은행명을 입력해주세요"),
  accountNumber: z.string().min(1, "계좌번호를 입력해주세요"),
  accountHolder: z.string().min(1, "예금주를 입력해주세요"),
  balance: z.number().min(0, "잔액은 0 이상이어야 합니다")
});

const cryptoAssetSchema = z.object({
  exchangeName: z.string().optional(),
  coinName: z.string().min(1, "코인명을 입력해주세요"),
  quantity: z.number().min(0, "수량은 0 이상이어야 합니다"),
  currency: z.string().default('USDT')
});

interface AssetFormProps {
  type: 'cash' | 'korean-account' | 'vietnamese-account' | 'exchange' | 'binance';
  editData?: any;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

// 거래소 목록
const DEFAULT_EXCHANGES = ['Bithumb', 'Upbit', 'Coinone', 'Korbit', 'Binance', 'OKX'];

// 코인 목록  
const DEFAULT_COINS = ['BTC', 'ETH', 'XRP', 'ADA', 'DOT', 'USDT', 'USDC'];

export default function AssetForm({ type, editData, onSubmit, onCancel }: AssetFormProps) {
  // 기본 지폐 구성 정의
  const getDefaultDenominations = (currency: string) => {
    const defaultDenoms: Record<string, Record<string, number>> = {
      'KRW': { '50,000': 0, '10,000': 0, '5,000': 0, '1,000': 0 },
      'USD': { '100': 0, '50': 0, '20': 0, '10': 0, '5': 0, '2': 0, '1': 0 },
      'VND': { '500,000': 0, '200,000': 0, '100,000': 0, '50,000': 0, '20,000': 0, '10,000': 0, '5,000': 0, '2,000': 0, '1,000': 0 }
    };
    return defaultDenoms[currency] || defaultDenoms['KRW'];
  };

  const [denominations, setDenominations] = useState(() => {
    // editData가 있고 metadata.denominations이 있을 때
    if (editData?.metadata?.denominations) {
      return editData.metadata.denominations;
    }
    
    // 새로 추가하는 경우 KRW를 기본으로 설정
    if (type === 'cash') {
      return { '50,000': 0, '10,000': 0, '5,000': 0, '1,000': 0 };
    }
    return {};
  });
  
  // 현금 자산의 증가/감소 모드 (음수 허용)
  const [operation, setOperation] = useState<'increase' | 'decrease'>('increase');
  
  // 입력 필드의 표시 값을 관리 (음수 입력 중일 때 "-" 표시용)
  const [inputDisplayValues, setInputDisplayValues] = useState<Record<string, string>>({});
  
  // 현재 보유 자산 정보 (통화 선택 시 API에서 조회)
  const [currentAssetInfo, setCurrentAssetInfo] = useState<any>(null);

  // 거래소 및 코인 관리 state
  const [exchanges, setExchanges] = useState(DEFAULT_EXCHANGES);
  const [coins, setCoins] = useState(DEFAULT_COINS);
  const [showExchangeInput, setShowExchangeInput] = useState(false);
  const [showCoinInput, setShowCoinInput] = useState(false);
  const [newExchange, setNewExchange] = useState('');
  const [newCoin, setNewCoin] = useState('');
  
  // Loading state for form submission to prevent duplicate clicks
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 거래소 추가 함수
  const addExchange = () => {
    if (newExchange.trim() && !exchanges.includes(newExchange.trim())) {
      setExchanges([...exchanges, newExchange.trim()]);
      setNewExchange('');
      setShowExchangeInput(false);
    }
  };

  // 코인 추가 함수
  const addCoin = () => {
    if (newCoin.trim() && !coins.includes(newCoin.trim().toUpperCase())) {
      setCoins([...coins, newCoin.trim().toUpperCase()]);
      setNewCoin('');
      setShowCoinInput(false);
    }
  };

  // 현재 보유 자산 정보 조회
  const fetchCurrentAssetInfo = async (currency: string) => {
    try {
      const response = await fetch('/api/assets');
      const assets = await response.json();
      const existingAsset = assets.find((asset: any) => 
        asset.type === 'cash' && asset.currency === currency
      );
      
      if (existingAsset) {
        console.log('Found existing asset with denominations:', existingAsset.metadata?.denominations);
        
        setCurrentAssetInfo({
          currency: existingAsset.currency,
          balance: parseFloat(existingAsset.balance),
          denominations: existingAsset.metadata?.denominations || {}
        });
      } else {
        console.log('No existing asset found for currency:', currency);
        setCurrentAssetInfo(null);
      }
    } catch (error) {
      console.error('Error fetching current asset info:', error);
      setCurrentAssetInfo(null);
    }
  };

  // Check for duplicate bank accounts
  const checkBankAccountDuplicate = async (formData: any) => {
    try {
      const response = await fetch('/api/assets');
      const assets = await response.json();
      
      // 실제 데이터베이스에서는 모든 계좌가 'account' 타입으로 저장됨
      const expectedCurrency = type === 'korean-account' ? 'KRW' : 'VND';
      
      const existingAccount = assets.find((asset: any) => {
        const typeMatch = asset.type === 'account';
        const currencyMatch = asset.currency === expectedCurrency;
        const bankMatch = (asset.metadata?.bank || asset.metadata?.bankName) === formData.bankName;
        const holderMatch = asset.metadata?.accountHolder === formData.accountHolder;
        const accountMatch = asset.metadata?.accountNumber === formData.accountNumber;
        const notEditing = asset.id !== editData?.id;
        
        return typeMatch && currencyMatch && bankMatch && holderMatch && accountMatch && notEditing;
      });
      
      return existingAccount;
    } catch (error) {
      console.error('Error checking bank account duplicate:', error);
      return null;
    }
  };

  // Check for duplicate exchange assets
  const checkExchangeAssetDuplicate = async (formData: any) => {
    try {
      const response = await fetch('/api/assets');
      const assets = await response.json();
      
      const existingAsset = assets.find((asset: any) => {
        const typeMatch = asset.type === 'exchange';
        const nameMatch = asset.name === formData.exchangeName;
        const currencyMatch = asset.currency === formData.coinName;
        const notEditing = asset.id !== editData?.id;
        
        return typeMatch && nameMatch && currencyMatch && notEditing;
      });
      
      return existingAsset;
    } catch (error) {
      console.error('Error checking exchange asset duplicate:', error);
      return null;
    }
  };

  // Check for duplicate binance assets
  const checkBinanceAssetDuplicate = async (formData: any) => {
    try {
      const response = await fetch('/api/assets');
      const assets = await response.json();
      
      const expectedName = `Binance ${formData.coinName}`;
      
      const existingAsset = assets.find((asset: any) => {
        const typeMatch = asset.type === 'binance';
        const currencyMatch = asset.currency === formData.coinName;
        // 기존 이름 패턴도 고려 ("Binance" 또는 "Binance USDT")
        const nameMatch = asset.name === expectedName || 
                         (asset.name === 'Binance' && formData.coinName === 'USDT');
        const notEditing = asset.id !== editData?.id;
        
        return typeMatch && nameMatch && currencyMatch && notEditing;
      });
      
      return existingAsset;
    } catch (error) {
      console.error('Error checking binance asset duplicate:', error);
      return null;
    }
  };

  const getSchema = () => {
    switch (type) {
      case 'cash': return cashAssetSchema;
      case 'korean-account':
      case 'vietnamese-account': return accountSchema;
      case 'exchange':
      case 'binance': return cryptoAssetSchema;
      default: 
        console.warn(`Unknown asset type: ${type}, using basic schema`);
        return z.object({
          name: z.string().min(1, "이름을 입력해주세요"),
          balance: z.number().min(0, "잔액은 0 이상이어야 합니다")
        });
    }
  };

  const form = useForm({
    resolver: zodResolver(getSchema()),
    defaultValues: getFormValues()
  });

  // editData 변경 시 denominations 업데이트
  useEffect(() => {
    if (editData && type === 'cash') {
      const denomData = editData.metadata?.denominations || editData.denominations;
      if (denomData && Object.keys(denomData).length > 0) {
        console.log('Setting denominations from editData:', denomData);
        setDenominations(denomData);
      }
    }
  }, [editData?.id, type, editData?.metadata?.denominations, editData?.denominations]);

  // 현재 선택된 통화를 추적하기 위한 ref
  const [lastCurrency, setLastCurrency] = useState<string>('');

  // 새로 추가할 때 통화 변경 시 현재 자산 정보 조회 및 지폐 구성 초기화
  useEffect(() => {
    if (!editData && type === 'cash') {
      const currentCurrency = form.watch('currency');
      
      if (currentCurrency) {
        fetchCurrentAssetInfo(currentCurrency);
        
        // 통화가 실제로 변경된 경우에만 지폐 구성 초기화
        if (lastCurrency && lastCurrency !== currentCurrency) {
          const newDenoms = getDefaultDenominations(currentCurrency);
          console.log('Currency changed from', lastCurrency, 'to', currentCurrency, 'setting denominations:', newDenoms);
          setDenominations(newDenoms);
          setInputDisplayValues({});
        } else if (!lastCurrency) {
          // 처음 로드될 때도 지폐 구성 설정
          const newDenoms = getDefaultDenominations(currentCurrency);
          console.log('Initial load for currency:', currentCurrency, 'setting denominations:', newDenoms);
          setDenominations(newDenoms);
        }
        
        // 현재 통화를 lastCurrency로 설정
        setLastCurrency(currentCurrency);
      }
    }
  }, [form.watch('currency'), editData, type, lastCurrency]);

  function getFormValues() {
    if (editData) {
      // PostgreSQL 데이터 구조에 맞게 변환
      const formData: any = {};
      
      console.log('Raw editData received:', editData);
      
      if (type === 'cash') {
        formData.currency = editData.currency;
        formData.balance = parseFloat(editData.balance) || 0;
        const denominations = editData.metadata?.denominations || editData.denominations || {};
        formData.denominations = denominations;
        formData.memo = editData.metadata?.memo || '';
        
        console.log('Cash edit data processed:', {
          currency: formData.currency,
          balance: formData.balance,
          denominations: denominations
        });
      } else if (type === 'korean-account' || type === 'vietnamese-account') {
        // 데이터베이스에서는 metadata에 저장됨
        formData.bankName = editData.metadata?.bank || editData.bankName || editData.name?.split(' ')[0] || '';
        formData.accountNumber = editData.metadata?.accountNumber || editData.accountNumber || '';
        formData.accountHolder = editData.metadata?.accountHolder || editData.accountHolder || '';
        formData.balance = parseFloat(editData.balance) || 0;
        
        console.log('Account edit data processed:', {
          bankName: formData.bankName,
          accountNumber: formData.accountNumber,
          accountHolder: formData.accountHolder,
          balance: formData.balance,
          rawMetadata: editData.metadata
        });
      } else if (type === 'exchange') {
        // 데이터베이스에서는 metadata.exchange에 거래소명이 저장됨
        formData.exchangeName = editData.metadata?.exchange || editData.exchangeName || editData.name?.split(' ')[0] || '';
        formData.coinName = editData.currency || editData.coinName || editData.name?.split(' ')[1] || '';
        formData.quantity = parseFloat(editData.balance) || editData.quantity || 0;
        formData.currency = editData.currency || 'USDT';
        
        console.log('Exchange edit data processed:', {
          exchangeName: formData.exchangeName,
          coinName: formData.coinName,
          quantity: formData.quantity,
          currency: formData.currency,
          rawMetadata: editData.metadata
        });
      } else if (type === 'binance') {
        // 데이터베이스에서는 metadata.exchange에 "Binance"가 저장됨
        formData.coinName = editData.currency || editData.coinName || editData.name?.split(' ')[1] || '';
        formData.quantity = parseFloat(editData.balance) || editData.quantity || 0;
        formData.currency = editData.currency || 'USDT';
        
        console.log('Binance edit data processed:', {
          coinName: formData.coinName,
          quantity: formData.quantity,
          currency: formData.currency,
          rawMetadata: editData.metadata
        });
      }
      
      console.log('Final edit form data:', formData);
      return formData;
    }
    
    return getDefaultValues();
  }

  function getDefaultValues() {
    switch (type) {
      case 'cash':
        return { currency: 'KRW', balance: 0, denominations: {}, operation: 'increase', memo: '' };
      case 'korean-account':
      case 'vietnamese-account':
        return { bankName: '', accountNumber: '', accountHolder: '', balance: 0 };
      case 'exchange':
        return { exchangeName: '', coinName: '', quantity: 0, currency: 'USDT' };
      case 'binance':
        return { coinName: '', quantity: 0, currency: 'USDT' };
      default:
        console.warn(`Unknown asset type: ${type}, using basic defaults`);
        return { name: '', balance: 0 };
    }
  }

  const handleFormSubmit = async (data: any) => {
    if (isSubmitting) return; // Prevent duplicate submissions
    
    setIsSubmitting(true);
    
    try {
      // Check for duplicates based on asset type
      if (type === 'korean-account' || type === 'vietnamese-account') {
        const duplicateAccount = await checkBankAccountDuplicate(data);
        if (duplicateAccount) {
          alert('동일한 계좌가 이미 존재합니다.\n은행명, 계좌번호, 예금주가 모두 동일한 계좌입니다.');
          setIsSubmitting(false);
          return;
        }
      } else if (type === 'exchange') {
        const duplicateExchange = await checkExchangeAssetDuplicate(data);
        if (duplicateExchange) {
          // For exchanges, update existing asset instead of showing error
          data.id = duplicateExchange.id; // 실제 데이터베이스 ID 사용
          const existingBalance = parseFloat(duplicateExchange.balance);
          const addingQuantity = parseFloat(data.quantity);
          const newBalance = existingBalance + addingQuantity;
          data.balance = newBalance.toString();
          data.originalAsset = duplicateExchange; // 원본 자산 정보 보존
          
          console.log('거래소 계산:', {
            existing: existingBalance,
            adding: addingQuantity,
            result: newBalance,
            stringResult: data.balance
          });
          
          alert(`동일한 거래소/코인 조합이 발견되어 기존 자산에 추가합니다.\n${duplicateExchange.name} ${duplicateExchange.currency}: ${duplicateExchange.balance} + ${data.quantity} = ${data.balance}`);
        }
      } else if (type === 'binance') {
        const duplicateBinance = await checkBinanceAssetDuplicate(data);
        if (duplicateBinance) {
          // For binance, update existing asset instead of showing error
          data.id = duplicateBinance.id; // 실제 데이터베이스 ID 사용
          const existingBalance = parseFloat(duplicateBinance.balance);
          const addingQuantity = parseFloat(data.quantity);
          const newBalance = existingBalance + addingQuantity;
          data.balance = newBalance.toString();
          data.originalAsset = duplicateBinance; // 원본 자산 정보 보존
          
          console.log('바이낸스 계산:', {
            existing: existingBalance,
            adding: addingQuantity,
            result: newBalance,
            stringResult: data.balance
          });
          
          alert(`동일한 코인이 발견되어 기존 자산에 추가합니다.\n${duplicateBinance.name}: ${duplicateBinance.balance} + ${data.quantity} = ${data.balance}`);
        }
      }
    
      if (type === 'cash') {
        // 현재 denominations 상태를 사용 (폼 데이터가 아닌)
        const finalDenominations = { ...denominations };
        
        // Validate denominations object
        if (typeof finalDenominations !== 'object' || finalDenominations === null) {
          throw new Error('Invalid denominations data');
        }
        
        // 폼 데이터의 denominations 대신 현재 상태 사용
        data.denominations = finalDenominations;
        data.balance = Object.entries(finalDenominations).reduce((total, [denom, count]) => {
          // Remove commas from denomination string before parsing
          const denomValue = parseFloat(String(denom).replace(/,/g, ''));
          const countValue = typeof count === 'number' ? count : 0;
          
          if (isNaN(denomValue) || isNaN(countValue)) {
            console.warn(`Invalid denomination data: ${denom}=${count}`);
            return total;
          }
          
          return total + (denomValue * countValue);
        }, 0);
        
        // Ensure currency is set
        if (!data.currency) {
          data.currency = editData?.currency || 'KRW';
        }
        
        // Generate name based on selected currency
        data.name = `${data.currency} 현금`;
        data.type = 'cash';
        data.operation = operation; // 증가/감소 정보 추가
        
        // 메타데이터에 지폐 구성과 메모 포함
        data.metadata = {
          denominations: finalDenominations,
          memo: data.memo || ''
        };
        // Generate unique ID if not editing
        if (!editData) {
          data.id = Date.now().toString();
        } else {
          data.id = editData.id;
        }
      } else if (type === 'exchange') {
        // 거래소 자산의 이름과 메타데이터 설정
        data.name = data.exchangeName || 'Exchange';
        data.type = 'exchange';
        data.currency = data.coinName || 'USDT';
        
        // 중복 처리에서 이미 balance가 설정되었다면 그대로 사용
        if (!data.balance) {
          data.balance = data.quantity?.toString() || '0';
        }
        
        data.metadata = {
          exchange: data.exchangeName || 'Exchange',
          assetType: 'crypto'
        };
        
        // Generate unique ID if not editing and not a duplicate update
        if (!editData && !data.id) {
          data.id = Date.now().toString();
        } else if (editData) {
          data.id = editData.id;
        }
      } else if (type === 'binance') {
        // 바이낸스 자산의 이름과 메타데이터 설정
        data.name = 'Binance ' + (data.coinName || 'USDT');
        data.type = 'binance';
        data.currency = data.coinName || 'USDT';
        
        // 중복 처리에서 이미 balance가 설정되었다면 그대로 사용
        if (!data.balance) {
          data.balance = data.quantity?.toString() || '0';
        }
        
        data.metadata = {
          exchange: 'Binance',
          assetType: 'crypto'
        };
        
        // Generate unique ID if not editing and not a duplicate update
        if (!editData && !data.id) {
          data.id = Date.now().toString();
        } else if (editData) {
          data.id = editData.id;
        }
      } else if (type === 'korean-account' || type === 'vietnamese-account') {
        // 계좌 자산의 이름 설정
        data.name = `${data.bankName} (${data.accountHolder})`;
        data.type = type;
        data.currency = type === 'korean-account' ? 'KRW' : 'VND';
        data.metadata = {
          bank: data.bankName,
          accountNumber: data.accountNumber,
          accountHolder: data.accountHolder
        };
        
        // Generate unique ID if not editing
        if (!editData) {
          data.id = Date.now().toString();
        } else {
          data.id = editData.id;
        }
      } else {
        // For other asset types, generate ID if not editing
        if (!editData) {
          data.id = Date.now().toString();
        } else {
          data.id = editData.id;
        }
      }
      
      console.log('AssetForm onSubmit 전달 데이터:', data);
      onSubmit(data);
    } catch (error) {
      console.error('Error in duplicate checking or form submission:', error);
      alert('처리 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateDenomination = (denom: string, value: number) => {
    setDenominations((prev: Record<string, number>) => ({
      ...prev,
      [denom]: value // 음수도 허용
    }));
  };

  // 지폐 고유 색상 반환 함수
  const getDenominationColor = (currency: string, denomination: string) => {
    const denomValue = parseFloat(denomination.replace(/,/g, ''));
    
    switch (currency) {
      case 'KRW':
        if (denomValue >= 50000) return 'bg-yellow-100 border-yellow-300'; // 노란색 계열
        if (denomValue >= 10000) return 'bg-green-100 border-green-300'; // 초록색 계열
        if (denomValue >= 5000) return 'bg-red-100 border-red-300'; // 빨간색 계열
        return 'bg-blue-100 border-blue-300'; // 파란색 계열
        
      case 'USD':
        if (denomValue >= 100) return 'bg-green-100 border-green-300'; // 초록색 계열 (달러 특성)
        if (denomValue >= 50) return 'bg-pink-100 border-pink-300'; // 분홍색 계열
        if (denomValue >= 20) return 'bg-green-50 border-green-200'; // 연한 초록색
        if (denomValue >= 10) return 'bg-yellow-100 border-yellow-300'; // 노란색 계열
        if (denomValue >= 5) return 'bg-purple-100 border-purple-300'; // 보라색 계열
        if (denomValue >= 2) return 'bg-gray-100 border-gray-300'; // 회색 계열
        return 'bg-emerald-100 border-emerald-300'; // 에메랄드 계열
        
      case 'VND':
        if (denomValue >= 500000) return 'bg-purple-100 border-purple-300'; // 보라색 계열
        if (denomValue >= 200000) return 'bg-orange-100 border-orange-300'; // 주황색 계열
        if (denomValue >= 100000) return 'bg-green-100 border-green-300'; // 초록색 계열
        if (denomValue >= 50000) return 'bg-pink-100 border-pink-300'; // 분홍색 계열
        if (denomValue >= 20000) return 'bg-blue-100 border-blue-300'; // 파란색 계열
        if (denomValue >= 10000) return 'bg-yellow-100 border-yellow-300'; // 노란색 계열
        if (denomValue >= 5000) return 'bg-red-100 border-red-300'; // 빨간색 계열
        if (denomValue >= 2000) return 'bg-teal-100 border-teal-300'; // 청록색 계열
        return 'bg-indigo-100 border-indigo-300'; // 남색 계열
        
      default:
        return 'bg-gray-100 border-gray-300';
    }
  };

  const getTitle = () => {
    if (type === 'cash') {
      return editData ? '현금 자산 수정' : '현금 증감';
    }
    
    const titles = {
      'korean-account': editData ? '한국 계좌 수정' : '한국 계좌 추가',
      'vietnamese-account': editData ? '베트남 계좌 수정' : '베트남 계좌 추가',
      'exchange': editData ? '거래소 자산 수정' : '거래소 자산 추가',
      'binance': editData ? '바이낸스 자산 수정' : '바이낸스 자산 추가'
    };

    return titles[type as keyof typeof titles];
  };

  // 지폐 구성에 실제 변경사항이 있는지 확인하는 함수
  const hasChanges = () => {
    if (type !== 'cash') return true; // 현금 자산이 아니면 항상 true
    
    // 현재 보유 자산이 없으면 새로 추가하는 것이므로 지폐가 하나라도 있으면 true
    if (!currentAssetInfo) {
      return Object.values(denominations).some((count) => (typeof count === 'number' ? count : 0) > 0);
    }
    
    // 기존 자산이 있으면 변경사항이 있는지 확인
    const currentDenominations = currentAssetInfo.denominations || {};
    
    // 현재 지폐 구성과 기존 지폐 구성을 비교
    const allDenoms = [
      ...Object.keys(denominations),
      ...Object.keys(currentDenominations)
    ];
    
    for (const denom of allDenoms) {
      const currentCount = denominations[denom] || 0;
      const existingCount = currentDenominations[denom] || 0;
      
      if (currentCount !== 0) { // 0이 아닌 값이 하나라도 있으면 변경사항 있음
        return true;
      }
    }
    
    return false; // 모든 지폐가 0이면 변경사항 없음
  };

  return (
    <Card className="bg-white rounded-lg shadow-xl overflow-y-auto max-h-[95vh] sm:max-h-none">
      <div className="p-4 sm:p-6">
        <div className="flex justify-between items-center mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900">{getTitle()}</h2>
          <Button variant="ghost" size="sm" onClick={onCancel} data-testid="button-close">
            <X size={20} />
          </Button>
        </div>
        
        <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 sm:space-y-6">
          {type === 'cash' && (
            <>
              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>통화</FormLabel>
                    <Select 
                      onValueChange={(value) => {
                        field.onChange(value);
                        // 새로 추가할 때만 denominations 초기화
                        if (!editData) {
                          const defaultDenoms: Record<string, Record<string, number>> = {
                            'KRW': { '50,000': 0, '10,000': 0, '5,000': 0, '1,000': 0 },
                            'USD': { '100': 0, '50': 0, '20': 0, '10': 0, '5': 0, '2': 0, '1': 0 },
                            'VND': { '500,000': 0, '200,000': 0, '100,000': 0, '50,000': 0, '20,000': 0, '10,000': 0, '5,000': 0, '2,000': 0, '1,000': 0 }
                          };
                          setDenominations(defaultDenoms[value] || {});
                          // 현재 보유 자산 정보 조회
                          fetchCurrentAssetInfo(value);
                        }
                      }} 
                      value={field.value}
                      defaultValue={field.value}
                      disabled={!!editData} // 수정 시 통화 변경 불가
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-currency">
                          <SelectValue placeholder="통화를 선택하세요" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="KRW">KRW (원화)</SelectItem>
                        <SelectItem value="USD">USD (달러)</SelectItem>
                        <SelectItem value="VND">VND (베트남 동)</SelectItem>
                      </SelectContent>
                    </Select>
                    {editData && <p className="text-xs text-gray-500 mt-1">수정 시 통화는 변경할 수 없습니다.</p>}
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 현재 보유 자산 정보 표시 - 실시간 계산 */}
              {!editData && form.watch('currency') && currentAssetInfo && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
                  <h4 className="font-medium text-gray-800 flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    현재 보유 {currentAssetInfo.currency} 자산 {Object.entries(denominations).some(([, count]) => count !== 0) && (
                      <span className="text-xs text-blue-600 font-normal ml-1">(실시간 계산 중)</span>
                    )}
                  </h4>
                  <div className="grid grid-cols-1 gap-3">
                    {/* 기존 총 잔액 */}
                    <div className="flex justify-between items-center bg-gray-100 rounded p-3 border border-gray-200">
                      <span className="text-gray-600">기존 총 잔액:</span>
                      <span className="font-semibold text-gray-800">
                        {form.watch('currency') === 'KRW' ? '₩' : 
                         form.watch('currency') === 'USD' ? '$' : '₫'}
                        {currentAssetInfo.balance.toLocaleString()}
                      </span>
                    </div>
                    
                    {/* 현금 증감 박스 - 항상 표시 */}
                    <div className="flex justify-between items-center bg-blue-50 rounded p-3 border border-blue-200">
                      <span className="text-blue-700">
                        {Object.entries(denominations).reduce((total, [denom, count]) => {
                          return total + (parseFloat(denom.replace(/,/g, '')) * ((typeof count === 'number' ? count : 0)));
                        }, 0) >= 0 ? '현금 증감:' : '현금 증감:'}
                      </span>
                      <span className={`font-semibold ${
                        Object.entries(denominations).reduce((total, [denom, count]) => {
                          return total + (parseFloat(denom.replace(/,/g, '')) * ((typeof count === 'number' ? count : 0)));
                        }, 0) >= 0 ? 'text-green-700' : 'text-red-700'
                      }`}>
                        {(() => {
                          const changeAmount = Object.entries(denominations).reduce((total, [denom, count]) => {
                            return total + (parseFloat(denom.replace(/,/g, '')) * ((typeof count === 'number' ? count : 0)));
                          }, 0);
                          const currencySymbol = form.watch('currency') === 'KRW' ? '₩' : 
                                                form.watch('currency') === 'USD' ? '$' : '₫';
                          
                          if (changeAmount === 0) {
                            return `${currencySymbol}0`;
                          } else if (changeAmount >= 0) {
                            return `+${currencySymbol}${changeAmount.toLocaleString()}`;
                          } else {
                            return `-${currencySymbol}${Math.abs(changeAmount).toLocaleString()}`;
                          }
                        })()}
                      </span>
                    </div>

                    {/* 실시간 총 잔액 계산 */}
                    <div className="flex justify-between items-center bg-white rounded p-3 border-2 border-blue-300 shadow-sm">
                      <span className="text-blue-800 font-medium">계산 후 총 잔액:</span>
                      <span className="font-bold text-blue-900 text-lg">
                        {form.watch('currency') === 'KRW' ? '₩' : 
                         form.watch('currency') === 'USD' ? '$' : '₫'}
                        {(() => {
                          const changedAmount = Object.entries(denominations).reduce((total, [denom, count]) => {
                            return total + (parseFloat(denom.replace(/,/g, '')) * ((typeof count === 'number' ? count : 0)));
                          }, 0);
                          const newBalance = currentAssetInfo.balance + changedAmount;
                          return newBalance.toLocaleString();
                        })()}
                      </span>
                    </div>
                    {/* 실시간 지폐 구성 계산 */}
                    {form.watch('currency') && (
                      <div className="space-y-2">
                        <span className="text-sm text-gray-600">지폐 구성:</span>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                          {/* 현재 보유중인 모든 지폐 및 새로 추가되는 지폐 표시 */}
                          {(() => {
                            // 현재 보유 지폐와 변경할 지폐를 모두 포함한 전체 지폐 목록 생성
                            const allDenoms = new Set([
                              ...Object.keys(currentAssetInfo?.denominations || {}),
                              ...Object.keys(denominations)
                            ]);
                            
                            // KRW 통화인 경우 4개 지폐 강제 표시
                            if (form.watch('currency') === 'KRW') {
                              return ['50,000', '10,000', '5,000', '1,000'].map((denom) => {
                                // 콤마 있는 키와 콤마 없는 키 모두 체크
                                const denomWithoutComma = denom.replace(/,/g, '');
                                const currentCount = (currentAssetInfo?.denominations?.[denom] as number) || 
                                                   (currentAssetInfo?.denominations?.[denomWithoutComma] as number) || 0;
                                const changeCount = denominations[denom] || 0;
                                const newCount = currentCount + changeCount;
                                
                                // KRW는 0이어도 모든 지폐 표시
                                
                                return (
                                  <div key={denom} className={`flex justify-between items-center rounded px-2 py-1 border ${
                                    changeCount !== 0 ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-100'
                                  }`}>
                                    <span className="text-gray-600">
                                      {parseFloat(denom.replace(/,/g, '')).toLocaleString()}원권:
                                    </span>
                                    <div className="flex items-center space-x-2">
                                      {editData && (
                                        <div className="flex items-center space-x-1">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setDenominations((prev: Record<string, number>) => ({
                                                ...prev,
                                                [denom]: (prev[denom] || 0) - 1
                                              }));
                                            }}
                                            className="w-5 h-5 rounded-full bg-red-100 hover:bg-red-200 flex items-center justify-center text-red-600 text-xs"
                                            data-testid={`button-decrease-${denom}-display`}
                                          >
                                            -
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setDenominations((prev: Record<string, number>) => ({
                                                ...prev,
                                                [denom]: (prev[denom] || 0) + 1
                                              }));
                                            }}
                                            className="w-5 h-5 rounded-full bg-green-100 hover:bg-green-200 flex items-center justify-center text-green-600 text-xs"
                                            data-testid={`button-increase-${denom}-display`}
                                          >
                                            +
                                          </button>
                                        </div>
                                      )}
                                      <span className={`font-medium ${changeCount !== 0 ? 'text-blue-800' : 'text-gray-800'}`}>
                                        {newCount}장
                                        {changeCount !== 0 && (
                                          <span className={`text-xs ml-1 ${changeCount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            ({changeCount > 0 ? '+' : ''}{changeCount})
                                          </span>
                                        )}
                                      </span>
                                    </div>
                                  </div>
                                );
                              });
                            } else if (currentAssetInfo?.denominations && Object.keys(currentAssetInfo.denominations).length > 0) {
                              // 다른 통화는 키 정규화를 통해 중복 방지
                              const normalizedDenoms = new Map<string, { normalizedKey: string, currentCount: number, changeCount: number }>();
                              
                              // 기존 지폐 처리 (콤마 없는 키를 콤마 있는 형태로 변환)
                              Object.entries(currentAssetInfo.denominations).forEach(([key, count]) => {
                                const numericValue = parseFloat(key.replace(/,/g, ''));
                                const normalizedKey = numericValue.toLocaleString();
                                if (!normalizedDenoms.has(normalizedKey)) {
                                  normalizedDenoms.set(normalizedKey, { normalizedKey, currentCount: 0, changeCount: 0 });
                                }
                                normalizedDenoms.get(normalizedKey)!.currentCount += (typeof count === 'number' ? count : 0);
                              });
                              
                              // 변경 지폐 처리 (콤마 있는 키를 동일한 형태로 처리)
                              Object.entries(denominations).forEach(([key, count]) => {
                                const numericValue = parseFloat(key.replace(/,/g, ''));
                                const normalizedKey = numericValue.toLocaleString();
                                if (!normalizedDenoms.has(normalizedKey)) {
                                  normalizedDenoms.set(normalizedKey, { normalizedKey, currentCount: 0, changeCount: 0 });
                                }
                                normalizedDenoms.get(normalizedKey)!.changeCount += (typeof count === 'number' ? count : 0);
                              });
                              
                              return Array.from(normalizedDenoms.values())
                                .sort((a, b) => {
                                  const numA = parseFloat(a.normalizedKey.replace(/,/g, ''));
                                  const numB = parseFloat(b.normalizedKey.replace(/,/g, ''));
                                  return numB - numA;
                                })
                                .map(({ normalizedKey, currentCount, changeCount }) => {
                                  const newCount = currentCount + changeCount;
                                  
                                  // 현재 수량과 변경 수량이 모두 0이면 표시하지 않음
                                  if (currentCount === 0 && changeCount === 0) return null;
                                  
                                  return (
                                    <div key={normalizedKey} className={`flex justify-between items-center rounded px-2 py-1 border ${
                                      changeCount !== 0 ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-100'
                                    }`}>
                                      <span className="text-gray-600">
                                        {form.watch('currency') === 'USD' ? `$${normalizedKey}` :
                                         `${normalizedKey}₫`}:
                                      </span>
                                      <div className="flex items-center space-x-2">
                                        {editData && (
                                          <div className="flex items-center space-x-1">
                                            <button
                                              type="button"
                                              onClick={() => {
                                                // 콤마 있는 키를 사용하여 상태 업데이트
                                                const commaKey = parseFloat(normalizedKey.replace(/,/g, '')).toLocaleString();
                                                setDenominations((prev: Record<string, number>) => ({
                                                  ...prev,
                                                  [commaKey]: (prev[commaKey] || 0) - 1
                                                }));
                                              }}
                                              className="w-5 h-5 rounded-full bg-red-100 hover:bg-red-200 flex items-center justify-center text-red-600 text-xs"
                                              data-testid={`button-decrease-${normalizedKey}-display`}
                                            >
                                              -
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                // 콤마 있는 키를 사용하여 상태 업데이트
                                                const commaKey = parseFloat(normalizedKey.replace(/,/g, '')).toLocaleString();
                                                setDenominations((prev: Record<string, number>) => ({
                                                  ...prev,
                                                  [commaKey]: (prev[commaKey] || 0) + 1
                                                }));
                                              }}
                                              className="w-5 h-5 rounded-full bg-green-100 hover:bg-green-200 flex items-center justify-center text-green-600 text-xs"
                                              data-testid={`button-increase-${normalizedKey}-display`}
                                            >
                                              +
                                            </button>
                                          </div>
                                        )}
                                        <span className={`font-medium ${changeCount !== 0 ? 'text-blue-800' : 'text-gray-800'}`}>
                                          {newCount}장
                                          {changeCount !== 0 && (
                                            <span className={`text-xs ml-1 ${changeCount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                              ({changeCount > 0 ? '+' : ''}{changeCount})
                                            </span>
                                          )}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })
                                .filter(Boolean); // null 값 제거
                            }
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 수정 모드일 때 기존 자산과 새로운 자산 비교 표시 */}
              {editData && (
                <div className="space-y-4">
                  <div className="bg-white/70 rounded-lg p-3 border border-blue-100">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-blue-700">기존 총계:</span>
                      <span className="font-semibold text-blue-800">
                        {form.watch('currency') === 'KRW' ? '₩' : 
                         form.watch('currency') === 'USD' ? '$' : '₫'}
                        {Object.entries(editData?.metadata?.denominations || editData?.denominations || {}).reduce((total, [denom, count]) => {
                          return total + (parseFloat(denom.replace(/,/g, '')) * ((typeof count === 'number' ? count : 0)));
                        }, 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="inline-block w-8 h-0.5 bg-blue-300"></div>
                    <div className="text-xs text-blue-600 font-medium mt-1">수정 후</div>
                  </div>
                  <div className="bg-white rounded-lg p-4 border-2 border-blue-200 shadow-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-blue-800 font-medium text-lg">새로운 총계:</span>
                      <span className="text-2xl font-bold text-blue-900">
                        {form.watch('currency') === 'KRW' ? '₩' : 
                         form.watch('currency') === 'USD' ? '$' : '₫'}
                        {Object.entries(denominations).reduce((total, [denom, count]) => {
                          return total + (parseFloat(denom.replace(/,/g, '')) * ((typeof count === 'number' ? count : 0)));
                        }, 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <h3 className="font-medium text-gray-900">지폐 구성</h3>
              
              {/* KRW 현금 새로 추가 모드 - 4개 지폐 강제 표시 */}
              {type === 'cash' && form.watch('currency') === 'KRW' && !editData && (
                <div className="space-y-6">
                  
                  {/* 50,000원권 */}
                  <div className="grid grid-cols-1 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 gap-6">
                    <div className={`space-y-3 p-4 border rounded-lg min-w-0 ${getDenominationColor(form.watch('currency'), '50,000')}`}>
                      <label className="text-xs font-semibold text-gray-800 block text-center">
                        50,000원권
                      </label>
                      <div className="flex items-center space-x-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newValue = (denominations['50,000'] || 0) - 1;
                            const newDenoms = { 
                              '50,000': newValue, 
                              '10,000': denominations['10,000'] || 0, 
                              '5,000': denominations['5,000'] || 0, 
                              '1,000': denominations['1,000'] || 0 
                            };
                            setDenominations(newDenoms);
                          }}
                          className="h-8 w-8 p-0 flex-shrink-0"
                          data-testid="button-decrease-50000-new"
                        >
                          <Minus size={14} />
                        </Button>
                        <Input
                          type="text"
                          value={(denominations['50,000'] || 0).toString()}
                          onChange={(e) => {
                            const value = parseInt(e.target.value) || 0;
                            const newDenoms = { 
                              '50,000': value, 
                              '10,000': denominations['10,000'] || 0, 
                              '5,000': denominations['5,000'] || 0, 
                              '1,000': denominations['1,000'] || 0 
                            };
                            setDenominations(newDenoms);
                          }}
                          className="h-10 sm:h-9 text-center flex-1 min-w-0"
                          placeholder="0"
                          data-testid="input-50000-new"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newValue = (denominations['50,000'] || 0) + 1;
                            const newDenoms = { 
                              '50,000': newValue, 
                              '10,000': denominations['10,000'] || 0, 
                              '5,000': denominations['5,000'] || 0, 
                              '1,000': denominations['1,000'] || 0 
                            };
                            setDenominations(newDenoms);
                          }}
                          className="h-8 w-8 p-0 flex-shrink-0"
                          data-testid="button-increase-50000-new"
                        >
                          <Plus size={14} />
                        </Button>
                      </div>
                      <div className="text-xs text-gray-500 text-center">
                        총액: ₩{(50000 * (denominations['50,000'] || 0)).toLocaleString()}
                      </div>
                    </div>

                    {/* 10,000원권 */}
                    <div className={`space-y-3 p-4 border rounded-lg min-w-0 ${getDenominationColor(form.watch('currency'), '10,000')}`}>
                      <label className="text-xs font-semibold text-gray-800 block text-center">
                        10,000원권
                      </label>
                      <div className="flex items-center space-x-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newValue = (denominations['10,000'] || 0) - 1;
                            const newDenoms = { 
                              '50,000': denominations['50,000'] || 0, 
                              '10,000': newValue, 
                              '5,000': denominations['5,000'] || 0, 
                              '1,000': denominations['1,000'] || 0 
                            };
                            setDenominations(newDenoms);
                          }}
                          className="h-8 w-8 p-0 flex-shrink-0"
                          data-testid="button-decrease-10000-new"
                        >
                          <Minus size={14} />
                        </Button>
                        <Input
                          type="text"
                          value={(denominations['10,000'] || 0).toString()}
                          onChange={(e) => {
                            const value = parseInt(e.target.value) || 0;
                            const newDenoms = { 
                              '50,000': denominations['50,000'] || 0, 
                              '10,000': value, 
                              '5,000': denominations['5,000'] || 0, 
                              '1,000': denominations['1,000'] || 0 
                            };
                            setDenominations(newDenoms);
                          }}
                          className="h-10 sm:h-9 text-center flex-1 min-w-0"
                          placeholder="0"
                          data-testid="input-10000-new"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newValue = (denominations['10,000'] || 0) + 1;
                            const newDenoms = { 
                              '50,000': denominations['50,000'] || 0, 
                              '10,000': newValue, 
                              '5,000': denominations['5,000'] || 0, 
                              '1,000': denominations['1,000'] || 0 
                            };
                            setDenominations(newDenoms);
                          }}
                          className="h-8 w-8 p-0 flex-shrink-0"
                          data-testid="button-increase-10000-new"
                        >
                          <Plus size={14} />
                        </Button>
                      </div>
                      <div className="text-xs text-gray-500 text-center">
                        총액: ₩{(10000 * (denominations['10,000'] || 0)).toLocaleString()}
                      </div>
                    </div>

                    {/* 5,000원권 */}
                    <div className={`space-y-3 p-4 border rounded-lg min-w-0 ${getDenominationColor(form.watch('currency'), '5,000')}`}>
                      <label className="text-xs font-semibold text-gray-800 block text-center">
                        5,000원권
                      </label>
                      <div className="flex items-center space-x-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newValue = (denominations['5,000'] || 0) - 1;
                            const newDenoms = { 
                              '50,000': denominations['50,000'] || 0, 
                              '10,000': denominations['10,000'] || 0, 
                              '5,000': newValue, 
                              '1,000': denominations['1,000'] || 0 
                            };
                            setDenominations(newDenoms);
                          }}
                          className="h-8 w-8 p-0 flex-shrink-0"
                          data-testid="button-decrease-5000-new"
                        >
                          <Minus size={14} />
                        </Button>
                        <Input
                          type="text"
                          value={(denominations['5,000'] || 0).toString()}
                          onChange={(e) => {
                            const value = parseInt(e.target.value) || 0;
                            const newDenoms = { 
                              '50,000': denominations['50,000'] || 0, 
                              '10,000': denominations['10,000'] || 0, 
                              '5,000': value, 
                              '1,000': denominations['1,000'] || 0 
                            };
                            setDenominations(newDenoms);
                          }}
                          className="h-10 sm:h-9 text-center flex-1 min-w-0"
                          placeholder="0"
                          data-testid="input-5000-new"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newValue = (denominations['5,000'] || 0) + 1;
                            const newDenoms = { 
                              '50,000': denominations['50,000'] || 0, 
                              '10,000': denominations['10,000'] || 0, 
                              '5,000': newValue, 
                              '1,000': denominations['1,000'] || 0 
                            };
                            setDenominations(newDenoms);
                          }}
                          className="h-8 w-8 p-0 flex-shrink-0"
                          data-testid="button-increase-5000-new"
                        >
                          <Plus size={14} />
                        </Button>
                      </div>
                      <div className="text-xs text-gray-500 text-center">
                        총액: ₩{(5000 * (denominations['5,000'] || 0)).toLocaleString()}
                      </div>
                    </div>

                    {/* 1,000원권 */}
                    <div className={`space-y-3 p-4 border rounded-lg min-w-0 ${getDenominationColor(form.watch('currency'), '1,000')}`}>
                      <label className="text-xs font-semibold text-gray-800 block text-center">
                        1,000원권
                      </label>
                      <div className="flex items-center space-x-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newValue = (denominations['1,000'] || 0) - 1;
                            const newDenoms = { 
                              '50,000': denominations['50,000'] || 0, 
                              '10,000': denominations['10,000'] || 0, 
                              '5,000': denominations['5,000'] || 0, 
                              '1,000': newValue 
                            };
                            setDenominations(newDenoms);
                          }}
                          className="h-8 w-8 p-0 flex-shrink-0"
                          data-testid="button-decrease-1000-new"
                        >
                          <Minus size={14} />
                        </Button>
                        <Input
                          type="text"
                          value={(denominations['1,000'] || 0).toString()}
                          onChange={(e) => {
                            const value = parseInt(e.target.value) || 0;
                            const newDenoms = { 
                              '50,000': denominations['50,000'] || 0, 
                              '10,000': denominations['10,000'] || 0, 
                              '5,000': denominations['5,000'] || 0, 
                              '1,000': value 
                            };
                            setDenominations(newDenoms);
                          }}
                          className="h-10 sm:h-9 text-center flex-1 min-w-0"
                          placeholder="0"
                          data-testid="input-1000-new"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newValue = (denominations['1,000'] || 0) + 1;
                            const newDenoms = { 
                              '50,000': denominations['50,000'] || 0, 
                              '10,000': denominations['10,000'] || 0, 
                              '5,000': denominations['5,000'] || 0, 
                              '1,000': newValue 
                            };
                            setDenominations(newDenoms);
                          }}
                          className="h-8 w-8 p-0 flex-shrink-0"
                          data-testid="button-increase-1000-new"
                        >
                          <Plus size={14} />
                        </Button>
                      </div>
                      <div className="text-xs text-gray-500 text-center">
                        총액: ₩{(1000 * (denominations['1,000'] || 0)).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* USD, VND 통화 새로 추가 모드 - 동적 입력 필드 */}
              {type === 'cash' && form.watch('currency') !== 'KRW' && !editData && (
                <div className="space-y-4">
                  {Object.entries(denominations).length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(denominations)
                        .sort((a, b) => {
                          const numA = parseFloat(a[0].replace(/,/g, ''));
                          const numB = parseFloat(b[0].replace(/,/g, ''));
                          return numB - numA;
                        })
                        .map(([denom, count]) => (
                          <div key={denom} className={`space-y-3 p-4 border rounded-lg ${getDenominationColor(form.watch('currency'), denom)}`}>
                          <label className="text-xs font-semibold text-gray-800 block text-center">
                            {form.watch('currency') === 'USD' ? 
                              `$${denom}` : 
                              `${parseFloat(denom.replace(/,/g, '')).toLocaleString()}₫`
                            }
                          </label>
                          <div className="flex items-center space-x-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const currentCount = typeof count === 'number' ? count : 0;
                                const newValue = currentCount - 1;
                                setDenominations((prev: Record<string, number>) => ({
                                  ...prev,
                                  [denom]: newValue
                                }));
                              }}
                              className="h-8 w-8 p-0 flex-shrink-0"
                              data-testid={`button-decrease-${denom}-new`}
                            >
                              <Minus size={14} />
                            </Button>
                            <Input
                              type="text"
                              value={(typeof count === 'number' ? count : 0).toString()}
                              onChange={(e) => {
                                const value = parseInt(e.target.value) || 0;
                                setDenominations((prev: Record<string, number>) => ({
                                  ...prev,
                                  [denom]: value
                                }));
                              }}
                              className="h-10 sm:h-9 text-center flex-1 min-w-0"
                              placeholder="0"
                              data-testid={`input-${denom}-new`}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const currentCount = typeof count === 'number' ? count : 0;
                                const newValue = currentCount + 1;
                                setDenominations((prev: Record<string, number>) => ({
                                  ...prev,
                                  [denom]: newValue
                                }));
                              }}
                              className="h-8 w-8 p-0 flex-shrink-0"
                              data-testid={`button-increase-${denom}-new`}
                            >
                              <Plus size={14} />
                            </Button>
                          </div>
                          <div className="text-xs text-gray-500 text-center">
                            총액: {form.watch('currency') === 'USD' ? '$' : '₫'}
                            {(parseFloat(denom.replace(/,/g, '')) * (typeof count === 'number' ? count : 0)).toLocaleString()}
                          </div>
                        </div>
                        ))
                      }
                    </div>
                  ) : (
                    <div className="text-center text-gray-500 py-4">
                      통화를 선택하면 지폐 입력 필드가 표시됩니다.
                    </div>
                  )}
                </div>
              )}

              {/* 수정 모드일 때 KRW 하드코딩된 지폐 구조 */}
              {editData && form.watch('currency') === 'KRW' && (
                <div className="space-y-6">
                  {/* 50,000원권 */}
                  <div className="grid grid-cols-1 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 gap-6">
                    <div className={`space-y-3 p-4 border rounded-lg min-w-0 ${getDenominationColor(form.watch('currency'), '50,000')}`}>
                      <label className="text-xs font-semibold text-gray-800 block text-center">
                        50,000원권
                      </label>
                      <div className="flex items-center space-x-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newValue = (denominations['50,000'] || 0) - 1;
                            const newDenoms = { 
                              '50,000': newValue, 
                              '10,000': denominations['10,000'] || 0, 
                              '5,000': denominations['5,000'] || 0, 
                              '1,000': denominations['1,000'] || 0 
                            };
                            setDenominations(newDenoms);
                            setInputDisplayValues(prev => ({
                              ...prev,
                              '50,000': formatInputWithCommas(newValue.toString())
                            }));
                          }}
                          className="h-8 w-8 p-0 flex-shrink-0"
                          data-testid="button-decrease-50000"
                        >
                          <Minus size={14} />
                        </Button>
                        <Input
                          type="text"
                          value={inputDisplayValues['50,000'] !== undefined ? inputDisplayValues['50,000'] : formatInputWithCommas((denominations['50,000'] || 0).toString())}
                          onChange={(e) => {
                            const inputValue = e.target.value;
                            setInputDisplayValues(prev => ({
                              ...prev,
                              '50,000': inputValue
                            }));
                            
                            if (inputValue === '') {
                              const newDenoms = { 
                                '50,000': 0, 
                                '10,000': denominations['10,000'] || 0, 
                                '5,000': denominations['5,000'] || 0, 
                                '1,000': denominations['1,000'] || 0 
                              };
                              setDenominations(newDenoms);
                              return;
                            }
                            
                            const cleanInput = inputValue.replace(/,/g, '');
                            if (/^-?\d+$/.test(cleanInput)) {
                              const numericValue = parseInt(cleanInput, 10);
                              if (!isNaN(numericValue)) {
                                const newDenoms = { 
                                  '50,000': numericValue, 
                                  '10,000': denominations['10,000'] || 0, 
                                  '5,000': denominations['5,000'] || 0, 
                                  '1,000': denominations['1,000'] || 0 
                                };
                                setDenominations(newDenoms);
                              }
                            }
                          }}
                          className="h-10 sm:h-9 text-center flex-1 min-w-0"
                          placeholder="0"
                          data-testid="input-50000"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newValue = (denominations['50,000'] || 0) + 1;
                            const newDenoms = { 
                              '50,000': newValue, 
                              '10,000': denominations['10,000'] || 0, 
                              '5,000': denominations['5,000'] || 0, 
                              '1,000': denominations['1,000'] || 0 
                            };
                            setDenominations(newDenoms);
                            setInputDisplayValues(prev => ({
                              ...prev,
                              '50,000': formatInputWithCommas(newValue.toString())
                            }));
                          }}
                          className="h-8 w-8 p-0 flex-shrink-0"
                          data-testid="button-increase-50000"
                        >
                          <Plus size={14} />
                        </Button>
                      </div>
                      <div className="text-xs text-gray-500 text-center space-y-1">
                        <div>
                          총액: ₩{(50000 * (denominations['50,000'] || 0)).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    {/* 10,000원권 */}
                    <div className={`space-y-3 p-4 border rounded-lg min-w-0 ${getDenominationColor(form.watch('currency'), '10,000')}`}>
                      <label className="text-xs font-semibold text-gray-800 block text-center">
                        10,000원권
                      </label>
                      <div className="flex items-center space-x-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newValue = (denominations['10,000'] || 0) - 1;
                            const newDenoms = { 
                              '50,000': denominations['50,000'] || 0, 
                              '10,000': newValue, 
                              '5,000': denominations['5,000'] || 0, 
                              '1,000': denominations['1,000'] || 0 
                            };
                            setDenominations(newDenoms);
                            setInputDisplayValues(prev => ({
                              ...prev,
                              '10,000': formatInputWithCommas(newValue.toString())
                            }));
                          }}
                          className="h-8 w-8 p-0 flex-shrink-0"
                          data-testid="button-decrease-10000"
                        >
                          <Minus size={14} />
                        </Button>
                        <Input
                          type="text"
                          value={inputDisplayValues['10,000'] !== undefined ? inputDisplayValues['10,000'] : formatInputWithCommas((denominations['10,000'] || 0).toString())}
                          onChange={(e) => {
                            const inputValue = e.target.value;
                            setInputDisplayValues(prev => ({
                              ...prev,
                              '10,000': inputValue
                            }));
                            
                            if (inputValue === '') {
                              const newDenoms = { 
                                '50,000': denominations['50,000'] || 0, 
                                '10,000': 0, 
                                '5,000': denominations['5,000'] || 0, 
                                '1,000': denominations['1,000'] || 0 
                              };
                              setDenominations(newDenoms);
                              return;
                            }
                            
                            const cleanInput = inputValue.replace(/,/g, '');
                            if (/^-?\d+$/.test(cleanInput)) {
                              const numericValue = parseInt(cleanInput, 10);
                              if (!isNaN(numericValue)) {
                                const newDenoms = { 
                                  '50,000': denominations['50,000'] || 0, 
                                  '10,000': numericValue, 
                                  '5,000': denominations['5,000'] || 0, 
                                  '1,000': denominations['1,000'] || 0 
                                };
                                setDenominations(newDenoms);
                              }
                            }
                          }}
                          className="h-10 sm:h-9 text-center flex-1 min-w-0"
                          placeholder="0"
                          data-testid="input-10000"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newValue = (denominations['10,000'] || 0) + 1;
                            const newDenoms = { 
                              '50,000': denominations['50,000'] || 0, 
                              '10,000': newValue, 
                              '5,000': denominations['5,000'] || 0, 
                              '1,000': denominations['1,000'] || 0 
                            };
                            setDenominations(newDenoms);
                            setInputDisplayValues(prev => ({
                              ...prev,
                              '10,000': formatInputWithCommas(newValue.toString())
                            }));
                          }}
                          className="h-8 w-8 p-0 flex-shrink-0"
                          data-testid="button-increase-10000"
                        >
                          <Plus size={14} />
                        </Button>
                      </div>
                      <div className="text-xs text-gray-500 text-center space-y-1">
                        <div>
                          총액: ₩{(10000 * (denominations['10,000'] || 0)).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    {/* 5,000원권 */}
                    <div className={`space-y-3 p-4 border rounded-lg min-w-0 ${getDenominationColor(form.watch('currency'), '5,000')}`}>
                      <label className="text-xs font-semibold text-gray-800 block text-center">
                        5,000원권
                      </label>
                      <div className="flex items-center space-x-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newValue = (denominations['5,000'] || 0) - 1;
                            const newDenoms = { 
                              '50,000': denominations['50,000'] || 0, 
                              '10,000': denominations['10,000'] || 0, 
                              '5,000': newValue, 
                              '1,000': denominations['1,000'] || 0 
                            };
                            setDenominations(newDenoms);
                            setInputDisplayValues(prev => ({
                              ...prev,
                              '5,000': formatInputWithCommas(newValue.toString())
                            }));
                          }}
                          className="h-8 w-8 p-0 flex-shrink-0"
                          data-testid="button-decrease-5000"
                        >
                          <Minus size={14} />
                        </Button>
                        <Input
                          type="text"
                          value={inputDisplayValues['5,000'] !== undefined ? inputDisplayValues['5,000'] : formatInputWithCommas((denominations['5,000'] || 0).toString())}
                          onChange={(e) => {
                            const inputValue = e.target.value;
                            setInputDisplayValues(prev => ({
                              ...prev,
                              '5,000': inputValue
                            }));
                            
                            if (inputValue === '') {
                              const newDenoms = { 
                                '50,000': denominations['50,000'] || 0, 
                                '10,000': denominations['10,000'] || 0, 
                                '5,000': 0, 
                                '1,000': denominations['1,000'] || 0 
                              };
                              setDenominations(newDenoms);
                              return;
                            }
                            
                            const cleanInput = inputValue.replace(/,/g, '');
                            if (/^-?\d+$/.test(cleanInput)) {
                              const numericValue = parseInt(cleanInput, 10);
                              if (!isNaN(numericValue)) {
                                const newDenoms = { 
                                  '50,000': denominations['50,000'] || 0, 
                                  '10,000': denominations['10,000'] || 0, 
                                  '5,000': numericValue, 
                                  '1,000': denominations['1,000'] || 0 
                                };
                                setDenominations(newDenoms);
                              }
                            }
                          }}
                          className="h-10 sm:h-9 text-center flex-1 min-w-0"
                          placeholder="0"
                          data-testid="input-5000"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newValue = (denominations['5,000'] || 0) + 1;
                            const newDenoms = { 
                              '50,000': denominations['50,000'] || 0, 
                              '10,000': denominations['10,000'] || 0, 
                              '5,000': newValue, 
                              '1,000': denominations['1,000'] || 0 
                            };
                            setDenominations(newDenoms);
                            setInputDisplayValues(prev => ({
                              ...prev,
                              '5,000': formatInputWithCommas(newValue.toString())
                            }));
                          }}
                          className="h-8 w-8 p-0 flex-shrink-0"
                          data-testid="button-increase-5000"
                        >
                          <Plus size={14} />
                        </Button>
                      </div>
                      <div className="text-xs text-gray-500 text-center space-y-1">
                        <div>
                          총액: ₩{(5000 * (denominations['5,000'] || 0)).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    {/* 1,000원권 */}
                    <div className={`space-y-3 p-4 border rounded-lg min-w-0 ${getDenominationColor(form.watch('currency'), '1,000')}`}>
                      <label className="text-xs font-semibold text-gray-800 block text-center">
                        1,000원권
                      </label>
                      <div className="flex items-center space-x-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newValue = (denominations['1,000'] || 0) - 1;
                            const newDenoms = { 
                              '50,000': denominations['50,000'] || 0, 
                              '10,000': denominations['10,000'] || 0, 
                              '5,000': denominations['5,000'] || 0, 
                              '1,000': newValue 
                            };
                            setDenominations(newDenoms);
                            setInputDisplayValues(prev => ({
                              ...prev,
                              '1,000': formatInputWithCommas(newValue.toString())
                            }));
                          }}
                          className="h-8 w-8 p-0 flex-shrink-0"
                          data-testid="button-decrease-1000"
                        >
                          <Minus size={14} />
                        </Button>
                        <Input
                          type="text"
                          value={inputDisplayValues['1,000'] !== undefined ? inputDisplayValues['1,000'] : formatInputWithCommas((denominations['1,000'] || 0).toString())}
                          onChange={(e) => {
                            const inputValue = e.target.value;
                            setInputDisplayValues(prev => ({
                              ...prev,
                              '1,000': inputValue
                            }));
                            
                            if (inputValue === '') {
                              const newDenoms = { 
                                '50,000': denominations['50,000'] || 0, 
                                '10,000': denominations['10,000'] || 0, 
                                '5,000': denominations['5,000'] || 0, 
                                '1,000': 0 
                              };
                              setDenominations(newDenoms);
                              return;
                            }
                            
                            const cleanInput = inputValue.replace(/,/g, '');
                            if (/^-?\d+$/.test(cleanInput)) {
                              const numericValue = parseInt(cleanInput, 10);
                              if (!isNaN(numericValue)) {
                                const newDenoms = { 
                                  '50,000': denominations['50,000'] || 0, 
                                  '10,000': denominations['10,000'] || 0, 
                                  '5,000': denominations['5,000'] || 0, 
                                  '1,000': numericValue 
                                };
                                setDenominations(newDenoms);
                              }
                            }
                          }}
                          className="h-10 sm:h-9 text-center flex-1 min-w-0"
                          placeholder="0"
                          data-testid="input-1000"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newValue = (denominations['1,000'] || 0) + 1;
                            const newDenoms = { 
                              '50,000': denominations['50,000'] || 0, 
                              '10,000': denominations['10,000'] || 0, 
                              '5,000': denominations['5,000'] || 0, 
                              '1,000': newValue 
                            };
                            setDenominations(newDenoms);
                            setInputDisplayValues(prev => ({
                              ...prev,
                              '1,000': formatInputWithCommas(newValue.toString())
                            }));
                          }}
                          className="h-8 w-8 p-0 flex-shrink-0"
                          data-testid="button-increase-1000"
                        >
                          <Plus size={14} />
                        </Button>
                      </div>
                      <div className="text-xs text-gray-500 text-center space-y-1">
                        <div>
                          총액: ₩{(1000 * (denominations['1,000'] || 0)).toLocaleString()}
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              )}

              {/* USD, VND 통화 증감 모드 - 지폐 구성 입력만 표시 (현재 자산 정보는 위에서 표시됨) */}
              {false && !editData && form.watch('currency') !== 'KRW' && (
                <div className="space-y-4">
                  {Object.entries(denominations).length > 0 ? (
                    Object.entries(denominations)
                      .sort((a, b) => {
                        const numA = parseFloat(a[0].replace(/,/g, ''));
                        const numB = parseFloat(b[0].replace(/,/g, ''));
                        return numB - numA;
                      })
                      .map(([denom, count]) => (
                        <div key={denom} className={`space-y-3 p-4 border rounded-lg ${getDenominationColor(form.watch('currency'), denom)}`}>
                          <label className="text-xs font-semibold text-gray-800 block text-center">
                            {form.watch('currency') === 'USD' ? 
                              `${denom}달러권` : 
                              `${parseFloat(denom.replace(/,/g, '')).toLocaleString()}동권`
                            }
                          </label>
                          <div className="flex items-center space-x-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const currentCount = typeof count === 'number' ? count : 0;
                                const newValue = currentCount - 1;
                                setDenominations((prev: Record<string, number>) => ({
                                  ...prev,
                                  [denom]: newValue
                                }));
                                setInputDisplayValues((prev: Record<string, string>) => ({
                                  ...prev,
                                  [denom]: formatInputWithCommas(newValue.toString())
                                }));
                              }}
                              className="h-8 w-8 p-0 flex-shrink-0"
                              data-testid={`button-decrease-${denom}`}
                            >
                              <Minus size={14} />
                            </Button>
                            <Input
                              type="text"
                              value={inputDisplayValues[denom] !== undefined ? inputDisplayValues[denom] : formatInputWithCommas((typeof count === 'number' ? count : 0).toString())}
                              onChange={(e) => {
                                const inputValue = e.target.value;
                                setInputDisplayValues((prev: Record<string, string>) => ({
                                  ...prev,
                                  [denom]: inputValue
                                }));
                                
                                if (inputValue === '') {
                                  setDenominations((prev: Record<string, number>) => ({
                                    ...prev,
                                    [denom]: 0
                                  }));
                                  return;
                                }
                                
                                const cleanInput = inputValue.replace(/,/g, '');
                                if (/^-?\d+$/.test(cleanInput)) {
                                  const numericValue = parseInt(cleanInput, 10);
                                  if (!isNaN(numericValue)) {
                                    setDenominations((prev: Record<string, number>) => ({
                                      ...prev,
                                      [denom]: numericValue
                                    }));
                                  }
                                }
                              }}
                              className="h-10 sm:h-9 text-center flex-1 min-w-0"
                              placeholder="0"
                              data-testid={`input-${denom}`}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const currentCount = typeof count === 'number' ? count : 0;
                                const newValue = currentCount + 1;
                                setDenominations((prev: Record<string, number>) => ({
                                  ...prev,
                                  [denom]: newValue
                                }));
                                setInputDisplayValues((prev: Record<string, string>) => ({
                                  ...prev,
                                  [denom]: formatInputWithCommas(newValue.toString())
                                }));
                              }}
                              className="h-8 w-8 p-0 flex-shrink-0"
                              data-testid={`button-increase-${denom}`}
                            >
                              <Plus size={14} />
                            </Button>
                          </div>
                          <div className="text-xs text-gray-500 text-center">
                            총액: {form.watch('currency') === 'USD' ? '$' : '₫'}
                            {(parseFloat(denom.replace(/,/g, '')) * (typeof count === 'number' ? count : 0)).toLocaleString()}
                          </div>
                        </div>
                      ))
                  ) : (
                    <div className="text-center text-gray-500 py-4">
                      지폐 구성 정보를 불러오는 중입니다.
                    </div>
                  )}

                </div>
              )}



              {/* 모든 현금 자산에 공통 메모 필드 추가 */}
              {type === 'cash' && (
                <div className="mt-6">
                  <FormField
                    control={form.control}
                    name="memo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>메모</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="현금 증감 관련 메모를 입력하세요"
                            {...field}
                            data-testid="input-cash-memo-common"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </>
          )}

          {(type === 'korean-account' || type === 'vietnamese-account') && (
            <>
              <FormField
                control={form.control}
                name="bankName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>은행명</FormLabel>
                    <FormControl>
                      <Input placeholder="예: 신한은행" {...field} data-testid="input-bank-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="accountNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>계좌번호</FormLabel>
                    <FormControl>
                      <Input placeholder="예: 123-456-789" {...field} data-testid="input-account-number" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="accountHolder"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>예금주</FormLabel>
                    <FormControl>
                      <Input placeholder="예: 홍길동" {...field} data-testid="input-account-holder" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="balance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>잔액</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="0"
                        value={formatInputWithCommas(field.value?.toString() || '')}
                        onChange={(e) => {
                          // 은행 계좌는 정수만 허용 (소숫점 입력 방지)
                          const value = e.target.value.replace(/[^0-9,]/g, ''); // 숫자와 콤마만 허용
                          const numericValue = parseCommaFormattedNumber(value);
                          field.onChange(Math.floor(numericValue)); // 정수로 변환
                        }}
                        data-testid="input-balance"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          )}

          {(type === 'exchange' || type === 'binance') && (
            <>
              {type === 'exchange' && (
                <FormField
                  control={form.control}
                  name="exchangeName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>거래소명</FormLabel>
                      <div className="flex space-x-2">
                        <div className="flex-1">
                          <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-exchange">
                                <SelectValue placeholder="거래소를 선택하세요" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {exchanges.map(exchange => (
                                <SelectItem key={exchange} value={exchange}>{exchange}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setShowExchangeInput(!showExchangeInput)}
                          data-testid="button-add-exchange"
                        >
                          <Plus size={16} />
                        </Button>
                      </div>
                      {showExchangeInput && (
                        <div className="flex space-x-2 mt-2">
                          <Input
                            placeholder="새 거래소명"
                            value={newExchange}
                            onChange={(e) => setNewExchange(e.target.value)}
                            data-testid="input-new-exchange"
                          />
                          <Button type="button" onClick={addExchange} data-testid="button-confirm-exchange">
                            추가
                          </Button>
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => {
                              setShowExchangeInput(false);
                              setNewExchange('');
                            }}
                            data-testid="button-cancel-exchange"
                          >
                            취소
                          </Button>
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              <FormField
                control={form.control}
                name="coinName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>코인명</FormLabel>
                    <div className="flex space-x-2">
                      <div className="flex-1">
                        <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-coin">
                              <SelectValue placeholder="코인을 선택하세요" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {coins.map(coin => (
                              <SelectItem key={coin} value={coin}>{coin}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setShowCoinInput(!showCoinInput)}
                        data-testid="button-add-coin"
                      >
                        <Plus size={16} />
                      </Button>
                    </div>
                    {showCoinInput && (
                      <div className="flex space-x-2 mt-2">
                        <Input
                          placeholder="새 코인명"
                          value={newCoin}
                          onChange={(e) => setNewCoin(e.target.value)}
                          data-testid="input-new-coin"
                        />
                        <Button type="button" onClick={addCoin} data-testid="button-confirm-coin">
                          추가
                        </Button>
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => {
                            setShowCoinInput(false);
                            setNewCoin('');
                          }}
                          data-testid="button-cancel-coin"
                        >
                          취소
                        </Button>
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>수량</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="0"
                        value={formatInputWithCommas(field.value?.toString() || '')}
                        onChange={(e) => {
                          const numericValue = parseCommaFormattedNumber(e.target.value);
                          field.onChange(numericValue);
                        }}
                        data-testid="input-quantity"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          )}

          {/* Modal Action Buttons */}
          <div className="flex justify-end space-x-4 mt-8 pt-6 border-t border-gray-200">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCancel} 
              className="px-6 py-2"
              data-testid="button-cancel"
            >
              취소
            </Button>
            <Button 
              type="submit"
              className="px-6 py-2"
              data-testid="button-submit"
              disabled={isSubmitting || (type === 'cash' && !hasChanges())}
            >
              {isSubmitting ? '처리중...' : (editData ? '수정' : '추가')}
            </Button>
          </div>
        </form>
        </Form>
      </div>
    </Card>
  );
}