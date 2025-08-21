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

// 거래내역용 금액 포맷팅 함수 (암호화폐 여부에 따라 다르게 처리)
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
  
  // 일반 통화는 정수로 표시
  return Math.round(num).toLocaleString();
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
