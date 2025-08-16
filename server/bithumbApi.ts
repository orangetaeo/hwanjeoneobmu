import crypto from 'crypto';

interface BithumbApiConfig {
  connectKey: string;
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
      connectKey: process.env.BITHUMB_API_KEY || 'a47849b7c86067d598fe0c3ed8502131',
      secretKey: process.env.BITHUMB_SECRET_KEY || '64f36ebe17092026677c22705db62b32',
      baseUrl: 'https://api.bithumb.com'
    };
    
    console.log('Bithumb API 1.0 Service initialized with:', {
      connectKeyLength: this.config.connectKey.length,
      secretKeyLength: this.config.secretKey.length,
      baseUrl: this.config.baseUrl
    });
  }

  private generateHmacSignature(endpoint: string, parameters: any = {}): { signature: string; nonce: string } {
    const nonce = Date.now().toString();
    
    // 파라미터를 문자열로 변환
    let paramString = '';
    if (parameters && Object.keys(parameters).length > 0) {
      paramString = new URLSearchParams(parameters).toString();
    }
    
    // 서명할 메시지 생성: endpoint + parameters + nonce
    const message = endpoint + paramString + nonce;
    
    console.log('HMAC 서명 생성:', {
      endpoint,
      paramString,
      nonce,
      message: message.substring(0, 100) + (message.length > 100 ? '...' : '')
    });
    
    // HMAC SHA512 서명 생성
    const signature = crypto
      .createHmac('sha512', this.config.secretKey)
      .update(message, 'utf-8')
      .digest('hex');
    
    console.log('Generated HMAC signature (first 20 chars):', signature.substring(0, 20) + '...');
    
    return { signature, nonce };
  }

  private async makeApiRequest(endpoint: string, parameters: any = {}): Promise<any> {
    try {
      const url = `${this.config.baseUrl}${endpoint}`;
      
      // HMAC SHA512 서명 생성
      const { signature, nonce } = this.generateHmacSignature(endpoint, parameters);
      
      // API 1.0 인증 헤더
      const headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Api-Key': this.config.connectKey,
        'Api-Sign': signature,
        'Api-Nonce': nonce
      };
      
      // form data로 변환
      const formData = new URLSearchParams();
      if (parameters && Object.keys(parameters).length > 0) {
        Object.entries(parameters).forEach(([key, value]) => {
          formData.append(key, String(value));
        });
      }
      
      const requestOptions: RequestInit = {
        method: 'POST',
        headers,
        body: formData.toString()
      };

      console.log('Bithumb API 1.0 Request:', {
        url,
        method: 'POST',
        headers: { ...headers, 'Api-Key': headers['Api-Key'].substring(0, 10) + '...', 'Api-Sign': '[HIDDEN]' },
        bodyParams: parameters
      });

      const response = await fetch(url, requestOptions);
      
      console.log('Response status:', response.status);
      console.log('Response headers:', Array.from(response.headers.entries()));
      
      const responseText = await response.text();
      console.log('Bithumb API Raw Response:', responseText);
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse response as JSON:', parseError);
        throw new Error(`Invalid JSON response: ${responseText}`);
      }
      
      // 빗썸 API 응답 형식 확인
      if (data.status && data.status !== '0000') {
        console.error('Bithumb API Error Details:', {
          status: data.status,
          message: data.message,
          fullResponse: data
        });
        
        throw new Error(`Bithumb API Error: ${data.message || data.status} (Code: ${data.status})`);
      }
      
      // error 필드가 있는 경우도 처리
      if (data.error) {
        console.error('Bithumb API Error:', data.error);
        throw new Error(`Bithumb API Error: ${data.error.name || data.error.message || 'Unknown error'}`);
      }

      return data;
    } catch (error) {
      console.error('Bithumb API request failed:', error);
      throw error;
    }
  }

  async getBalance(): Promise<BithumbBalance> {
    // 한국 빗썸은 POST 방식과 form data만 지원
    const response = await this.makeApiRequest('/info/balance', { currency: 'ALL' });
    return response.data || response;
  }

  async getTransactionHistory(currency: string = 'USDT', count: number = 50): Promise<BithumbTransaction[]> {
    // 한국 빗썸은 POST 방식과 form data만 지원
    const response = await this.makeApiRequest('/info/user_transactions', {
      order_currency: currency,
      payment_currency: 'KRW',
      count,
      searchGb: 1 // 1: 매수 완료만 조회
    });
    return response.data || response;
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