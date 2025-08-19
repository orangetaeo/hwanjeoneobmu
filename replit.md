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
- **VND Floor Profit System**: Automatic calculation and storage of profit from VND amount floor operations, with visual indicators showing difference amounts and separate profit tracking in transaction metadata.
- **Enhanced Denomination Input System**: Click-to-activate card interface with data persistence, integer-only input validation with automatic comma formatting, collapsed card data preview showing quantity and total amount, and one-click data reset functionality via checkbox interaction.
- **Cash Exchange Transaction Display System**: Comprehensive transaction labeling system with proper Korean terminology distinguishing between receipt ("수령") and payment ("지급") operations. KRW cash increases display as "KRW 현금 환전 수령" and VND cash increases display as "VND 현금 환전 지급", with consistent formatting across transaction history lists and detail modals including timestamp information.
- **VND Denomination Distribution Management**: Complete editable VND denomination breakdown system allowing staff to modify distribution quantities per customer requirements, with real-time total amount updates, visual remaining balance calculations showing "보유: X장 -사용량 = 남은량" format, leading zero prevention in input fields, and reset to default functionality for efficient transaction processing.
- **Smart VND Recommendation System**: Intelligent recommendation engine that suggests optimal denomination adjustments when amounts don't match target totals. Features include precise calculation logic (200,000 VND exactly 5 sheets, 100,000 VND exactly 12 sheets for 1,200,000 VND deficit), inventory-aware recommendations respecting available stock, and automatic recommendation clearing when target amounts are achieved through alternative denomination selections.

## UI/UX Decisions
- **Dashboard Layout**: 3-column responsive design with distinct sections for KRW, foreign currency, and crypto assets.
- **Iconography**: Consistent use of Lucide icons throughout the application for professional and clean visual design.
- **Exchange Operations**: Unified icon system using ArrowRightLeft (transfers), TrendingUp (P2P trading), History (transaction history), and Coins (API status).
- **Readability**: Enhanced font sizes for asset amounts.
- **Mobile Optimization**: Reduced header height, compact navigation, optimized text/icon sizes, and responsive padding for mobile landscape mode.
- **Dynamic Elements**: Dynamic page titles and visual indicators.
- **Currency Ordering**: KRW assets prioritized in display.
- **UI Component Unification**: Standardized all form elements to use shadcn/ui components for design consistency.

## Core Implementations
- **Exchange Rate Management**: Comprehensive system with database schemas for current and historical rates, UPSERT functionality, change percentage tracking, advanced validation, and currency denomination support.
- **Transaction System Integration**: Rebuilt TransactionForm leveraging the exchange rate system for auto-rate fetching, smart transaction logic, customer information capture, denomination awareness, real-time calculation, and professional validation.
- **Sell Rate Display System**: Implemented visual sell rate indicators in red boxes positioned on each denomination selection card, displaying "매도 시세" labels with rates formatted to 2 decimal places, providing immediate rate reference for staff during customer transactions.
- **Duplicate Asset Validation**: Comprehensive checking and prevention for bank accounts, exchange assets, and Binance assets, including merging quantities and user notifications.
- **Unified Icon System**: Replaced all colorful emojis and flags with monochrome Lucide icons for a consistent and professional appearance across the application.
- **Mobile Navigation Enhancement**: Redesigned mobile navigation with a hamburger menu, sliding sidebar, and simplified bottom navigation for improved accessibility.
- **Exchange Rate History Mobile Optimization**: Enhanced mobile user experience for exchange rate history display with responsive design patterns, single-line header layout displaying currency pair, denomination, change percentage, and date, improved mobile readability with proper spacing and touch-friendly design, and responsive grid layout that stacks vertically on mobile.
- **VND Amount Processing**: Implemented Math.floor (무조건 내림) for all VND calculations and displays, with visual difference indicators and automatic profit tracking for floor-based rounding differences stored in transaction metadata.

# External Dependencies

- **Firebase**: For real-time exchange rate functionality and authentication.
- **Open Exchange Rates API**: For fiat currency rates (USD, KRW, VND).
- **Bithumb API**: For Korean Won cryptocurrency prices.
- **CoinGecko API**: For additional cryptocurrency data.
- **Neon Database**: Serverless PostgreSQL provider.