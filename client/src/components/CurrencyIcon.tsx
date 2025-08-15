import React from 'react';

interface CurrencyIconProps {
  currency: string;
  size?: number;
  className?: string;
}

export default function CurrencyIcon({ currency, size = 24, className = "" }: CurrencyIconProps) {
  const iconStyle = { width: size, height: size };
  
  switch (currency.toUpperCase()) {
    case 'KRW':
      return (
        <div className={`inline-flex items-center justify-center ${className}`} style={iconStyle}>
          <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
            <circle cx="12" cy="12" r="10" fill="#CD2E3A" stroke="#ffffff" strokeWidth="1"/>
            <path d="M12 6v12M8 9h8M8 15h8" stroke="#ffffff" strokeWidth="2" strokeLinecap="round"/>
            <text x="12" y="16" textAnchor="middle" fill="#ffffff" fontSize="8" fontWeight="bold">₩</text>
          </svg>
        </div>
      );
      
    case 'USD':
      return (
        <div className={`inline-flex items-center justify-center ${className}`} style={iconStyle}>
          <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
            <circle cx="12" cy="12" r="10" fill="#1f7a1f" stroke="#ffffff" strokeWidth="1"/>
            <path d="M12 6v12M9 9c0-.6.4-1 1-1h4c.6 0 1 .4 1 1s-.4 1-1 1h-4M9 15c0 .6.4 1 1 1h4c.6 0 1-.4 1-1s-.4-1-1-1h-4" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round"/>
            <text x="12" y="16.5" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="bold">$</text>
          </svg>
        </div>
      );
      
    case 'VND':
      return (
        <div className={`inline-flex items-center justify-center ${className}`} style={iconStyle}>
          <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
            <circle cx="12" cy="12" r="10" fill="#da251d" stroke="#ffffff" strokeWidth="1"/>
            <path d="M12 4.5l-1.5 4.5h-4.5l3.75 2.7-1.5 4.5L12 13.5l3.75 2.7-1.5-4.5L18 9h-4.5L12 4.5z" fill="#ffff00"/>
            <text x="12" y="20" textAnchor="middle" fill="#ffffff" fontSize="7" fontWeight="bold">₫</text>
          </svg>
        </div>
      );
      
    case 'USDT':
      return (
        <div className={`inline-flex items-center justify-center ${className}`} style={iconStyle}>
          <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
            <circle cx="12" cy="12" r="10" fill="#26a17b" stroke="#ffffff" strokeWidth="1"/>
            <path d="M8 8h8v2h-2.5v6h-3v-6H8V8z" fill="#ffffff"/>
            <path d="M9.5 11h5c.3 0 .5.2.5.5s-.2.5-.5.5h-5c-.3 0-.5-.2-.5-.5s.2-.5.5-.5z" fill="#26a17b"/>
            <text x="12" y="20" textAnchor="middle" fill="#ffffff" fontSize="7" fontWeight="bold">₮</text>
          </svg>
        </div>
      );
      
    case 'BTC':
      return (
        <div className={`inline-flex items-center justify-center ${className}`} style={iconStyle}>
          <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
            <circle cx="12" cy="12" r="10" fill="#f7931a" stroke="#ffffff" strokeWidth="1"/>
            <path d="M10.5 7.5v1.2c-.5-.1-1-.1-1.5 0V7.5h-1v1.3c-1.2.2-2 .8-2 1.7 0 .8.6 1.4 1.5 1.6-.1.2-.1.4-.1.6 0 1 .8 1.8 2 2v1.3h1v-1.2c.5.1 1 .1 1.5 0v1.2h1v-1.3c1.2-.2 2-.8 2-2 0-.8-.6-1.4-1.5-1.6.1-.2.1-.4.1-.6 0-1-.8-1.8-2-2V7.5h-1z" fill="#ffffff"/>
            <text x="12" y="16.5" textAnchor="middle" fill="#f7931a" fontSize="8" fontWeight="bold">₿</text>
          </svg>
        </div>
      );
      
    case 'ETH':
      return (
        <div className={`inline-flex items-center justify-center ${className}`} style={iconStyle}>
          <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
            <circle cx="12" cy="12" r="10" fill="#627eea" stroke="#ffffff" strokeWidth="1"/>
            <path d="M12 3l6 9-6 3.5L6 12l6-9z" fill="#ffffff"/>
            <path d="M12 16.5l6-3.5-6 7.5-6-7.5 6 3.5z" fill="#ffffff" opacity="0.6"/>
            <text x="12" y="20" textAnchor="middle" fill="#ffffff" fontSize="7" fontWeight="bold">Ξ</text>
          </svg>
        </div>
      );
      
    default:
      return (
        <div className={`inline-flex items-center justify-center bg-gray-400 rounded-full ${className}`} style={iconStyle}>
          <span className="text-white text-xs font-bold">{currency.slice(0, 2)}</span>
        </div>
      );
  }
}