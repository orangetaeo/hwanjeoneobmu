import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { storage } from './storage';
import { insertTransactionSchema, insertAssetSchema, insertRateSchema, insertUserSettingsSchema, insertExchangeRateSchema, insertExchangeRateHistorySchema, transactions, assets, rates, exchangeRates, userSettings } from '@shared/schema';
// import bithumbApi from './bithumbApi';
import { apiKeyService } from './apiKeyService';
import { db } from './db';
import { eq } from 'drizzle-orm';

const router = Router();

// Extended Request interface
// interface AuthenticatedRequest extends Request {
//   user?: { id: string };
// }

// Middleware to check authentication (mock for development)
const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  // For development, create a mock user
  if (!req.user) {
    req.user = { id: 'dev-user-1' };
  }
  console.log('Auth middleware - User ID:', (req.user as any).id);
  next();
};

// Transactions Routes
router.post('/transactions', requireAuth, async (req: Request, res: Response) => {
  try {
    console.log('Transaction request body:', JSON.stringify(req.body, null, 2));
  console.log('User ID from request:', (req.user as any).id);
    const validatedData = insertTransactionSchema.parse(req.body);
    console.log('Validated data:', JSON.stringify(validatedData, null, 2));
  const transaction = await storage.createTransactionWithAssetMovement((req.user as any).id, validatedData);
    res.json(transaction);
  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(400).json({ error: 'Invalid transaction data', details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// 현금 자산 권종 데이터 정리 API
router.post('/cleanup-cash-denominations', requireAuth, async (req: Request, res: Response) => {
  try {
  await storage.cleanupCashDenominations((req.user as any).id);
    res.json({ message: '현금 자산 권종 데이터 정리가 완료되었습니다.' });
  } catch (error) {
    console.error('Error cleaning up cash denominations:', error);
    res.status(500).json({ error: 'Failed to cleanup cash denominations' });
  }
});
// 거래 상태 변경 API

// Assets Routes
router.post('/assets', requireAuth, async (req: Request, res: Response) => {
  try {
    // userId를 자동으로 추가
    const dataWithUserId = {
      ...req.body,
  userId: (req.user as any).id
    };
    
    console.log('Asset creation request:', JSON.stringify(dataWithUserId, null, 2));
    const validatedData = insertAssetSchema.parse(dataWithUserId);
  const asset = await storage.createAsset((req.user as any).id, validatedData);
    res.json(asset);
  } catch (error) {
    console.error('Error creating asset:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
    }
    res.status(400).json({ error: 'Invalid asset data', details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

router.get('/assets', requireAuth, async (req: Request, res: Response) => {
  try {
  const assets = await storage.getAssets((req.user as any).id);
    res.json(assets);
  } catch (error) {
    console.error('Error fetching assets:', error);
    res.status(500).json({ error: 'Failed to fetch assets' });
  }
});

router.put('/assets/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const validatedData = insertAssetSchema.partial().parse(req.body);
  const asset = await storage.updateAsset((req.user as any).id, req.params.id, validatedData);
    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }
    res.json(asset);
  } catch (error) {
    console.error('Error updating asset:', error);
    res.status(400).json({ error: 'Invalid asset data' });
  }
});

router.delete('/assets/:id', requireAuth, async (req: Request, res: Response) => {
  try {
  const success = await storage.deleteAsset((req.user as any).id, req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Asset not found' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting asset:', error);
    res.status(500).json({ error: 'Failed to delete asset' });
  }
});

// Rates Routes
router.post('/rates', requireAuth, async (req: Request, res: Response) => {
  try {
    const validatedData = insertRateSchema.parse(req.body);
  const rate = await storage.createRate((req.user as any).id, validatedData);
    res.json(rate);
  } catch (error) {
    console.error('Error creating rate:', error);
    const errorMessage = error instanceof Error ? error.message : 'Invalid rate data';
    res.status(400).json({ error: 'Invalid rate data', details: errorMessage });
  }
});

router.get('/rates', requireAuth, async (req: Request, res: Response) => {
  try {
    // 실시간 환율 데이터 제공 (실제 API에서 가져올 수 있지만, 개발용으로 고정값 사용)
    const currentRates = {
      'USD-VND': 25400,
      'KRW-VND': 18.75,
      'USD-KRW': 1355,
      'USDT-KRW': 1387.69,
      'USDT-VND': 25350,
      'VND-KRW': 0.0533,
      'KRW-USD': 0.000738,
      'VND-USD': 0.0000394
    };

    // 응답 형식을 기존 구조에 맞춤
    const response = {
      allRates: currentRates,
      timestamp: new Date().toISOString(),
      source: 'market_data'
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching rates:', error);
    res.status(500).json({ error: 'Failed to fetch rates' });
  }
});

router.get('/rates/:fromCurrency/:toCurrency/latest', requireAuth, async (req: Request, res: Response) => {
  try {
    const { fromCurrency, toCurrency } = req.params;
  const rate = await storage.getLatestRate((req.user as any).id, fromCurrency, toCurrency);
    if (!rate) {
      return res.status(404).json({ error: 'Rate not found' });
    }
    res.json(rate);
  } catch (error) {
    console.error('Error fetching latest rate:', error);
    res.status(500).json({ error: 'Failed to fetch latest rate' });
  }
});

// User Settings Routes
router.get('/settings', requireAuth, async (req: Request, res: Response) => {
  try {
    // 테스트 데이터 자동 초기화 제거 - 사용자가 직접 설정
    
  const settings = await storage.getUserSettings((req.user as any).id);
    res.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

router.put('/settings', requireAuth, async (req: Request, res: Response) => {
  try {
    const validatedData = insertUserSettingsSchema.partial().parse(req.body);
  const settings = await storage.updateUserSettings((req.user as any).id, validatedData);
    res.json(settings);
  } catch (error) {
    console.error('Error updating settings:', error);
    const errorMessage = error instanceof Error ? error.message : 'Invalid settings data';
    res.status(400).json({ error: 'Invalid settings data', details: errorMessage });
  }
});

// Exchange Rates Routes
router.post('/exchange-rates', requireAuth, async (req: Request, res: Response) => {
  try {
    const dataWithUserId = {
      ...req.body,
  userId: (req.user as any).id
    };
    
    console.log('Exchange rate creation request:', dataWithUserId);
    const validatedData = insertExchangeRateSchema.parse(dataWithUserId);
    
  const exchangeRate = await storage.createExchangeRate((req.user as any).id, validatedData);
    res.json(exchangeRate);
  } catch (error) {
    console.error('Error creating exchange rate:', error);
    res.status(400).json({ error: 'Invalid exchange rate data', details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

router.get('/exchange-rates', requireAuth, async (req: Request, res: Response) => {
  try {
  const exchangeRates = await storage.getExchangeRates((req.user as any).id);
    res.json(exchangeRates);
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    res.status(500).json({ error: 'Failed to fetch exchange rates' });
  }
});

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
router.get('/exchange-rates/history', requireAuth, async (req: Request, res: Response) => {
  try {
  const history = await storage.getExchangeRateHistory((req.user as any).id);
    res.json(history);
  } catch (error) {
    console.error('Error fetching exchange rate history:', error);
    res.status(500).json({ error: 'Failed to fetch exchange rate history' });
  }
});

// Exchange Rate for Transaction Route
router.get('/exchange-rates/transaction', requireAuth, async (req: Request, res: Response) => {
  try {
    const { fromCurrency, toCurrency, denomination, transactionType } = req.query;
    
    if (!fromCurrency || !toCurrency || !transactionType) {
      return res.status(400).json({ error: 'Missing required query parameters' });
    }

    const rateData = await storage.getExchangeRateForTransaction(
  (req.user as any).id,
      fromCurrency as string,
      toCurrency as string,
      denomination as string,
      transactionType as 'buy' | 'sell'
    );

    if (!rateData) {
      return res.status(404).json({ error: 'No exchange rate found for the specified parameters' });
    }

    res.json(rateData);
  } catch (error) {
    console.error('Error fetching transaction exchange rate:', error);
    res.status(500).json({ error: 'Failed to fetch transaction exchange rate' });
  }
});

// Bithumb API Routes

// 빗썸 API 연결 테스트 엔드포인트
router.get('/bithumb/test', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    console.log('=== 빗썸 API 연결 테스트 시작 ===');
    
    // 간단한 퍼블릭 API 테스트 (인증 불필요)
    const publicResponse = await fetch('https://api.bithumb.com/public/ticker/USDT_KRW');
    const publicData = await publicResponse.json();
    
    console.log('퍼블릭 API 응답:', publicData);
    
    if (publicData.status === '0000') {
      console.log('퍼블릭 API 연결 성공');
      
      // 이제 private API 테스트
      console.log('프라이빗 API 테스트 시작...');
      const balance = await bithumbApi.getBalance();
      
      res.json({
        success: true,
        message: '빗썸 API 연결 성공',
        publicApi: publicData,
        privateApi: balance
      });
    } else {
      throw new Error('퍼블릭 API 연결 실패');
    }
  } catch (error) {
    console.error('빗썸 API 테스트 실패:', error);
    res.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: '빗썸 API 연결 실패'
    });
  }
});

router.get('/bithumb/balance', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const balance = await bithumbApi.getBalance();
    res.json(balance);
  } catch (error) {
    console.error('Error fetching Bithumb balance:', error);
    res.status(500).json({ 
      error: 'Failed to fetch balance from Bithumb API',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get('/bithumb/transactions', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const transactions = await bithumbApi.getTransactionHistory(20, 'USDT');
    res.json(transactions);
  } catch (error) {
    console.error('Error fetching Bithumb transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions from Bithumb API' });
  }
});

router.get('/bithumb/usdt-data', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const data = await bithumbApi.getUsdtTransactionsNEW(limit);
    res.json(data);
  } catch (error) {
    console.error('Error fetching Bithumb USDT data:', error);
    res.status(500).json({ 
      error: 'Failed to fetch USDT data from Bithumb API',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// 빗썸 거래 내역 조회 (전체) - 개수 선택 기능 포함
router.get('/bithumb/transactions-full', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const currency = req.query.currency as string || 'USDT';
    console.log(`🚀 프론트엔드에서 요청: /transactions-full limit=${limit} currency=${currency}`);
    const data = await bithumbApi.getUsdtTransactionsNEW(limit);
    res.json(data);
  } catch (error) {
    console.error('Error fetching Bithumb transaction history:', error);
    res.status(500).json({ 
      error: 'Failed to fetch transaction history from Bithumb API',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// 🎯 빗썸 공식 API 종합 테스트
router.get('/bithumb/official-test', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    console.log('🎯🎯🎯 빗썸 공식 API 종합 테스트 시작! 🎯🎯🎯');
    
    const testResults = await bithumbApi.runOfficialApiTest();
    
    res.json({
      success: true,
      message: '빗썸 공식 API 테스트 완료',
      results: testResults,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ 빗썸 공식 API 테스트 실패:', error);
    res.status(500).json({
      success: false,
      message: '빗썸 공식 API 테스트 실패',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// 🔥 빗썸 계좌 조회 테스트 (파라미터 없음, 간단)
router.get('/bithumb/test-accounts', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    console.log('💰💰💰 빗썸 계좌 조회 테스트 시작! 💰💰💰');
    
    const jwt = require('jsonwebtoken');
    const { v4: uuidv4 } = require('uuid');
    
    const accessKey = '27522b3429dfd29be42f34a2a466d881b837b00b2908aadd';
    const secretKey = 'ZDBhYzA1MjU4ODI2MzUyMjJhMzYyZWRhZGI5MGVlNTY0NGE0YTY2NmQ0OGJiODNjYmIwYzI4MDlhY2Q5MTk2';
    
    // 계좌 조회는 파라미터 없음 (더 간단)
    const payload = {
      access_key: accessKey,
      nonce: uuidv4(),
      timestamp: Date.now()
    };
    
    console.log('🔐 계좌 조회 JWT 페이로드:', {
      access_key: accessKey.substring(0, 8) + '...',
      nonce: payload.nonce,
      timestamp: payload.timestamp
    });
    
    // HS256 서명
    const jwtToken = jwt.sign(payload, secretKey, { algorithm: 'HS256' });
    console.log('✅ JWT 토큰 (HS256):', jwtToken.substring(0, 50) + '...');
    
    // 빗썸 계좌 조회 API
    const apiUrl = 'https://api.bithumb.com/v1/accounts';
    console.log('📡 빗썸 계좌 URL:', apiUrl);
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${jwtToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📡 빗썸 응답 상태:', response.status);
    const responseText = await response.text();
    console.log('📡 빗썸 응답 내용:', responseText.substring(0, 300));
    
    let responseData;
    try {
      responseData = JSON.parse(responseText);
      console.log('✅ JSON 파싱 성공! 계좌 개수:', responseData.length || 0);
    } catch (parseError) {
      console.log('❌ JSON 파싱 실패:', parseError.message);
      responseData = { raw: responseText.substring(0, 500) };
    }
    
    res.json({
      success: response.ok,
      method: 'JWT Bearer Token (HS256) - 계좌 조회',
      endpoint: '/v1/accounts',
      status: response.status,
      data: responseData
    });
    
  } catch (error) {
    console.error('❌ 빗썸 계좌 조회 실패:', error);
    res.status(500).json({
      success: false,
      method: 'JWT Bearer Token (HS256) - 계좌 조회',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// 🔥 빗썸 공식 JWT 방식 (HS256 서명) 완전 구현
router.get('/bithumb/test-jwt', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    console.log('🎯🎯🎯 빗썸 공식 API 사양 JWT 테스트! 🎯🎯🎯');
    
    const jwt = require('jsonwebtoken');
    const crypto = require('crypto');
    const { v4: uuidv4 } = require('uuid');
    
    const accessKey = '27522b3429dfd29be42f34a2a466d881b837b00b2908aadd';
    const secretKey = 'ZDBhYzA1MjU4ODI2MzUyMjJhMzYyZWRhZGI5MGVlNTY0NGE0YTY2NmQ0OGJiODNjYmIwYzI4MDlhY2Q5MTk2';
    
    // 빗썸 공식 문서 정확한 쿼리 형식
    const query = 'market=KRW-USDT&limit=5&page=1&order_by=desc&state=done';
    
    // SHA512 해시 (빗썸 공식)
    const hash = crypto.createHash('SHA512');
    const queryHash = hash.update(query, 'utf-8').digest('hex');
    
    // 빗썸 공식 JWT 페이로드
    const payload = {
      access_key: accessKey,
      nonce: uuidv4(),  // UUID 형식 (공식 문서 기준)
      timestamp: Date.now(),  // 밀리초
      query_hash: queryHash,
      query_hash_alg: 'SHA512'
    };
    
    console.log('🔐 빗썸 공식 JWT 페이로드:', {
      access_key: accessKey.substring(0, 8) + '...',
      nonce: payload.nonce,
      timestamp: payload.timestamp,
      query_hash: queryHash.substring(0, 16) + '...',
      query_hash_alg: 'SHA512'
    });
    
    // ⭐ 핵심: HS256 서명 (빗썸 공식 권장)
    const jwtToken = jwt.sign(payload, secretKey, { algorithm: 'HS256' });
    console.log('✅ JWT 토큰 (HS256):', jwtToken.substring(0, 50) + '...');
    
    // 빗썸 공식 API 호출
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
    
  } catch (error) {
    console.error('❌ 빗썸 공식 JWT 실패:', error);
    res.status(500).json({
      success: false,
      method: 'JWT Bearer Token (빗썸 공식 HS256)',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// 🔥 빗썸 API 1.0과 2.0 모두 테스트하는 엔드포인트
router.get('/bithumb/test-hmac', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    console.log('🔥🔥🔥 빗썸 API 1.0 & 2.0 테스트 시작! 🔥🔥🔥');
    
    const queryParams = {
      order_currency: 'USDT',
      payment_currency: 'KRW',
      count: 5
    };
    
    const results: any = { jwt: null, v1: null, v2: null };
    
    // JWT 방식 테스트 (올바른 빗썸 API)
    try {
      console.log('📡 JWT 방식 테스트 시작...');
      
      // 올바른 쿼리 파라미터 (빗썸 공식 문서 기준)
      const correctParams = {
        market: 'KRW-USDT',
        limit: 5,
        page: 1,
        order_by: 'desc',
        state: 'done'  // 체결 완료된 주문만 조회
      };
      
      const jwtResult = await bithumbApi.makeApiRequest('/v1/orders', correctParams, 'GET');
      console.log('✅ JWT 방식 성공:', jwtResult);
      results.jwt = { success: true, data: jwtResult };
    } catch (jwtError: any) {
      console.log('❌ JWT 방식 실패:', jwtError.message);
      results.jwt = { success: false, error: jwtError.message };
    }
    
    // 기존 방식들도 유지 (비교용)
    try {
      console.log('📡 API 1.0 테스트 시작...');
      const v1Result = await bithumbApi.makeHmacV1Request('/info/orders', queryParams);
      console.log('✅ API 1.0 성공:', v1Result);
      results.v1 = { success: true, data: v1Result };
    } catch (v1Error) {
      console.log('❌ API 1.0 실패:', v1Error.message);
      results.v1 = { success: false, error: v1Error.message };
    }
    
    try {
      console.log('📡 API 2.0 테스트 시작...');
      const v2Result = await bithumbApi.makeHmacRequest('/info/orders', queryParams);
      console.log('✅ API 2.0 성공:', v2Result);
      results.v2 = { success: true, data: v2Result };
    } catch (v2Error) {
      console.log('❌ API 2.0 실패:', v2Error.message);
      results.v2 = { success: false, error: v2Error.message };
    }
    
    res.json({
      success: true,
      message: 'API 1.0과 2.0 테스트 완료',
      results: results
    });
    
  } catch (error) {
    console.error('❌ 전체 테스트 실패:', error);
    res.status(500).json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Test data initialization endpoint
router.post('/test-data/initialize', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    console.log(`테스트 데이터 초기화 시작 - 사용자: ${userId}`);

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

// 새거래용 환율 조회 API
router.get('/exchange-rates/transaction', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { fromCurrency, toCurrency, denomination, transactionType } = req.query;
    
    if (!fromCurrency || !toCurrency) {
      return res.status(400).json({ error: 'fromCurrency and toCurrency are required' });
    }

    const rate = await storage.getExchangeRateForTransaction(
      req.user!.id,
      fromCurrency as string,
      toCurrency as string,
      denomination as string,
      (transactionType as 'buy' | 'sell') || 'buy'
    );

    if (!rate) {
      return res.status(404).json({ error: 'Exchange rate not found' });
    }

    res.json(rate);
  } catch (error) {
    console.error('Error fetching transaction exchange rate:', error);
    res.status(500).json({ error: 'Failed to fetch exchange rate' });
  }
});

// 환전상 시세 목록 조회 API
router.get('/exchange-rates', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const rates = await storage.getExchangeRates(req.user!.id);
    res.json(rates);
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    res.status(500).json({ error: 'Failed to fetch exchange rates' });
  }
});

// 환전상 시세 저장/업데이트 API (UPSERT)
router.post('/exchange-rates', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validatedData = insertExchangeRateSchema.parse({
      ...req.body,
      userId: req.user!.id
    });

    // 매입가 > 매도가 검증
    if (validatedData.myBuyRate && validatedData.mySellRate) {
      const buyRate = parseFloat(validatedData.myBuyRate);
      const sellRate = parseFloat(validatedData.mySellRate);
      if (buyRate > sellRate) {
        return res.status(400).json({ 
          error: '매입가가 매도가보다 높습니다. 올바른 시세를 입력하세요.' 
        });
      }
    }

    const rate = await storage.upsertExchangeRate(validatedData);
    res.json(rate);
  } catch (error) {
    console.error('Error saving exchange rate:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data format', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to save exchange rate' });
  }
});

// 환전상 시세 이력 조회 API
router.get('/exchange-rates/history', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { fromCurrency, toCurrency, denomination, startDate, endDate } = req.query;
    
    const filters: any = {};
    if (fromCurrency) filters.fromCurrency = fromCurrency as string;
    if (toCurrency) filters.toCurrency = toCurrency as string;
    if (denomination) filters.denomination = denomination as string;
    if (startDate) filters.startDate = new Date(startDate as string);
    if (endDate) filters.endDate = new Date(endDate as string);

    const history = await storage.getExchangeRateHistory(req.user!.id, filters);
    res.json(history);
  } catch (error) {
    console.error('Error fetching exchange rate history:', error);
    res.status(500).json({ error: 'Failed to fetch exchange rate history' });
  }
});


// 통합 API Key 관리

export default router;