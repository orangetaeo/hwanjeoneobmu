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
        
        // Bithumb API는 CORS 문제로 일시적으로 비활성화
        // 기본값으로 USDT 가격 설정
        processedCryptoRates['USDT'] = {
          KRW: rates.KRW, // USD와 동일한 가격으로 설정
          USDT: 1
        };

        // Binance API는 CORS 문제로 일시적으로 비활성화
        // 추후 서버 프록시를 통해 구현 예정
        
        setCryptoRates(processedCryptoRates);

      } catch (error) {
        console.error("환율 API 호출 실패:", error);
        console.log("기본 환율 값 설정 중...");
        // 오류 발생 시 기본값 설정
        setRealTimeRates({
          'KRW-USD': 1 / 1350,
          'USD-KRW': 1350,
          'KRW-VND': 1 / 0.055, // 약 18.18
          'VND-KRW': 0.055,
          'USD-VND': 24500,
          'VND-USD': 1 / 24500,
          'USDT-USD': 1,
          'USD-USDT': 1,
          'USDT-KRW': 1350,
          'KRW-USDT': 1 / 1350,
          'USDT-VND': 24500,
          'VND-USDT': 1 / 24500,
        });
        setCryptoRates({
          'USDT': { KRW: 1350, USDT: 1 },
          'BTC': { KRW: 95000000, USDT: 70000 }
        });
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
