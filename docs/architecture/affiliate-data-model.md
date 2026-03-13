# Affiliate System Data Model

## Overview

This document defines the data model for the affiliate system, to be implemented in `shapeshift/microservices`.

## Prisma Schema

```prisma
// Add to prisma/schema.prisma in microservices

model Affiliate {
  id            String   @id @default(uuid())
  walletAddress String   @unique @map("wallet_address") @db.VarChar(42)
  partnerCode   String?  @unique @map("partner_code") @db.VarChar(32)
  bps           Int      @default(60)
  isActive      Boolean  @default(true) @map("is_active")
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  // Relations
  swaps         Swap[]   @relation("AffiliateSwaps")

  @@map("affiliates")
  @@index([partnerCode])
  @@index([isActive])
}

// Extend existing Swap model
model Swap {
  // ... existing fields ...

  // New affiliate fields
  affiliateAddress String?    @map("affiliate_address") @db.VarChar(42)
  affiliateBps     Int?       @map("affiliate_bps")
  affiliateFeeUsd  Decimal?   @map("affiliate_fee_usd") @db.Decimal(18, 8)
  
  // Relation to affiliate (optional, for registered affiliates)
  affiliate        Affiliate? @relation("AffiliateSwaps", fields: [affiliateAddress], references: [walletAddress])

  @@index([affiliateAddress])
}

// Partner codes can map to multiple affiliates (organizations)
model PartnerCodeMember {
  id            String    @id @default(uuid())
  partnerCode   String    @map("partner_code") @db.VarChar(32)
  walletAddress String    @map("wallet_address") @db.VarChar(42)
  role          String    @default("member") @db.VarChar(16) // "owner" | "admin" | "member"
  createdAt     DateTime  @default(now()) @map("created_at")

  @@unique([partnerCode, walletAddress])
  @@map("partner_code_members")
  @@index([partnerCode])
  @@index([walletAddress])
}
```

## DTOs (Data Transfer Objects)

```typescript
// packages/shared-types/src/affiliate.ts

export interface AffiliateDto {
  id: string
  walletAddress: string
  partnerCode: string | null
  bps: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateAffiliateDto {
  walletAddress: string
  partnerCode?: string
  bps?: number
}

export interface UpdateAffiliateDto {
  bps?: number
  isActive?: boolean
}

export interface AffiliateStatsDto {
  totalSwaps: number
  totalVolumeUsd: string
  totalFeesEarnedUsd: string
  periodStart?: string
  periodEnd?: string
}

export interface AffiliateSwapDto {
  swapId: string
  sellAsset: string
  buyAsset: string
  sellAmountUsd: string
  buyAmountUsd: string
  affiliateFeeUsd: string
  status: string
  createdAt: string
  txHash?: string
}

export interface ClaimPartnerCodeDto {
  partnerCode: string
}

export interface PartnerCodeResolutionDto {
  partnerCode: string
  affiliateAddress: string
  bps: number
}
```

## API Contracts

### GET /v1/affiliate/:address

Get affiliate configuration by wallet address.

**Response:**
```json
{
  "id": "uuid",
  "walletAddress": "0x...",
  "partnerCode": "vultisig",
  "bps": 100,
  "isActive": true,
  "createdAt": "2026-03-12T00:00:00Z",
  "updatedAt": "2026-03-12T00:00:00Z"
}
```

**404 Response:** Affiliate not registered (use default BPS)

### POST /v1/affiliate

Register as affiliate. Requires SIWE authentication.

**Headers:**
```
Authorization: Bearer <siwe-token>
```

**Request:**
```json
{
  "walletAddress": "0x...",
  "partnerCode": "mycode",
  "bps": 60
}
```

**Response:** Created affiliate object

### PATCH /v1/affiliate/:address

Update affiliate settings. Requires SIWE auth matching address.

**Request:**
```json
{
  "bps": 100
}
```

### GET /v1/affiliate/:address/stats

Get aggregate swap statistics.

**Query params:**
- `startDate` (optional): ISO date
- `endDate` (optional): ISO date

**Response:**
```json
{
  "totalSwaps": 1234,
  "totalVolumeUsd": "1234567.89",
  "totalFeesEarnedUsd": "7407.41"
}
```

### GET /v1/affiliate/:address/swaps

Get paginated swap history.

**Query params:**
- `page` (default: 1)
- `limit` (default: 50, max: 100)
- `startDate` (optional)
- `endDate` (optional)

**Response:**
```json
{
  "swaps": [
    {
      "swapId": "uuid",
      "sellAsset": "ETH",
      "buyAsset": "BTC",
      "sellAmountUsd": "1000.00",
      "buyAmountUsd": "995.00",
      "affiliateFeeUsd": "6.00",
      "status": "completed",
      "createdAt": "2026-03-12T00:00:00Z",
      "txHash": "0x..."
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 1234,
    "pages": 25
  }
}
```

### GET /v1/partner/:code

Resolve partner code to affiliate configuration.

**Response:**
```json
{
  "partnerCode": "vultisig",
  "affiliateAddress": "0x...",
  "bps": 100
}
```

### POST /v1/affiliate/claim-code

Claim a partner code. Requires SIWE auth.

**Request:**
```json
{
  "partnerCode": "mycode"
}
```

**Validation:**
- Code must be 3-32 alphanumeric characters
- Code must not be taken
- One code per affiliate (can transfer)

## Migration

```sql
-- Migration: add_affiliate_tables

CREATE TABLE affiliates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address VARCHAR(42) NOT NULL UNIQUE,
  partner_code VARCHAR(32) UNIQUE,
  bps INTEGER NOT NULL DEFAULT 60,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_affiliates_partner_code ON affiliates(partner_code);
CREATE INDEX idx_affiliates_is_active ON affiliates(is_active);

-- Add columns to existing swaps table
ALTER TABLE swaps ADD COLUMN affiliate_address VARCHAR(42);
ALTER TABLE swaps ADD COLUMN affiliate_bps INTEGER;
ALTER TABLE swaps ADD COLUMN affiliate_fee_usd DECIMAL(18, 8);

CREATE INDEX idx_swaps_affiliate_address ON swaps(affiliate_address);

-- Partner code members (for organizations)
CREATE TABLE partner_code_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_code VARCHAR(32) NOT NULL,
  wallet_address VARCHAR(42) NOT NULL,
  role VARCHAR(16) NOT NULL DEFAULT 'member',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(partner_code, wallet_address)
);

CREATE INDEX idx_partner_code_members_code ON partner_code_members(partner_code);
CREATE INDEX idx_partner_code_members_wallet ON partner_code_members(wallet_address);
```

## Validation Rules

### Wallet Address
- Must be valid EVM address (0x + 40 hex chars)
- Checksummed for storage

### Partner Code
- 3-32 characters
- Alphanumeric + hyphens only
- Case-insensitive (stored lowercase)
- Reserved codes: `shapeshift`, `ss`, `admin`, `api`, `test`

### BPS
- Range: 0-1000 (0% to 10%)
- Default: 60 (0.6%)
- Only modifiable by affiliate owner or admin

## Security Considerations

1. **SIWE Authentication**: All write operations require signed message proving wallet ownership
2. **Rate Limiting**: Stats endpoints rate-limited per address
3. **Address Validation**: Strict EVM address validation
4. **Partner Code Squatting**: Consider verification for branded codes
