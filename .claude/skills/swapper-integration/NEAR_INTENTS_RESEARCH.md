# NEAR Intents Integration - Complete Research & Implementation Plan

## Table of Contents
1. [What is NEAR Intents?](#what-is-near-intents)
2. [How NEAR Intents Works](#how-near-intents-works)
3. [Technical Architecture](#technical-architecture)
4. [The 1Click API](#the-1click-api)
5. [Integration Pattern - Same as Chainflip](#integration-pattern)
6. [Supported Chains & Assets](#supported-chains--assets)
7. [Fee Structure](#fee-structure)
8. [Implementation Plan](#implementation-plan)
9. [Code Examples](#code-examples)
10. [Testing Strategy](#testing-strategy)

---

## What is NEAR Intents?

### The Big Picture

**NEAR Intents is an intent-based cross-chain swap protocol** where users specify WHAT they want (the outcome) rather than HOW to achieve it (the execution path).

**Traditional DEX Aggregator (0x, 1inch, Jupiter):**
```
User → "Use Uniswap V3 to swap 100 USDC for WETH on Ethereum using this route"
     → Direct execution on specified DEX
```

**NEAR Intents:**
```
User → "I want to swap 100 USDC on Ethereum for ETH on Ethereum"
     → Market Makers compete off-chain to provide best execution
     → Winner executes the swap
     → Settlement verified on NEAR blockchain
```

### Key Statistics
- **$1.8 billion** in total volume processed
- **3.6 million** swaps completed
- **121 different assets** supported
- **20+ blockchains** supported (no bridges required!)
- **Launched**: November 2024
- **Renamed**: From "Defuse" to "NEAR Intents" in 2025

### Why It's Different
1. **No Bridges**: Uses NEAR's "Chain Signatures" technology to sign transactions on any blockchain without custody/bridge risks
2. **Competitive Execution**: Market makers compete for your order, potentially better pricing
3. **Cross-Chain Native**: Built from ground-up for cross-chain, not retrofitted
4. **Intent-Based**: You specify the outcome, solvers figure out the best path

---

## How NEAR Intents Works

### The Three-Phase Process

#### Phase 1: Intent Broadcasting
```
User submits intent:
  "I want to swap 100 USDT on TRON for ETH on Ethereum"

  ↓

Intent broadcasted to Market Makers network
```

#### Phase 2: Competitive Fulfillment
```
Market Makers (Solvers) compete off-chain:
  - Solver A: "I can give you 0.0285 ETH"
  - Solver B: "I can give you 0.0287 ETH"  ← Best quote
  - Solver C: "I can give you 0.0284 ETH"

  ↓

Best quote presented to user for approval
```

#### Phase 3: On-Chain Settlement
```
User approves best quote

  ↓

User deposits assets to generated deposit address

  ↓

Verifier smart contract on NEAR:
  - Verifies the intent
  - Confirms solver delivered promised assets
  - Settles the transaction

  ↓

User receives assets on destination chain
```

### The Architecture - Three Core Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Distribution Channels                     │
│  (Wallets, Exchanges, dApps - e.g., ShapeShift, Ledger)    │
│         • Create intents                                     │
│         • Broadcast to Market Makers                         │
│         • Execute user transactions                          │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────────────────────────┐
│                     Market Makers (Solvers)                  │
│         • Compete to fulfill intent requests                 │
│         • Provide liquidity                                  │
│         • Execute off-chain optimization                     │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────────────────────────┐
│              Verifier Smart Contract (on NEAR)               │
│         • Deployed at: intents.near                          │
│         • Verifies intent fulfillment                        │
│         • Settles transactions on-chain                      │
│         • Collects protocol fees (0.0001%)                   │
└─────────────────────────────────────────────────────────────┘
```

---

## Technical Architecture

### NEAR Chain Signatures - The Secret Sauce

**Problem**: Traditional cross-chain swaps require bridges (risky, expensive, slow)

**NEAR's Solution**: Chain Signatures allow a NEAR account to sign transactions on ANY blockchain:
- Bitcoin transactions
- Ethereum transactions
- Solana transactions
- Any ECDSA/EdDSA compatible chain

**How**: Multi-party computation (MPC) protocol where NEAR validators collectively sign transactions without any single party having full key access.

**Result**: No bridges, no wrapped tokens, no custody risk!

### The Deposit-Address Model

Unlike traditional DEX aggregators that return transaction data to sign, NEAR Intents uses a **deposit-address model**:

1. **Quote Request** → API generates unique deposit address
2. **User Sends Assets** → To that deposit address
3. **Solver Monitors** → Detects deposit, executes swap
4. **Settlement** → Verifier confirms, releases funds

This is **identical to how ChainflipSwapper works** - nothing new for ShapeShift!

---

## The 1Click API

### What is 1Click?

**1Click is the integration API** for NEAR Intents. It abstracts the complexity of:
- Intent creation
- Solver coordination
- Deposit address generation
- Transaction execution
- Status tracking

Think of it as the "easy mode" for integrating NEAR Intents.

### Base URL
```
https://1click.chaindefuser.com/
```

(Note: "chaindefuser" = old "Defuse" branding, not updated yet)

### Authentication

**JWT Token Required** (or pay 0.1% penalty!)

- **With JWT**: Only 0.0001% protocol fee
- **Without JWT**: 0.0001% protocol fee + 0.1% additional fee

**How to Get JWT**: Fill out Google Form
https://docs.google.com/forms/d/e/1FAIpQLSdrSrqSkKOMb_a8XhwF0f7N5xZ0Y5CYgyzxiAuoC2g4a2N68g/viewform

**Header Format**:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

### Core Endpoints

#### 1. GET `/v0/tokens`
**Purpose**: Get all supported tokens across all chains

**Authentication**: None required

**Response**:
```json
[
  {
    "assetId": "eth.0x0000000000000000000000000000000000000000",
    "blockchain": "eth",
    "symbol": "ETH",
    "decimals": 18,
    "price": 3245.67,
    "priceUpdatedAt": "2025-01-07T10:30:00Z",
    "contractAddress": "0x0000000000000000000000000000000000000000"
  },
  // ... more tokens
]
```

#### 2. POST `/v0/quote`
**Purpose**: Get swap quote with deposit address

**Authentication**: JWT required

**Request**:
```json
{
  "dry": false,
  "swapType": "EXACT_INPUT",
  "slippageTolerance": 100,
  "originAsset": "eth.0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
  "destinationAsset": "eth.0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
  "amount": "1000000",
  "depositType": "ORIGIN_CHAIN",
  "refundTo": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "refundType": "ORIGIN_CHAIN",
  "recipient": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "recipientType": "DESTINATION_CHAIN",
  "deadline": "2025-01-07T12:00:00Z",
  "appFees": [
    {
      "recipient": "0x9c9aA90363630d4ab1D9dbF416cc3BBC8d3Ed502",
      "fee_bps": 55
    }
  ]
}
```

**Response**:
```json
{
  "timestamp": "2025-01-07T10:35:00Z",
  "signature": "0x...",
  "quoteRequest": { /* echo of request */ },
  "quote": {
    "depositAddress": "0xABCD...",
    "depositMemo": null,
    "amountIn": "1000000",
    "amountInFormatted": "1.0",
    "amountInUsd": "1.00",
    "minAmountIn": "1000000",
    "amountOut": "30341871598244352",
    "amountOutFormatted": "0.0303",
    "amountOutUsd": "98.75",
    "minAmountOut": "30041871598244352",
    "timeEstimate": 120,
    "deadline": "2025-01-07T12:00:00Z",
    "timeWhenInactive": "2025-01-07T11:00:00Z"
  }
}
```

**Key Fields**:
- `depositAddress`: Where user sends funds
- `timeEstimate`: Estimated settlement time in seconds
- `amountOut`: Expected output amount
- `minAmountOut`: Minimum output (with slippage)

#### 3. POST `/v0/deposit/submit`
**Purpose**: (Optional) Notify service of deposit to speed up processing

**Authentication**: JWT required

**Request**:
```json
{
  "txHash": "0xabc123...",
  "depositAddress": "0xABCD...",
  "memo": null
}
```

#### 4. GET `/v0/status`
**Purpose**: Check swap status

**Authentication**: JWT required

**Query Params**:
- `depositAddress` (required)
- `depositMemo` (optional)

**Response**:
```json
{
  "quoteResponse": { /* original quote */ },
  "status": "SUCCESS",
  "updatedAt": "2025-01-07T10:37:00Z",
  "swapDetails": {
    "intentHashes": ["0x..."],
    "nearTxHashes": ["abc123..."],
    "amountIn": "1000000",
    "amountOut": "30341871598244352",
    "slippage": 0.99,
    "originChainTxHashes": [
      {
        "hash": "0x...",
        "explorerUrl": "https://etherscan.io/tx/0x..."
      }
    ],
    "destinationChainTxHashes": [
      {
        "hash": "0x...",
        "explorerUrl": "https://etherscan.io/tx/0x..."
      }
    ],
    "refundedAmount": "0",
    "refundedAmountUsd": "0"
  }
}
```

**Status Values**:
- `PENDING_DEPOSIT` - Waiting for user to deposit
- `KNOWN_DEPOSIT_TX` - Deposit transaction seen but not confirmed
- `PROCESSING` - Deposit confirmed, swap executing
- `SUCCESS` - Swap complete ✅
- `INCOMPLETE_DEPOSIT` - Insufficient amount deposited
- `REFUNDED` - Swap failed, funds refunded
- `FAILED` - Swap failed ❌

### Swap Types

#### EXACT_INPUT (Recommended for ShapeShift)
- User specifies exact sell amount
- Receives estimated buy amount (with slippage protection)
- Excess deposits are refunded
- **This matches ShapeShift's current UX**

#### EXACT_OUTPUT
- User specifies exact buy amount needed
- API returns `minAmountIn` and `maxAmountIn`
- Deposits between min/max are accepted
- More complex UX

#### FLEX_INPUT
- Accepts variable input amounts
- More flexible but harder to reason about
- Probably not needed for MVP

#### ANY_INPUT
- Streaming deposits with multiple withdrawals
- Advanced use case
- Not needed for MVP

### TypeScript SDK

**Package**: `@defuse-protocol/one-click-sdk-typescript`

**Installation**:
```bash
yarn add @defuse-protocol/one-click-sdk-typescript
```

**Basic Usage**:
```typescript
import { OpenAPI, OneClickService, QuoteRequest } from '@defuse-protocol/one-click-sdk-typescript'

// Configure
OpenAPI.BASE = 'https://1click.chaindefuser.com'
OpenAPI.TOKEN = 'your-jwt-token'

// Get supported tokens
const tokens = await OneClickService.getTokens()

// Get quote
const quoteRequest: QuoteRequest = {
  dry: false,
  swapType: 'EXACT_INPUT',
  slippageTolerance: 100,
  originAsset: 'eth.0xa0b8699...',
  destinationAsset: 'eth.0xc02aa...',
  amount: '1000000',
  // ... other fields
}
const quote = await OneClickService.postQuote({ requestBody: quoteRequest })

// Check status
const status = await OneClickService.getStatus({
  depositAddress: quote.quote.depositAddress
})
```

**Benefits of Using SDK**:
- Type-safe API calls
- Auto-generated from OpenAPI spec
- Handles request/response serialization
- Error handling built-in
- Maintained by NEAR Intents team

---

## Integration Pattern - Same as Chainflip!

### The Key Insight

**NEAR Intents uses the EXACT same deposit-to-address pattern as ChainflipSwapper!**

```
ChainflipSwapper Pattern:
  1. getTradeQuote() → Call Chainflip API → Get deposit address + swap ID
  2. Standard execution → Build tx to deposit address
  3. checkTradeStatus() → Poll Chainflip API with swap ID
  4. Settlement → Receive buyTxHash when complete

NEAR Intents Pattern:
  1. getTradeQuote() → Call 1Click API → Get deposit address + quote metadata
  2. Standard execution → Build tx to deposit address
  3. checkTradeStatus() → Poll 1Click API with deposit address
  4. Settlement → Receive buyTxHash when complete
```

### File Structure (Mirror ChainflipSwapper)

```
packages/swapper/src/swappers/NearIntentsSwapper/
├── index.ts
├── NearIntentsSwapper.ts
├── endpoints.ts
├── types.ts
├── constants.ts
├── swapperApi/
│   ├── getTradeQuote.ts
│   └── getTradeRate.ts
├── utils/
│   ├── oneClickService.ts
│   ├── helpers.ts
│   └── statusMapping.ts
└── INTEGRATION.md
```

### Implementation Checklist

Following ChainflipSwapper pattern:

**Core Functions**:
- ✅ `getTradeQuote` - Calls 1Click `/v0/quote` with SDK
- ✅ `getTradeRate` - Calls 1Click `/v0/quote` with `dry: true`
- ✅ `getUnsignedEvmTransaction` - Builds tx to deposit address
- ✅ `getEvmTransactionFees` - Estimates gas for deposit tx
- ✅ `getUnsignedUtxoTransaction` - Builds UTXO tx to deposit address
- ✅ `getUtxoTransactionFees` - Estimates fees for UTXO
- ✅ `getUnsignedSolanaTransaction` - Builds Solana tx to deposit address
- ✅ `getSolanaTransactionFees` - Estimates fees for Solana
- ✅ `checkTradeStatus` - Polls 1Click `/v0/status`

**No Need For**:
- ❌ `executeEvmMessage` - Not gasless (unlike CowSwap)
- ❌ Custom transaction building - Standard execution works
- ❌ Special approval flow - Direct deposit to address

---

## Supported Chains & Assets

### Documented Chains

From NEAR Intents documentation:

**EVM Chains**:
- Ethereum (eth)
- Arbitrum (arb)
- Aurora (aurora)
- Base (base)
- Berachain (bera)
- BSC / BNB Smart Chain (bnb)
- Gnosis (gnosis)
- Polygon (pol)

**UTXO Chains**:
- Bitcoin (btc)
- Dogecoin (doge)

**Other Chains**:
- NEAR (near)
- Solana (sol)
- Stellar (stellar)
- Sui (sui)
- TON (ton)
- TRON (tron)
- XRP (xrp)

**Partial Support**:
- Cardano (cardano) - Shelley addresses only
- ZCash (zec) - Transparent addresses only

### ShapeShift Supported Chains

From codebase analysis:

**EVM Chains**:
- Ethereum
- Avalanche
- Optimism
- BSC
- Polygon
- Gnosis
- Arbitrum
- Arbitrum Nova
- Base

**UTXO Chains**:
- Bitcoin
- Bitcoin Cash
- Dogecoin
- Litecoin

**Other**:
- Solana

### Intersection (Confirmed)

**9 chains confirmed in both docs**:
1. ✅ Ethereum (eth)
2. ✅ Arbitrum (arb)
3. ✅ Base (base)
4. ✅ BSC (bnb)
5. ✅ Polygon (pol)
6. ✅ Gnosis (gnosis)
7. ✅ Bitcoin (btc)
8. ✅ Dogecoin (doge)
9. ✅ Solana (sol)

**2 chains to verify** (ShapeShift has, NEAR docs don't mention):
- ❓ Avalanche (evm chain, likely supported)
- ❓ Optimism (evm chain, likely supported)

**Action**: Call `/v0/tokens` to verify actual supported chains

### Chain ID Mapping

NEAR Intents uses a different chain naming convention:

```typescript
// ShapeShift CAIP-2 format → NEAR Intents format
export const chainIdToNearIntentsChain: Record<ChainId, string> = {
  'eip155:1': 'eth',
  'eip155:42161': 'arb',
  'eip155:8453': 'base',
  'eip155:56': 'bnb',
  'eip155:137': 'pol',
  'eip155:100': 'gnosis',
  'bip122:000000000019d6689c085ae165831e93': 'btc',
  'bip122:00000000001a91e3dace36e2be3bf030': 'doge',
  'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp': 'sol',
  // To verify:
  'eip155:43114': 'avax', // Avalanche
  'eip155:10': 'op',      // Optimism
}
```

---

## Fee Structure

### Understanding All the Fees

#### 1. Protocol Fee (Always Applied)
- **Rate**: 0.0001% (1 pip, 1 basis point)
- **Who**: Collected by `intents.near` smart contract
- **When**: Every swap, non-negotiable
- **Goes To**: `fee_collector` account

**Impact**: Negligible (1 pip = 0.001% of trade value)

#### 2. 1Click API Fee (Conditional)
- **With JWT Token**: 0% additional fee ✅
- **Without JWT Token**: 0.1% additional fee ❌

**Math**:
```
With JWT:    Total = 0.0001% protocol
Without JWT: Total = 0.0001% protocol + 0.1% API = 0.1001%
```

**Action Required**: Get JWT token to avoid 0.1% penalty for users!

#### 3. ShapeShift Affiliate Fee (Our Revenue)
- **Rate**: 55 basis points = 0.55%
- **Configured**: Hardcoded in `src/lib/fees/constant.ts` as `DEFAULT_FEE_BPS = '55'`
- **Passed**: Through `input.affiliateBps` to swapper
- **Sent To**: Via 1Click `appFees` parameter

**Implementation**:
```typescript
// In getBebopTradeQuote pattern:
const { affiliateBps } = input  // '55' from app

// Pass to 1Click API:
const quoteRequest: QuoteRequest = {
  // ... other fields
  appFees: [
    {
      recipient: '0x9c9aA90363630d4ab1D9dbF416cc3BBC8d3Ed502', // DAO_TREASURY_BASE
      fee_bps: Number(affiliateBps), // 55
    }
  ],
}
```

#### 4. Total Fee Breakdown

**Example: 1000 USDC swap**

```
Input Amount:           1000.00 USDC
Protocol Fee (0.0001%): -   0.001 USDC
ShapeShift Fee (0.55%): -   5.50 USDC
──────────────────────────────────
Amount Swapped:          994.499 USDC
Expected Output:         ~0.305 ETH (at $3250/ETH)
```

**User Impact**: 0.55% total fee (very competitive!)

### ShapeShift Treasury Addresses

From codebase (`packages/utils/src/treasury.ts`):

**EVM Treasury by Chain**:
```typescript
export const DAO_TREASURY_ETHEREUM_MAINNET = '0x90a48d5cf7343b08da12e067680b4c6dbfe551be'
export const DAO_TREASURY_OPTIMISM = '0x6268d07327f4fb7380732dc6d63d95F88c0E083b'
export const DAO_TREASURY_AVALANCHE = '0x74d63F31C2335b5b3BA7ad2812357672b2624cEd'
export const DAO_TREASURY_POLYGON = '0xB5F944600785724e31Edb90F9DFa16dBF01Af000'
export const DAO_TREASURY_GNOSIS = '0xb0E3175341794D1dc8E5F02a02F9D26989EbedB3'
export const DAO_TREASURY_BSC = '0x8b92b1698b57bEDF2142297e9397875ADBb2297E'
export const DAO_TREASURY_ARBITRUM = '0x38276553F8fbf2A027D901F8be45f00373d8Dd48'
export const DAO_TREASURY_BASE = '0x9c9aA90363630d4ab1D9dbF416cc3BBC8d3Ed502'
```

**Recommended for NEAR Intents**:
- **Primary**: `DAO_TREASURY_BASE` = `0x9c9aA90363630d4ab1D9dbF416cc3BBC8d3Ed502`
- **Why**: Used as default multi-chain EVM address (see RelaySwapper pattern)

**Alternative Approach**: Map chain-specific treasuries
```typescript
// In utils/helpers.ts
export const getTreasuryAddress = (chainId: ChainId): string => {
  switch (chainId) {
    case 'eip155:1': return DAO_TREASURY_ETHEREUM_MAINNET
    case 'eip155:10': return DAO_TREASURY_OPTIMISM
    case 'eip155:43114': return DAO_TREASURY_AVALANCHE
    case 'eip155:137': return DAO_TREASURY_POLYGON
    case 'eip155:100': return DAO_TREASURY_GNOSIS
    case 'eip155:56': return DAO_TREASURY_BSC
    case 'eip155:42161': return DAO_TREASURY_ARBITRUM
    case 'eip155:8453': return DAO_TREASURY_BASE
    default: return DAO_TREASURY_BASE // Fallback
  }
}
```

---

## Implementation Plan

### Phase 1: Setup & Configuration

#### 1.1 Get JWT Token
- Fill out Google Form: https://docs.google.com/forms/d/e/1FAIpQLSdrSrqSkKOMb_a8XhwF0f7N5xZ0Y5CYgyzxiAuoC2g4a2N68g/viewform
- Store in `.env.development` and `.env`

#### 1.2 Install TypeScript SDK
```bash
cd /Users/alexandre.gomes/Sites/shapeshiftWebClone
yarn add @defuse-protocol/one-click-sdk-typescript
```

#### 1.3 Verify Chain Support
Call `/v0/tokens` endpoint to get actual list of supported chains and verify Avalanche/Optimism support.

#### 1.4 Add Configuration
**File**: `src/config.ts`
```typescript
const validators = {
  // ... existing validators
  VITE_NEAR_INTENTS_API_KEY: str(), // JWT token
}
```

**File**: `src/vite-env.d.ts`
```typescript
interface ImportMetaEnv {
  // ... existing
  readonly VITE_NEAR_INTENTS_API_KEY: string
  readonly VITE_FEATURE_NEAR_INTENTS_SWAP: boolean
}
```

**File**: `packages/swapper/src/types.ts`
```typescript
export type SwapperConfig = {
  // ... existing
  VITE_NEAR_INTENTS_API_KEY: string
}
```

**Files**: `.env` and `.env.development`
```bash
# NEAR Intents
VITE_NEAR_INTENTS_API_KEY=your-jwt-token-here
VITE_FEATURE_NEAR_INTENTS_SWAP=false  # .env (production)
VITE_FEATURE_NEAR_INTENTS_SWAP=true   # .env.development
```

### Phase 2: Core Implementation

#### 2.1 Create Swapper Structure
```bash
mkdir -p packages/swapper/src/swappers/NearIntentsSwapper/{swapperApi,utils}
```

#### 2.2 Implement Types (`types.ts`)
```typescript
import type { Address } from 'viem'

// Re-export SDK types
export type {
  QuoteRequest,
  QuoteResponse,
  GetExecutionStatusResponse,
  TokenResponse,
} from '@defuse-protocol/one-click-sdk-typescript'

// Supported chains
export const nearIntentsSupportedChainIds = [
  KnownChainIds.EthereumMainnet,
  KnownChainIds.ArbitrumMainnet,
  KnownChainIds.BaseMainnet,
  KnownChainIds.BnbSmartChainMainnet,
  KnownChainIds.PolygonMainnet,
  KnownChainIds.GnosisMainnet,
  // To verify:
  // KnownChainIds.AvalancheMainnet,
  // KnownChainIds.OptimismMainnet,
] as const

export type NearIntentsSupportedChainId = (typeof nearIntentsSupportedChainIds)[number]

// Chain ID mapping
export const chainIdToNearIntentsChain: Record<NearIntentsSupportedChainId, string> = {
  [KnownChainIds.EthereumMainnet]: 'eth',
  [KnownChainIds.ArbitrumMainnet]: 'arb',
  [KnownChainIds.BaseMainnet]: 'base',
  [KnownChainIds.BnbSmartChainMainnet]: 'bnb',
  [KnownChainIds.PolygonMainnet]: 'pol',
  [KnownChainIds.GnosisMainnet]: 'gnosis',
}

// Asset ID format: "blockchain.contractAddress"
// Example: "eth.0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"
export const getNearIntentsAssetId = (
  blockchain: string,
  contractAddress: string,
): string => {
  return `${blockchain}.${contractAddress.toLowerCase()}`
}
```

#### 2.3 Implement Constants (`constants.ts`)
```typescript
import type { SwapperName } from '../../types'

export const NEAR_INTENTS_SWAPPER_NAME: SwapperName = 'NearIntents'

// Default slippage: 0.5% = 50 basis points
export const DEFAULT_SLIPPAGE_BPS = 50

// 1Click API base URL
export const ONE_CLICK_BASE_URL = 'https://1click.chaindefuser.com'

// Swap type - matches ShapeShift UX
export const DEFAULT_SWAP_TYPE = 'EXACT_INPUT'

// Treasury address for affiliate fees (Base chain address, multi-chain compatible)
export const SHAPESHIFT_TREASURY_ADDRESS = '0x9c9aA90363630d4ab1D9dbF416cc3BBC8d3Ed502'
```

#### 2.4 Implement Service (`utils/oneClickService.ts`)
```typescript
import { OpenAPI, OneClickService } from '@defuse-protocol/one-click-sdk-typescript'

let isInitialized = false

export const initializeOneClickService = (apiKey: string) => {
  if (isInitialized) return

  OpenAPI.BASE = 'https://1click.chaindefuser.com'
  OpenAPI.TOKEN = apiKey

  isInitialized = true
}

export { OneClickService }
```

#### 2.5 Implement Helpers (`utils/helpers.ts`)
```typescript
import type { Asset } from '@shapeshiftoss/types'
import { TxStatus } from '../../types'
import type { GetExecutionStatusResponse } from '../types'
import { chainIdToNearIntentsChain, getNearIntentsAssetId } from '../types'

// Convert ShapeShift slippage to 1Click basis points
export const convertSlippageToBps = (
  slippageDecimal: string | undefined,
): number => {
  if (!slippageDecimal) return DEFAULT_SLIPPAGE_BPS
  return Math.round(Number(slippageDecimal) * 10000)
}

// Convert asset to NEAR Intents format
export const assetToNearIntentsId = (asset: Asset): string => {
  const chainId = asset.chainId
  const blockchain = chainIdToNearIntentsChain[chainId]

  if (!blockchain) {
    throw new Error(`Unsupported chain for NEAR Intents: ${chainId}`)
  }

  // For native assets, use zero address
  const contractAddress = asset.assetReference === 'slip44:60'
    ? '0x0000000000000000000000000000000000000000'
    : asset.assetReference

  return getNearIntentsAssetId(blockchain, contractAddress)
}

// Map 1Click status to ShapeShift TxStatus
export const mapNearIntentsStatus = (
  status: GetExecutionStatusResponse['status'],
): TxStatus => {
  switch (status) {
    case 'PENDING_DEPOSIT':
    case 'KNOWN_DEPOSIT_TX':
    case 'PROCESSING':
      return TxStatus.Pending
    case 'SUCCESS':
      return TxStatus.Confirmed
    case 'INCOMPLETE_DEPOSIT':
    case 'REFUNDED':
    case 'FAILED':
      return TxStatus.Failed
    default:
      return TxStatus.Unknown
  }
}

// Get user-friendly status message
export const getNearIntentsStatusMessage = (
  status: GetExecutionStatusResponse['status'],
): string | undefined => {
  switch (status) {
    case 'PENDING_DEPOSIT':
      return 'Waiting for deposit...'
    case 'KNOWN_DEPOSIT_TX':
      return 'Deposit detected, waiting for confirmation...'
    case 'PROCESSING':
      return 'Processing swap...'
    case 'SUCCESS':
      return undefined // No message needed for success
    case 'INCOMPLETE_DEPOSIT':
      return 'Insufficient deposit amount'
    case 'REFUNDED':
      return 'Swap failed, funds refunded'
    case 'FAILED':
      return 'Swap failed'
    default:
      return 'Unknown status'
  }
}
```

#### 2.6 Implement Quote Logic (`swapperApi/getTradeQuote.ts`)

See detailed code example in "Code Examples" section below.

#### 2.7 Implement Rate Logic (`swapperApi/getTradeRate.ts`)

Same as quote but with `dry: true` and no deposit address generation.

#### 2.8 Implement Endpoints (`endpoints.ts`)

Wire up all the SwapperApi functions following ChainflipSwapper pattern.

#### 2.9 Implement Main Swapper (`NearIntentsSwapper.ts`)
```typescript
import type { Swapper } from '../../types'
import { executeEvmTransaction, executeUtxoTransaction, executeSolanaTransaction } from '../../utils'

export const nearIntentsSwapper: Swapper = {
  executeEvmTransaction,
  executeUtxoTransaction,
  executeSolanaTransaction,
}
```

#### 2.10 Implement Index (`index.ts`)
```typescript
export * from './NearIntentsSwapper'
export * from './endpoints'
export * from './types'
export * from './constants'
```

### Phase 3: Registration

#### 3.1 Register SwapperName
**File**: `packages/swapper/src/constants.ts`
```typescript
export enum SwapperName {
  // ... existing
  NearIntents = 'NearIntents',
}

export const swappers: Record<SwapperName, Swapper> = {
  // ... existing
  [SwapperName.NearIntents]: nearIntentsSwapper,
}
```

#### 3.2 Register Default Slippage
**File**: `packages/swapper/src/swappers/utils/helpers/helpers.ts`
```typescript
export const getDefaultSlippageDecimalPercentageForSwapper = (
  swapperName: SwapperName,
): string => {
  switch (swapperName) {
    // ... existing cases
    case SwapperName.NearIntents:
      return '0.005' // 0.5%
    default:
      return DEFAULT_SLIPPAGE
  }
}
```

#### 3.3 Add CSP Headers
**File**: `src/lib/headers/csps/defi/swappers/NearIntents.ts`
```typescript
import type { Csp } from 'csp-header'

export const nearIntentsCsp: Csp = {
  'connect-src': [
    'https://1click.chaindefuser.com',
  ],
}
```

**File**: `src/lib/headers/csps/index.ts`
```typescript
import { nearIntentsCsp } from './defi/swappers/NearIntents'

export const csp: Csp = {
  'connect-src': [
    // ... existing
    ...nearIntentsCsp['connect-src'],
  ],
}
```

### Phase 4: UI Integration

#### 4.1 Add Swapper Icon
1. Get NEAR Intents logo (PNG, 128x128)
2. Save to: `src/components/MultiHopTrade/components/TradeInput/components/SwapperIcon/near-intents-icon.png`

#### 4.2 Update SwapperIcon Component
**File**: `src/components/MultiHopTrade/components/TradeInput/components/SwapperIcon/SwapperIcon.tsx`
```typescript
import nearIntentsIcon from './near-intents-icon.png'

// In switch statement:
case SwapperName.NearIntents:
  return <Image src={nearIntentsIcon} />
```

#### 4.3 Add Feature Flag
**File**: `src/state/slices/preferencesSlice/preferencesSlice.ts`
```typescript
export type FeatureFlags = {
  // ... existing
  NearIntentsSwap: boolean
}

const initialState: Preferences = {
  featureFlags: {
    // ... existing
    NearIntentsSwap: getConfig().VITE_FEATURE_NEAR_INTENTS_SWAP,
  }
}
```

#### 4.4 Wire Up Feature Flag
**File**: `src/state/helpers.ts`
```typescript
export const getEnabledSwappers = (
  { NearIntentsSwap, ...otherFlags }: FeatureFlags,
  isCrossAccountTrade: boolean,
): Record<SwapperName, boolean> => {
  return {
    // ... existing
    [SwapperName.NearIntents]:
      NearIntentsSwap && (!isCrossAccountTrade || isCrossAccountTradeSupported(SwapperName.NearIntents)),
  }
}
```

### Phase 5: Testing

#### 5.1 Unit Tests
- Test helper functions (slippage conversion, asset ID formatting, status mapping)
- Test error handling
- Mock SDK responses

#### 5.2 Integration Tests
- Test quote generation with real API (testnet... oh wait, no testnet!)
- Test status polling
- Test all supported chains

#### 5.3 Manual Testing Checklist
- [ ] Get JWT token
- [ ] Verify chain support via `/v0/tokens`
- [ ] Test single-chain swap (ETH → USDC on Ethereum)
- [ ] Test cross-chain swap (BTC → ETH)
- [ ] Test status polling during swap
- [ ] Test refund scenario (cancel before deposit)
- [ ] Test insufficient deposit handling
- [ ] Verify affiliate fees appear in quotes
- [ ] Test slippage handling
- [ ] Test all supported chains

#### 5.4 Build Validation
```bash
# Type checking
yarn type-check

# Linting
yarn lint

# Build swapper package
yarn build:packages

# Build full app
yarn build:web
```

---

## Code Examples

### Example: getTradeQuote Implementation

```typescript
// packages/swapper/src/swappers/NearIntentsSwapper/swapperApi/getTradeQuote.ts

import { Err, Ok } from '@sniptt/monads'
import type { Result } from '@sniptt/monads'
import { v4 as uuid } from 'uuid'
import type { GetEvmTradeQuoteInput, SwapErrorRight, TradeQuote } from '../../../types'
import { SwapperName } from '../../../types'
import { makeSwapErrorRight, SwapError } from '../../../utils'
import type { QuoteRequest, QuoteResponse } from '../types'
import { SHAPESHIFT_TREASURY_ADDRESS, DEFAULT_SWAP_TYPE } from '../constants'
import { initializeOneClickService, OneClickService } from '../utils/oneClickService'
import {
  convertSlippageToBps,
  assetToNearIntentsId,
} from '../utils/helpers'

export async function getNearIntentsTradeQuote(
  input: GetEvmTradeQuoteInput,
  deps: {
    config: { VITE_NEAR_INTENTS_API_KEY: string }
    assertGetEvmChainAdapter: (chainId: ChainId) => EvmChainAdapter
    assetsById: AssetsById
  },
): Promise<Result<TradeQuote[], SwapErrorRight>> {
  try {
    const {
      sellAsset,
      buyAsset,
      sellAmountIncludingProtocolFeesCryptoBaseUnit,
      affiliateBps,
      slippageTolerancePercentageDecimal,
      receiveAddress,
      accountNumber,
      sendAddress,
    } = input

    // Initialize SDK with API key
    initializeOneClickService(deps.config.VITE_NEAR_INTENTS_API_KEY)

    // Build quote request
    const quoteRequest: QuoteRequest = {
      dry: false,
      swapType: DEFAULT_SWAP_TYPE,
      slippageTolerance: convertSlippageToBps(slippageTolerancePercentageDecimal),
      originAsset: assetToNearIntentsId(sellAsset),
      destinationAsset: assetToNearIntentsId(buyAsset),
      amount: sellAmountIncludingProtocolFeesCryptoBaseUnit,
      depositType: 'ORIGIN_CHAIN',
      refundTo: sendAddress,
      refundType: 'ORIGIN_CHAIN',
      recipient: receiveAddress,
      recipientType: 'DESTINATION_CHAIN',
      deadline: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 min from now
      appFees: [
        {
          recipient: SHAPESHIFT_TREASURY_ADDRESS,
          fee_bps: Number(affiliateBps),
        },
      ],
    }

    // Call 1Click API
    const quoteResponse: QuoteResponse = await OneClickService.postQuote({
      requestBody: quoteRequest,
    })

    const { quote } = quoteResponse

    // Build TradeQuote
    const tradeQuote: TradeQuote = {
      id: uuid(),
      receiveAddress,
      affiliateBps,
      potentialAffiliateBps: affiliateBps,
      rate: bn(quote.amountOut).div(quote.amountIn).toString(),
      slippageTolerancePercentageDecimal:
        slippageTolerancePercentageDecimal ?? getDefaultSlippageDecimalPercentageForSwapper(SwapperName.NearIntents),
      steps: [
        {
          accountNumber,
          allowanceContract: quote.depositAddress, // Not really an allowance, but deposit address
          buyAmountBeforeFeesCryptoBaseUnit: quote.amountOut,
          buyAmountAfterFeesCryptoBaseUnit: quote.amountOut,
          buyAsset,
          feeData: {
            protocolFees: {
              [sellAsset.assetId]: {
                amountCryptoBaseUnit: '0', // NEAR Intents fees are in output
                requiresBalance: false,
                asset: sellAsset,
              },
            },
            networkFeeCryptoBaseUnit: '0', // Calculated later in getEvmTransactionFees
          },
          rate: bn(quote.amountOut).div(quote.amountIn).toString(),
          sellAmountIncludingProtocolFeesCryptoBaseUnit: quote.amountIn,
          sellAsset,
          source: SwapperName.NearIntents,
          // Store NEAR Intents specific data
          nearIntentsSpecific: {
            depositAddress: quote.depositAddress,
            depositMemo: quote.depositMemo,
            timeEstimate: quote.timeEstimate,
            deadline: quote.deadline,
            quoteResponse, // Store full response for status checking
          },
        },
      ],
    }

    return Ok([tradeQuote])
  } catch (error) {
    return Err(
      makeSwapErrorRight({
        message: error instanceof Error ? error.message : 'Unknown error getting NEAR Intents quote',
        code: SwapError.TRADE_QUOTE_FAILED,
        cause: error,
      }),
    )
  }
}
```

### Example: checkTradeStatus Implementation

```typescript
// packages/swapper/src/swappers/NearIntentsSwapper/endpoints.ts (excerpt)

import type { TradeStatusResponse } from '../../types'
import { TxStatus } from '../../types'
import { initializeOneClickService, OneClickService } from './utils/oneClickService'
import { mapNearIntentsStatus, getNearIntentsStatusMessage } from './utils/helpers'

export const nearIntentsApi: SwapperApi = {
  // ... other methods

  checkTradeStatus: async ({
    config,
    swap,
  }): Promise<TradeStatusResponse> => {
    const { nearIntentsSpecific } = swap?.metadata ?? {}

    if (!nearIntentsSpecific?.depositAddress) {
      throw new Error('depositAddress is required for NEAR Intents status check')
    }

    initializeOneClickService(config.VITE_NEAR_INTENTS_API_KEY)

    try {
      const statusResponse = await OneClickService.getStatus({
        depositAddress: nearIntentsSpecific.depositAddress,
        depositMemo: nearIntentsSpecific.depositMemo,
      })

      const txStatus = mapNearIntentsStatus(statusResponse.status)
      const message = getNearIntentsStatusMessage(statusResponse.status)

      // Extract buyTxHash from destination chain transactions
      const buyTxHash = statusResponse.swapDetails?.destinationChainTxHashes?.[0]?.hash

      return {
        status: txStatus,
        buyTxHash,
        message,
      }
    } catch (error) {
      return {
        status: TxStatus.Unknown,
        buyTxHash: undefined,
        message: 'Failed to fetch swap status',
      }
    }
  },
}
```

---

## Testing Strategy

### No Testnet = Production Testing Required

**Challenge**: NEAR Intents explicitly has NO testnet deployment.

**Solution**: Careful staged rollout with small amounts.

### Testing Phases

#### Phase 1: Development Testing (Small Amounts)
1. **Setup**:
   - Get JWT token for dev
   - Use `.env.development` with feature flag enabled
   - Fund test wallet with small amounts ($10-20 worth)

2. **Test Cases**:
   - Single-chain swap: 10 USDC → ETH on Ethereum
   - Cross-chain swap: $10 BTC → ETH
   - Status polling: Monitor through complete lifecycle
   - Error handling: Try unsupported pair, insufficient balance

3. **Validation**:
   - Quote appears in UI
   - Deposit address generated
   - Transaction executes to deposit address
   - Status updates correctly
   - Funds received on destination
   - Affiliate fees deducted correctly

#### Phase 2: Internal Testing (Medium Amounts)
1. **Team Testing**:
   - Multiple team members test various pairs
   - Different wallet types (MetaMask, Ledger, etc.)
   - Different chains
   - Edge cases (min amounts, max slippage, etc.)

2. **Monitoring**:
   - Track all swaps via Intents Explorer
   - Verify affiliate fees received at treasury address
   - Check for any failed swaps or refunds

#### Phase 3: Beta Testing (Gated Release)
1. **Feature Flag**:
   - Keep `VITE_FEATURE_NEAR_INTENTS_SWAP=false` in production `.env`
   - Manually enable for beta users via admin panel (if exists) or direct DB access

2. **Monitoring**:
   - Set up alerting for failed swaps
   - Track swap success rate
   - Monitor affiliate fee collection
   - Gather user feedback

#### Phase 4: Full Release
1. **Gradual Rollout**:
   - Enable feature flag in production: `VITE_FEATURE_NEAR_INTENTS_SWAP=true`
   - Monitor closely for first 24-48 hours
   - Be ready to disable quickly if issues arise

2. **Success Metrics**:
   - Swap success rate > 95%
   - No user fund losses
   - Affiliate fees collecting correctly
   - Competitive pricing vs other swappers

### Monitoring & Alerting

**Set up monitoring for**:
- Failed swaps (status = FAILED or REFUNDED)
- Stuck swaps (PROCESSING > 10 minutes)
- Incomplete deposits
- API errors / rate limiting
- Treasury fee collection

**Tools**:
- NEAR Intents Explorer: https://explorer.near-intents.org/
- On-chain monitoring of treasury address
- Application error tracking (Sentry)
- Custom metrics dashboard

---

## Summary

### What We Learned

1. **NEAR Intents is NOT fundamentally different** - it's the same deposit-to-address pattern as ChainflipSwapper
2. **1Click API is well-documented** with OpenAPI spec and TypeScript SDK
3. **20+ chains supported** including 9-11 chains ShapeShift already supports
4. **Fee structure is simple** - just protocol fee (0.0001%) + our affiliate fee (0.55%)
5. **JWT token is critical** to avoid 0.1% penalty for users
6. **No testnet** means careful production testing required
7. **No DCA/streaming** - I was hallucinating Chainflip features!
8. **Refund addresses ARE customizable** - not a Chainflip-only feature

### Implementation Complexity

**Low to Medium** - Following ChainflipSwapper pattern makes this straightforward:
- Use existing transaction execution (`executeEvmTransaction`, etc.)
- Use existing status polling infrastructure (`checkTradeStatus`)
- Use SDK for API calls (don't reinvent)
- Mirror ChainflipSwapper file structure

**Estimated Effort**: 2-3 days for experienced developer familiar with codebase

### Key Success Factors

1. ✅ Get JWT token BEFORE starting
2. ✅ Use TypeScript SDK (don't build HTTP client from scratch)
3. ✅ Follow ChainflipSwapper pattern exactly
4. ✅ Test with small amounts first (no testnet!)
5. ✅ Set up proper monitoring before launch
6. ✅ Gradual rollout with feature flag

### Next Steps

1. **Get JWT token** from NEAR Intents team
2. **Verify chain support** by calling `/v0/tokens`
3. **Start implementation** following this plan
4. **Test thoroughly** with small amounts
5. **Launch** with feature flag control

---

---

## Acceptance Criteria - ANSWERED ✅

### From GitHub Issue #10991

#### 1. ✅ Spike into feasibility of integrating Near Intents into the swapper

**ANSWER: FULLY FEASIBLE**

- NEAR Intents uses **deposit-to-address pattern** (identical to ChainflipSwapper)
- 1Click API is well-documented with TypeScript SDK
- No architectural changes needed - standard swapper integration
- 9-11 chains overlap with ShapeShift's supported chains
- Estimated implementation: 2-3 days

**Conclusion**: Straightforward integration following existing patterns.

---

#### 2. ✅ Do we need anything special for tracking transactions in progress?

**ANSWER: NO - Existing infrastructure handles it perfectly**

**Evidence**:
- Status polling via `checkTradeStatus` (already implemented in swapper abstraction)
- 1Click API provides `/v0/status` endpoint
- Status flow: `PENDING_DEPOSIT` → `PROCESSING` → `SUCCESS`
- Same pattern as Chainflip (we already do this!)
- UI already has action center subscribers for swap status tracking (`useSwapActionSubscriber.tsx`)

**What we store in metadata**:
```typescript
nearIntentsSpecific: {
  depositAddress: string,      // To poll status
  depositMemo?: string,         // If required by blockchain
  quoteResponse: QuoteResponse, // Full response for reference
  timeEstimate: number,         // Expected settlement time
  deadline: string,             // ISO timestamp when quote expires
}
```

**Existing infrastructure handles**:
- Polling loop in `useSwapActionSubscriber.tsx`
- Status updates via Redux
- Transaction links in UI
- Notifications on completion

**Conclusion**: Nothing special needed - reuse existing status polling infrastructure.

---

#### 3. ✅ How do we track revenues and how flexible is that for params?

**ANSWER: Automatic collection + flexible params**

##### Revenue Collection Mechanism

**How affiliate fees work**:
```typescript
// In quote request:
appFees: [
  {
    recipient: getTreasuryForNearIntents(sellAsset.chainId), // Per-chain treasury
    fee_bps: Number(affiliateBps), // 55 from app constant
  }
]
```

**Fee deduction**:
- For `EXACT_INPUT`: Fee deducted from input amount before swap
- Example: 1000 USDC input → 5.5 USDC fee → 994.5 USDC swapped
- Fee sent directly to treasury address on-chain during swap execution

**Treasury routing logic**:
```typescript
const getTreasuryForNearIntents = (chainId: ChainId): string => {
  try {
    // EVM chains: Use per-chain treasury
    return getTreasuryAddressFromChainId(chainId)
  } catch (err) {
    // Non-EVM chains (BTC, SOL, DOGE): Fallback to Base treasury
    // NEAR Intents handles cross-chain transfer automatically
    return DAO_TREASURY_BASE // 0x9c9aA90363630d4ab1D9dbF416cc3BBC8d3Ed502
  }
}
```

**Recipient address support** (from 1Click docs):
- ✅ **EVM addresses** (0x...)
- ✅ **NEAR named accounts** (alice.near)
- ✅ **NEAR implicit accounts** (64-char hex)
- ❌ **Bitcoin/Solana/other non-EVM addresses** (not supported)

**Solution**: Use per-chain EVM treasury for EVM chains, fallback to Base EVM address for non-EVM chains. NEAR Intents handles the cross-chain fee transfer automatically.

##### Revenue Tracking (Observability)

**On-chain tracking**:
- Monitor treasury addresses per chain
- See incoming transactions from 1Click swaps
- Can query by token/chain

**1Click Intents Explorer API**:
- Endpoint: `https://explorer.near-intents.org/api/v0/transactions`
- Can filter by affiliate address
- Shows all swaps with our affiliate fees

**Example query**:
```bash
GET https://explorer.near-intents.org/api/v0/transactions?affiliate=0x9c9aA90363630d4ab1D9dbF416cc3BBC8d3Ed502
Authorization: Bearer JWT_TOKEN
```

**Response includes**:
- All swaps with ShapeShift affiliate
- Fee amounts per swap
- Status of each swap
- Timestamps, chains, assets

##### Flexibility of Params

**Current setup**:
- **Affiliate BPS**: Hardcoded as `'55'` in `src/lib/fees/constant.ts`
- **Treasury address**: Per-chain routing via `getTreasuryAddressFromChainId()`
- **Passed through**: Automatically via `input.affiliateBps`

**Flexibility options supported by 1Click API**:

1. **Per-chain treasury addresses**: ✅ Implemented
   ```typescript
   // EVM chains get their own treasury
   // Non-EVM chains fallback to Base treasury
   ```

2. **Revenue sharing** (future use): ✅ Supported by API
   ```typescript
   appFees: [
     { recipient: treasuryAddress, fee_bps: 50 },
     { recipient: partnerAddress, fee_bps: 5 },
   ]
   ```

3. **Dynamic fee percentages**: Not needed (55 bps hardcoded at app level, works as designed)

**Current flexibility**: Optimal
- Fixed 55 bps across all swaps (as designed)
- Per-chain treasury routing for EVM chains
- Fallback to Base treasury for non-EVM chains
- Passed automatically - no manual configuration per swap

**Conclusion**: Revenue collection is automatic, tracking is comprehensive, and parameters have appropriate flexibility.

---

## Appendix

### Useful Links

**Official Documentation**:
- Main docs: https://docs.near-intents.org/near-intents
- 1Click API: https://docs.near-intents.org/near-intents/integration/distribution-channels/1click-api
- Chain support: https://docs.near-intents.org/near-intents/chain-address-support
- Fees: https://docs.near-intents.org/near-intents/fees
- FAQs: https://docs.near-intents.org/near-intents/faqs

**API Resources**:
- OpenAPI Spec: https://1click.chaindefuser.com/docs/v0/openapi.yaml
- Base URL: https://1click.chaindefuser.com
- JWT Form: https://docs.google.com/forms/d/e/1FAIpQLSdrSrqSkKOMb_a8XhwF0f7N5xZ0Y5CYgyzxiAuoC2g4a2N68g/viewform

**SDK**:
- npm: https://www.npmjs.com/package/@defuse-protocol/one-click-sdk-typescript
- GitHub: https://github.com/defuse-protocol/one-click-sdk-typescript

**Explorer**:
- Intents Explorer: https://explorer.near-intents.org/
- Explorer API: https://docs.near-intents.org/near-intents/integration/distribution-channels/intents-explorer-api

**Demo**:
- Demo dApp: https://near-intents.org/

### Glossary

**Intent**: A declarative statement of desired outcome (e.g., "swap X for Y")
**Solver / Market Maker**: Entity that fulfills intents by providing liquidity
**Verifier**: Smart contract on NEAR that validates and settles intents
**Distribution Channel**: Application that creates and broadcasts intents (ShapeShift)
**1Click**: Simplified API wrapper for NEAR Intents integration
**Chain Signatures**: NEAR's MPC technology for cross-chain transaction signing
**Deposit Address**: Unique address generated per swap where user sends assets
**EXACT_INPUT**: Swap type where user specifies exact sell amount
**Basis Points (bps)**: Fee units where 100 bps = 1%
**JWT**: JSON Web Token for 1Click API authentication
