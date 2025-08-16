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
    
    console.log('Bithumb API Service initialized with:', {
      apiKeyLength: this.config.apiKey.length,
      secretKeyLength: this.config.secretKey.length,
      baseUrl: this.config.baseUrl
    });
  }

  private generateApiSign(endpoint: string, parameters: string, nonce: string, method: number = 1): string {
    // 빗썸 API 문서에 따른 정확한 signature 생성
    const data = endpoint + parameters + nonce + this.config.secretKey;
    
    console.log('API Signature Generation Debug:', {
      method,
      endpoint,
      parameters,
      nonce,
      secretKeyLength: this.config.secretKey.length,
      dataToSign: data.substring(0, 100) + '...',
      apiKeyLength: this.config.apiKey.length
    });
    
    let signature;
    if (method === 1) {
      // 방법 1: 일반적인 방법 (현재 방법) - Secret Key를 그대로 사용
      signature = crypto.createHmac('sha512', this.config.secretKey).update(data).digest('hex');
      console.log('Generated signature (method 1 - plain secret):', signature.substring(0, 20) + '...');
    } else if (method === 2) {
      // 방법 2: Secret Key를 Base64로 디코딩 후 사용
      try {
        const decodedSecretKey = Buffer.from(this.config.secretKey, 'base64').toString();
        console.log('Decoded secret key length:', decodedSecretKey.length);
        const dataWithDecodedSecret = endpoint + parameters + nonce + decodedSecretKey;
        signature = crypto.createHmac('sha512', decodedSecretKey).update(dataWithDecodedSecret).digest('hex');
        console.log('Generated signature (method 2 - base64 decoded):', signature.substring(0, 20) + '...');
      } catch (error) {
        console.error('Base64 decoding failed, falling back to method 1:', error);
        signature = crypto.createHmac('sha512', this.config.secretKey).update(data).digest('hex');
      }
    } else {
      // 방법 3: Secret Key를 바이너리로 변환하여 사용
      const binarySecret = Buffer.from(this.config.secretKey, 'hex');
      signature = crypto.createHmac('sha512', binarySecret).update(data).digest('hex');
      console.log('Generated signature (method 3 - hex to binary):', signature.substring(0, 20) + '...');
    }
    
    return signature;
  }

  private async makeApiRequest(endpoint: string, parameters: any = {}, authMethod: number = 1): Promise<any> {
    const nonce = Date.now().toString();
    const paramString = new URLSearchParams(parameters).toString();
    const apiSign = this.generateApiSign(endpoint, paramString, nonce, authMethod);

    const headers = {
      'Api-Key': this.config.apiKey,
      'Api-Nonce': nonce,
      'Api-Sign': apiSign,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json'
    };

    try {
      console.log('Bithumb API Request Details:', {
        url: `${this.config.baseUrl}${endpoint}`,
        endpoint,
        method: 'POST',
        paramString,
        nonce,
        apiKeyFirst10: this.config.apiKey.substring(0, 10) + '...',
        secretKeyFirst10: this.config.secretKey.substring(0, 10) + '...',
        headers: { ...headers, 'Api-Key': '[HIDDEN]', 'Api-Sign': '[HIDDEN]' }
      });

      const response = await fetch(`${this.config.baseUrl}${endpoint}`, {
        method: 'POST',
        headers,
        body: paramString
      });

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
          authMethod,
          status: data.status,
          message: data.message,
          fullResponse: data
        });
        
        // 인증 방법을 순차적으로 시도
        if (authMethod < 3 && (data.status === '5300' || data.message?.includes('invalid'))) {
          console.log(`인증 방법 ${authMethod} 실패, 방법 ${authMethod + 1} 시도 중...`);
          return this.makeApiRequest(endpoint, parameters, authMethod + 1);
        }
        
        throw new Error(`Bithumb API Error: ${data.message || data.status} (Code: ${data.status})`);
      }

      return data;
    } catch (error) {
      console.error('Bithumb API request failed:', error);
      
      // 네트워크 오류가 아닌 경우 다른 인증 방법 시도
      if (authMethod < 3 && error instanceof Error && error.message.includes('API Error')) {
        console.log(`인증 방법 ${authMethod} 실패, 방법 ${authMethod + 1} 시도 중...`);
        return this.makeApiRequest(endpoint, parameters, authMethod + 1);
      }
      
      throw error;
    }
  }

  async getBalance(): Promise<BithumbBalance> {
    const response = await this.makeApiRequest('/info/balance', { currency: 'ALL' });
    return response.data;
  }

  async getTransactionHistory(currency: string = 'USDT', count: number = 50): Promise<BithumbTransaction[]> {
    const response = await this.makeApiRequest('/info/user_transactions', {
      order_currency: currency,
      payment_currency: 'KRW',
      count,
      searchGb: 1 // 1: 매수 완료만 조회
    });
    return response.data;
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