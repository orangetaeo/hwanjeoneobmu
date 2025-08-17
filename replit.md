# Overview

This is a full-stack asset management and exchange tracking application designed to help users manage various financial assets including cash, bank accounts, and cryptocurrency holdings, while also tracking exchange transactions. The application provides a comprehensive dashboard for portfolio management with real-time exchange rate monitoring and detailed cash denomination tracking. The business vision is to offer a robust, user-friendly platform for efficient financial asset tracking and exchange management, targeting individuals and small businesses involved in multi-currency and crypto transactions.

## Recent Updates (2025-08-17)
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