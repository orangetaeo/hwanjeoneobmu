# Overview

This is a full-stack asset management and exchange tracking application designed to help users manage various financial assets including cash, bank accounts, and cryptocurrency holdings, while also tracking exchange transactions. The application provides a comprehensive dashboard for portfolio management with real-time exchange rate monitoring and detailed cash denomination tracking. The business vision is to offer a robust, user-friendly platform for efficient financial asset tracking and exchange management, targeting individuals and small businesses involved in multi-currency and crypto transactions.

## Recent Major Updates (January 2025)

### VND Exchange Transaction System Enhancements
- **Complete Auto-Adjustment System**: Fixed Math.ceil() based precise excess calculation for VND denomination distribution (500,000 VND now correctly adjusts from 19→16 instead of 19→17)
- **Smart Inventory Management**: Real-time validation preventing quantity inputs exceeding available stock with automatic caps
- **Transaction Amount Verification**: Comprehensive final validation comparing actual VND distribution totals against expected exchange amounts with detailed error messages
- **Enhanced Transaction Confirmation**: Added detailed VND denomination breakdown in transaction confirmation section showing individual quantities, subtotals, and total distribution
- **Preserved User Input Logic**: System maintains user input denominations during auto-adjustment while intelligently rebalancing other denominations

### VND Amount Calculation Accuracy Fix (August 19, 2025)
- **Fixed VND Distribution Calculation**: Resolved critical calculation error where VND breakdown used incorrect targetAmount (11,640,000 VND) instead of actual exchange amount (vndOriginalAmount: 11,630,000 VND)
- **Unified Display Consistency**: All screen displays now show correct VND amount of 11,630,000 VND with proper denomination breakdown (500,000×23 + 100,000×1 + 20,000×1 + 10,000×1)
- **Error Message Correction**: Fixed transaction validation error messages to display accurate "환전 예상 금액" matching actual exchange amounts
- **Transaction Validation Enhancement**: Strengthened amount verification logic ensuring actual vs expected totals match exactly before allowing transaction completion
- **Mobile Responsive Design**: Completed mobile optimization for TransactionForm component with responsive layouts, touch-friendly input sizes, and proper text scaling for all screen sizes
- **Calculation Independence Fix**: Fixed denomination fold/unfold UI state affecting calculations by using Object.entries(denominationAmounts) instead of fromDenominations array
- **Amount Validation Accuracy**: Corrected VND amount mismatch validation to use vndOriginalAmount or formatVNDWithFloor values for precise error checking
- **UI Layout Improvement**: Relocated amount display sections (받는 금액/주는 금액) above denomination selection for better user workflow and more intuitive interface design
- **Mobile VND Distribution Enhancement**: Improved VND denomination input interface with larger touch-friendly input fields (16×40px → 20×48px), expanded +0 button sizes, right-aligned layout for input elements, and increased card padding for better mobile usability
- **Exchange Rate Rules Implementation**: Established clear rate selection logic - VND→KRW and VND→USD exchanges use "내 매입가" (my buy rate), while KRW→VND exchanges use "내 매도가" (my sell rate) for accurate business calculations

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
- **Advanced Auto-Adjustment System**: Sophisticated automatic rebalancing when user inputs exceed target amounts. Uses Math.ceil() for precise excess calculation, intelligently reduces large denominations while preserving user input values, and automatically supplements with smaller denominations to maintain exact target totals. Includes comprehensive logging for transaction transparency.
- **Inventory Protection System**: Real-time validation preventing users from entering quantities exceeding available stock. Automatically caps input values at maximum available quantities with clear console feedback, ensuring transaction feasibility and preventing inventory errors during customer service operations.
- **Transaction Amount Verification**: Comprehensive final validation system that compares actual VND denomination distribution totals against expected exchange amounts. Displays detailed error messages with amount breakdowns and prevents transaction completion when totals don't match, ensuring 100% accuracy in real-money exchanges.

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