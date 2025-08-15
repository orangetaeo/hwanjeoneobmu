import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { storage } from './storage';
import { insertTransactionSchema, insertAssetSchema, insertRateSchema, insertUserSettingsSchema } from '@shared/schema';

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
  next();
};

// Transactions Routes
router.post('/transactions', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validatedData = insertTransactionSchema.parse(req.body);
    const transaction = await storage.createTransactionWithAssetMovement(req.user!.id, validatedData);
    res.json(transaction);
  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(400).json({ error: 'Invalid transaction data' });
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
    const validatedData = insertAssetSchema.parse(req.body);
    const asset = await storage.createAsset(req.user!.id, validatedData);
    res.json(asset);
  } catch (error) {
    console.error('Error creating asset:', error);
    res.status(400).json({ error: 'Invalid asset data' });
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
    res.status(400).json({ error: 'Invalid rate data' });
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
    res.status(400).json({ error: 'Invalid settings data' });
  }
});

export default router;