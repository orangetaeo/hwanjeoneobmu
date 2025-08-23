import crypto from 'crypto';

interface BithumbApiConfig {
  connectKey: string;
  secretKey: string;
  api2Key?: string; // API 2.0 키 추가
  baseUrl: string;
  apiVersion: '1.0' | '2.0';
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
      connectKey: process.env.BITHUMB_API_KEY || 'f873caae13b8b6fa428fcccad3bacb14',
      secretKey: process.env.BITHUMB_SECRET_KEY || '50b0d7ae4868e9755783f6be5ab22a91',
      api2Key: process.env.BITHUMB_API2_KEY || 'b98ea5c12a3d00694290f5a394682ee9b79ebdc62a7d8fda',
      baseUrl: 'https://api.bithumb.com',
      apiVersion: '1.0' // 새로운 API 1.0 키로 테스트
    };
    
    console.log(`Bithumb API ${this.config.apiVersion} Service initialized with:`, {
      apiVersion: this.config.apiVersion,
      connectKeyLength: this.config.connectKey.length,
      secretKeyLength: this.config.secretKey.length,
      api2KeyLength: this.config.api2Key?.length,
      baseUrl: this.config.baseUrl,
      connectKeyPreview: this.config.connectKey.substring(0, 8) + '...',
      secretKeyPreview: this.config.secretKey.substring(0, 8) + '...',
      api2KeyPreview: this.config.api2Key?.substring(0, 8) + '...'
    });
  }

  private generateHmacSignature(endpoint: string, parameters: any = {}): { signature: string; nonce: string; timestamp?: string } {
    if (this.config.apiVersion === '2.0') {
      return this.generateApi2Signature(endpoint, parameters);
    }
    
    // API 1.0: 정확한 빗썸 형식으로 nonce 생성 (마이크로초)
    const now = Date.now();
    const microseconds = Math.floor(Math.random() * 1000);
    const nonce = (now * 1000 + microseconds).toString();
    
    // 빗썸 API 1.0의 정확한 형식
    // 1. endpoint 추가
    const allParams = {
      endpoint: endpoint,
      ...parameters
    };
    
    // 2. 파라미터를 정확한 형식으로 인코딩
    const paramString = new URLSearchParams();
    Object.keys(allParams).sort().forEach(key => {
      if (allParams[key] !== undefined && allParams[key] !== null) {
        paramString.append(key, allParams[key].toString());
      }
    });
    const encodedParams = paramString.toString();
    
    // 3. 빗썸의 정확한 서명 메시지 형식: endpoint + chr(0) + encoded_params + chr(0) + nonce
    const message = endpoint + String.fromCharCode(0) + encodedParams + String.fromCharCode(0) + nonce;
    
    console.log('빗썸 API 1.0 정확한 HMAC SHA512 서명:', {
      endpoint,
      parameters,
      nonce,
      encodedParams,
      messageLength: message.length,
      messagePreview: message.replace(/\0/g, '[CHR0]').substring(0, 200)
    });
    
    // 4. HMAC-SHA512로 서명 생성 후 Base64 인코딩
    const hmac = crypto.createHmac('sha512', this.config.secretKey);
    hmac.update(message, 'utf-8');
    const signature = hmac.digest('base64');
    
    console.log('생성된 서명 정보:', {
      signatureLength: signature.length,
      signaturePreview: signature.substring(0, 20) + '...'
    });
    
    return { signature, nonce };
  }
  
  private generateApi2Signature(endpoint: string, parameters: any = {}): { signature: string; nonce: string; timestamp: string } {
    const timestamp = Date.now().toString();
    const nonce = timestamp;
    
    // API 2.0: JWT-style 서명 생성
    let queryString = '';
    if (parameters && Object.keys(parameters).length > 0) {
      const sortedParams = Object.keys(parameters)
        .sort()
        .map(key => `${key}=${parameters[key]}`)
        .join('&');
      queryString = sortedParams;
    }
    
    // API 2.0 서명 메시지: queryString + nonce
    const message = queryString + nonce;
    
    console.log('빗썸 API 2.0 HMAC SHA512 서명 생성:', {
      endpoint, parameters, timestamp, nonce,
      queryString: queryString.substring(0, 100) + (queryString.length > 100 ? '...' : ''),
      message: message.substring(0, 100) + (message.length > 100 ? '...' : '')
    });
    
    const signature = crypto
      .createHmac('sha512', this.config.secretKey)
      .update(message, 'utf-8')
      .digest('hex');
    
    return { signature, nonce, timestamp };
  }

  private async makeApiRequest(endpoint: string, parameters: any = {}): Promise<any> {
    try {
      const url = `${this.config.baseUrl}${endpoint}`;
      
      if (this.config.apiVersion === '2.0') {
        return await this.makeApi2Request(url, endpoint, parameters);
      }
      
      // API 1.0 요청 - 정확한 빗썸 형식
      const { signature, nonce } = this.generateHmacSignature(endpoint, parameters);
      
      // 빗썸 API 1.0의 정확한 헤더 형식
      const headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
        'Api-Key': this.config.connectKey,
        'Api-Sign': signature,
        'Api-Nonce': nonce,
        'Cache-Control': 'no-cache'
      };
      
      // 빗썸의 정확한 POST body 형식
      const formParams = new URLSearchParams();
      formParams.append('endpoint', endpoint);
      
      // 파라미터 정렬해서 추가
      Object.keys(parameters).sort().forEach(key => {
        if (parameters[key] !== undefined && parameters[key] !== null) {
          formParams.append(key, parameters[key].toString());
        }
      });
      
      const requestOptions: RequestInit = {
        method: 'POST',
        headers,
        body: formParams.toString()
      };

      console.log(`빗썸 API ${this.config.apiVersion} 정확한 요청:`, {
        url,
        method: 'POST',
        headers: {
          ...headers,
          'Api-Key': headers['Api-Key'].substring(0, 12) + '...',
          'Api-Sign': signature.substring(0, 20) + '...'
        },
        bodyLength: formParams.toString().length,
        bodyPreview: formParams.toString().substring(0, 100)
      });
      
      return await this.processApiResponse(url, requestOptions);
    } catch (error) {
      console.error('Bithumb API request failed:', error);
      throw error;
    }
  }
  
  private async makeApi2Request(url: string, endpoint: string, parameters: any = {}): Promise<any> {
    const { signature, nonce } = this.generateHmacSignature(endpoint, parameters);
    
    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Api-Key': this.config.api2Key!,
      'Api-Sign': signature,
      'Api-Nonce': nonce
    };
    
    const requestOptions: RequestInit = {
      method: 'POST',
      headers,
      body: Object.keys(parameters).length > 0 ? JSON.stringify(parameters) : undefined
    };

    console.log(`Bithumb API ${this.config.apiVersion} Request:`, {
      url, method: 'POST',
      headers: { ...headers, 'Api-Key': headers['Api-Key'].substring(0, 10) + '...', 'Api-Sign': '[HIDDEN]' },
      bodyParams: parameters
    });
    
    return await this.processApiResponse(url, requestOptions);
  }
  
  private async processApiResponse(url: string, requestOptions: RequestInit): Promise<any> {

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
    
    if (data.status && data.status !== '0000') {
      console.error('Bithumb API Error Details:', {
        status: data.status,
        message: data.message,
        fullResponse: data
      });
      
      throw new Error(`Bithumb API Error: ${data.message || data.status} (Code: ${data.status})`);
    }
    
    if (data.error) {
      console.error('Bithumb API Error:', data.error);
      throw new Error(`Bithumb API Error: ${data.error.name || data.error.message || 'Unknown error'}`);
    }

    return data;
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

  // API Key 관리 메서드
  getApiKeys(): { connectKey: string; secretKey: string; api2Key: string; apiVersion: string } {
    return {
      connectKey: this.config.connectKey.substring(0, 8) + '****' + this.config.connectKey.substring(this.config.connectKey.length - 4),
      secretKey: this.config.secretKey.substring(0, 8) + '****' + this.config.secretKey.substring(this.config.secretKey.length - 4),
      api2Key: this.config.api2Key!.substring(0, 8) + '****' + this.config.api2Key!.substring(this.config.api2Key!.length - 4),
      apiVersion: this.config.apiVersion
    };
  }

  updateApiKeys(newKeys: { connectKey?: string; secretKey?: string; api2Key?: string; apiVersion?: '1.0' | '2.0' }): void {
    if (newKeys.connectKey) {
      this.config.connectKey = newKeys.connectKey;
    }
    if (newKeys.secretKey) {
      this.config.secretKey = newKeys.secretKey;
    }
    if (newKeys.api2Key) {
      this.config.api2Key = newKeys.api2Key;
    }
    if (newKeys.apiVersion) {
      this.config.apiVersion = newKeys.apiVersion;
    }
    
    console.log('Bithumb API keys updated:', {
      apiVersion: this.config.apiVersion,
      connectKeyLength: this.config.connectKey.length,
      secretKeyLength: this.config.secretKey.length,
      api2KeyLength: this.config.api2Key?.length,
      connectKeyPreview: this.config.connectKey.substring(0, 8) + '...',
      secretKeyPreview: this.config.secretKey.substring(0, 8) + '...',
      api2KeyPreview: this.config.api2Key?.substring(0, 8) + '...'
    });
  }

  async testApiConnection(): Promise<{ success: boolean; message: string }> {
    try {
      await this.getBalance();
      return {
        success: true,
        message: 'API 연결이 성공적으로 확인되었습니다.'
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'API 연결 테스트 실패'
      };
    }
  }
}

export const bithumbApi = new BithumbApiService();
export type { BithumbTransaction, BithumbBalance };