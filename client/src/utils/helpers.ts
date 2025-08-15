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
