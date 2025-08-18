import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// 숫자에서 콤마 제거하는 함수 (소숫점은 보존)
export function removeCommas(value: string): string {
  return value.replace(/,/g, '');
}

// 숫자에 콤마 추가하는 함수 (입력 표시용)
export function addCommas(value: string): string {
  const num = removeCommas(value);
  if (!num || isNaN(Number(num))) return value;
  return Number(num).toLocaleString();
}

// 입력 필드용 숫자 포맷팅 (콤마 포함)
export function formatNumberInput(value: string): string {
  if (!value) return '';
  
  // 소숫점과 숫자만 허용하고 콤마는 제거
  const cleanValue = value.replace(/[^0-9.]/g, '');
  
  // 빈 문자열이거나 유효하지 않은 숫자면 원본 반환
  if (!cleanValue) return '';
  
  // 소숫점이 포함된 경우 정수 부분만 콤마 적용
  if (cleanValue.includes('.')) {
    const parts = cleanValue.split('.');
    const integerPart = parts[0];
    const decimalPart = parts[1] || '';
    
    // 정수 부분에 콤마 추가
    const formattedInteger = integerPart ? Number(integerPart).toLocaleString() : '';
    return decimalPart ? `${formattedInteger}.${decimalPart}` : formattedInteger;
  }
  
  // 소숫점이 없으면 기존 방식
  return Number(cleanValue).toLocaleString();
}

export function formatCurrency(amount: number | string, currency: string = 'KRW'): string {
  const num = typeof amount === 'string' ? parseFloat(removeCommas(amount)) : amount;
  
  if (isNaN(num)) return '0';
  
  switch (currency) {
    case 'KRW':
      return new Intl.NumberFormat('ko-KR', {
        style: 'currency',
        currency: 'KRW',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(num);
    case 'USD':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(num);
    case 'VND':
      return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(num);
    case 'USDT':
      return `${num.toFixed(8)} USDT`;
    default:
      return num.toString();
  }
}
