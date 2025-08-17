# Overview

This is a full-stack asset management and exchange tracking application built with React, Express, and PostgreSQL. The application allows users to manage various types of financial assets including cash, bank accounts, cryptocurrency holdings, and track exchange transactions. It features real-time exchange rate monitoring, Firebase integration for data persistence, and a comprehensive dashboard for portfolio management.

## Recent Major Updates (August 17, 2025)

### Version: "환전상 시스템 v1.8 - 현금 증감 내역 검색 기능 강화" (2025-08-17 03:55 AM)

### 현금 거래 내역 검색 및 필터링 기능 완전 구현
- **날짜 범위 검색**: 시작일-종료일 선택으로 특정 기간 거래 내역 조회
- **거래 유형 필터**: 전체/증가/감소 선택으로 거래 타입별 분류 보기  
- **통합 필터 UI**: 검색어, 날짜, 거래 유형을 한 화면에서 동시 적용
- **필터 초기화**: 모든 필터를 한 번에 초기화하는 편의 기능
- **반응형 레이아웃**: 모바일과 데스크톱에서 최적화된 필터링 인터페이스
- **최근 5개 제한**: 성능 최적화를 위해 최신 5개 거래만 표시
- **거래 카운터**: 전체 거래 수 대비 현재 표시 건수 명시

### 테스트 데이터 구축 완료
- **현금 증가 거래**: 8건의 다양한 금액과 날짜로 구성된 증가 거래
- **현금 감소 거래**: 3건의 감소 거래로 실제 사용 패턴 반영
- **시간대 분산**: 2025년 8월 10일~17일 기간에 분산된 거래 내역
- **메타데이터 완성**: 각 거래별 지폐 구성 변화량 상세 기록

### 사용자 경험 개선사항
- **직관적 아이콘**: 달력 아이콘으로 날짜 필터 구분 명확화
- **실시간 필터링**: 입력과 동시에 즉시 결과 반영
- **상태 표시**: 활성화된 필터 항목 시각적 표시
- **데이터 무결성**: 날짜 형식 자동 검증 및 범위 확인
- **성능 최적화**: 페이징 없이 최신 데이터 우선 표시로 빠른 로딩

### Version: "환전상 시스템 v1.7 - PostgreSQL 완전 통합 완료" (2025-08-15 12:05 PM)

### PostgreSQL API 완전 통합 시스템 구축
- **완전한 API 통합**: 모든 CRUD 작업이 PostgreSQL API를 통해 처리
- **localStorage 완전 제거**: 클라이언트 사이드 저장소 의존성 완전 제거
- **Firebase 제한**: 실시간 환율 기능만 유지, 데이터 저장은 PostgreSQL 전용
- **userId 자동 처리**: 서버에서 자동으로 사용자 ID 할당으로 보안 강화
- **실시간 동기화**: 모든 작업 후 서버에서 최신 데이터 자동 재로딩
- **에러 처리 강화**: 상세한 오류 로깅과 사용자 친화적 에러 메시지

### 통합 검증 완료 기능들
- **자산 생성**: 현금, 은행계좌, 거래소, 바이낸스 자산 PostgreSQL 저장 ✓
- **자산 수정**: 실시간 지폐 구성 업데이트 및 데이터베이스 동기화 ✓  
- **자산 삭제**: 완전한 데이터베이스 삭제 및 UI 즉시 업데이트 ✓
- **계좌 정보 표시**: 은행명, 예금주, 계좌번호 정확한 표시 ✓
- **데이터 지속성**: 페이지 새로고침 후에도 모든 변경사항 완벽 유지 ✓

### Version: "환전상 시스템 v1.6 - 현금 자산 수정 시스템 완성" (2025-08-15 11:52 AM)

### 현금 자산 수정 기능 완전 구현
- **PostgreSQL 연동**: 현금 자산 수정 시 데이터베이스까지 완전 업데이트
- **지폐 구성 관리**: denomination 메타데이터를 통한 정확한 지폐별 수량 추적
- **실시간 UI 동기화**: API 업데이트 후 전체 데이터 재로딩으로 완전한 상태 동기화
- **기존 데이터 표시**: 수정 폼에서 기존 지폐 구성과 총계가 정확히 표시
- **TypeScript 안정성**: CashAsset 타입에 type 필드 추가로 타입 안전성 확보
- **양방향 데이터 매핑**: AssetManager와 AssetForm 간 일관된 데이터 구조 지원

### 데이터 무결성 시스템 강화
- **API 기반 상태 관리**: 로컬 상태가 아닌 서버 데이터를 기준으로 UI 업데이트
- **실시간 계산**: 지폐별 수량 변경 시 총 잔액 자동 계산 및 검증
- **지속성 보장**: 페이지 새로고침 후에도 변경사항 완벽 유지
- **에러 방지**: 무한 렌더링과 데이터 불일치 문제 완전 해결

### Version: "환전상 시스템 v1.5 - 표시 포맷팅 최적화 완료" (2025-08-15 10:46 AM)

### 사용자 친화적 표시 포맷팅 시스템 구축
- **통화별 소숫점 최적화**: KRW/VND/USD는 정수 표시, 암호화폐는 소숫점 2자리 고정
- **텍스트 오버플로우 방지**: 모든 자산 카드에 overflow-hidden과 truncate 적용으로 레이아웃 깨짐 방지
- **통화 기호 완성**: USDT(₮), BTC(₿), ETH(Ξ) 포함한 전체 암호화폐 기호 지원
- **레이아웃 최적화**: Flexbox 구조로 편집/삭제 버튼과 텍스트 영역 완전 분리
- **Dashboard 일관성**: AssetManager와 Dashboard 전반에 걸친 동일한 포맷팅 규칙 적용

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