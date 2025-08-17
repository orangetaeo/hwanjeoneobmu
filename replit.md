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
  - ExchangeRateManager: Globe icons for real-time rates, Banknote for gold shop rates, DollarSign for form sections
  - TypeScript: Fixed all type safety issues and removed unused emoji functions
  - Achieved complete visual consistency with navigation bar design language throughout entire application
- **Mobile Navigation UX Enhancement**: Complete redesign of mobile navigation system for improved accessibility
  - Added hamburger menu button to mobile header for full menu access
  - Implemented sliding sidebar navigation with all menu items including settings
  - Simplified bottom navigation to 4 core functions: 대시보드, 환전거래, 환전상 시세, 자산관리
  - Enhanced mobile user experience with proper menu hierarchy and reduced screen clutter
  - All navigation features now properly accessible on mobile devices with intuitive interaction patterns
- **UI Component System Unification**: Standardized all form elements to use shadcn/ui components
  - ExchangeRateManager: Replaced HTML select elements with shadcn/ui Select components
  - Added consistent placeholder text and improved user experience
  - Achieved complete design consistency across all form elements throughout the application
  - Fixed realTimeRates props connection for proper real-time exchange rate display
- **Exchange Rate Management Feature Validation**: Confirmed full functionality of gold shop rate management
  - Input, save, update, and display features all working correctly
  - Real-time exchange rate information properly displayed
  - Form validation and error handling functioning as expected
- **Binance P2P VND Account Configuration Fix**: Resolved critical account search logic issue
  - Fixed VND account detection to use 우리은행 김학태 계좌 exclusively for P2P transactions
  - Updated account search logic to check metadata.accountHolder field instead of name field
  - Corrected existing P2P transaction records to point to correct 우리은행 account ID
  - Added comprehensive logging for VND account detection debugging
  - Confirmed proper VND amount calculation and display functionality
- **Network Transfer Fee Logic Fix**: Resolved USDT network transfer double fee deduction issue
  - Fixed fromAmount calculation to properly deduct (transfer amount + network fee) from source
  - Corrected toAmount to only add transfer amount to destination (without fee deduction)
  - Updated transaction history display to show accurate arrival amounts
  - Improved transaction metadata for better tracking of gross/net amounts
- **Toast Notification Auto-Dismiss**: Implemented 1-second auto-dismiss for all toast notifications
  - Changed TOAST_REMOVE_DELAY from 1,000,000ms to 1,000ms for better UX
  - All success and error messages now automatically disappear after 1 second
  - Applies to network transfers, P2P trades, asset management, and all other operations
- **Mobile-Optimized Transaction History**: Enhanced network transfer and P2P trading history for mobile devices
  - Desktop: Maintains original table layout for detailed information
  - Mobile: Card-based layout with hierarchical information display for both network transfers and Binance P2P trades
  - Improved readability with emphasized transaction amounts and organized metadata
  - Touch-friendly design with proper spacing, visual hierarchy, and optimized management buttons
  - Status indicators and action buttons properly adapted for mobile interaction

# External Dependencies

- **Firebase**: For real-time exchange rate functionality and authentication.
- **Open Exchange Rates API**: For fiat currency rates (USD, KRW, VND).
- **Bithumb API**: For Korean Won cryptocurrency prices.
- **CoinGecko API**: For additional cryptocurrency data.
- **Neon Database**: Serverless PostgreSQL provider.