import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { storage } from './storage';
import { insertTransactionSchema, insertAssetSchema, insertRateSchema, insertUserSettingsSchema, insertExchangeRateSchema, insertExchangeRateHistorySchema, transactions, assets, rates, exchangeRates, userSettings } from '@shared/schema';
// bithumbApi 관련 코드 제거
import { apiKeyService } from './apiKeyService';
import { db } from './db';
import { eq } from 'drizzle-orm';

const router = Router();

// Extended Request interface
// AuthenticatedRequest 관련 코드 제거
// }

// Middleware to check authentication (mock for development)
// 인증 미들웨어 제거 (더 이상 req.user 사용 안함)
const requireAuth = (req: Request, res: Response, next: NextFunction) => { next(); };

// Transactions Routes
// req.user 사용 엔드포인트 전체 제거

// 현금 자산 권종 데이터 정리 API
// req.user 사용 엔드포인트 전체 제거
// 거래 상태 변경 API

// Assets Routes
// req.user 사용 엔드포인트 전체 제거

// req.user 사용 엔드포인트 전체 제거

// req.user 사용 엔드포인트 전체 제거

// req.user 사용 엔드포인트 전체 제거

// Rates Routes
// req.user 사용 엔드포인트 전체 제거

// req.user 사용 엔드포인트 전체 제거

// req.user 사용 엔드포인트 전체 제거

// User Settings Routes
// req.user 사용 엔드포인트 전체 제거

// req.user 사용 엔드포인트 전체 제거

// Exchange Rates Routes
// req.user 사용 엔드포인트 전체 제거

// req.user 사용 엔드포인트 전체 제거

router.patch('/exchange-rates/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const exchangeRate = await storage.updateExchangeRate(req.params.id, req.body);
    if (!exchangeRate) {
      return res.status(404).json({ error: 'Exchange rate not found' });
    }
    res.json(exchangeRate);
  } catch (error) {
    console.error('Error updating exchange rate:', error);
    res.status(500).json({ error: 'Failed to update exchange rate' });
  }
});

// Exchange Rates History Route
// req.user 사용 엔드포인트 전체 제거

// Exchange Rate for Transaction Route
// req.user 사용 엔드포인트 전체 제거

// Bithumb API 엔드포인트 전체 삭제
    const apiUrl = `https://api.bithumb.com/v1/orders?${query}`;
    console.log('📡 빗썸 공식 URL:', apiUrl);
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${jwtToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📡 빗썸 응답 상태:', response.status);
    console.log('📡 빗썸 응답 헤더:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('📡 빗썸 응답 내용:', responseText.substring(0, 300));
    
    let responseData;
    try {
      responseData = JSON.parse(responseText);
      console.log('✅ JSON 파싱 성공!');
    } catch (parseError) {
      console.log('❌ JSON 파싱 실패:', parseError.message);
      responseData = { raw: responseText.substring(0, 500) };
    }
    
    res.json({
      success: response.ok,
      method: 'JWT Bearer Token (빗썸 공식 HS256)',
      endpoint: '/v1/orders',
      status: response.status,
      query,
      payload_info: {
        algorithm: 'HS256',
        nonce_type: 'UUID',
        query_hash_alg: 'SHA512'
      },
      data: responseData
    });
    
// 불필요한 catch 블록 및 중괄호 삭제
});

// Bithumb 및 AuthenticatedRequest 관련 엔드포인트 전체 삭제

    // 1. 기존 데이터 모두 삭제
    await db.delete(transactions).where(eq(transactions.userId, userId));
    await db.delete(assets).where(eq(assets.userId, userId));
    await db.delete(rates).where(eq(rates.userId, userId));
    await db.delete(exchangeRates).where(eq(exchangeRates.userId, userId));
    await db.delete(userSettings).where(eq(userSettings.userId, userId));
    
    console.log('기존 데이터 삭제 완료');

    // 2. 사용자 설정 생성
    await storage.updateUserSettings(userId, {
      bithumbFeeRate: "0.0004",
      bithumbGrade: "white",
      defaultFeeRates: {
        bithumb: 0.0004,
        binance: 0.001
      }
    });

    // 3. 초기 자산 생성
    const initialAssets = [
      // 현금 자산 (현재 저장된 데이터 반영)
      {
        userId,
        type: 'cash',
        name: 'KRW 현금',
        currency: 'KRW',
        balance: '4020000',
        metadata: {
          denominations: {
            '50000': 68,
            '10000': 62,
            '5000': 0,
            '1000': 0
          }
        }
      },
      {
        userId,
        type: 'cash',
        name: 'USD 현금',
        currency: 'USD',
        balance: '755',
        metadata: {
          denominations: {
            '100': 6,
            '50': 1,
            '20': 0,
            '10': 4,
            '5': 4,
            '2': 0,
            '1': 45
          }
        }
      },
      {
        userId,
        type: 'cash',
        name: 'VND 현금',
        currency: 'VND',
        balance: '49300000',
        metadata: {
          denominations: {
            '500000': 93,
            '200000': 7,
            '100000': 12,
            '50000': 4,
            '20000': 0,
            '10000': 0,
            '5000': 0,
            '2000': 0,
            '1000': 0
          }
        }
      },
      // 한국 은행 계좌 (현재 저장된 데이터 반영)
      {
        userId,
        type: 'account',
        name: '하나은행',
        currency: 'KRW',
        balance: '750000',
        metadata: {
          bank: '하나은행',
          accountNumber: '123-456-7890',
          accountHolder: '조윤희'
        }
      },
      {
        userId,
        type: 'account',
        name: '국민은행 (김학태)',
        currency: 'KRW',
        balance: '0',
        metadata: {
          bankName: '국민은행',
          accountNumber: '123-456-789123',
          accountHolder: '김학태'
        }
      },
      {
        userId,
        type: 'account',
        name: '카카오뱅크 (김학태)',
        currency: 'KRW',
        balance: '0',
        metadata: {
          bankName: '카카오뱅크',
          accountNumber: '3333-03-1258874',
          accountHolder: '김학태'
        }
      },
      // 베트남 은행 계좌들 (현재 저장된 데이터 반영)
      {
        userId,
        type: 'account',
        name: '우리은행 (김학태)',
        currency: 'VND',
        balance: '0',
        metadata: {
          country: '베트남',
          bankName: '우리은행',
          accountHolder: '김학태',
          accountNumber: '1002-123-456789'
        }
      },
      {
        userId,
        type: 'account',
        name: 'BIDV',
        currency: 'VND',
        balance: '1200000',
        metadata: {
          bank: 'BIDV',
          accountNumber: '110-456-789123',
          accountHolder: '조윤희'
        }
      },
      {
        userId,
        type: 'account',
        name: '신한은행',
        currency: 'VND',
        balance: '22160000',
        metadata: {
          bank: '신한은행',
          accountNumber: '110-123-456789',
          accountHolder: '조윤희'
        }
      },
      // 거래소 자산 (현재 저장된 데이터 반영)
      {
        userId,
        type: 'exchange',
        name: 'Bithumb USDT',
        currency: 'USDT',
        balance: '2563.07363534',
        metadata: {
          exchange: 'Bithumb'
        }
      },
      // 바이낸스 자산
      {
        userId,
        type: 'binance',
        name: 'Binance USDT',
        currency: 'USDT',
        balance: '1.14',
        metadata: {
          exchange: 'Binance',
          assetType: 'crypto'
        }
      }
    ];

    console.log('초기 자산 생성 시작');
    for (const asset of initialAssets) {
      console.log('자산 생성 중:', { name: asset.name, balance: asset.balance });
      const createdAsset = await storage.createAsset(userId, asset);
      console.log('자산 생성 완료:', { name: createdAsset.name, balance: createdAsset.balance });
    }
    console.log('초기 자산 생성 완료');

    // 4. 환율 정보 생성
    const initialExchangeRates = [
      // USD -> VND 환율
      {
        userId,
        fromCurrency: 'USD',
        toCurrency: 'VND',
        denomination: '100',
        goldShopRate: '25200',
        myBuyRate: '25000',
        mySellRate: '25300',
        isActive: 'true',
        memo: '100달러 지폐'
      },
      {
        userId,
        fromCurrency: 'USD',
        toCurrency: 'VND',
        denomination: '50',
        goldShopRate: '25180',
        myBuyRate: '24980',
        mySellRate: '25280',
        isActive: 'true',
        memo: '50달러 지폐'
      },
      // KRW -> VND 환율  
      {
        userId,
        fromCurrency: 'KRW',
        toCurrency: 'VND',
        denomination: '50000',
        goldShopRate: '19.2',
        myBuyRate: '19.0',
        mySellRate: '19.4',
        isActive: 'true',
        memo: '5만원권'
      },
      {
        userId,
        fromCurrency: 'KRW',
        toCurrency: 'VND',
        denomination: '10000',
        goldShopRate: '19.1',
        myBuyRate: '18.9',
        mySellRate: '19.3',
        isActive: 'true',
        memo: '1만원권'
      }
    ];

    console.log('환율 정보 생성 시작');
    try {
      for (const rate of initialExchangeRates) {
        console.log('환율 생성 중:', rate);
        await storage.createExchangeRate(userId, rate);
        console.log('환율 생성 완료');
      }
      console.log('환율 정보 생성 완료');
    } catch (rateError) {
      console.error('환율 정보 생성 오류:', rateError);
      throw rateError;
    }

    // 5. 거래 내역 생성
    console.log('거래 내역 초기화 시작...');
    const initialTransactions = [
      {
        userId,
        type: 'cash_change',
        fromAssetType: '',
        fromAssetId: '',
        fromAssetName: '현금 증가',
        toAssetType: '',
        toAssetId: '',
        toAssetName: 'USD 현금',
        fromAmount: '319',
        toAmount: '319',
        rate: '1',
        fees: '0',
        profit: '0',
        memo: '',
        metadata: {
          assetId: 'usd-cash-placeholder',
          denominationChanges: {
            '1': 14,
            '2': 0,
            '5': 1,
            '10': -4,
            '20': -3,
            '50': 0,
            '100': 4
          }
        },
        status: 'confirmed'
      },
      {
        userId,
        type: 'cash_change',
        fromAssetType: '',
        fromAssetId: '',
        fromAssetName: '현금 증가',
        toAssetType: '',
        toAssetId: '',
        toAssetName: 'KRW 현금',
        fromAmount: '480000',
        toAmount: '480000',
        rate: '1',
        fees: '0',
        profit: '0',
        memo: '',
        metadata: {
          assetId: 'krw-cash-placeholder',
          denominationChanges: {
            '1000': 0,
            '5000': 0,
            '10000': 3,
            '50000': 9
          }
        },
        status: 'confirmed'
      },
      {
        userId,
        type: 'cash_change',
        fromAssetType: '',
        fromAssetId: '',
        fromAssetName: '현금 증가',
        toAssetType: '',
        toAssetId: '',
        toAssetName: 'VND 현금',
        fromAmount: '18510000',
        toAmount: '18510000',
        rate: '1',
        fees: '0',
        profit: '0',
        memo: '',
        metadata: {
          assetId: 'vnd-cash-placeholder',
          denominationChanges: {
            '1000': 0,
            '2000': 0,
            '5000': 0,
            '10000': -7,
            '20000': -1,
            '50000': 0,
            '100000': 7,
            '200000': -3,
            '500000': 37
          }
        },
        status: 'confirmed'
      }
    ];

    console.log('거래 내역 생성 시작');
    for (const transaction of initialTransactions) {
      console.log('거래 내역 생성 중:', { type: transaction.type, toAssetName: transaction.toAssetName });
      try {
        // 거래 내역만 생성 (자산 이동 없이)
        const [result] = await db
          .insert(transactions)
          .values({
            ...transaction,
            timestamp: new Date()
          })
          .returning();
        console.log('거래 내역 생성 완료:', { id: result.id, type: result.type });
      } catch (error) {
        console.error('거래 내역 생성 오류:', error);
      }
    }
    console.log('거래 내역 생성 완료');

    console.log('테스트 데이터 초기화 완료');
    res.json({ 
      success: true, 
      message: '테스트 데이터가 성공적으로 초기화되었습니다.',
      data: {
        assets: initialAssets.length,
        exchangeRates: initialExchangeRates.length,
        transactions: initialTransactions.length
      }
    });

  } catch (error) {
    console.error('테스트 데이터 초기화 중 오류:', error);
    res.status(500).json({ 
      error: '테스트 데이터 초기화에 실패했습니다.', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// 새거래용 환율 조회 API (비활성화)

// 환전상 시세 목록 조회 API (비활성화)

// 환전상 시세 저장/업데이트 API (비활성화)

// 환전상 시세 이력 조회 API (비활성화)


// 통합 API Key 관리

export default router;