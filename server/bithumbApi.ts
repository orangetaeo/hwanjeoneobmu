import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

interface BithumbApiConfig {
  apiKey: string; // API 2.0 키
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
      apiKey: process.env.BITHUMB_API2_KEY || 'b98ea5c12a3d00694290f5a394682ee9b79ebdc62a7d8fda',
      secretKey: process.env.BITHUMB_SECRET_KEY || 'ZDBhYzA1MjU4ODI2MzUyMjJhMzYyZWRhZGI5MGVlNTY0NGE0YTY2NmQ0OGJiODNjYmIwYzI4MDlhY2Q5MTk2',
      baseUrl: 'https://api.bithumb.com'
    };
    
    console.log('Bithumb API 2.0 Service initialized with:', {
      apiKeyLength: this.config.apiKey.length,
      secretKeyLength: this.config.secretKey.length,
      baseUrl: this.config.baseUrl,
      apiKeyPreview: this.config.apiKey.substring(0, 8) + '...',
      secretKeyPreview: this.config.secretKey.substring(0, 8) + '...'
    });
  }

  private generateJwtSignature(endpoint: string, parameters: any = {}): string {
    const timestamp = Date.now();
    const nonce = uuidv4();
    
    // JWT v2.1.0: 빗썸 새로운 인증 방식
    let queryString = '';
    if (parameters && Object.keys(parameters).length > 0) {
      const sortedParams = Object.keys(parameters)
        .sort()
        .map(key => `${key}=${parameters[key]}`)
        .join('&');
      queryString = sortedParams;
    }
    
    // SHA512로 쿼리 해시 생성
    const queryHash = crypto
      .createHash('sha512')
      .update(queryString || '', 'utf-8')
      .digest('hex');
    
    // JWT 페이로드 구성
    const payload = {
      access_key: this.config.apiKey,
      nonce: nonce,
      timestamp: timestamp,
      query_hash: queryHash,
      query_hash_alg: 'SHA512'
    };
    
    console.log('빗썸 API v2.1.0 JWT 인증 생성:', {
      endpoint, parameters, timestamp, nonce,
      queryString: queryString.substring(0, 100) + (queryString.length > 100 ? '...' : ''),
      queryHash: queryHash.substring(0, 20) + '...',
      accessKey: payload.access_key.substring(0, 10) + '...'
    });
    
    // JWT 토큰 생성 (HS256 알고리즘)
    const jwtToken = jwt.sign(payload, this.config.secretKey, { algorithm: 'HS256' });
    
    return jwtToken;
  }

  private async makeApiRequest(endpoint: string, parameters: any = {}): Promise<any> {
    try {
      const url = `${this.config.baseUrl}${endpoint}`;
      const jwtToken = this.generateJwtSignature(endpoint, parameters);
      
      // JWT v2.1.0 헤더 구성
      const headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json; charset=utf-8',
        'Authorization': `Bearer ${jwtToken}`
      };
      
      const requestOptions: RequestInit = {
        method: 'POST',
        headers,
        body: Object.keys(parameters).length > 0 ? JSON.stringify(parameters) : undefined
      };

      console.log(`Bithumb API 2.0 JWT Request:`, {
        url, method: 'POST',
        headers: { ...headers, 'Authorization': 'Bearer [JWT_TOKEN_HIDDEN]' },
        bodyParams: parameters
      });
      
      return await this.processApiResponse(url, requestOptions);
    } catch (error) {
      console.error('Bithumb API request failed:', error);
      throw error;
    }
  }

  private async processApiResponse(url: string, requestOptions: RequestInit): Promise<any> {
    const response = await fetch(url, requestOptions);
    
    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers);
    
    const textResponse = await response.text();
    console.log('Bithumb API Raw Response:', textResponse);
    
    let data;
    try {
      data = JSON.parse(textResponse);
    } catch (parseError) {
      console.error('Failed to parse JSON response:', parseError);
      throw new Error(`Invalid JSON response: ${textResponse}`);
    }
    
    // 빗썸 API 2.0 오류 처리
    if (data.error) {
      console.log('Bithumb API Error:', data.error);
      throw new Error(`Bithumb API Error: ${data.error.name || data.error}`);
    }
    
    // 빗썸 API 1.0 스타일 오류 처리 (호환성)
    if (data.status && data.status !== '0000') {
      console.log('Bithumb API Error Details:', {
        status: data.status,
        message: data.message,
        fullResponse: data
      });
      throw new Error(`Bithumb API Error: ${data.message} (Code: ${data.status})`);
    }
    
    return data;
  }

  public async getBalance(): Promise<BithumbBalance> {
    try {
      const response = await this.makeApiRequest('/info/balance', { currency: 'ALL' });
      return response.data;
    } catch (error) {
      console.error('Error fetching balance:', error);
      throw error;
    }
  }

  public async getUsdtTransactions(): Promise<BithumbTransaction[]> {
    try {
      const balance = await this.getBalance();
      
      if (!balance || !balance.total_usdt) {
        console.log('USDT balance not found or zero');
        return [];
      }
      
      const response = await this.makeApiRequest('/info/user_transactions', { 
        currency: 'USDT',
        count: 20
      });
      
      return response.data || [];
    } catch (error) {
      console.error('Failed to fetch Bithumb data:', error);
      throw new Error('빗썸 API 연결에 실패했습니다. API 키와 IP 설정을 확인해주세요.');
    }
  }

  public getApiKeys() {
    return {
      apiKey: this.config.apiKey.substring(0, 8) + '****' + this.config.apiKey.slice(-4),
      secretKey: this.config.secretKey.substring(0, 8) + '****' + this.config.secretKey.slice(-4),
    };
  }

  public updateApiKeys(updates: Partial<{ apiKey: string; secretKey: string }>) {
    if (updates.apiKey) {
      this.config.apiKey = updates.apiKey;
    }
    if (updates.secretKey) {
      this.config.secretKey = updates.secretKey;
    }
    
    console.log('Bithumb API keys updated:', {
      apiKeyLength: this.config.apiKey.length,
      secretKeyLength: this.config.secretKey.length,
      apiKeyPreview: this.config.apiKey.substring(0, 8) + '...',
      secretKeyPreview: this.config.secretKey.substring(0, 8) + '...'
    });
  }

  public async testApiConnection(): Promise<{ success: boolean; message: string }> {
    try {
      await this.getBalance();
      return {
        success: true,
        message: '빗썸 API 연결이 성공했습니다.'
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || '빗썸 API 연결에 실패했습니다.'
      };
    }
  }
}

export default new BithumbApiService();