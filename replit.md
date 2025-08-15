# Overview

This is a full-stack asset management and exchange tracking application built with React, Express, and PostgreSQL. The application allows users to manage various types of financial assets including cash, bank accounts, cryptocurrency holdings, and track exchange transactions. It features real-time exchange rate monitoring, Firebase integration for data persistence, and a comprehensive dashboard for portfolio management.

## Recent Major Updates (August 15, 2025)

### Version: "환전상 시스템 v1.4 - 테스트 데이터 초기화 완료" (2025-08-15 10:30 AM)

### 테스트 데이터 초기화 시스템 구축
- **Clean State Initialization**: 모든 자동 테스트 데이터 생성 로직 제거
- **Manual Test Data Setup**: 사용자 요청 시 표준 테스트 데이터 세트 생성
- **Homepage Data Loading**: PostgreSQL 전용 데이터 로딩으로 완전 전환
- **LocalStorage Cleanup**: 기존 localStorage 의존성 완전 제거
- **Server-side Auto-init Removal**: 서버 자동 초기화 로직 비활성화

### Firebase to PostgreSQL Migration & System Optimization  
- **Firebase Isolation**: Limited Firebase usage to real-time exchange rates only
- **PostgreSQL Primary**: Migrated all data storage (transactions, assets, user settings) to PostgreSQL
- **Authentication Simplification**: Replaced Firebase Auth with PostgreSQL-based dev authentication
- **RateManager Rewrite**: Completely rewrote RateManager component to use PostgreSQL API instead of Firestore
- **Security Enhancement**: Added environment variable support for Firebase config (fallback to hardcoded for dev)
- **Data Consistency**: Eliminated dual storage system reducing complexity and potential sync issues

### 표준 테스트 데이터 세트
- **한국 계좌**: 국민은행 (김학태) 3,500,000원
- **베트남 계좌**: 신한은행 26,684,000동, BIDV 1,200,000동  
- **현금 자산**: KRW 3,540,000원, VND 30,790,000동, USD 436달러
- **암호화폐**: Binance USDT 1.14, Bithumb USDT 2,563.07

### Bug Fixes & System Stabilization  
- **Plus Icon Import Error**: Fixed missing Plus icon import in HomePage.tsx causing web console errors
- **Database Data Cleanup**: Removed inconsistent asset type data ('exchange_asset' → 'account', 'exchange', 'binance')
- **Test Data Initialization**: Improved automatic test data creation with proper asset types and user settings
- **Transaction Schema**: Fixed userId field handling in transaction creation workflow
- **Network Selection Enhancement**: Added TRC20/ERC20/BSC network selection for exchange transfers with automatic fee handling

### Advanced Transaction System Implementation
- **Complex Trading Workflows**: Implemented sophisticated transaction types for exchange operations:
  - KRW Bank → Exchange (Bithumb) transfers with fee tracking
  - Exchange cryptocurrency purchases with market vs. custom price comparison
  - Inter-exchange transfers (Bithumb → Binance) with network fees
  - P2P trading system with profit/loss calculations
- **Enhanced Database Schema**: Added PostgreSQL support with comprehensive transaction, asset, and rate tracking
- **Professional Transaction History**: Full-featured transaction history with filtering, searching, and detailed analytics
- **Real-time Price Integration**: Market price vs. actual trade price comparison with profit rate calculations

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript for type safety and modern development
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query for server state management and caching
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **UI Components**: Radix UI primitives with shadcn/ui component library for consistent design
- **Build Tool**: Vite for fast development and optimized production builds

## Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript for type safety across the stack
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Storage Interface**: Abstracted storage layer with in-memory implementation for development
- **API Design**: RESTful API structure with /api prefix routing

## Data Storage Solutions
- **Primary Database**: PostgreSQL configured through Drizzle ORM with comprehensive transaction tracking
- **Database Provider**: Neon Database (serverless PostgreSQL)
- **ORM**: Drizzle ORM with schema-first approach and automatic type generation
- **Advanced Schema**: Multi-table structure supporting complex financial transactions:
  - `transactions`: Advanced transaction tracking with metadata and custom pricing
  - `assets`: Unified asset management with JSON metadata storage
  - `rates`: Historical exchange rate and price tracking
- **Session Storage**: PostgreSQL-based session storage using connect-pg-simple
- **Development Storage**: In-memory storage implementation for rapid prototyping

## Authentication and Authorization
- **Primary Auth**: Firebase Authentication with anonymous sign-in fallback
- **Session Management**: Express sessions with PostgreSQL storage
- **Custom Tokens**: Support for Firebase custom tokens via environment variables
- **Development Mode**: Automatic anonymous authentication for seamless development

## External Service Integrations
- **Firebase**: Firestore for real-time data synchronization and Firebase Auth for user management
- **Exchange Rate APIs**: 
  - Open Exchange Rates API for fiat currency rates (USD, KRW, VND)
  - Bithumb API for Korean Won cryptocurrency prices
  - CoinGecko API for additional cryptocurrency data
- **Real-time Data**: Live exchange rate fetching with automatic updates
- **Multi-currency Support**: KRW, USD, VND, and major cryptocurrencies (BTC, ETH, USDT, ADA)

## Key Design Patterns
- **Monorepo Structure**: Shared schema between client and server in /shared directory
- **Type Safety**: End-to-end TypeScript with shared types and schema validation using Zod
- **Component Composition**: Radix UI primitives composed into custom components
- **Advanced Transaction Architecture**: Multi-step transaction workflows with comprehensive tracking:
  - Transaction form validation with real-time calculations
  - Metadata storage for platform-specific information
  - Profit/loss analysis with market price comparison
- **Hook-based Architecture**: Custom React hooks for authentication, exchange rates, and data fetching
- **Error Handling**: Centralized error handling with toast notifications
- **Responsive Design**: Mobile-first approach with Tailwind CSS breakpoints
- **Development Experience**: Hot module replacement, runtime error overlay, and Replit integration

## Advanced Features Implemented
- **Professional Trading Interface**: Tabbed interface supporting multiple transaction types
- **Smart Calculation System**: Real-time price calculations with market rate comparisons
- **Comprehensive History**: Advanced filtering, sorting, and search capabilities
- **Data Integrity**: PostgreSQL constraints and validation ensuring data consistency
- **User Experience**: Modal-based workflows with proper state management and error handling