# Overview

This is a full-stack asset management and exchange tracking application for managing various financial assets including cash, bank accounts, and cryptocurrency holdings, and tracking exchange transactions. It provides a comprehensive dashboard for portfolio management with real-time exchange rate monitoring and detailed cash denomination tracking. The business vision is to offer a robust, user-friendly platform for efficient financial asset tracking and exchange management, targeting individuals and small businesses involved in multi-currency and crypto transactions.

## Recent Changes (August 20, 2025)
- **매매시세 박스 시스템 완성**: 새거래 화면에서 권종별 매매시세 표시 기능 완전 구현
- **URL 기반 라우팅 시스템**: /new-transaction 등 직접 URL 접근 지원
- **환율 표시 규칙**: KRW→VND/USD→VND는 매매시세 박스 표시, VND→KRW는 숨김
- **정확한 환전 계산 시스템**: 권종별 환율 적용으로 정확한 환전 금액 계산 (예: USD 50+20/10달러 → 1,798,000 VND)
- **VND 분배 시스템 완성**: 5,000원권과 1,000원권 포함한 정확한 분배 (1,798,000 VND → 500,000×3 + 200,000×1 + 50,000×1 + 20,000×2 + 5,000×1 + 1,000×3)
- **formatVNDWithFloor 제거**: Math.floor 사용으로 정확한 계산값 유지 (반올림 오차 제거)
- **거래 확인 시스템 개선**: 실시간 권종별 환율 계산으로 정확한 고객 지급 금액 표시

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter
- **State Management**: TanStack Query
- **Styling**: Tailwind CSS with custom CSS variables and shadcn/ui
- **UI Components**: Radix UI primitives
- **Build Tool**: Vite

## Backend
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Storage Interface**: Abstracted storage layer
- **API Design**: RESTful API structure with `/api` prefix routing

## Data Storage
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
- **Dynamic Rendering**: Conditional rendering based on currency for specific denominations.
- **Automated Test Data**: Standardized test data sets for consistent development and testing.
- **VND Floor Profit System**: Automatic calculation and storage of profit from VND amount floor operations.
- **Enhanced Denomination Input System**: Click-to-activate card interface with data persistence, integer-only input validation, collapsed card data preview, and one-click data reset.
- **Cash Exchange Transaction Display System**: Comprehensive transaction labeling system with proper Korean terminology.
- **VND Denomination Distribution Management**: Editable VND denomination breakdown system with real-time total amount updates and remaining balance calculations.
- **Smart VND Recommendation System**: Intelligent recommendation engine for optimal denomination adjustments.
- **Advanced Auto-Adjustment System**: Sophisticated automatic rebalancing for user input exceeding target amounts.
- **Inventory Protection System**: Real-time validation preventing quantities exceeding available stock.
- **Transaction Amount Verification**: Comprehensive final validation comparing actual denomination distribution totals against expected exchange amounts.

## UI/UX Decisions
- **Dashboard Layout**: 3-column responsive design with distinct sections for KRW, foreign currency, and crypto assets.
- **Iconography**: Consistent use of Lucide icons.
- **Exchange Operations**: Unified icon system using ArrowRightLeft, TrendingUp, History, and Coins.
- **Readability**: Enhanced font sizes for asset amounts.
- **Mobile Optimization**: Reduced header height, compact navigation, optimized text/icon sizes, and responsive padding.
- **Dynamic Elements**: Dynamic page titles and visual indicators.
- **Currency Ordering**: KRW assets prioritized in display.
- **UI Component Unification**: Standardized all form elements to use shadcn/ui components.

## Core Implementations
- **Exchange Rate Management**: Comprehensive system with database schemas for current and historical rates, UPSERT functionality, change percentage tracking, advanced validation, and currency denomination support.
- **Transaction System Integration**: Rebuilt TransactionForm leveraging the exchange rate system for auto-rate fetching, smart transaction logic, customer information capture, denomination awareness, real-time calculation, and professional validation.
- **Sell Rate Display System**: Visual sell rate indicators in red boxes on denomination selection cards.
- **Duplicate Asset Validation**: Comprehensive checking and prevention for bank accounts, exchange assets, and Binance assets.
- **Unified Icon System**: Replaced all colorful emojis and flags with monochrome Lucide icons.
- **Mobile Navigation Enhancement**: Redesigned mobile navigation with a hamburger menu, sliding sidebar, and simplified bottom navigation.
- **Exchange Rate History Mobile Optimization**: Enhanced mobile user experience for exchange rate history display.
- **VND Amount Processing**: Implemented Math.floor for all VND calculations and displays, with visual difference indicators and automatic profit tracking.

# External Dependencies

- **Firebase**: For real-time exchange rate functionality and authentication.
- **Open Exchange Rates API**: For fiat currency rates (USD, KRW, VND).
- **Bithumb API**: For Korean Won cryptocurrency prices.
- **CoinGecko API**: For additional cryptocurrency data.
- **Neon Database**: Serverless PostgreSQL provider.