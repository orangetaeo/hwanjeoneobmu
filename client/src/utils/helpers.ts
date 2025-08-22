export const formatNumberWithCommas = (value: number | string | null | undefined, decimalPlaces?: number): string => {
  if (value === null || value === undefined || value === '') return '';
  const num = typeof value === 'number' ? value : parseFloat(value);
  if (isNaN(num)) return '';
  
  const fixedValue = decimalPlaces !== undefined ? num.toFixed(decimalPlaces) : num.toString();
  let [integer, decimal] = fixedValue.split('.');
  integer = integer.replace(/,/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return decimal !== undefined ? `${integer}.${decimal}` : integer;
};

export const parseNumberWithCommas = (value: string | number): number | string => {
  if (typeof value !== 'string') return value;
  const parsed = parseFloat(value.replace(/,/g, ''));
  return isNaN(parsed) ? '' : parsed;
};

export const handleNumericInput = (value: string, setter: (value: string) => void): void => {
  const sanitized = value.replace(/[^0-9]/g, '');
  setter(sanitized);
};

export const handleIntegerInput = (value: string): string => {
  // 숫자와 콤마만 허용, 소숫점 제거
  return value.replace(/[^0-9,]/g, '');
};

export const handleDecimalInput = (value: string, setter: (value: string) => void): void => {
  const sanitized = value.replace(/[^0-9.]/g, '');
  const parts = sanitized.split('.');
  if (parts.length > 2) {
    setter(parts[0] + '.' + parts.slice(1).join(''));
  } else {
    setter(sanitized);
  }
};

// 통화 표시 함수 추가
export const getCurrencyDisplayName = (currency: string): string => {
  switch (currency) {
    case 'USD':
      return '달러';
    case 'KRW':
      return '원';
    case 'VND':
      return '동';
    case 'USDT':
      return 'USDT';
    default:
      return currency;
  }
};

// 매수/매도 자동 판별 헬퍼 함수
export const determineTransactionRateType = (
  transactionType: string,
  fromCurrency: string,
  toCurrency: string
): 'buy' | 'sell' => {
  // 환전상 관점에서 매수/매도 판별
  // 매수 (myBuyRate): 고객이 환전상에게 판매 (환전상이 외화를 매수)
  // 매도 (mySellRate): 환전상이 고객에게 판매 (환전상이 외화를 매도)

  switch (transactionType) {
    case 'cash_exchange':
      // 현금 환전의 경우 입력 통화 기준으로 판별
      if (fromCurrency === 'USD') {
        // 고객이 USD를 가져온 경우 → 환전상이 USD 매수
        return 'buy';
      } else if (toCurrency === 'USD') {
        // 고객이 USD를 요청하는 경우 → 환전상이 USD 매도  
        return 'sell';
      }
      // VND ↔ KRW 환전의 경우
      else if (fromCurrency === 'VND' && toCurrency === 'KRW') {
        // 고객이 VND를 KRW로 환전 → 환전상이 VND 매수 (KRW 기준으로는 매도)
        return 'buy';
      } else if (fromCurrency === 'KRW' && toCurrency === 'VND') {
        // 고객이 KRW를 VND로 환전 → 환전상이 VND 매도 (KRW 기준으로는 매수)
        return 'sell';
      }
      break;

    case 'cash_to_krw_account':
    case 'cash_to_vnd_account':
      // 현금 → 계좌: 고객이 현금을 입금하므로 환전상이 외화 매수
      return 'buy';

    case 'vnd_account_to_krw_account':
      // VND계좌 → KRW계좌: VND를 받고 KRW로 환전하므로 환전상이 VND 매수
      return 'buy';

    case 'krw_account_to_vnd_account':
      // KRW계좌 → VND계좌: KRW를 받고 VND로 환전하므로 환전상이 VND 매도
      return 'sell';

    default:
      // 기본값은 매수
      return 'buy';
  }

  // 기본값
  return 'buy';
};

// 환율 쌍 결정 헬퍼 함수
export const getExchangeRatePair = (
  fromCurrency: string,
  toCurrency: string
): { fromCurrency: string; toCurrency: string } => {
  // USD가 포함된 경우 USD를 기준으로 설정
  if (fromCurrency === 'USD' || toCurrency === 'USD') {
    if (fromCurrency === 'USD') {
      return { fromCurrency: 'USD', toCurrency };
    } else {
      return { fromCurrency: 'USD', toCurrency: fromCurrency };
    }
  }
  
  // VND ↔ KRW의 경우 KRW를 기준으로 설정
  if ((fromCurrency === 'VND' && toCurrency === 'KRW') || 
      (fromCurrency === 'KRW' && toCurrency === 'VND')) {
    return { fromCurrency: 'KRW', toCurrency: 'VND' };
  }

  // 기본적으로 입력 순서 유지
  return { fromCurrency, toCurrency };
};

// 환전상 시세 조회 및 적용 함수
export const getExchangeShopRate = async (
  transactionType: string,
  fromCurrency: string,
  toCurrency: string,
  denomination?: string
): Promise<{ rate: number; source: string } | null> => {
  try {
    // 매수/매도 타입 자동 판별
    const rateType = determineTransactionRateType(transactionType, fromCurrency, toCurrency);
    
    // 환율 쌍 결정
    const ratePair = getExchangeRatePair(fromCurrency, toCurrency);
    
    // 환전상 시세 조회
    const response = await fetch('/api/exchange-rates');
    if (!response.ok) {
      console.error('환전상 시세 조회 실패:', response.statusText);
      return null;
    }
    
    const exchangeRates = await response.json();
    
    // 해당 통화쌍과 권종에 맞는 활성 시세 찾기
    const matchingRate = exchangeRates.find((rate: any) => 
      rate.fromCurrency === ratePair.fromCurrency &&
      rate.toCurrency === ratePair.toCurrency &&
      rate.denomination === (denomination || '') &&
      rate.isActive === 'true'
    );
    
    if (!matchingRate) {
      console.log(`환전상 시세 없음: ${ratePair.fromCurrency}-${ratePair.toCurrency} ${denomination || ''}`);
      return null;
    }
    
    // 매수/매도에 따라 적절한 환율 선택
    const rate = rateType === 'buy' 
      ? parseFloat(matchingRate.myBuyRate || '0')
      : parseFloat(matchingRate.mySellRate || '0');
    
    if (rate <= 0) {
      console.log(`유효하지 않은 환율: ${rateType} rate = ${rate}`);
      return null;
    }
    
    // 환율 방향 조정 (필요한 경우 역환율 계산)
    let finalRate = rate;
    if (ratePair.fromCurrency !== fromCurrency) {
      // 역환율 계산
      finalRate = 1 / rate;
    }
    
    console.log(`환전상 시세 적용: ${fromCurrency}→${toCurrency} ${denomination || ''} (${rateType}) = ${finalRate}`);
    
    return {
      rate: finalRate,
      source: `환전상 ${rateType === 'buy' ? '매수' : '매도'}시세 (${ratePair.fromCurrency}-${ratePair.toCurrency} ${denomination || ''})`
    };
    
  } catch (error) {
    console.error('환전상 시세 조회 중 오류:', error);
    return null;
  }
};

// 권종별 환율 가중평균 계산 함수
export const calculateWeightedExchangeRate = async (
  transactionType: string,
  fromCurrency: string,
  toCurrency: string,
  denominationAmounts: Record<string, number>
): Promise<{ rate: number; source: string } | null> => {
  try {
    let totalAmount = 0;
    let weightedSum = 0;
    const rateDetails: string[] = [];
    
    for (const [denomination, amount] of Object.entries(denominationAmounts)) {
      if (amount && amount > 0) {
        const denominationValue = parseFloat(denomination);
        const totalValue = denominationValue * amount;
        
        // 해당 권종의 환전상 시세 조회
        const rateResult = await getExchangeShopRate(transactionType, fromCurrency, toCurrency, denomination);
        
        if (rateResult) {
          totalAmount += totalValue;
          weightedSum += rateResult.rate * totalValue;
          rateDetails.push(`${denomination}${getCurrencyDisplayName(fromCurrency)} × ${amount}장 = ${rateResult.rate}`);
        }
      }
    }
    
    if (totalAmount === 0) {
      return null;
    }
    
    const weightedRate = weightedSum / totalAmount;
    
    console.log('권종별 가중평균 환율 계산:', {
      denominationAmounts,
      totalAmount,
      weightedRate,
      rateDetails
    });
    
    return {
      rate: weightedRate,
      source: `권종별 가중평균 환율 (${rateDetails.join(', ')})`
    };
    
  } catch (error) {
    console.error('권종별 가중평균 환율 계산 중 오류:', error);
    return null;
  }
};

export const formatInputWithCommas = (value: string): string => {
  if (!value) return '';
  
  // Remove all non-numeric characters except decimal point
  const numericValue = value.replace(/[^0-9.]/g, '');
  
  // Handle multiple decimal points by keeping only the first one
  const parts = numericValue.split('.');
  let cleanedValue = parts[0];
  if (parts.length > 1) {
    cleanedValue = parts[0] + '.' + parts.slice(1).join('');
  }
  
  // Split again for formatting
  const finalParts = cleanedValue.split('.');
  
  // Format the integer part with commas
  const integerPart = finalParts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  
  // Return formatted value, preserve all decimal places
  if (finalParts[1] !== undefined) {
    return `${integerPart}.${finalParts[1]}`;
  }
  return integerPart;
};

export const parseCommaFormattedNumber = (value: string): number => {
  if (!value) return 0;
  const numericValue = value.replace(/,/g, '');
  const parsed = parseFloat(numericValue);
  return isNaN(parsed) ? 0 : parsed;
};

// 암호화폐인지 판단하는 함수
export const isCryptoCurrency = (currency: string, assetName?: string): boolean => {
  const cryptoCurrencies = ['USDT', 'BTC', 'ETH', 'ADA', 'USDC', 'BNB', 'XRP', 'DOGE', 'SOL', 'AVAX', 'MATIC', 'DOT'];
  
  // currency가 암호화폐이거나
  if (cryptoCurrencies.includes(currency.toUpperCase())) {
    return true;
  }
  
  // assetName에 암호화폐 관련 키워드가 있는 경우
  if (assetName) {
    const cryptoKeywords = ['USDT', 'BTC', 'ETH', 'Bithumb', 'Binance', 'Upbit', '코인', 'Coin'];
    return cryptoKeywords.some(keyword => assetName.includes(keyword));
  }
  
  return false;
};

export const formatCurrency = (amount: number | string, currency: string): string => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (amount === null || amount === undefined || isNaN(num)) {
    return '0';
  }
  
  if (num === 0) {
    return '0';
  }
  
  // 베트남돈, 원화, 달러는 소숫점 표시 안함 - 반올림으로 변경
  if (currency === 'VND' || currency === 'KRW' || currency === 'USD') {
    return Math.round(num).toLocaleString();
  }
  
  // 코인은 소숫점 2자리까지만
  return num.toFixed(2);
};

// 거래내역용 금액 포맷팅 함수 - 저장된 데이터를 그대로 표시 (계산 없음)
export const formatTransactionAmount = (amount: number | string, currency?: string, assetName?: string): string => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (amount === null || amount === undefined || isNaN(num)) {
    return '0';
  }
  
  if (num === 0) {
    return '0';
  }
  
  // 암호화폐인 경우 소숫점 2자리까지 표시
  if (currency && isCryptoCurrency(currency, assetName)) {
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  
  // 일반 통화는 저장된 데이터 그대로 표시 (Math.round 제거)
  return Math.floor(num).toLocaleString();
};

// 거래 유형별 환율 표시 포맷팅 함수
export const formatExchangeRateByTransaction = (rate: number, fromCurrency?: string, toCurrency?: string, transactionType?: string): string => {
  if (rate === null || rate === undefined || isNaN(rate)) return '0';
  
  // 거래 유형별 통화 추출 로직
  let actualFromCurrency = fromCurrency;
  let actualToCurrency = toCurrency;
  
  // 거래 유형에서 통화 정보 추출
  if (!fromCurrency || !toCurrency) {
    if (transactionType === 'cash_exchange') {
      // 환율 값으로 통화 유형 추정
      if (rate > 1000) {
        // USD → VND (큰 값)
        actualFromCurrency = 'USD';
        actualToCurrency = 'VND';
      } else if (rate > 10) {
        // KRW → VND (중간 값)
        actualFromCurrency = 'KRW';
        actualToCurrency = 'VND';
      } else {
        // VND → KRW (작은 값)
        actualFromCurrency = 'VND';
        actualToCurrency = 'KRW';
      }
    }
  }
  
  // KRW → VND 환율: 소숫점 2자리 표시
  if (actualFromCurrency === 'KRW' && actualToCurrency === 'VND') {
    return rate.toLocaleString('ko-KR', { 
      minimumFractionDigits: 2,
      maximumFractionDigits: 2 
    });
  }
  
  // USD → VND 환율: 정수만 표시
  if (actualFromCurrency === 'USD' && actualToCurrency === 'VND') {
    return Math.round(rate).toLocaleString('ko-KR');
  }
  
  // USD/KRW 환율은 정수로 표시
  if ((actualFromCurrency === 'USD' && actualToCurrency === 'KRW') || 
      (actualFromCurrency === 'KRW' && actualToCurrency === 'USD')) {
    return Math.round(rate).toLocaleString('ko-KR');
  }
  
  // VND → KRW 환율은 소숫점 2자리까지 표시  
  if (actualFromCurrency === 'VND' && actualToCurrency === 'KRW') {
    return rate.toLocaleString('ko-KR', { 
      minimumFractionDigits: 0,
      maximumFractionDigits: 2 
    });
  }
  
  // 기본값: 소숫점 2자리까지
  return rate.toLocaleString('ko-KR', { 
    minimumFractionDigits: 0,
    maximumFractionDigits: 2 
  });
};

// 권종별 표시 형식 포맷팅
export const formatDenomination = (denom: string, currency: string): string => {
  switch (currency) {
    case 'VND':
      switch (denom) {
        case '500000': return '50만동';
        case '200000': return '20만동';
        case '100000': return '10만동';
        case '50000': return '5만동';
        case '20000': return '2만동';
        case '10000': return '1만동';
        case '5000': return '5천동';
        case '1000': return '1천동';
        default: return `${denom}동`;
      }
    case 'USD':
      switch (denom) {
        case '100': return '100달러';
        case '50': return '50달러';
        case '20_10': return '20/10달러';
        case '5_2_1': return '5/2/1달러';
        default: return `${denom}달러`;
      }
    case 'KRW':
      switch (denom) {
        case '50000': return '5만원';
        case '10000': return '1만원';
        case '5000_1000': return '5천/1천원';
        default: return `${denom}원`;
      }
    default:
      return `${denom} ${currency}`;
  }
};

// 환율 표시 포맷팅 (매매시세 기준, 통화별 소숫점 규칙 적용) - 기존 함수 유지
export const formatExchangeRate = (rate: number, fromCurrency?: string, toCurrency?: string): string => {
  if (rate === null || rate === undefined || isNaN(rate)) return '0';
  
  // USD/KRW 환율은 정수로 표시
  if ((fromCurrency === 'USD' && toCurrency === 'KRW') || 
      (fromCurrency === 'KRW' && toCurrency === 'USD')) {
    return Math.round(rate).toLocaleString('ko-KR');
  }
  
  // KRW/VND, VND/KRW 환율은 소숫점 2자리까지 표시  
  if ((fromCurrency === 'KRW' && toCurrency === 'VND') || 
      (fromCurrency === 'VND' && toCurrency === 'KRW')) {
    return rate.toLocaleString('ko-KR', { 
      minimumFractionDigits: 0,
      maximumFractionDigits: 2 
    });
  }
  
  // USD/VND, VND/USD 환율은 정수로 표시
  if ((fromCurrency === 'USD' && toCurrency === 'VND') || 
      (fromCurrency === 'VND' && toCurrency === 'USD')) {
    return Math.round(rate).toLocaleString('ko-KR');
  }
  
  // 기본값: 소숫점 2자리까지
  return rate.toLocaleString('ko-KR', { 
    minimumFractionDigits: 0,
    maximumFractionDigits: 2 
  });
};
