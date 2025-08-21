import { useState, useCallback, useMemo } from 'react';

// 권종별 설정
export const CURRENCY_DENOMINATIONS = {
  USD: [
    { value: "100", label: "100달러" },
    { value: "50", label: "50달러" },
    { value: "20_10", label: "20/10달러" },
    { value: "5_2_1", label: "5/2/1달러" }
  ],
  KRW: [
    { value: "50000", label: "5만원" },
    { value: "10000", label: "1만원" },
    { value: "5000", label: "5천원" },
    { value: "1000", label: "1천원" }
  ],
  VND: [
    { value: "500000", label: "50만동" },
    { value: "200000", label: "20만동" },
    { value: "100000", label: "10만동" },
    { value: "50000", label: "5만동" },
    { value: "20000", label: "2만동" },
    { value: "10000", label: "1만동" },
    { value: "5000", label: "5천동" },
    { value: "1000", label: "1천동" }
  ]
};

export const useTransactionCalculations = (exchangeRates: any[] = []) => {
  // VND → KRW 매매시세 계산 함수
  const getVndToKrwDisplayRate = useCallback((denomination: string) => {
    if (Array.isArray(exchangeRates)) {
      // 우선 해당 권종의 VND → KRW 환율 조회
      let specificRate = exchangeRates.find((rate: any) => 
        rate.fromCurrency === "VND" && 
        rate.toCurrency === "KRW" && 
        rate.denomination === denomination &&
        rate.isActive === "true"
      );
      
      if (!specificRate) {
        // 해당 권종의 환율이 없으면 500,000 VND 환율로 대체
        const fallbackRate = exchangeRates.find((rate: any) => 
          rate.fromCurrency === "VND" && 
          rate.toCurrency === "KRW" && 
          rate.denomination === "500000" &&
          rate.isActive === "true"
        );
        
        if (fallbackRate) {
          console.log(`환율 검색: VND→KRW, 원본권종: ${denomination}, 검색권종: 500000, 결과:`, fallbackRate);
          specificRate = fallbackRate;
        }
      }
      
      if (specificRate) {
        const buyRate = parseFloat(specificRate.myBuyRate);
        console.log(`권종별 VND→KRW 매매시세 (${denomination}: ${buyRate}) - 내 매입가 사용`);
        return buyRate;
      }
    }
    return 0;
  }, [exchangeRates]);

  // 권종별 환율의 평균 계산
  const calculateAverageExchangeRate = useCallback((
    fromCurrency: string, 
    toCurrency: string, 
    denominationAmounts: Record<string, string>
  ) => {
    // VND→KRW 거래의 경우 권종별 매매시세의 평균 계산
    if (fromCurrency === "VND" && toCurrency === "KRW") {
      if (Array.isArray(exchangeRates)) {
        // 입력된 권종들의 매매시세 수집
        const enteredDenominations = Object.keys(denominationAmounts || {}).filter(denom => 
          denominationAmounts[denom] && parseFloat(denominationAmounts[denom]) > 0
        );
        
        if (enteredDenominations.length > 0) {
          const rates: number[] = [];
          
          enteredDenominations.forEach(denomination => {
            const displayRate = getVndToKrwDisplayRate(denomination);
            if (displayRate > 0) {
              rates.push(displayRate);
            }
          });
          
          if (rates.length > 0) {
            const avgRate = rates.reduce((sum, rate) => sum + rate, 0) / rates.length;
            console.log(`거래 확인 적용 환율 평균 계산: ${rates.join(', ')} → 평균: ${avgRate}`);
            return avgRate;
          }
        }
        
        // 입력된 권종이 없으면 기본값으로 500000 권종 환율 사용
        const defaultRate = getVndToKrwDisplayRate("500000");
        if (defaultRate > 0) {
          return defaultRate;
        }
      }
    }
    
    return 0;
  }, [exchangeRates, getVndToKrwDisplayRate]);

  // 총 입금 금액 계산
  const calculateTotalFromAmount = useCallback((denominationAmounts: Record<string, string>) => {
    let total = 0;
    Object.entries(denominationAmounts || {}).forEach(([denomination, count]) => {
      const denominationValue = parseFloat(denomination);
      const countValue = parseFloat(count) || 0;
      total += denominationValue * countValue;
    });
    return total;
  }, []);

  // VND 분배 계산
  const calculateVndDistribution = useCallback((amount: number) => {
    const denominations = [500000, 200000, 100000, 50000, 20000, 10000, 5000, 1000];
    const result: Record<string, number> = {};
    let remaining = Math.floor(amount);
    
    for (const denom of denominations) {
      if (remaining >= denom) {
        const count = Math.floor(remaining / denom);
        result[denom.toString()] = count;
        remaining -= count * denom;
      }
    }
    
    return result;
  }, []);

  return {
    CURRENCY_DENOMINATIONS,
    getVndToKrwDisplayRate,
    calculateAverageExchangeRate,
    calculateTotalFromAmount,
    calculateVndDistribution
  };
};