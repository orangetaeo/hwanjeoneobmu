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
  const parts = numericValue.split('.');
  
  // Format the integer part with commas
  const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  
  // Return formatted value
  if (parts[1] !== undefined) {
    return `${integerPart}.${parts[1]}`;
  }
  return integerPart;
};

export const parseCommaFormattedNumber = (value: string): number => {
  if (!value) return 0;
  const numericValue = value.replace(/,/g, '');
  const parsed = parseFloat(numericValue);
  return isNaN(parsed) ? 0 : parsed;
};

export const formatCurrency = (amount: number | string, currency: string): string => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '0';
  
  // 베트남돈, 원화, 달러는 소숫점 표시 안함
  if (currency === 'VND' || currency === 'KRW' || currency === 'USD') {
    return Math.floor(num).toLocaleString();
  }
  
  // 코인은 소숫점 2자리까지만
  return num.toFixed(2);
};
