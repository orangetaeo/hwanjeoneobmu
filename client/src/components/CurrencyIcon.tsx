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
            <circle cx="12" cy="12" r="10" fill="#0047A0" stroke="#ffffff" strokeWidth="1"/>
            <rect x="6" y="8" width="12" height="8" rx="2" fill="none" stroke="#ffffff" strokeWidth="1.5"/>
            <path d="M9 10h6M9 14h6" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round"/>
            <text x="12" y="19" textAnchor="middle" fill="#ffffff" fontSize="6" fontWeight="bold">원</text>
          </svg>
        </div>
      );
      
    case 'USD':
      return (
        <div className={`inline-flex items-center justify-center ${className}`} style={iconStyle}>
          <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
            <circle cx="12" cy="12" r="10" fill="#2E8B57" stroke="#ffffff" strokeWidth="1"/>
            <path d="M12 5v2M12 17v2" stroke="#ffffff" strokeWidth="2" strokeLinecap="round"/>
            <path d="M10 9c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2h-2" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
            <path d="M10 13h2c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
            <text x="12" y="20" textAnchor="middle" fill="#ffffff" fontSize="5" fontWeight="bold">USD</text>
          </svg>
        </div>
      );
      
    case 'VND':
      return (
        <div className={`inline-flex items-center justify-center ${className}`} style={iconStyle}>
          <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
            <circle cx="12" cy="12" r="10" fill="#E4002B" stroke="#ffffff" strokeWidth="1"/>
            <path d="M12 4.5l-1.2 3.6h-3.8l3 2.2-1.2 3.6L12 11.7l3.2 2.2-1.2-3.6 3-2.2h-3.8L12 4.5z" fill="#FFD700"/>
            <rect x="7" y="15" width="10" height="2" rx="1" fill="#ffffff"/>
            <text x="12" y="20" textAnchor="middle" fill="#ffffff" fontSize="5" fontWeight="bold">VND</text>
          </svg>
        </div>
      );
      
    case 'USDT':
      return (
        <div className={`inline-flex items-center justify-center ${className}`} style={iconStyle}>
          <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
            <circle cx="12" cy="12" r="10" fill="#26A17B" stroke="#ffffff" strokeWidth="1"/>
            <path d="M8 7h8v3h-2.5v7h-3v-7H8V7z" fill="#ffffff"/>
            <ellipse cx="12" cy="13" rx="4" ry="1.5" fill="#26A17B"/>
            <ellipse cx="12" cy="13" rx="3" ry="1" fill="#ffffff"/>
            <text x="12" y="20" textAnchor="middle" fill="#ffffff" fontSize="4" fontWeight="bold">USDT</text>
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