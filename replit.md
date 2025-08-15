# Overview

This is a full-stack asset management and exchange tracking application built with React, Express, and PostgreSQL. The application allows users to manage various types of financial assets including cash, bank accounts, cryptocurrency holdings, and track exchange transactions. It features real-time exchange rate monitoring, Firebase integration for data persistence, and a comprehensive dashboard for portfolio management.

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
- **Primary Database**: PostgreSQL configured through Drizzle ORM
- **Database Provider**: Neon Database (serverless PostgreSQL)
- **ORM**: Drizzle ORM with schema-first approach and automatic type generation
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
- **Hook-based Architecture**: Custom React hooks for authentication, exchange rates, and data fetching
- **Error Handling**: Centralized error handling with toast notifications
- **Responsive Design**: Mobile-first approach with Tailwind CSS breakpoints
- **Development Experience**: Hot module replacement, runtime error overlay, and Replit integration