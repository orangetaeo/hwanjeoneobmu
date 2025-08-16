import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { storage } from './storage';
import { insertTransactionSchema, insertAssetSchema, insertRateSchema, insertUserSettingsSchema, insertExchangeRateSchema } from '@shared/schema';
import { bithumbApi } from './bithumbApi';

const router = Router();

// Extended Request interface
interface AuthenticatedRequest extends Request {
  user?: { id: string };
}

// Middleware to check authentication (mock for development)
const requireAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  // For development, create a mock user
  if (!req.user) {
    req.user = { id: 'dev-user-1' };
  }
  console.log('Auth middleware - User ID:', req.user.id);
  next();
};

// Transactions Routes
router.post('/transactions', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    console.log('Transaction request body:', JSON.stringify(req.body, null, 2));
    console.log('User ID from request:', req.user!.id);
    
    const validatedData = insertTransactionSchema.parse(req.body);
    console.log('Validated data:', JSON.stringify(validatedData, null, 2));
    
    const transaction = await storage.createTransactionWithAssetMovement(req.user!.id, validatedData);
    res.json(transaction);
  } catch (error) {
    console.error('Error creating transaction:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    res.status(400).json({ error: 'Invalid transaction data', details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

router.get('/transactions', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const transactions = await storage.getTransactions(req.user!.id);
    res.json(transactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

router.get('/transactions/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const transaction = await storage.getTransactionById(req.user!.id, req.params.id);
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    res.json(transaction);
  } catch (error) {
    console.error('Error fetching transaction:', error);
    res.status(500).json({ error: 'Failed to fetch transaction' });
  }
});

// Assets Routes
router.post('/assets', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // userId를 자동으로 추가
    const dataWithUserId = {
      ...req.body,
      userId: req.user!.id
    };
    
    console.log('Asset creation request:', JSON.stringify(dataWithUserId, null, 2));
    const validatedData = insertAssetSchema.parse(dataWithUserId);
    const asset = await storage.createAsset(req.user!.id, validatedData);
    res.json(asset);
  } catch (error) {
    console.error('Error creating asset:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
    }
    res.status(400).json({ error: 'Invalid asset data', details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

router.get('/assets', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const assets = await storage.getAssets(req.user!.id);
    res.json(assets);
  } catch (error) {
    console.error('Error fetching assets:', error);
    res.status(500).json({ error: 'Failed to fetch assets' });
  }
});

router.put('/assets/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validatedData = insertAssetSchema.partial().parse(req.body);
    const asset = await storage.updateAsset(req.user!.id, req.params.id, validatedData);
    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }
    res.json(asset);
  } catch (error) {
    console.error('Error updating asset:', error);
    res.status(400).json({ error: 'Invalid asset data' });
  }
});

router.delete('/assets/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const success = await storage.deleteAsset(req.user!.id, req.params.id);
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
router.post('/rates', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validatedData = insertRateSchema.parse(req.body);
    const rate = await storage.createRate(req.user!.id, validatedData);
    res.json(rate);
  } catch (error) {
    console.error('Error creating rate:', error);
    const errorMessage = error instanceof Error ? error.message : 'Invalid rate data';
    res.status(400).json({ error: 'Invalid rate data', details: errorMessage });
  }
});

router.get('/rates', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const rates = await storage.getRates(req.user!.id);
    res.json(rates);
  } catch (error) {
    console.error('Error fetching rates:', error);
    res.status(500).json({ error: 'Failed to fetch rates' });
  }
});

router.get('/rates/:fromCurrency/:toCurrency/latest', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { fromCurrency, toCurrency } = req.params;
    const rate = await storage.getLatestRate(req.user!.id, fromCurrency, toCurrency);
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
router.get('/settings', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // 테스트 데이터 자동 초기화 제거 - 사용자가 직접 설정
    
    const settings = await storage.getUserSettings(req.user!.id);
    res.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

router.put('/settings', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validatedData = insertUserSettingsSchema.partial().parse(req.body);
    const settings = await storage.updateUserSettings(req.user!.id, validatedData);
    res.json(settings);
  } catch (error) {
    console.error('Error updating settings:', error);
    const errorMessage = error instanceof Error ? error.message : 'Invalid settings data';
    res.status(400).json({ error: 'Invalid settings data', details: errorMessage });
  }
});

// Exchange Rates Routes
router.post('/exchange-rates', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const dataWithUserId = {
      ...req.body,
      userId: req.user!.id
    };
    
    console.log('Exchange rate creation request:', dataWithUserId);
    const validatedData = insertExchangeRateSchema.parse(dataWithUserId);
    
    const exchangeRate = await storage.createExchangeRate(validatedData);
    res.json(exchangeRate);
  } catch (error) {
    console.error('Error creating exchange rate:', error);
    res.status(400).json({ error: 'Invalid exchange rate data', details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

router.get('/exchange-rates', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const exchangeRates = await storage.getExchangeRates(req.user!.id);
    res.json(exchangeRates);
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    res.status(500).json({ error: 'Failed to fetch exchange rates' });
  }
});

router.patch('/exchange-rates/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
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

// Bithumb API Routes
router.get('/bithumb/balance', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const balance = await bithumbApi.getBalance();
    res.json(balance);
  } catch (error) {
    console.error('Error fetching Bithumb balance:', error);
    res.status(500).json({ error: 'Failed to fetch balance from Bithumb API' });
  }
});

router.get('/bithumb/transactions', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const transactions = await bithumbApi.getTransactionHistory('USDT');
    res.json(transactions);
  } catch (error) {
    console.error('Error fetching Bithumb transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions from Bithumb API' });
  }
});

router.get('/bithumb/usdt-data', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = await bithumbApi.getUsdtTransactions();
    res.json(data);
  } catch (error) {
    console.error('Error fetching Bithumb USDT data:', error);
    res.status(500).json({ 
      error: 'Failed to fetch USDT data from Bithumb API',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;