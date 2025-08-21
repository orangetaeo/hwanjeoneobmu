# Overview

This is a full-stack asset management and exchange tracking application for managing various financial assets including cash, bank accounts, and cryptocurrency holdings, and tracking exchange transactions. It provides a comprehensive dashboard for portfolio management with real-time exchange rate monitoring and detailed cash denomination tracking. The business vision is to offer a robust, user-friendly platform for efficient financial asset tracking and exchange management, targeting individuals and small businesses involved in multi-currency and crypto transactions.

## Recent Changes (August 21, 2025)
- **거래 상세 모달 UI 완전 개선**: 커스텀 X버튼 구현으로 기본 X버튼 숨김, 헤더 padding 균등화(py-1.5), 출금-입금-환율 한 줄 배치, 컴팩트 디자인
- **자산 변동 내역 최적화**: 고액권 우선 정렬, 좌측 큰 금액 세로 중앙 정렬(min-h-[80px]), flex-wrap 모바일 줄바꿈, whitespace-nowrap 텍스트 깨짐 방지
- **X버튼 중복 문제 해결**: CSS 선택자 [&>button]:hidden으로 기본 X버튼 숨김, 커스텀 X버튼을 "거래 상세"와 같은 줄에 정확 배치
- **권종별 변동 표시 완성**: 우측에 권종별 변동 정보 horizontal wrap 배치, 시간 정보 제거로 깔끔한 디자인
- **메인 거래만 리스트 표시 시스템**: 거래내역에서 메인 거래(cash_exchange, 계좌이체)만 표시하고 부가 거래(cash_change)는 상세 모달에서 표시
- **거래 분류 시스템 완성**: isMainTransaction, parentTransactionId 필드로 메인 거래와 부가 거래 구분
- **데이터베이스 스키마 확장**: 거래 테이블에 메인 거래 식별 필드 추가

## Recent Changes (August 20, 2025)
- **확장된 계좌이체 시스템 완성**: 4가지 주요 계좌이체 패턴 완전 구현 (현금→KRW계좌, 현금→VND계좌, VND계좌→KRW계좌, KRW계좌→VND계좌)
- **계좌 선택 UI 시스템**: 동적 계좌 선택 드롭다운과 잔액 표시 기능 구현
- **매매시세 박스 시스템 완성**: 새거래 화면에서 권종별 매매시세 표시 기능 완전 구현
- **URL 기반 라우팅 시스템**: /new-transaction 등 직접 URL 접근 지원
- **환율 표시 규칙**: KRW→VND/USD→VND는 매매시세 박스 표시, VND→KRW는 숨김
- **정확한 환전 계산 시스템**: 권종별 환율 적용으로 정확한 환전 금액 계산 (예: USD 50+20/10달러 → 1,798,000 VND)
- **VND 분배 시스템 완성**: 5,000원권과 1,000원권 포함한 정확한 분배 (1,798,000 VND → 500,000×3 + 200,000×1 + 50,000×1 + 20,000×2 + 5,000×1 + 1,000×3)
- **formatVNDWithFloor 완전 제거**: 모든 VND 계산에서 Math.floor 사용으로 정확한 계산값 유지 (반올림 오차 완전 해결)
- **VND 권종 카드 확장**: 5,000과 1,000 VND 권종 추가로 완전한 분배 시스템 구현
- **거래 확인 시스템 완성**: 실시간 권종별 환율 계산으로 정확한 고객 지급 금액 표시 및 완전한 권종별 분배 제공
- **현금 환전 상세 내역 시스템 완성**: USD/VND 현금 증감 내역 정확한 표시, VND 고액권 우선 정렬, 순변동 음수 표시 구현, 사업자 관점 완전 반영
- **현금 증감 내역 표시 완전 수정**: 권종별 변동사항 우선 계산으로 실제 변동 금액 정확 표시 (-20,000, +20,000)
- **중복 클릭 방지 시스템 완성**: 자산 수정 버튼 중복 클릭 방지 및 "처리중..." 로딩 상태 표시
- **USD 환전 거래 상세 표시 완성**: 모든 통화(USD/VND/KRW) 환전 거래 상세 내역 정확한 권종별 표시
- **백엔드 계좌이체 처리 시스템**: moveAssetsCashToKRWAccount, moveAssetsCashToVNDAccount, moveAssetsAccountToAccount 메서드 완성
- **계좌 간 이체 로직**: VND↔KRW 계좌 간 직접 이체 기능과 환율 적용 시스템 완성
- **다중 거래 타입 지원**: cash_to_krw_account, cash_to_vnd_account, vnd_account_to_krw_account, krw_account_to_vnd_account 완전 지원
- **계좌이체 시스템 최종 검증 완료**: 4가지 패턴 모두 실제 거래 테스트 통과, 자산 이동 정확성 확인, TypeScript 빌드 성공, LSP 오류 없음
- **거래내역 모바일 최적화 완성**: 수익금 강조 표시, 모바일 스크롤 오버플로우 해결, Badge 텍스트 짤림 방지, 카드 레이아웃 개선
- **환율 표시 시스템 개선**: 매매시세 기준 환율 표시, 통화별 소숫점 규칙 적용 (USD/KRW: 정수, KRW/VND: 소수점 2자리, USD/VND: 정수)
- **수익 표시 규칙 정리**: 수익 금액은 정수 표시 (Math.round), 수익률은 소수점 2자리 표시 (toFixed(2))
- **수익 금액 디자인 강화**: 배경색, 테두리, 그림자 효과로 시각적 강조, 다크 모드 지원, 그라데이션 배경 적용
- **데이터 갱신 시스템**: 윈도우 포커스 시 즉시 갱신, 마운트 시 항상 갱신으로 수동 새로고침 방식 적용
- **VND 권종 재고 검증 시스템 수정**: API 데이터 키 형태 불일치 문제 해결, 권종 키를 숫자 형태 그대로 사용하여 정확한 보유량 확인

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