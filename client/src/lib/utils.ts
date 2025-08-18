import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// 숫자에서 콤마 제거하는 함수
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
  const cleanValue = removeCommas(value);
  if (!cleanValue || isNaN(Number(cleanValue))) return '';
  return addCommas(cleanValue);
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
