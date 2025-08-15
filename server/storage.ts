import { transactions, assets, rates, type InsertTransaction, type Transaction, type InsertAsset, type Asset, type InsertRate, type Rate } from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";

export interface IStorage {
  // Transactions
  createTransaction(userId: string, transaction: InsertTransaction): Promise<Transaction>;
  getTransactions(userId: string): Promise<Transaction[]>;
  getTransactionById(userId: string, id: string): Promise<Transaction | undefined>;
  
  // Assets
  createAsset(userId: string, asset: InsertAsset): Promise<Asset>;
  getAssets(userId: string): Promise<Asset[]>;
  updateAsset(userId: string, id: string, updates: Partial<InsertAsset>): Promise<Asset | undefined>;
  deleteAsset(userId: string, id: string): Promise<boolean>;
  
  // Rates
  createRate(userId: string, rate: InsertRate): Promise<Rate>;
  getRates(userId: string): Promise<Rate[]>;
  getLatestRate(userId: string, fromCurrency: string, toCurrency: string): Promise<Rate | undefined>;
}

export class DatabaseStorage implements IStorage {
  // Transactions
  async createTransaction(userId: string, transaction: InsertTransaction): Promise<Transaction> {
    const [result] = await db
      .insert(transactions)
      .values({ ...transaction, userId })
      .returning();
    return result;
  }

  async getTransactions(userId: string): Promise<Transaction[]> {
    return await db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.timestamp));
  }

  async getTransactionById(userId: string, id: string): Promise<Transaction | undefined> {
    const [result] = await db
      .select()
      .from(transactions)
      .where(and(eq(transactions.userId, userId), eq(transactions.id, id)));
    return result || undefined;
  }

  // Assets
  async createAsset(userId: string, asset: InsertAsset): Promise<Asset> {
    const [result] = await db
      .insert(assets)
      .values({ ...asset, userId })
      .returning();
    return result;
  }

  async getAssets(userId: string): Promise<Asset[]> {
    return await db
      .select()
      .from(assets)
      .where(eq(assets.userId, userId))
      .orderBy(desc(assets.createdAt));
  }

  async updateAsset(userId: string, id: string, updates: Partial<InsertAsset>): Promise<Asset | undefined> {
    const [result] = await db
      .update(assets)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(assets.userId, userId), eq(assets.id, id)))
      .returning();
    return result || undefined;
  }

  async deleteAsset(userId: string, id: string): Promise<boolean> {
    const result = await db
      .delete(assets)
      .where(and(eq(assets.userId, userId), eq(assets.id, id)));
    return (result.rowCount ?? 0) > 0;
  }

  // Rates
  async createRate(userId: string, rate: InsertRate): Promise<Rate> {
    const [result] = await db
      .insert(rates)
      .values({ ...rate, userId })
      .returning();
    return result;
  }

  async getRates(userId: string): Promise<Rate[]> {
    return await db
      .select()
      .from(rates)
      .where(eq(rates.userId, userId))
      .orderBy(desc(rates.timestamp));
  }

  async getLatestRate(userId: string, fromCurrency: string, toCurrency: string): Promise<Rate | undefined> {
    const [result] = await db
      .select()
      .from(rates)
      .where(and(
        eq(rates.userId, userId),
        eq(rates.fromCurrency, fromCurrency),
        eq(rates.toCurrency, toCurrency)
      ))
      .orderBy(desc(rates.timestamp))
      .limit(1);
    return result || undefined;
  }
}

export const storage = new DatabaseStorage();