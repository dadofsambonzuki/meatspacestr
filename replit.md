# meatspacestr - Proof-of-Place Attestations over Nostr

## Overview

meatspacestr is a web application that creates cryptographic proof-of-place attestations using the Nostr protocol. The system allows users to verify that a Nostr identity in cyberspace has physical access to a specific meatspace location through encrypted notes and verification tokens.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized production builds
- **UI Framework**: Tailwind CSS with shadcn/ui component library
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: React Query (TanStack Query) for server state and caching
- **Authentication**: Browser-based Nostr extension integration (NIP-07)

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Database**: PostgreSQL with Drizzle ORM
- **Database Provider**: Neon serverless PostgreSQL
- **Session Management**: Connect-pg-simple for PostgreSQL-backed sessions
- **API Design**: RESTful endpoints with JSON responses

### Key Components

#### Database Schema
- **Verifications Table**: Stores verification metadata, recipient information, and business logic
- **Notes Table**: Contains encrypted content with 1-to-1 relationship to verifications
- **Foreign Key Constraints**: Notes reference verifications for data integrity

#### Authentication System
- **Browser Extension Integration**: Uses NIP-07 compatible Nostr signing extensions
- **Supported Extensions**: Alby, nos2x, Flamingo
- **Key Management**: Client-side key handling, no server-side key storage
- **Public Key Format**: Uses npub (bech32) format for user-friendly display

#### Encryption & Signing
- **Client-Side Only**: All cryptographic operations handled by browser extensions
- **NIP-04 Encryption**: End-to-end encryption for private messages
- **Event Signing**: Nostr events signed client-side for authenticity
- **No Server Secrets**: Server never handles private keys or decrypted content

## Data Flow

1. **Verification Creation**:
   - User creates verification with recipient npub and optional metadata
   - Server generates unique token and verification URL
   - Client signs Nostr event with encrypted content
   - Server stores verification and encrypted note

2. **Verification Process**:
   - Recipient receives verification token/URL
   - System validates token and updates verification status
   - Encrypted content becomes accessible to authorized parties

3. **Note Viewing**:
   - Client-side decryption for authorized users (sender/recipient)
   - Public verification list shows verified attestations
   - PDF generation for documentation purposes

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL database connectivity
- **drizzle-orm**: Type-safe database ORM
- **nostr-tools**: Nostr protocol implementation
- **@tanstack/react-query**: Server state management
- **@radix-ui/***: Accessible UI component primitives

### Development Tools
- **TypeScript**: Static type checking
- **Tailwind CSS**: Utility-first styling
- **Vite**: Development server and build tool
- **tsx**: TypeScript execution for server

### Browser Integration
- **NIP-07 Extensions**: Required for Nostr key management
- **Canvas API**: QR code generation
- **Web Crypto API**: Client-side cryptographic operations

## Deployment Strategy

### Development Environment
- **Hot Reload**: Vite development server with HMR
- **Port Configuration**: Client (5000), API (3000)
- **Database**: Neon serverless PostgreSQL
- **Environment Variables**: DATABASE_URL for database connection

### Production Build
- **Static Assets**: Vite builds optimized client bundle
- **Server Bundle**: esbuild creates Node.js server bundle
- **Deployment Target**: Replit autoscale deployment
- **Process Management**: npm scripts for development and production

### Database Management
- **Schema Migrations**: Drizzle Kit for database schema management
- **Connection Pooling**: Neon serverless handles connection management
- **Data Persistence**: PostgreSQL for reliable data storage

## Changelog

- June 15, 2025. Initial setup
- June 15, 2025. Enhanced mobile responsiveness across all pages - fixed card overflow issues, improved horizontal spacing, added proper text sizing for mobile devices

## User Preferences

Preferred communication style: Simple, everyday language.