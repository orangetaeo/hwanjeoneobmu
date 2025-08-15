import { useState, useEffect } from 'react';

interface RealTimeRates {
  [key: string]: number;
}

interface CryptoRates {
  [coin: string]: {
    KRW?: number;
    USDT?: number;
  };
}

export function useExchangeRates() {
  const [realTimeRates, setRealTimeRates] = useState<RealTimeRates>({});
  const [cryptoRates, setCryptoRates] = useState<CryptoRates>({});
  const [isFetchingRates, setIsFetchingRates] = useState(true);

  useEffect(() => {
    const fetchAllRates = async () => {
      setIsFetchingRates(true);
      try {
        // Fetch Fiat Rates
        const fiatResponse = await fetch('https://open.er-api.com/v6/latest/USD');
        if (!fiatResponse.ok) throw new Error('Fiat API request failed');
        const fiatData = await fiatResponse.json();
        const rates = fiatData.rates;
        
        setRealTimeRates({
          'KRW-USD': 1 / rates.KRW,
          'USD-KRW': rates.KRW,
          'KRW-VND': rates.VND / rates.KRW,
          'VND-KRW': rates.KRW / rates.VND,
          'USD-VND': rates.VND,
          'VND-USD': 1 / rates.VND,
          'USDT-USD': 1,
          'USD-USDT': 1,
          'USDT-KRW': rates.KRW,
          'KRW-USDT': 1 / rates.KRW,
          'USDT-VND': rates.VND,
          'VND-USDT': 1 / rates.VND,
        });

        // Fetch Crypto Rates
        const processedCryptoRates: CryptoRates = {};
        
        // Bithumb for KRW prices
        try {
          const bithumbResponse = await fetch('https://api.bithumb.com/public/ticker/ALL_KRW');
          const bithumbData = await bithumbResponse.json();
          if (bithumbData.status === "0000") {
            for (const coin in bithumbData.data) {
              if (coin === 'date') continue;
              processedCryptoRates[coin] = {
                ...processedCryptoRates[coin],
                KRW: parseFloat(bithumbData.data[coin].closing_price)
              };
            }
          }
        } catch (error) {
          console.error("Bithumb API Error:", error);
        }

        // Binance for USDT prices
        try {
          const binanceResponse = await fetch('https://api.binance.com/api/v3/ticker/price');
          const binanceData = await binanceResponse.json();
          binanceData.forEach((pair: any) => {
            if (pair.symbol.endsWith('USDT')) {
              const coin = pair.symbol.replace('USDT', '');
              processedCryptoRates[coin] = {
                ...processedCryptoRates[coin],
                USDT: parseFloat(pair.price)
              };
            }
          });
        } catch (error) {
          console.error("Binance API Error:", error);
        }
        
        setCryptoRates(processedCryptoRates);

      } catch (error) {
        console.error("환율 API 호출 실패:", error);
      } finally {
        setIsFetchingRates(false);
      }
    };

    fetchAllRates();
    
    // Refresh rates every 30 seconds
    const interval = setInterval(fetchAllRates, 30000);
    return () => clearInterval(interval);
  }, []);

  return { realTimeRates, cryptoRates, isFetchingRates };
}
