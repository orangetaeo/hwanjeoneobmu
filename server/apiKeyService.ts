interface ApiKeyConfig {
  [service: string]: {
    [key: string]: string;
  };
}

class ApiKeyService {
  private config: ApiKeyConfig = {
    firebase: {
      apiKey: process.env.VITE_FIREBASE_API_KEY || 'AIzaSyDo3werljLZm8-QT2Dl18ZerJJTblxwif0',
      authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || 'money-bd714.firebaseapp.com',
      projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'money-bd714',
      storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || 'money-bd714.firebasestorage.app',
      messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '493286374794',
      appId: process.env.VITE_FIREBASE_APP_ID || '1:493286374794:web:44c5b035a8de67752c5c73'
    },
    binance: {
      apiKey: process.env.BINANCE_API_KEY || '',
      secretKey: process.env.BINANCE_SECRET_KEY || ''
    },
    coinGecko: {
      apiKey: process.env.COINGECKO_API_KEY || ''
    },
    openExchangeRates: {
      apiKey: process.env.OPENEXCHANGERATES_API_KEY || ''
    }
  };

  getApiKeys(service?: string): any {
    if (service) {
      if (!this.config[service]) {
        throw new Error(`Unknown service: ${service}`);
      }
      // 보안을 위해 마스킹
      const maskedConfig: any = {};
      Object.keys(this.config[service]).forEach(key => {
        const value = this.config[service][key];
        if (value && value.length > 8) {
          maskedConfig[key] = value.substring(0, 8) + '****' + value.substring(value.length - 4);
        } else {
          maskedConfig[key] = value ? '****' : '';
        }
      });
      return maskedConfig;
    }
    
    // 모든 서비스의 마스킹된 키 반환
    const allMasked: any = {};
    Object.keys(this.config).forEach(serviceName => {
      allMasked[serviceName] = this.getApiKeys(serviceName);
    });
    return allMasked;
  }

  updateApiKeys(service: string, newKeys: { [key: string]: string }): void {
    if (!this.config[service]) {
      throw new Error(`Unknown service: ${service}`);
    }

    Object.keys(newKeys).forEach(key => {
      if (newKeys[key] && newKeys[key].trim()) {
        this.config[service][key] = newKeys[key].trim();
      }
    });

    console.log(`${service} API keys updated:`, {
      service,
      updatedKeys: Object.keys(newKeys),
      keyLengths: Object.keys(this.config[service]).reduce((acc, key) => {
        acc[key] = this.config[service][key].length;
        return acc;
      }, {} as any)
    });
  }

  testConnection(service: string): Promise<{ success: boolean; message: string }> {
    switch (service) {
      case 'firebase':
        return this.testFirebaseConnection();
      case 'binance':
        return this.testBinanceConnection();
      case 'coinGecko':
        return this.testCoinGeckoConnection();
      case 'openExchangeRates':
        return this.testOpenExchangeRatesConnection();
      default:
        return Promise.resolve({
          success: false,
          message: `${service} 연결 테스트는 지원되지 않습니다.`
        });
    }
  }

  private async testFirebaseConnection(): Promise<{ success: boolean; message: string }> {
    try {
      // Firebase는 클라이언트 측에서 테스트하는 것이 적합
      const firebaseConfig = this.config.firebase;
      if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
        return {
          success: false,
          message: 'Firebase API Key 또는 Project ID가 설정되지 않았습니다.'
        };
      }
      return {
        success: true,
        message: 'Firebase 설정이 올바르게 구성되었습니다.'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Firebase 연결 테스트 실패'
      };
    }
  }

  private async testBinanceConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const { apiKey } = this.config.binance;
      if (!apiKey) {
        return {
          success: false,
          message: 'Binance API Key가 설정되지 않았습니다.'
        };
      }

      // Binance API 테스트 (공개 엔드포인트)
      const response = await fetch('https://api.binance.com/api/v3/ping');
      if (response.ok) {
        return {
          success: true,
          message: 'Binance API 연결이 성공적으로 확인되었습니다.'
        };
      } else {
        return {
          success: false,
          message: 'Binance API 연결 실패'
        };
      }
    } catch (error) {
      return {
        success: false,
        message: 'Binance API 연결 테스트 중 오류가 발생했습니다.'
      };
    }
  }

  private async testCoinGeckoConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const { apiKey } = this.config.coinGecko;
      const url = apiKey 
        ? `https://api.coingecko.com/api/v3/ping?x_cg_demo_api_key=${apiKey}`
        : 'https://api.coingecko.com/api/v3/ping';

      const response = await fetch(url);
      if (response.ok) {
        return {
          success: true,
          message: 'CoinGecko API 연결이 성공적으로 확인되었습니다.'
        };
      } else {
        return {
          success: false,
          message: 'CoinGecko API 연결 실패'
        };
      }
    } catch (error) {
      return {
        success: false,
        message: 'CoinGecko API 연결 테스트 중 오류가 발생했습니다.'
      };
    }
  }

  private async testOpenExchangeRatesConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const { apiKey } = this.config.openExchangeRates;
      if (!apiKey) {
        // 무료 API 테스트
        const response = await fetch('https://open.er-api.com/v6/latest/USD');
        if (response.ok) {
          return {
            success: true,
            message: 'Open Exchange Rates (무료) API 연결이 성공적으로 확인되었습니다.'
          };
        }
      } else {
        // 유료 API 테스트
        const response = await fetch(`https://openexchangerates.org/api/latest.json?app_id=${apiKey}`);
        if (response.ok) {
          return {
            success: true,
            message: 'Open Exchange Rates API 연결이 성공적으로 확인되었습니다.'
          };
        }
      }
      return {
        success: false,
        message: 'Open Exchange Rates API 연결 실패'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Open Exchange Rates API 연결 테스트 중 오류가 발생했습니다.'
      };
    }
  }

  getAllServices(): string[] {
    return Object.keys(this.config);
  }

  getServiceConfig(service: string): { [key: string]: { label: string; required: boolean; maxLength?: number } } {
    const configs: any = {
      firebase: {
        apiKey: { label: 'API Key', required: true },
        authDomain: { label: 'Auth Domain', required: true },
        projectId: { label: 'Project ID', required: true },
        storageBucket: { label: 'Storage Bucket', required: false },
        messagingSenderId: { label: 'Messaging Sender ID', required: false },
        appId: { label: 'App ID', required: true }
      },
      binance: {
        apiKey: { label: 'API Key', required: true, maxLength: 64 },
        secretKey: { label: 'Secret Key', required: true, maxLength: 64 }
      },
      coinGecko: {
        apiKey: { label: 'API Key', required: false, maxLength: 50 }
      },
      openExchangeRates: {
        apiKey: { label: 'API Key', required: false, maxLength: 32 }
      }
    };

    return configs[service] || {};
  }
}

export const apiKeyService = new ApiKeyService();
export type { ApiKeyConfig };