# Overview

This is a full-stack asset management and exchange tracking application designed to help users manage various financial assets including cash, bank accounts, and cryptocurrency holdings, while also tracking exchange transactions. The application provides a comprehensive dashboard for portfolio management with real-time exchange rate monitoring and detailed cash denomination tracking. The business vision is to offer a robust, user-friendly platform for efficient financial asset tracking and exchange management, targeting individuals and small businesses involved in multi-currency and crypto transactions.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter
- **State Management**: TanStack Query
- **Styling**: Tailwind CSS with custom CSS variables and shadcn/ui
- **UI Components**: Radix UI primitives
- **Build Tool**: Vite

## Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Storage Interface**: Abstracted storage layer
- **API Design**: RESTful API structure with `/api` prefix routing

## Data Storage Solutions
- **Primary Database**: PostgreSQL configured through Drizzle ORM
- **ORM**: Drizzle ORM with schema-first approach and automatic type generation
- **Advanced Schema**: Multi-table structure supporting complex financial transactions (`transactions`, `assets`, `rates`)
- **Session Storage**: PostgreSQL-based session storage using connect-pg-simple
- **Development Storage**: In-memory storage implementation for rapid prototyping

## Authentication and Authorization
- **Primary Auth**: Firebase Authentication with anonymous sign-in fallback
- **Session Management**: Express sessions with PostgreSQL storage

## Key Design Patterns
- **Monorepo Structure**: Shared schema between client and server in `/shared` directory
- **Type Safety**: End-to-end TypeScript with shared types and schema validation using Zod
- **Component Composition**: Radix UI primitives composed into custom components
- **Advanced Transaction Architecture**: Multi-step transaction workflows with comprehensive tracking, including form validation, metadata storage, and profit/loss analysis.
- **Hook-based Architecture**: Custom React hooks for authentication, exchange rates, and data fetching
- **Error Handling**: Centralized error handling with toast notifications
- **Responsive Design**: Mobile-first approach with Tailwind CSS breakpoints

## Advanced Features
- **Professional Trading Interface**: Tabbed interface supporting multiple transaction types.
- **Smart Calculation System**: Real-time price calculations with market rate comparisons.
- **Comprehensive History**: Advanced filtering, sorting, and search capabilities for transaction history.
- **Data Integrity**: PostgreSQL constraints and validation ensuring data consistency.
- **User Experience**: Modal-based workflows for state management and error handling.
- **Dynamic Rendering**: Conditional rendering based on currency for specific denominations (e.g., KRW banknotes).
- **Automated Test Data**: Standardized test data sets for consistent development and testing.

## UI/UX Decisions
- **Dashboard Layout**: 3-column responsive design with distinct sections for KRW, foreign currency, and crypto assets.
- **Iconography**: Consistent use of Lucide icons throughout the application for professional and clean visual design.
- **Exchange Operations**: Unified icon system using ArrowRightLeft (transfers), TrendingUp (P2P trading), History (transaction history), and Coins (API status).
- **Readability**: Enhanced font sizes for asset amounts.
- **Mobile Optimization**: Reduced header height, compact navigation, optimized text/icon sizes, and responsive padding for mobile landscape mode.
- **Dynamic Elements**: Dynamic page titles and visual indicators.
- **Currency Ordering**: KRW assets prioritized in display.

# Recent Changes (2025-08-17)
- **Complete Icon System Unification**: Replaced ALL colorful emojis and flags with monochrome Lucide icons for cleaner, more professional appearance
  - Dashboard: Globe icons for currencies, Building for banks, Coins for exchanges, Bitcoin for crypto section
  - AssetManager: Banknote for cash, Building for banks, Coins for exchanges
  - ExchangeOperations: Coins for Bithumb trading, ArrowRightLeft for network transfers, TrendingUp for P2P trading
  - BithumbTrading: Coins icon for API status, History icon for transaction list
  - NetworkTransfer: ArrowRightLeft for transfers, Send/History for tabs
  - BinanceP2P: TrendingUp for P2P trading, History for transaction history
  - TypeScript: Fixed all type safety issues and removed unused emoji functions
  - Achieved complete visual consistency with navigation bar design language throughout entire application
- **Mobile Navigation Accessibility Fix**: Added missing "환전상 시세" (Exchange Rate Manager) menu to mobile navigation
  - Fixed user-reported issue where exchange rate input interface was inaccessible on mobile devices
  - Added DollarSign icon with "금은방" label for mobile navigation consistency
  - Both RateManager and ExchangeRateManager components now accessible across all device types

# External Dependencies

- **Firebase**: For real-time exchange rate functionality and authentication.
- **Open Exchange Rates API**: For fiat currency rates (USD, KRW, VND).
- **Bithumb API**: For Korean Won cryptocurrency prices.
- **CoinGecko API**: For additional cryptocurrency data.
- **Neon Database**: Serverless PostgreSQL provider.