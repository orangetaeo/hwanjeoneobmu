import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

interface BithumbApiConfig {
  apiKey: string;
  secretKey: string;
  baseUrl: string;
}

interface BithumbBalance {
  status: string;
  total_krw: string;
  total_usdt: string;
  available_krw: string;
  available_usdt: string;
  in_use_krw: string;
  in_use_usdt: string;
  xcoin_last_usdt: string;
}

interface BithumbTransaction {
  transfer_date: number;
  order_currency: string;
  payment_currency: string;
  units: string;
  price: string;
  amount: string;
  fee_currency: string;
  fee: string;
  order_balance: string;
  payment_balance: string;
}

class BithumbApiService {
  private config: BithumbApiConfig;

  constructor() {
    this.config = {
      apiKey: process.env.BITHUMB_API_KEY || 'b98ea5c12a3d00694290f5a394682ee9b79ebdc62a7d8fda',
      secretKey: process.env.BITHUMB_SECRET_KEY || 'NDU0Njc1NGE5YjZlYWJmZWE0YzMyZDM4MDk2MjQ4ZTk4NWE1OTY2ODI4ZWJiMDliYjdjZjI5N2M4YmRiNjQ3',
      baseUrl: 'https://api.bithumb.com'
    };
    
    console.log('Bithumb JWT API Service initialized with:', {
      apiKeyLength: this.config.apiKey.length,
      secretKeyLength: this.config.secretKey.length,
      baseUrl: this.config.baseUrl
    });
  }

  private generateJwtToken(queryParams: any = {}): string {
    const nonce = uuidv4();
    const timestamp = Date.now();
    
    let payload: any = {
      access_key: this.config.apiKey,
      nonce,
      timestamp
    };
    
    // 파라미터가 있는 경우 query_hash 생성
    if (queryParams && Object.keys(queryParams).length > 0) {
      // URL 인코딩된 쿼리 스트링 생성
      const queryString = new URLSearchParams(queryParams).toString();
      console.log('Query string for hashing:', queryString);
      
      // SHA512로 해시 생성
      const hash = crypto.createHash('sha512');
      hash.update(queryString, 'utf-8');
      const queryHash = hash.digest('hex');
      
      payload.query_hash = queryHash;
      payload.query_hash_alg = 'SHA512';
    }
    
    console.log('JWT Payload:', {
      access_key: payload.access_key.substring(0, 10) + '...',
      nonce,
      timestamp,
      query_hash: payload.query_hash ? payload.query_hash.substring(0, 20) + '...' : undefined,
      query_hash_alg: payload.query_hash_alg
    });
    
    // JWT 토큰 생성 (HS256 서명)
    const jwtToken = jwt.sign(payload, this.config.secretKey, { algorithm: 'HS256' });
    console.log('Generated JWT token (first 50 chars):', jwtToken.substring(0, 50) + '...');
    
    return jwtToken;
  }

  private async makeApiRequest(endpoint: string, parameters: any = {}, isGetRequest: boolean = false): Promise<any> {
    try {
      let url = `${this.config.baseUrl}${endpoint}`;
      let requestOptions: RequestInit;
      
      // JWT 토큰 생성
      const jwtToken = this.generateJwtToken(parameters);
      
      const headers = {
        'Authorization': `Bearer ${jwtToken}`,
        'Accept': 'application/json'
      };
      
      if (isGetRequest) {
        // GET 요청의 경우 쿼리 파라미터로 추가
        if (parameters && Object.keys(parameters).length > 0) {
          const queryString = new URLSearchParams(parameters).toString();
          url += `?${queryString}`;
        }
        
        requestOptions = {
          method: 'GET',
          headers
        };
      } else {
        // POST 요청의 경우 JSON body 사용
        headers['Content-Type'] = 'application/json';
        
        requestOptions = {
          method: 'POST',
          headers,
          body: Object.keys(parameters).length > 0 ? JSON.stringify(parameters) : undefined
        };
      }

      console.log('Bithumb JWT API Request:', {
        url,
        method: isGetRequest ? 'GET' : 'POST',
        headers: { ...headers, 'Authorization': 'Bearer [HIDDEN]' },
        hasBody: !isGetRequest && Object.keys(parameters).length > 0
      });

      const response = await fetch(url, requestOptions);
      
      console.log('Response status:', response.status);
      console.log('Response headers:', [...response.headers.entries()]);
      
      const responseText = await response.text();
      console.log('Bithumb API Raw Response:', responseText);
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse response as JSON:', parseError);
        throw new Error(`Invalid JSON response: ${responseText}`);
      }
      
      if (data.status !== '0000') {
        console.error('Bithumb API Error Details:', {
          status: data.status,
          message: data.message,
          fullResponse: data
        });
        
        throw new Error(`Bithumb API Error: ${data.message || data.status} (Code: ${data.status})`);
      }

      return data;
    } catch (error) {
      console.error('Bithumb JWT API request failed:', error);
      throw error;
    }
  }

  async getBalance(): Promise<BithumbBalance> {
    // v2.0 API는 GET 방식일 수도 있으므로 둘 다 시도
    try {
      // 먼저 POST 방식으로 시도
      const response = await this.makeApiRequest('/info/balance', { currency: 'ALL' }, false);
      return response.data;
    } catch (error) {
      console.log('POST 방식 실패, GET 방식으로 재시도...');
      // GET 방식으로 재시도
      const response = await this.makeApiRequest('/info/balance', { currency: 'ALL' }, true);
      return response.data;
    }
  }

  async getTransactionHistory(currency: string = 'USDT', count: number = 50): Promise<BithumbTransaction[]> {
    try {
      const response = await this.makeApiRequest('/info/user_transactions', {
        order_currency: currency,
        payment_currency: 'KRW',
        count,
        searchGb: 1 // 1: 매수 완료만 조회
      }, false);
      return response.data;
    } catch (error) {
      console.log('거래내역 POST 방식 실패, GET 방식으로 재시도...');
      const response = await this.makeApiRequest('/info/user_transactions', {
        order_currency: currency,
        payment_currency: 'KRW',
        count,
        searchGb: 1
      }, true);
      return response.data;
    }
  }

  async getUsdtTransactions(): Promise<{
    balance: number;
    availableBalance: number;
    transactions: Array<{
      date: string;
      amount: number;
      quantity: number;
      price: number;
      fee: number;
      totalCost: number;
    }>;
  }> {
    try {
      // 잔고 조회
      const balance = await this.getBalance();
      const usdtBalance = parseFloat(balance.total_usdt || '0');
      const availableUsdt = parseFloat(balance.available_usdt || '0');

      // 거래 내역 조회
      const transactions = await this.getTransactionHistory('USDT');
      
      const formattedTransactions = transactions.map(tx => ({
        date: new Date(tx.transfer_date * 1000).toISOString(),
        amount: parseFloat(tx.amount), // KRW 금액
        quantity: parseFloat(tx.units), // USDT 수량
        price: parseFloat(tx.price), // 단가
        fee: parseFloat(tx.fee), // 수수료
        totalCost: parseFloat(tx.amount) // 총 비용
      }));

      return {
        balance: usdtBalance,
        availableBalance: availableUsdt,
        transactions: formattedTransactions
      };
    } catch (error) {
      console.error('Failed to fetch Bithumb data:', error);
      throw new Error('빗썸 API 연결에 실패했습니다. API 키와 IP 설정을 확인해주세요.');
    }
  }
}

export const bithumbApi = new BithumbApiService();
export type { BithumbTransaction, BithumbBalance };