import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

// 거래 내역 테이블
export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  type: text("type").notNull(), // 'bank_to_exchange', 'exchange_purchase', 'exchange_transfer', 'p2p_trade'
  fromAssetType: text("from_asset_type"), // 'bank', 'exchange', 'binance'
  fromAssetId: varchar("from_asset_id"),
  fromAssetName: text("from_asset_name").notNull(),
  toAssetType: text("to_asset_type"), // 'bank', 'exchange', 'binance'
  toAssetId: varchar("to_asset_id"),
  toAssetName: text("to_asset_name").notNull(),
  fromAmount: decimal("from_amount", { precision: 18, scale: 8 }).notNull(),
  toAmount: decimal("to_amount", { precision: 18, scale: 8 }).notNull(),
  rate: decimal("rate", { precision: 18, scale: 8 }).notNull(),
  fees: decimal("fees", { precision: 18, scale: 8 }).default("0"),
  profit: decimal("profit", { precision: 18, scale: 8 }).default("0"),
  marketPrice: decimal("market_price", { precision: 18, scale: 8 }), // 시장 가격
  customPrice: decimal("custom_price", { precision: 18, scale: 8 }), // 사용자 입력 가격
  status: text("status").default("pending"), // 'pending', 'confirmed', 'cancelled' - 기본값 pending으로 변경
  memo: text("memo"),
  metadata: jsonb("metadata"), // 추가 정보 (거래소명, P2P 플랫폼 등)
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

// 자산 테이블
export const assets = pgTable("assets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  type: text("type").notNull(), // 'cash', 'bank_account', 'exchange_asset', 'binance_asset'
  name: text("name").notNull(),
  currency: text("currency").notNull(),
  balance: decimal("balance", { precision: 18, scale: 8 }).default("0"),
  metadata: jsonb("metadata"), // 지폐 구성, 계좌 정보, 거래소명 등
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 환율/시세 기록 테이블
export const rates = pgTable("rates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  fromCurrency: text("from_currency").notNull(),
  toCurrency: text("to_currency").notNull(),
  rate: decimal("rate", { precision: 18, scale: 8 }).notNull(),
  source: text("source"), // 'manual', 'api', 'market'
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

// 금은방 시세 및 환전상 요율 관리 테이블
export const exchangeRates = pgTable("exchange_rates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  fromCurrency: text("from_currency").notNull(), // 'USD', 'KRW'
  toCurrency: text("to_currency").notNull(), // 'VND'
  denomination: text("denomination"), // '100', '50', '20_10', '5_2_1', '50000', '10000', '5000_1000' 등
  goldShopRate: decimal("gold_shop_rate", { precision: 18, scale: 8 }), // 금은방 시세 (참고용)
  myBuyRate: decimal("my_buy_rate", { precision: 18, scale: 8 }), // 내가 사는 가격
  mySellRate: decimal("my_sell_rate", { precision: 18, scale: 8 }), // 내가 파는 가격
  isActive: text("is_active").default("true"), // 'true', 'false'
  memo: text("memo"), // 급변상황 메모
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 사용자 설정 테이블
export const userSettings = pgTable("user_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(),
  bithumbFeeRate: decimal("bithumb_fee_rate", { precision: 5, scale: 4 }).default("0.0004"), // 0.04%
  bithumbGrade: text("bithumb_grade").default("white"), // 'white', 'gold', 'platinum' 등
  defaultFeeRates: jsonb("default_fee_rates"), // 각 거래소별 기본 수수료
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  userId: true,
  timestamp: true,
});

export const insertAssetSchema = createInsertSchema(assets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRateSchema = createInsertSchema(rates).omit({
  id: true,
  timestamp: true,
});

export const insertUserSettingsSchema = createInsertSchema(userSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Asset = typeof assets.$inferSelect;
export type InsertAsset = z.infer<typeof insertAssetSchema>;
export type Rate = typeof rates.$inferSelect;
export type InsertRate = z.infer<typeof insertRateSchema>;
export type UserSettings = typeof userSettings.$inferSelect;
export type InsertUserSettings = z.infer<typeof insertUserSettingsSchema>;

export const insertExchangeRateSchema = createInsertSchema(exchangeRates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type ExchangeRate = typeof exchangeRates.$inferSelect;
export type InsertExchangeRate = z.infer<typeof insertExchangeRateSchema>;
