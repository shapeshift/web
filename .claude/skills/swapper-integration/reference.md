# Swapper Integration Reference

General patterns and architecture knowledge for ShapeShift swapper integrations.

## Swapper Architecture Overview

ShapeShift Web uses a unified interface for all swap providers. Each swapper implements two interfaces:

1. **`Swapper`**: Execution methods (how to execute transactions)
2. **`SwapperApi`**: Data methods (how to get quotes, rates, fees, status)

These are combined and registered in `packages/swapper/src/constants.ts`.

## Swapper Types

### 1. EVM Single-Hop (Most Common)

**Characteristics:**
- Swaps on a single EVM chain (no cross-chain)
- One transaction to execute
- Standard ERC20 approvals (or Permit2)
- Sign transaction execution

**Examples**: BebopSwapper, ZrxSwapper, PortalsSwapper (same-chain mode)

**Use this pattern when**: Your swapper operates on EVM chains (Ethereum, Polygon, Arbitrum, etc.) and doesn't do cross-chain swaps.

---

### 2. Gasless / Order-Based

**Characteristics:**
- User signs a **message**, not a transaction
- No gas fees at execution time
- Order is submitted to API/relayer
- Returns `orderUid` instead of `txHash`

**Examples**: CowSwapper

**Key differences:**
- Implements `executeEvmMessage` instead of `executeEvmTransaction`
- Implements `getUnsignedEvmMessage` instead of `getUnsignedEvmTransaction`
- `getEvmTransactionFees` returns '0'
- Special status checking (polls for order status, not tx status)

**Use this pattern when**: Your swapper uses order book / relayer model with gasless execution.

---

### 3. Solana-Only

**Characteristics:**
- Operates on Solana blockchain
- Different transaction structure (instructions, ALTs)
- Account creation fees
- Compute unit calculations

**Examples**: JupiterSwapper

**Key differences:**
- Implements `executeSolanaTransaction`
- Uses `solanaTransactionMetadata`
- Different fee calculations
- Account lookup tables (ALTs)

**Use this pattern when**: Your swapper is Solana-specific.

---

### 4. Cross-Chain / Multi-Hop

**Characteristics:**
- Can swap between different blockchains
- May require 2+ steps (multi-hop)
- Different adapters for different chains
- More complex fee calculations

**Examples**: ThorchainSwapper, ChainflipSwapper, PortalsSwapper (cross-chain mode)

**Key differences:**
- May return `MultiHopTradeQuoteSteps` (2 steps)
- Different chain adapters needed
- May involve deposit addresses
- Cross-chain fee calculations

**Use this pattern when**: Your swapper bridges or swaps across different blockchains.

---

### 5. Bridge-Specific

**Characteristics:**
- Focus on bridging assets, not swapping
- Often 1:1 rate (or close to it)
- May have different source/destination chains

**Examples**: ArbitrumBridgeSwapper, RelaySwapper

**Use this pattern when**: Your integration is primarily a bridge, not a DEX.

---

## Universal Patterns

These patterns apply to **ALL** swappers:

### 1. Monadic Error Handling

All functions return `Result<T, SwapErrorRight>`:

```typescript
import { Err, Ok } from '@sniptt/monads'
import { makeSwapErrorRight } from '../../../utils'
import { TradeQuoteError } from '../../../types'

// On error
return Err(
  makeSwapErrorRight({
    message: 'Description of what went wrong',
    code: TradeQuoteError.SomeError,
    details: { optional: 'context' }
  })
)

// On success
return Ok(result)
```

**Never throw errors** - always return `Err()`.

### 2. Service Layer Pattern

All swappers use monadic HTTP service:

```typescript
import { createCache, makeSwapperAxiosServiceMonadic } from '../../../utils'
import axios from 'axios'

const axiosConfig = {
  timeout: 10000,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'x-api-key': apiKey, // Or whatever header needed
  },
}

const serviceBase = createCache(maxAge, cachedUrls, axiosConfig)
export const xyzService = makeSwapperAxiosServiceMonadic(serviceBase)

// Usage
const maybeResponse = await xyzService.get<ResponseType>(url, { params })
if (maybeResponse.isErr()) return Err(maybeResponse.unwrapErr())
const { data } = maybeResponse.unwrap()
```

### 3. SwapperApi Interface

All swappers must implement:

```typescript
export const xyzApi: SwapperApi = {
  getTradeQuote: async (input, deps) => {
    const result = await getTradeQuote(input, deps)
    return result.map(quote => [quote]) // Wrap in array
  },

  getTradeRate: async (input, deps) => {
    const result = await getTradeRate(input, deps)
    return result.map(rate => [rate])
  },

  checkTradeStatus: async (input) => {
    // For EVM: checkEvmSwapStatus
    // For Solana: checkSolanaSwapStatus
    // For custom: implement your own polling
  },

  // EVM swappers also need:
  getUnsignedEvmTransaction: async (args) => { /* ... */ },
  getEvmTransactionFees: async (args) => { /* ... */ },
}
```

### 4. Swapper Interface

Most swappers use standard execution:

```typescript
import { executeEvmTransaction } from '../../utils'

export const xyzSwapper: Swapper = {
  executeEvmTransaction, // From utils - standard implementation
}
```

**Exception**: CowSwap implements custom `executeEvmMessage`.

### 5. TradeQuoteStep Structure

Every step must include:

```typescript
{
  buyAmountBeforeFeesCryptoBaseUnit: string
  buyAmountAfterFeesCryptoBaseUnit: string
  sellAmountIncludingProtocolFeesCryptoBaseUnit: string
  feeData: {
    protocolFees: Record<string, string>
    networkFeeCryptoBaseUnit: string
  }
  rate: string
  source: SwapSource
  buyAsset: Asset
  sellAsset: Asset
  accountNumber: number | undefined
  allowanceContract: string | undefined
  estimatedExecutionTimeMs: number | undefined

  // Swapper-specific metadata (pick one):
  xyzTransactionMetadata?: { ... }
}
```

### 6. Rate Calculation

Standard rate calculation pattern:

```typescript
import { getInputOutputRate } from '../../../utils'

const rate = getInputOutputRate({
  sellAmountCryptoBaseUnit,
  buyAmountCryptoBaseUnit,
  sellAsset,
  buyAsset,
})
```

OR if custom:

```typescript
import { convertPrecision, bn } from '@shapeshiftoss/utils'

const rate = convertPrecision({
  value: buyAmount,
  inputExponent: buyAsset.precision,
  outputExponent: sellAsset.precision,
})
  .dividedBy(bn(sellAmount))
  .toFixed()
```

---

## Common Implementation Variations

### Approval Contracts

**Standard ERC20 Approval**:
```typescript
allowanceContract: isNativeEvmAsset(sellAsset.assetId)
  ? undefined
  : SOME_CONTRACT_ADDRESS
```

**Permit2** (Zrx only currently):
```typescript
import { PERMIT2_CONTRACT } from '@shapeshiftoss/contracts'

allowanceContract: isNativeEvmAsset(sellAsset.assetId) || isWrappedNative
  ? undefined
  : PERMIT2_CONTRACT

permit2Eip712: permit2Data as unknown as TypedData | undefined
```

**No Approval Needed**:
```typescript
allowanceContract: '0x0' // Or undefined
```

**API Provides Target**:
```typescript
allowanceContract: quote.approvalTarget // From API response
```

### Native Token Handling

**Some APIs use special markers** for native tokens (ETH, MATIC, BNB):
- `0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE` (common)
- `0x0000000000000000000000000000000000000000` (some APIs)
- Empty/omit field (rare)

**Pattern**:
```typescript
import { isToken } from '@shapeshiftoss/utils'
import { fromAssetId } from '@shapeshiftoss/caip'

export const NATIVE_MARKER = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'

export const assetIdToToken = (assetId: AssetId): string => {
  if (!isToken(assetId)) return NATIVE_MARKER  // Native token
  const { assetReference } = fromAssetId(assetId)
  return getAddress(assetReference)  // ERC20 token (checksummed)
}
```

**Check API documentation** to see if they use a marker.

### Dummy Address for Rates

When fetching rates without a connected wallet, **some swappers use a dummy address**:

```typescript
// Common dummy address (Vitalik's address)
export const DUMMY_ADDRESS = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045' as Address

export const fetchPrice = ({
  receiveAddress,
  ...otherParams
}) => {
  const address = (receiveAddress as Address | undefined) || DUMMY_ADDRESS

  return fetchQuote({
    takerAddress: address,
    receiverAddress: address,
    ...otherParams
  })
}
```

**Why?** Some APIs require a taker address even for price-only queries.

---

## File Structure

Standard structure (most swappers):

```
[SwapperName]Swapper/
├── index.ts                              # Exports
├── [SwapperName]Swapper.ts              # Swapper interface implementation
├── endpoints.ts                          # SwapperApi interface implementation
├── types.ts                              # TypeScript types
├── get[SwapperName]TradeQuote/
│   └── get[SwapperName]TradeQuote.ts
├── get[SwapperName]TradeRate/
│   └── get[SwapperName]TradeRate.ts
└── utils/
    ├── constants.ts                      # Supported chains, defaults
    ├── [swapperName]Service.ts           # HTTP service
    ├── fetchFrom[SwapperName].ts         # API fetch functions
    └── helpers/
        └── helpers.ts                    # Helper utilities
```

**Variations**:
- Some inline getTradeQuote/getTradeRate in endpoints.ts
- Some have swapperApi/ folder instead
- Some have additional utils (blacklist, poolAssets, etc.)

**Best practice**: Follow the structure of a similar swapper.

---

## Testing Checklist

Before considering integration complete:

**Automated checks**:
- [ ] `yarn type-check` passes
- [ ] `yarn lint` passes
- [ ] `yarn build:swapper` succeeds

**Manual testing**:
- [ ] Can fetch quote for supported chain
- [ ] Rate displays correctly
- [ ] Approval flow works (if needed)
- [ ] Can execute swap transaction
- [ ] Error handling works (bad inputs, unsupported chains, etc.)
- [ ] UI shows swapper name and icon
- [ ] Feature flag works

**Cross-swapper comparison**:
- [ ] Pricing is competitive with other swappers
- [ ] Rate vs quote delta is minimal (< 0.1%)

---

## Registration Checklist

To fully integrate a swapper:

1. **Swapper package** (`packages/swapper/src/`):
   - [ ] Created swapper directory
   - [ ] Implemented Swapper interface
   - [ ] Implemented SwapperApi interface
   - [ ] Added to `constants.ts` (SwapperName enum + swappers record)
   - [ ] Added to `index.ts` (exports)
   - [ ] Added types to `types.ts` (if needed)

2. **CSP Headers** (`headers/csps/`):
   - [ ] Added API domain to `index.ts`
   - [ ] Created `defi/swappers/[SwapperName].ts`

3. **UI** (`src/`):
   - [ ] Added swapper icon
   - [ ] Updated SwapperIcon.tsx
   - [ ] Added feature flag to preferencesSlice
   - [ ] Updated state helpers (getEnabledSwappers, isCrossAccountTradeSupported)

4. **Config**:
   - [ ] Added env vars to `.env` and `.env.development`
   - [ ] Updated `src/config.ts`
   - [ ] Updated test mocks if needed

5. **Documentation**:
   - [ ] Created INTEGRATION.md in swapper directory

---

## When to Deviate from Patterns

**Most of the time**: Follow existing patterns closely.

**Deviate only when**:
- API fundamentally requires different approach
- Swapper is unique type (gasless, Solana, etc.)
- Performance or security concerns

**Always**: Document deviations in INTEGRATION.md.

---

## Getting Help

If stuck during implementation:

1. **Search existing swappers** for similar patterns
2. **Check `@common-gotchas.md`** for known issues
3. **Read similar swapper's INTEGRATION.md**
4. **Grep codebase** for similar implementations
5. **Ask user** for clarification on API behavior
