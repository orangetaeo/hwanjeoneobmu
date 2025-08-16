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
  }

  private generateJwtToken(queryString: string = ''): string {
    const payload: any = {
      access_key: this.config.apiKey,
      nonce: uuidv4(),
      timestamp: Date.now()
    };

    // 매개변수가 있는 경우 query_hash 추가
    if (queryString) {
      const hash = crypto.createHash('sha512');
      hash.update(queryString, 'utf-8');
      payload.query_hash = hash.digest('hex');
      payload.query_hash_alg = 'SHA512';
    }

    return jwt.sign(payload, this.config.secretKey);
  }

  private async makeApiRequest(endpoint: string, parameters: any = {}): Promise<any> {
    const paramString = new URLSearchParams(parameters).toString();
    const jwtToken = this.generateJwtToken(paramString);

    const headers = {
      'Authorization': `Bearer ${jwtToken}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json'
    };

    try {
      console.log('Bithumb API Request:', {
        endpoint,
        method: 'POST',
        paramString,
        headers: { ...headers, Authorization: 'Bearer [HIDDEN]' }
      });

      const response = await fetch(`${this.config.baseUrl}${endpoint}`, {
        method: 'POST',
        headers,
        body: paramString
      });

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
        console.error('Bithumb API Error Response:', data);
        throw new Error(`Bithumb API Error: ${data.message || data.status}`);
      }

      return data;
    } catch (error) {
      console.error('Bithumb API request failed:', error);
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