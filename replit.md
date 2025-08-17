# Overview

This is a full-stack asset management and exchange tracking application designed to help users manage various financial assets including cash, bank accounts, and cryptocurrency holdings, while also tracking exchange transactions. The application provides a comprehensive dashboard for portfolio management with real-time exchange rate monitoring and detailed cash denomination tracking. The business vision is to offer a robust, user-friendly platform for efficient financial asset tracking and exchange management, targeting individuals and small businesses involved in multi-currency and crypto transactions.

## Recent Updates (2025-08-17)
- **Cash Memo Field Integration Completed**: Unified memo functionality across all cash transactions
  - Added memo field to cash increase/decrease forms for all currencies (KRW, USD, VND)
  - Removed duplicate memo field implementations and consolidated into single common field
  - Memo field displays below denomination composition for clean UI organization
  - Enhanced transaction tracking with memo information in transaction history
  - Fixed USD/VND duplicate denomination input boxes issue
- **Cash Transaction Detail Modal Enhancement**: Fixed denomination change display bug
  - CashChangeDetailModal now correctly displays denomination changes (e.g., "50,000원권 +1장")
  - Fixed data format mismatch between storage (comma format) and display (no-comma format)
  - Enhanced denomination change calculation to handle both comma and non-comma formats
  - Transaction memo display working perfectly in detail popups
- **Cash Transaction Detail View Completed**: Integrated transaction detail modal in all components
  - CashTransactionHistory: Added click handlers for transaction items to open detail modal
  - CashChangeDetailModal: Fully integrated across all cash management interfaces
  - Asset management > Cash management > Transaction history: Click functionality implemented
  - Comprehensive transaction detail display showing denomination changes by bill type
  - Enhanced denomination display format: "50,000원권", "500,000동권", "100달러권" with localized formatting
- **Transaction History Modal UX Enhancement**: Fixed auto-focus issue in search field
  - Added onOpenAutoFocus={(e) => e.preventDefault()} to DialogContent component
  - Eliminated unwanted cursor blinking in search field when modal opens
  - Users can now open transaction history without automatic search field focus
  - Search functionality remains fully accessible when clicked manually
- **Complete Test Data System Finalized**: Comprehensive test data initialization now includes all components
  - Asset data: Current cash, bank accounts, and exchange assets with exact balances
  - Exchange rate data: USD→VND and KRW→VND rates for all denominations  
  - Transaction history: Sample cash change transactions with denomination tracking
  - All data accurately reflects user's actual asset state (하나은행 750,000원 포함)
- **Test Data Validation Completed**: Full system verification shows perfect functionality
  - Assets: 10 items including all cash (KRW 4,020,000원, USD 755달러, VND 49,300,000동)
  - Bank accounts: Korean banks (하나은행 750,000원, 국민은행 0원) and Vietnamese banks
  - Exchange assets: Bithumb USDT 2,563.07363534, Binance USDT 1.14
  - Exchange rates: 4 configured rates for currency conversion
  - Transaction history: 3 sample transactions with detailed denomination changes
- **Exchange Operations System Completed**: Full 4-stage exchange trading system now operational
  - Bithumb Trading: USDT asset display and balance tracking working perfectly (2,563.07 USDT)
  - Network Transfer: Cross-exchange USDT transfers with fee calculation fully functional
  - Binance P2P: Balance tracking and P2P trade preparation ready
  - Cost Tracking: Foundation laid for comprehensive profit/loss analysis
- **Asset Name Matching Resolution**: Fixed Bithumb asset recognition across all components
  - Client-side: Enhanced asset search logic to handle "Bithumb" vs "Bithumb USDT" naming
  - Server-side: Implemented flexible asset matching for Bithumb-related assets
  - Database consistency: All components now correctly identify and display Bithumb USDT assets
- **Asset Display Fix Confirmed**: Exchange asset display names working correctly
  - Bithumb assets now properly display as "빗썸" in asset management interface
  - Korean exchange name mapping functioning correctly
  - Database metadata structure verified and working properly
- **P2P Trading UI Enhancement**: Improved user experience for USDT trading
  - Changed "최대" button to "max" for better clarity
  - Enhanced decimal input precision up to 8 decimal places for USDT amounts
  - Improved paste handling and input validation for accurate number entry
- **Full System Integration Test Successful**: Complete 4-stage exchange operation verified
  - Bithumb Trading: 2,563.07 USDT starting balance
  - Network Transfer: Bithumb → Binance with 1 USDT network fee
  - Binance P2P: 2,563.21 USDT → 67,530,426 VND at 26,346 rate
  - Final result: VND deposited to 우리은행 account successfully
- **Network Transfer Success**: Confirmed working cross-exchange USDT transfers
  - Successfully transferred 2,563.07 USDT from Bithumb to Binance
  - Network fee calculation (1 USDT) properly applied
  - Real-time balance updates on both exchanges verified
  - Transaction history accurately recorded with full metadata
- **Test Data Update**: Updated test data initialization with current asset states
  - KRW 현금: 4,020,000원 (50,000원×68장, 10,000원×62장)
  - USD 현금: 755달러 (100달러×6장, 50달러×1장, 10달러×4장, 5달러×4장, 1달러×45장)
  - VND 현금: 49,300,000동 (500,000동×93장, 200,000동×7장, 100,000동×12장, 50,000동×4장)
  - 한국 은행: 하나은행(조윤희, 750,000원), 국민은행(김학태, 0원)
  - 베트남 은행: 우리은행(김학태, 0동), BIDV(조윤희, 1,200,000동), 신한은행(조윤희, 22,160,000동)
  - 거래소: Bithumb USDT (2,563.07), Binance USDT (1.14)
- **Critical Bug Fix**: Resolved USD 현금 (755달러) missing from total asset calculation 
- **Query Optimization**: Fixed infinite loop issue in React Query caused by timestamp-based cache keys
- **Asset Calculation**: All cash assets (KRW, USD, VND) now properly included in Dashboard calculations
- **UI Enhancement**: Added visual indicator in Dashboard showing USD cash inclusion status 
- **Data Integrity**: Enhanced logging system for asset calculation debugging and verification
- **Enhanced Cash Management**: Completed comprehensive cash denomination tracking for KRW, USD, and VND currencies
- **UI Improvements**: Implemented 2-column grid layout for denomination input fields for better mobile optimization
- **Transaction System**: Improved cash change tracking with detailed denomination change records
- **Mobile Landscape Optimization**: Comprehensive optimization for mobile landscape mode including:
  - Reduced header height (h-12 on mobile, h-16 on desktop)
  - Compact navigation bar (h-12 with smaller icons and spacing)
  - Optimized text and icon sizes throughout the interface
  - Improved sidebar and real-time rates widget spacing
  - Enhanced responsive padding and margins for efficient space usage
- **Header & Navigation Improvements**: Fixed z-index layering and dynamic page titles
  - Header z-index set to z-50 to prevent navigation overlay issues
  - Dynamic page title display based on current route
  - Mobile navigation z-index adjusted to z-40 for proper layering
- **Account Display Enhancement**: Fixed account holder name display from metadata
  - Account names now properly show "Bank Name - Account Holder" format
  - Metadata parsing implemented for accountHolder and accountNumber fields
  - All Korean and Vietnamese accounts display correctly with holder names
- **Dashboard Currency Ordering**: Implemented KRW-first display priority
  - KRW currency assets now appear first in both simple and detailed view modes
  - Maintains original order for other currencies (USD, VND, USDT)
  - Applied to both cash assets section and asset summary cards
- **Dashboard Layout Overhaul (2025-08-17)**: Complete 3-column responsive layout redesign
  - Total Asset Summary: Fixed to left-right layout on all screen sizes (mobile included)
  - Asset Cards: Reorganized into 3 categories - 원화 자산 (🇰🇷), 외화 자산 (🌏), 코인 자산 (₿)
  - Cryptocurrency Separation: USDT moved to dedicated "코인 자산" section with exchange-specific breakdown
  - Exchange Icons: Implemented 🔵 for Bithumb, 🟡 for Binance, replacing generic currency icons
  - National Flags: Added 🇰🇷 (KRW), 🇻🇳 (VND), 🇺🇸 (USD) for better visual identification
  - Font Size Enhancement: Increased asset amounts to text-lg/text-xl for better readability
  - Mobile Responsiveness: Ensured proper 2-column layout on mobile, 3-column on desktop

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter
- **State Management**: TanStack Query for server state management and caching
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **UI Components**: Radix UI primitives with shadcn/ui component library
- **Build Tool**: Vite

## Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Storage Interface**: Abstracted storage layer
- **API Design**: RESTful API structure with `/api` prefix routing

## Data Storage Solutions
- **Primary Database**: PostgreSQL configured through Drizzle ORM
- **Database Provider**: Neon Database (serverless PostgreSQL)
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

# External Dependencies

- **Firebase**: Used for real-time exchange rate functionality and authentication.
- **Open Exchange Rates API**: For fiat currency rates (USD, KRW, VND).
- **Bithumb API**: For Korean Won cryptocurrency prices.
- **CoinGecko API**: For additional cryptocurrency data.
- **Neon Database**: Serverless PostgreSQL provider.