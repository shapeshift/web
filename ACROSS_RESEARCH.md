# Across Protocol Integration Research

## tl;dr

Across is an intent-based crosschain bridge with a clean REST API, integrator fee support (`appFee` as decimal percentage 0-1), and 10 overlapping chains with ShapeShift. Integration complexity is comparable to Relay. **Blocker: we need to register for an integrator ID before going to production.**

---

## Table of Contents

- [1. API Overview](#1-api-overview)
- [2. Supported Chains & Overlap](#2-supported-chains--overlap)
- [3. Affiliate / Integrator Fees](#3-affiliate--integrator-fees)
- [4. SDK vs REST API](#4-sdk-vs-rest-api)
- [5. Types & Response Shapes](#5-types--response-shapes)
- [6. Registration & Access Requirements](#6-registration--access-requirements)
- [7. Brand Assets / Press Kit](#7-brand-assets--press-kit)
- [8. Feature Flag & Env Vars Plan](#8-feature-flag--env-vars-plan)
- [9. Treasury Addresses (Per-Chain)](#9-treasury-addresses-per-chain)
- [10. Comparison with Relay](#10-comparison-with-relay)
- [11. Implementation Plan](#11-implementation-plan)
- [12. Open Questions & Blockers](#12-open-questions--blockers)

---

## 1. API Overview

**Base URLs:**
- Mainnet: `https://app.across.to/api`
- Testnet: `https://testnet.across.to/api`

**Architecture:** REST API, serverless, no state storage. Returns ready-to-execute calldata.

### Endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/swap/approval` | GET | Get executable swap calldata (recommended for integrators) |
| `/swap/approval` | POST | Same, but with embedded destination chain actions |
| `/swap/chains` | GET | List supported chains |
| `/swap/tokens` | GET | List supported tokens |
| `/swap/sources` | GET | List available liquidity sources |
| `/deposit/status` | GET | Track deposit/fill lifecycle |
| `/deposits` | GET | Get all deposits for a depositor |
| `/suggested-fees` | GET | Lower-level fee quote (bridge-only, no swap calldata) |
| `/limits` | GET | Transfer min/max limits for a route |
| `/available-routes` | GET | Discover supported routes |

### Primary Flow (Swap API)

1. `GET /swap/approval` with params → returns `approvalTxns[]` + `swapTx` calldata
2. Sign & send approval txns (if any)
3. Sign & send `swapTx`
4. Poll `GET /deposit/status?depositTxnRef={txHash}` for fill status

### Key `/swap/approval` Query Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `tradeType` | string | Yes | `exactInput`, `minOutput`, or `exactOutput` |
| `amount` | string | Yes | Amount in smallest units |
| `inputToken` | string | Yes | Token address on origin chain |
| `outputToken` | string | Yes | Token address on destination chain |
| `originChainId` | integer | Yes | Origin chain ID |
| `destinationChainId` | integer | Yes | Destination chain ID |
| `depositor` | string | Yes | Sender wallet address |
| `recipient` | string | No | Output recipient (defaults to depositor) |
| `appFee` | number | No | **Integrator fee as decimal percentage (0-1 range)** |
| `appFeeRecipient` | string | No | Required if appFee set |
| `integratorId` | string | No | 2-byte hex identifier (e.g. `"0xdead"`) |
| `slippage` | string/float | No | `"auto"` (default) or 0-1 decimal |
| `refundAddress` | string | No | Defaults to depositor |
| `refundOnOrigin` | boolean | No | Control refund location |
| `excludeSources` | array | No | Sources to exclude |
| `includeSources` | array | No | Sources to include |

### Deposit Status Values

| Status | Meaning |
|---|---|
| `filled` | Complete, funds received on destination |
| `pending` | Not yet filled |
| `expired` | Won't be filled, eligible for refund |
| `refunded` | Expired deposit refunded on origin chain |
| `slowFillRequested` | No relayer filled; Across fills without relayer capital |

### Caching Policy

Across explicitly requests **no caching** of `/swap/approval` and `/suggested-fees` responses. Only `/deposit/status` can be cached (it's stateful). We should use a minimal/no cache for quote requests.

### Error Response Format

```json
{
  "type": "string",
  "code": "string",
  "status": 400,
  "message": "human-readable description",
  "id": "unique error identifier"
}
```

---

## 2. Supported Chains & Overlap

### Across Mainnet Chains (23 total)

| Chain | Chain ID | In ShapeShift? |
|---|---|---|
| Arbitrum | 42161 | **YES** |
| Base | 8453 | **YES** |
| Blast | 81457 | No |
| BNB Smart Chain | 56 | **YES** |
| Ethereum | 1 | **YES** |
| HyperEVM | 999 | **YES** |
| Ink | 57073 | No |
| Lens | 232 | No |
| Linea | 59144 | No |
| Lisk | 1135 | No |
| MegaETH | 4326 | No |
| Mode | 34443 | No |
| Monad | 143 | **YES** |
| Optimism | 10 | **YES** |
| Plasma | 9745 | **YES** |
| Polygon | 137 | **YES** |
| Scroll | 534352 | No |
| Soneium | 1868 | No |
| Solana | 34268394551451 | **YES** |
| Unichain | 130 | No |
| World Chain | 480 | No |
| zkSync | 324 | No |
| Zora | 7777777 | No |

### Overlapping Chains: 10

1. Ethereum (1)
2. Arbitrum (42161)
3. Base (8453)
4. BNB Smart Chain (56)
5. Optimism (10)
6. Polygon (137)
7. HyperEVM (999)
8. Monad (143)
9. Plasma (9745)
10. Solana (34268394551451)

### Notes

- Across supports Solana but uses a custom chain ID (`34268394551451`), not standard. ShapeShift uses CAIP-2 format (`solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp`). Need a mapping.
- Across does NOT support: Gnosis, Avalanche, Bitcoin, Tron, Sui, NEAR, Starknet, TON, Katana, or any UTXO/Cosmos chains.
- ShapeShift chains NOT in Across: Gnosis, Avalanche, Bitcoin, Bitcoin Cash, Litecoin, Dogecoin, Zcash, Cosmos, Thorchain, Mayachain, Binance, Tron, Sui, NEAR, Starknet, TON, Katana.

---

## 3. Affiliate / Integrator Fees

### Fee Format: DECIMAL PERCENTAGE (NOT basis points)

**CRITICAL:** Across uses `appFee` as a **decimal percentage from 0 to 1**, NOT basis points.

| Desired Fee | `appFee` value | Basis Points Equivalent |
|---|---|---|
| 0.01% | `0.0001` | 1 bps |
| 0.1% | `0.001` | 10 bps |
| 1% | `0.01` | 100 bps |
| 5% | `0.05` | 500 bps |

**Conversion from our internal basis points:**
```typescript
const appFee = affiliateBps / 10000 // e.g. 66 bps → 0.0066
```

### Fee Payout Mechanics

- `appFee`: decimal percentage (0-1)
- `appFeeRecipient`: address on the **destination chain** that receives the fee
- Fee is paid in the **output token** on the **destination chain**
- Fee is deducted from the output amount (user receives less)

### Fee Visibility in Response

The `/swap/approval` response includes detailed fee breakdown:

```json
{
  "fees": {
    "total": {
      "amount": "string",
      "amountUsd": "string",
      "pct": "string",
      "details": {
        "app": { "amount", "amountUsd", "pct", "token" },
        "bridge": {
          "details": {
            "lp": { "amount", "pct" },
            "relayerCapital": { "amount", "pct" },
            "destinationGas": { "amount", "pct" }
          }
        },
        "swapImpact": { "amount", "amountUsd", "pct" }
      }
    }
  }
}
```

### Important: Per-Chain Treasury Recipient

Since `appFeeRecipient` receives fees on the **destination chain**, we MUST use per-chain treasury addresses. Use the existing `getTreasuryAddressFromChainId(buyAsset.chainId)` helper from `@shapeshiftoss/utils`.

---

## 4. SDK vs REST API

### Option A: `@across-protocol/app-sdk`

| Aspect | Details |
|---|---|
| Version | `0.4.4` (pre-1.0) |
| Last published | Nov 11, 2025 (~3 months ago) |
| Runtime deps | Zero |
| Peer deps | `viem ^2.31.2` (we have `2.40.3`, compatible) |
| Bundle size | ~845 KB unpacked |
| TypeScript | Yes, 99.3% TS |
| License | **Ambiguous: MIT in package.json, AGPL-3.0 in repo LICENSE** |

**What the SDK actually does:**
- Wraps the same REST endpoints (`/swap/approval`, `/suggested-fees`, etc.)
- Adds `executeQuote()` lifecycle orchestrator (approve → deposit → fill with progress callbacks)
- `waitForFillTx()` watches on-chain contract events via viem (more real-time than REST polling)
- `buildMulticallHandlerMessage()` for cross-chain actions
- Zod validation of API responses
- Singleton client pattern (`createAcrossClient` / `getAcrossClient`)

**Pros:**
- Zero runtime deps, types included, Zod validation
- `waitForFillTx` gives real-time fill detection via on-chain events
- Small, tree-shakeable

**Cons:**
- License ambiguity (MIT vs AGPL-3.0 — needs clarification from Risk Labs)
- Pre-1.0, modest activity (3 months since last publish)
- Singleton pattern doesn't match our swapper architecture
- `executeQuote` orchestrator is the main value-add but we'd never use it — we have our own execution pipeline via chain adapters
- We'd mainly use it for types only

### Option B: Raw REST API (Relay pattern)

**Pros:**
- Consistent with existing swappers (Relay, Chainflip, ZRX, CowSwap, Portals, etc.)
- Full control over execution flow, error handling, retries
- No license concerns
- `/swap/approval` returns ready-to-execute calldata — same pattern as Relay
- `/deposit/status` gives simple polling-based status tracking
- Across is primarily EVM — types are simpler than Relay (no UTXO/Solana/Tron variants)

**Cons:**
- Need to write our own types (~200-300 lines, comparable to Relay's `types.ts`)
- No Zod validation (but we don't use it for other swappers either)
- Status polling via REST has ~10s indexer cadence vs SDK's on-chain event watching

### Recommendation

**REST API (Option B)** — matches every other swapper in the codebase. The SDK's main value-add (`executeQuote` orchestrator) is something we'd never use. We'd essentially import the SDK just for types, which doesn't justify the dependency + license risk. Worth looking at the SDK source for type inspiration though.

If the license is confirmed MIT, we could reconsider for `waitForFillTx` (better UX for fill detection), but that's a nice-to-have optimization, not a blocker.

---

## 5. Types & Response Shapes

### `/swap/approval` Response (Main Quote Type)

```typescript
type AcrossSwapApprovalResponse = {
  crossSwapType: 'bridgeableToBridgeable' | 'bridgeableToBridgeableIndirect' | 'bridgeableToAny' | 'anyToBridgeable' | 'anyToAny'
  amountType: string

  // Executable transactions
  approvalTxns: Array<{
    chainId: number
    to: string
    data: string
  }>
  swapTx: {
    simulationSuccess: boolean
    chainId: number
    to: string
    data: string
    gas: string
    maxFeePerGas: string
    maxPriorityFeePerGas: string
  }

  // Balance/allowance checks
  checks: {
    allowance: { token: string; spender: string; actual: string; expected: string }
    balance: { token: string; actual: string; expected: string }
  }

  // Route steps
  steps: {
    originSwap?: SwapStep
    bridge: BridgeStep
    destinationSwap?: SwapStep
  }

  // Token info
  inputToken: TokenInfo
  outputToken: TokenInfo
  refundToken: TokenInfo

  // Amounts
  inputAmount: string
  maxInputAmount: string
  expectedOutputAmount: string
  minOutputAmount: string

  // Fees (detailed breakdown)
  fees: {
    total: FeeBreakdown
    totalMax: FeeBreakdown
    originGas: { amount: string; amountUsd: string; token: TokenInfo }
  }

  expectedFillTime: number // seconds
  quoteExpiryTimestamp: number
  id: string
}

type TokenInfo = {
  address: string
  decimals: number
  symbol: string
  name: string
  chainId: number
}

type SwapStep = {
  tokenIn: TokenInfo
  tokenOut: TokenInfo
  inputAmount: string
  outputAmount: string
  minOutputAmount: string
  maxInputAmount: string
  swapProvider: { name: string; sources: string[] }
  slippage: number
}

type BridgeStep = {
  inputAmount: string
  outputAmount: string
  tokenIn: TokenInfo
  tokenOut: TokenInfo
  fees: {
    amount: string
    pct: string
    token: TokenInfo
    details: {
      type: 'across'
      relayerCapital: FeePart
      destinationGas: FeePart
      lp: FeePart
    }
  }
  provider: string
}

type FeePart = { amount: string; pct: string; token: TokenInfo }

type FeeBreakdown = {
  amount: string
  amountUsd: string
  token: TokenInfo
  pct: string
  details: {
    type: string
    swapImpact: { amount: string; amountUsd: string; token: TokenInfo; pct: string }
    app: { amount: string; amountUsd: string; pct: string; token: TokenInfo }
    bridge: BridgeStep['fees']
  }
}
```

### `/deposit/status` Response

```typescript
type AcrossDepositStatus = {
  status: 'filled' | 'pending' | 'expired' | 'refunded' | 'slowFillRequested'
  fillTxnRef?: string // only if status === 'filled'
  destinationChainId: number
  originChainId: number
  depositId: number
  depositTxnRef: string
  depositRefundTxnRef?: string
  actionsSucceeded?: boolean
  pagination: { currentIndex: number; maxIndex: number }
}
```

### `/suggested-fees` Response (Lower-level)

```typescript
type AcrossSuggestedFees = {
  totalRelayFee: { pct: string; total: string } // pct scaled by 1e18 (1% = 1e16)
  relayerCapitalFee: { pct: string; total: string }
  relayerGasFee: { pct: string; total: string }
  lpFee: { pct: string; total: string }
  timestamp: string
  isAmountTooLow: boolean
  quoteBlock: string
  spokePoolAddress: string
  exclusiveRelayer: string
  exclusivityDeadline: string
  expectedFillTimeSec: string
  fillDeadline: string
  limits: {
    minDeposit: string
    maxDeposit: string
    maxDepositInstant: string
    maxDepositShortDelay: string
    recommendedDepositInstant: string
  }
}
```

### Error Response

```typescript
type AcrossError = {
  type: string
  code: string
  status: number
  message: string
  id: string
}
```

### Notes on Fee Percentage Formats

**Two different formats depending on endpoint:**

| Endpoint | Fee Format | Example for 1% |
|---|---|---|
| `/swap/approval` (`appFee` param) | Decimal percentage (0-1) | `0.01` |
| `/swap/approval` response (`fees.*.pct`) | String decimal | `"0.01"` |
| `/suggested-fees` response (`*.pct`) | Scaled by 1e18 | `"10000000000000000"` |

Be careful not to mix these up. The Swap API uses human-readable decimals. The Suggested Fees API uses 1e18-scaled values.

---

## 6. Registration & Access Requirements

### Integrator ID Registration (BLOCKER)

**Registration form:** https://docs.google.com/forms/d/e/1FAIpQLSe-HY6mzTeGZs91HxObkQmwkMQuH7oy8ngZ1ROiu-f4SR4oMw/viewform

- Required before production deployment
- You receive a **2-byte hex string** (e.g. `"0xdead"`) as your integrator ID
- Passed as `integratorId` query parameter on API calls
- You can start building before receiving the ID — just add it later
- Registration also enables "co-marketing efforts" with Across team

### Access Model

- The API appears to be **open for development** (no auth headers, no API keys)
- The integrator ID is the only "gating" mechanism, and it's optional for development
- No IP whitelisting mentioned
- No rate limits documented (but "don't cache" policy suggests they expect reasonable usage)
- Testnet available at `https://testnet.across.to/api` for testing

### What to Do

1. **Fill out the form NOW** — it's a blocker for production
2. Development can proceed in parallel using the API without an integrator ID
3. Once received, add the ID as an env var (e.g. `VITE_ACROSS_INTEGRATOR_ID`)

---

## 7. Brand Assets / Press Kit

### Available Assets

| Asset | Variants | Formats | Use Case |
|---|---|---|---|
| Logotype (full wordmark) | Aqua, Dark, Gradient | SVG, PNG | Marketing only (gradient) |
| Logomark (circle symbol) | Aqua, Dark | SVG, PNG | **App icon, token icon** |
| "Powered By Across" | Black, White | SVG, PNG | Attribution badges |

### Brand Assets Page

https://docs.across.to/user-docs/additional-info/across-brand-assets

### For Our App

Use the **Logomark (Aqua Circle)** SVG — it's explicitly noted as suitable "for Apps and as a Token Icon."

Download URL (Primary Aqua Symbol SVG):
```
https://3563890891-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2Fo33kX1T6RRp4inOcEH1d%2Fuploads%2FvmOkOcLgbiXv7hVNSlNT%2FAcross%20Logomark%20Aqua%20Circle.svg?alt=media&token=b63972b2-174f-4ee8-9a58-08fb8792cd17
```

We'll need to download this and add it to `src/assets/` or wherever swapper icons live in the codebase.

---

## 8. Feature Flag & Env Vars Plan

Following the existing pattern (see Relay as reference):

### Environment Variables

| Variable | Type | Default | Description |
|---|---|---|---|
| `VITE_FEATURE_SWAPPER_ACROSS` | boolean | `false` | Feature flag to enable/disable |
| `VITE_ACROSS_API_URL` | url | `https://app.across.to/api` | API base URL |
| `VITE_ACROSS_INTEGRATOR_ID` | string | `""` | 2-byte hex integrator ID (e.g. `"0xdead"`) |

### Files to Update

1. **`src/config.ts`** — Add env var validation:
   ```typescript
   VITE_FEATURE_SWAPPER_ACROSS: bool({ default: false }),
   VITE_ACROSS_API_URL: url({ default: 'https://app.across.to/api' }),
   VITE_ACROSS_INTEGRATOR_ID: str({ default: '' }),
   ```

2. **`src/state/slices/preferencesSlice/preferencesSlice.ts`** — Add to FeatureFlags type + initial state

3. **`src/test/mocks/store.ts`** — Add mock value

4. **`.env`**, **`.env.development`**, **`.env.production`** — Set appropriate values

5. **`src/state/helpers.ts`** — Add swapper enablement logic:
   ```typescript
   [SwapperName.Across]: AcrossSwapper && (!isCrossAccountTrade || isCrossAccountTradeSupported(SwapperName.Across)),
   ```

---

## 9. Treasury Addresses (Per-Chain)

Across pays fees on the **destination chain** in the **output token**. We need per-chain treasury addresses.

Existing treasury addresses from `@shapeshiftoss/utils` (`packages/utils/src/treasury.ts`):

| Chain | Treasury Address | Across Support? |
|---|---|---|
| Ethereum | `0x90a48d5cf7343b08da12e067680b4c6dbfe551be` | YES |
| Optimism | `0x6268d07327f4fb7380732dc6d63d95F88c0E083b` | YES |
| Polygon | `0xB5F944600785724e31Edb90F9DFa16dBF01Af000` | YES |
| BNB Smart Chain | `0x8b92b1698b57bEDF2142297e9397875ADBb2297E` | YES |
| Arbitrum | `0x38276553F8fbf2A027D901F8be45f00373d8Dd48` | YES |
| Base | `0x9c9aA90363630d4ab1D9dbF416cc3BBC8d3Ed502` | YES |
| Solana | `Bh7R3MeJ98D7Ersxh7TgVQVQUSmDMqwrFVHH9DLfb4u3` | YES |
| Gnosis | `0xb0E3175341794D1dc8E5F02a02F9D26989EbedB3` | Not in Across |
| Avalanche | `0x74d63F31C2335b5b3BA7ad2812357672b2624cEd` | Not in Across |
| Bitcoin | `bc1qr2whxtd0gvq...` | Not in Across |
| Starknet | `0x052a1132ea4db8...` | Not in Across |

### Missing Treasury Addresses for Across Chains

We have treasury addresses for all overlapping EVM chains. For Monad, HyperEVM, and Plasma — these are newer chains and may not have treasury addresses yet. Need to check with the team or add them to `treasury.ts`.

### Usage Pattern

```typescript
import { getTreasuryAddressFromChainId } from '@shapeshiftoss/utils'

// In Across quote request:
const appFeeRecipient = getTreasuryAddressFromChainId(buyAsset.chainId)
const appFee = affiliateBps / 10000 // Convert bps → decimal percentage
```

---

## 10. Comparison with Relay

| Aspect | Relay | Across |
|---|---|---|
| **API Style** | REST (POST `/quote/v2`) | REST (GET `/swap/approval`) |
| **HTTP Method** | POST with JSON body | GET with query params |
| **Returns Calldata** | Yes (per step) | Yes (`swapTx` + `approvalTxns`) |
| **Fee Format** | Basis points (integer) | Decimal percentage (0-1 float) |
| **Fee Recipient** | Hardcoded `DAO_TREASURY_BASE` | Per-chain via `appFeeRecipient` |
| **Fee Paid In** | Output token | Output token |
| **Status Endpoint** | `GET /intents/status/v2?requestId=` | `GET /deposit/status?depositTxnRef=` |
| **Status Values** | success/failed/pending/refund/delayed/waiting | filled/pending/expired/refunded/slowFillRequested |
| **Tx Notification** | `POST /transactions/single` (optional, helps indexing) | Not needed |
| **Supported Chains** | 14 (EVM + BTC + Solana + Tron) | 23 (mostly EVM + Solana) |
| **UTXO Support** | Yes (Bitcoin) | No |
| **Non-EVM** | BTC, Solana, Tron | Solana only |
| **Max Steps** | 2 (rejects 3+) | N/A (single `swapTx`) |
| **Cache** | 15s via axios-cache-interceptor | No caching allowed |
| **Auth** | None (open API) | Integrator ID (for prod) |
| **SDK Available** | No official SDK | Yes (`@across-protocol/app-sdk`) |
| **Registration Required** | No | Yes (Google Form) |

### Key Differences

1. **Simpler execution model** — Across returns a single `swapTx` object vs Relay's multi-step `steps[].items[]` approach. No need to handle UTXO PSBTs, Solana instructions, or Tron transactions.
2. **GET vs POST** — Across uses GET with query params. Relay uses POST with JSON body.
3. **Fee format** — MUST convert our basis points to decimal percentage for Across. `affiliateBps / 10000`.
4. **No tx notification needed** — Relay benefits from calling `/transactions/single` after broadcast. Across doesn't need this.
5. **Status tracking is simpler** — Just poll with the deposit tx hash, no separate `requestId` to track.

---

## 11. Implementation Plan

### File Structure

```
packages/swapper/src/swappers/AcrossSwapper/
├── AcrossSwapper.ts                  # Main swapper export
├── endpoints.ts                      # SwapperApi (getTradeQuote, getTradeRate, checkTradeStatus)
├── constant.ts                       # Chain mappings, API URL, error codes
├── index.ts                          # Package export
├── getTradeQuote/
│   └── getTradeQuote.ts             # Quote request handler
├── getTradeRate/
│   └── getTradeRate.ts              # Rate request handler
└── utils/
    ├── types.ts                      # Across-specific types
    ├── getTrade.ts                   # Core quote/rate logic
    ├── fetchAcrossTrade.ts           # GET /swap/approval
    ├── acrossService.ts              # Axios instance (no cache per their policy)
    └── acrossTokenToAssetId.ts       # Convert Across token → AssetId
```

### Implementation Steps

1. **Register for integrator ID** (blocker for production)
2. **Add feature flag + env vars** (config.ts, preferencesSlice, .env files)
3. **Download and add Across icon** to swapper assets
4. **Add `SwapperName.Across`** to swapper types
5. **Create chain ID mapping** (ShapeShift CAIP-2 → Across chain IDs)
6. **Implement types** (~200-300 lines based on API response shapes above)
7. **Implement `acrossService.ts`** — Axios instance with NO cache
8. **Implement `fetchAcrossTrade.ts`** — GET `/swap/approval` with proper params
9. **Implement `getTrade.ts`** — Core logic mapping our types → Across params → our trade quote
10. **Implement `getTradeQuote.ts` + `getTradeRate.ts`** — Thin wrappers around `getTrade.ts`
11. **Implement `endpoints.ts`** — SwapperApi with `checkTradeStatus` polling `/deposit/status`
12. **Register swapper** in `packages/swapper/src/constants.ts`
13. **Add swapper enablement logic** in `src/state/helpers.ts`
14. **Test end-to-end** under feature flag

---

## 12. Decisions Made

| Decision | Choice | Rationale |
|---|---|---|
| **SDK vs REST** | REST API | Consistent with all other swappers, SDK's main value-add conflicts with our execution pipeline, license ambiguity |
| **Solana** | **Include** | Swap API DOES support Solana (docs were outdated). EVM→Solana is pure EVM tx. Solana→EVM returns base64 tx (simpler than Relay). 34 tokens supported. No dest swaps on Solana yet. |
| **Chains without treasury** | Support without fees | Monad/HyperEVM/Plasma supported but no `appFee` param sent (skip affiliate fees) |
| **Fee recipient** | Per-chain treasury | Use `getTreasuryAddressFromChainId(buyAsset.chainId)`, graceful fallback for chains without treasury |
| **All overlapping chains** | Yes, all 10 | Support every chain where ShapeShift and Across overlap |

---

## 13. Open Questions & Blockers

### Blockers

- [ ] **Register for integrator ID** — https://docs.google.com/forms/d/e/1FAIpQLSe-HY6mzTeGZs91HxObkQmwkMQuH7oy8ngZ1ROiu-f4SR4oMw/viewform

### Resolved Questions

1. **Solana execution model** — **INVESTIGATED via live curls: Swap API DOES support Solana** (docs/blog were outdated). See Section 14 for full details. EVM→Solana returns EVM calldata (no Solana code needed). Solana→EVM returns base64 Solana tx in `swapTx.data` with `ecosystem: "svm"`. No destination swaps on Solana yet. 34 tokens supported.
2. **Cross-account trades** — `recipient` param exists on `/swap/approval`, so cross-account works for EVM chains.
3. **Slippage** — Across supports `"auto"` slippage (default) or a manual decimal (0-1). Our auto-slippage maps to their `"auto"`.
4. **Quote expiry** — Response includes `quoteExpiryTimestamp`. We should respect this and re-fetch if expired.
5. **`slowFillRequested` status** — Unique to Across (no relayer fills, protocol fills directly). Display as "processing" state with "Taking longer than usual" message.
6. **Treasury addresses for Monad/HyperEVM/Plasma** — Not a blocker; skip affiliate fees on these chains until treasury addresses are deployed.

---

## 14. Solana Deep Dive — Different Integration Path

### Critical Finding — Docs Were Outdated, Swap API DOES Support Solana

Despite the blog post saying "Solana is on the roadmap", **live API testing proves the Swap API fully supports Solana now.** Here's what we found via actual curl requests:

### Live API Test Results

**Test 1: EVM → Solana (ETH USDC → Solana USDC)**
- `GET /swap/approval` with `originChainId=1, destinationChainId=34268394551451`
- **WORKS.** Returns EVM calldata (`swapTx.ecosystem: "evm"`, `swapTx.chainId: 1`)
- User signs an EVM tx on origin chain. Across handles Solana delivery.
- `crossSwapType: "bridgeableToBridgeable"`

**Test 2: Solana → EVM (Solana USDC → ETH USDC)**
- `GET /swap/approval` with `originChainId=34268394551451, destinationChainId=1`
- **WORKS.** Returns Solana transaction data (`swapTx.ecosystem: "svm"`, `swapTx.chainId: 34268394551451`)
- `swapTx.data` is a **base64-encoded Solana transaction** (NOT EVM calldata)
- `swapTx.to` is `DLv3NggMiSaef97YCkew5xKUHDh13tVGZ7tydt3ZeAru` (SVM SpokePool program)
- `simulationSuccess: false` (expected — test used a dummy depositor)
- `crossSwapType: "bridgeableToBridgeable"`

**Test 3: EVM → Solana (ETH native → Solana USDC, with origin swap)**
- **WORKS.** Returns EVM calldata with origin swap step.
- `crossSwapType: "anyToBridgeable"`, `swapTx.ecosystem: "evm"`

**Test 4: EVM → Solana (ETH native → Solana SOL, destination swap needed)**
- **FAILS.** Error: `"Destination swaps are not supported yet for routes involving Solana."`
- This means: bridgeable→bridgeable and any→bridgeable work, but **no destination-side swaps on Solana**

**Test 5: Token support**
- `/swap/tokens` returns **34 Solana tokens** including SOL, USDC, USDT, cbBTC, JUP, BONK, PENGU, RAY, JitoSOL, JupSOL, WBTC, ETH (Portal), and various others. Way beyond just USDC.

### Solana Support Matrix

| Route | Works? | `swapTx.ecosystem` | Notes |
|---|---|---|---|
| EVM → Solana (bridgeable→bridgeable) | **YES** | `evm` | User signs EVM tx |
| EVM → Solana (any→bridgeable) | **YES** | `evm` | Origin swap + bridge |
| EVM → Solana (any→any, dest swap) | **NO** | — | "Destination swaps not supported for Solana" |
| Solana → EVM (bridgeable→bridgeable) | **YES** | `svm` | User signs **Solana tx** (base64) |
| Solana → EVM (any→any) | **Untested** | likely `svm` | Probably works if origin is bridgeable |

### Key Implementation Details for Solana

1. **`swapTx.ecosystem` field** — This is the discriminator. When `"evm"`, the `data` field is hex calldata. When `"svm"`, the `data` field is a **base64-encoded Solana transaction**.

2. **For EVM → Solana routes:** Execution is identical to EVM→EVM. The user signs an EVM transaction. Across handles the Solana delivery via relayers. No Solana-specific code needed on our end for this direction.

3. **For Solana → EVM routes:** The `swapTx.data` is a base64 Solana transaction targeting the SVM SpokePool program (`DLv3NggMiSaef97YCkew5xKUHDh13tVGZ7tydt3ZeAru`). We need to:
   - Decode the base64 string into a Solana `Transaction` or `VersionedTransaction`
   - Sign it with the user's Solana wallet
   - Submit to Solana RPC

4. **`recipient` parameter** — When destination is Solana, pass a Solana Pubkey (base58). When destination is EVM, pass an EVM address. The API handles the format.

5. **Allowance/approval** — For Solana→EVM, the `checks.allowance.spender` is the SVM SpokePool program. The `approvalTxns` array should contain Solana approve instructions if needed.

### How Relay Handles Solana (for comparison)

Relay returns `RelayQuoteSolanaItemData` with:
```typescript
{ instructions: RelaySolanaInstruction[], addressLookupTableAddresses: string[] }
```
We then construct a `VersionedTransaction` from these instructions.

Across takes a different approach — they return a **complete serialized Solana transaction** as base64 in `swapTx.data`. This is simpler from our perspective: just decode, sign, submit. No instruction assembly needed.

### Revised Assessment

**Solana IS supported by the Swap API** and is actually simpler than expected:
- EVM → Solana: No Solana code needed (pure EVM tx)
- Solana → EVM: Decode base64 tx, sign, submit (simpler than Relay's instruction assembly)
- Limitation: No destination swaps on Solana yet (can't do ETH→SOL, only ETH→USDC on Solana)
- 34 Solana tokens supported in the token list

**Chain count: 10 (9 EVM + Solana)**

---

## 15. Codebase Pattern Deep Dive

### Route Filtering

**No pre-filtering at startup.** Swappers don't call external APIs to discover available routes. Instead:
1. Upstream: Feature flags enable/disable swappers via `getEnabledSwappers()` in `src/state/helpers.ts`
2. Downstream: Each swapper validates pairs at quote time. If no route → return `TradeQuoteError.UnsupportedTradePair`
3. Generic utils exist: `filterCrossChainEvmBuyAssetsBySellAssetId()` and `filterSameChainEvmBuyAssetsBySellAssetId()` in `packages/swapper/src/swappers/utils/`

**For Across:** Use the existing pattern — define a `chainIdToAcrossChainId` mapping (like Relay's `chainIdToRelayChainId`), filter by supported chains, let the API return errors for unsupported pairs. No need to call `/available-routes` at startup.

### Same-Chain Swaps

**Confirmed NOT supported by Across.** Live curl test returned:
```json
{ "message": "Failed to fetch swap quote: No bridge routes found for 1 -> 1" }
```
Across is cross-chain only. Use `filterCrossChainEvmBuyAssetsBySellAssetId()` helper.

### Approval Flow

**Pattern:** Swappers return `allowanceContract` in `TradeQuoteStep`. The app handles approvals via the standard chain adapter flow — no swapper-specific approval logic needed.

**For Across:** Set `allowanceContract` to the `checks.allowance.spender` value from the API response (e.g., `0x5c7BCd6E7De5423a257D81B442095A1a6ced35C5` which is the Across SpokePool on Ethereum). This is the same pattern as Bebop (`quote.approvalTarget`) and Portals (`target`).

### Solana Transaction Signing

**Existing pattern (Jupiter/Relay):** Both swappers store `TransactionInstruction[]` + `addressLookupTableAddresses` in `solanaTransactionMetadata`. At execution time:
1. `getUnsignedSolanaTransaction()` extracts instructions from metadata
2. `adapter.getFeeData()` computes compute units + priority fees
3. `adapter.buildSendApiTransaction()` serializes into `SolanaSignTx`
4. `executeSolanaTransaction()` → `signAndBroadcastTransaction()` (wallet callback)

**Key difference:** Jupiter/Relay return individual instructions (Jupiter: base64 data, Relay: hex data). **Across returns a full base64-encoded serialized transaction** in `swapTx.data`.

**Approach for Across Solana→EVM:**
- Option A: Deserialize the base64 tx into a `VersionedTransaction`, extract instructions, feed into existing pipeline
- Option B: Skip instruction extraction, directly pass the serialized tx to the wallet for signing (would need a slightly different path)
- **Recommendation: Option A** — deserialize to instructions to stay consistent with Jupiter/Relay pattern. Use `VersionedTransaction.deserialize()` then extract `.message.compiledInstructions`.

---

## Sources

- [Across Documentation](https://docs.across.to)
- [API Reference](https://docs.across.to/reference/api-reference)
- [Swap API Introduction](https://docs.across.to/developer-quickstart/introduction-to-swap-api)
- [Crosschain Swap Guide](https://docs.across.to/developer-quickstart/crosschain-swap)
- [Fees in the System](https://docs.across.to/reference/fees-in-the-system)
- [Supported Chains](https://docs.across.to/reference/supported-chains)
- [Brand Assets](https://docs.across.to/user-docs/additional-info/across-brand-assets)
- [App SDK (npm)](https://www.npmjs.com/package/@across-protocol/app-sdk)
- [Toolkit (GitHub)](https://github.com/across-protocol/toolkit)
- [Registration Form](https://docs.google.com/forms/d/e/1FAIpQLSe-HY6mzTeGZs91HxObkQmwkMQuH7oy8ngZ1ROiu-f4SR4oMw/viewform)
