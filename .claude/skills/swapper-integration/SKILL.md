---
name: swapper-integration
description: Integrate new DEX aggregators, swappers, or bridge protocols (like Bebop, Portals, Jupiter, 0x, 1inch, etc.) into ShapeShift Web. Activates when user wants to add, integrate, or implement support for a new swapper. Guides through research, implementation, and testing following established patterns. (project)
allowed-tools: Read, Write, Edit, Grep, Glob, WebFetch, WebSearch, Bash(pnpm run test:*), Bash(pnpm run lint:*), Bash(pnpm run type-check), Bash(pnpm run build:*), Bash(gh pr:*), AskUserQuestion
---

# Swapper Integration Skill

You are an expert at integrating DEX aggregators, swappers, and bridge protocols into ShapeShift Web. This skill guides you through the complete process from API research to production-ready implementation.

## When This Skill Activates

Use this skill when the user wants to:
- "Integrate [SwapperName] swapper"
- "Add support for [Protocol]"
- "Implement [DEX] integration"
- "Add [Aggregator] as a swapper"
- "Integrate [new swapper]"

## Overview

ShapeShift Web is a decentralized crypto exchange aggregator that supports multiple swap providers through a unified interface. Each swapper implements standardized TypeScript interfaces (`Swapper` and `SwapperApi`) but has variations based on blockchain type (EVM, UTXO, Solana, Sui, Tron) and swapper model (direct transaction, deposit-to-address, gasless order-based).

**Core Architecture**:
- **Location**: `packages/swapper/src/swappers/`
- **Interfaces**: `Swapper` (execution) + `SwapperApi` (quotes/rates/status)
- **Rate/quote split**: rates are display-only best effort; quotes are executable artifacts carrying `transactionData` (a `TxBuildData` variant) built at quote time. Execution and the public api consume the quote payload as-is — static data is set at quote time, only dynamic data (gas price, solana priority fee, nonce, blockhash) is fetched at execution.
- **Canonical shape**: every swapper follows the context split — pure `helpers.ts`, shared `getXTradeContext.ts`, discriminated `getXStepData.ts`, thin `getTradeQuote`/`getTradeRate` arm wrappers. `AcrossSwapper` is the spec in code form; the authoritative conventions rubric lives in `.claude/skills/swapper-rate-quote-review/SKILL.md` — read it alongside this skill.
- **Feature Flags**: All swappers behind runtime flags for gradual rollout

**Your Role**: Research → Implement → Test → Document, following battle-tested patterns from 18 existing swapper integrations.

---

## Workflow

### Phase 0: Pre-Research (Use WebFetch / WebSearch)

**BEFORE asking the user for anything**, proactively research the swapper online:

1. **Search for official documentation**:
   ```text
   Search: "[SwapperName] API documentation"
   Search: "[SwapperName] developer docs"
   Search: "[SwapperName] swagger api"
   ```

2. **Find their website and look for**:
   - API docs link
   - Developer portal
   - GitHub repos with examples
   - Public API endpoints
   - Known integrations

3. **Fetch their API docs** using `WebFetch`:
   - Main documentation page
   - Swagger/OpenAPI spec (if available)
   - Example requests/responses

4. **Research chain support**:
   ```text
   Search: "[SwapperName] supported chains"
   Search: "[SwapperName] which blockchains"
   ```

5. **Find existing integrations**:
   ```text
   Search: "github [SwapperName] integration example"
   Search: "[SwapperName] typescript sdk"
   ```

**Then**, compile what you found and ask the user ONLY for what you couldn't find or need confirmation on.

---

### Phase 1: Information Gathering

**Use the `AskUserQuestion` tool to gather missing information with structured prompts.**

Based on your Phase 0 research, ask the user for:

1. **API Access** (if needed):
   - API key for production (or staging)
   - Any authentication requirements you found
   - Confirmation of API endpoints you discovered

2. **Chain Support Confirmation**:
   - Verify the chains you found are correct
   - Ask about any limitations or special requirements per chain
   - Confirm chain naming convention (ethereum vs 1 vs mainnet)

3. **Critical API Behaviors** (if not clear from docs):
   - **Slippage format**: percentage (1=1%), decimal (0.01=1%), or basis points (100=1%)?
   - **Address format**: checksummed required?
   - **Native token handling**: marker address? which one?
   - Min/max trade amounts?
   - Quote expiration time?

4. **Brand Assets**:
   - Confirm official name and capitalization
   - Request logo/icon (128x128+ PNG preferred)

5. **Known Issues**:
   - Any quirks they're aware of?
   - Previous integration attempts or examples?

**Example Multi-Question Prompt**:
```typescript
AskUserQuestion({
  questions: [
    {
      question: "Do we have an API key for [Swapper]?",
      header: "API Key",
      multiSelect: false,
      options: [
        { label: "Yes, I have it", description: "I'll provide the API key" },
        { label: "No, but we can get one", description: "I'll obtain an API key" },
        { label: "No API key needed", description: "API is public/unauthenticated" }
      ]
    },
    {
      question: "Which chains should we support initially?",
      header: "Chain Support",
      multiSelect: true,
      options: [
        { label: "Ethereum", description: "Ethereum mainnet" },
        { label: "Polygon", description: "Polygon PoS" },
        { label: "Arbitrum", description: "Arbitrum One" },
        { label: "All supported chains", description: "Enable all chains the API supports" }
      ]
    }
  ]
})
```

---

### Phase 2: Deep Research & Pattern Analysis

**IMPORTANT**: Study existing swappers BEFORE writing any code. This prevents reimplementing solved problems.

#### Step 1: Identify Swapper Category

Based on API research, determine the swapper type. Every category produces the same canonical
structure — the category only changes what the quote's `transactionData` variant is and how the
context/step data derive it.

**EVM Direct Transaction** (Most Common):
- Characteristics: EVM chain(s), API returns transaction data, user signs & broadcasts
- Canonical examples: `ZrxSwapper`, `PortalsSwapper`, `BebopSwapper` (EVM arm), `DebridgeSwapper`, `AcrossSwapper`
- Quote carries: `transactionData: { type: 'evm', chainId, to, data, value, gasLimit }` — the
  gasLimit is ALWAYS set (provider-supplied, or estimated-and-set by `getEvmNetworkFeeCryptoBaseUnit`)
- **Choose this if**: API returns `{to, data, value, gas}` transaction object

**Deposit-to-Address (Cross-Chain/Async)**:
- Characteristics: user sends a plain transfer to a provider deposit address; provider executes
  asynchronously; status tracked by a provider-side id
- Canonical examples: `BobGatewaySwapper` (order resolved once up front), `ChainflipSwapper`
  (deposit channel opened quote-side), `NearIntentsSwapper`
- Quote carries: a normal chain-namespace `transactionData` (the transfer we build) PLUS a
  `swapperMetadata` union member holding the tracking id / deposit address
- **Choose this if**: API returns a deposit address and an id for tracking

**Gasless Order-Based**:
- Characteristics: sign an EIP-712 message (not a tx); order submitted to the provider; no broadcast
- Canonical example: `CowSwapper` — `transactionData: { type: 'cowswap', chainId, orderToSign }`,
  `getUnsignedEvmMessage` is a thin reader, `executeEvmMessage` signs + POSTs the order
- **Choose this if**: uses EIP-712 message signing + order submission

**Solana**:
- Instruction-based routes: `transactionData: { type: 'solana_instructions', instructions,
  addressLookupTableAddresses }` with the static compute unit limit set at quote time via
  `withComputeUnitLimit` (measured simulation × per-swapper margin); execution fetches only the
  dynamic priority fee. Canonical: the solana arms of `AcrossSwapper`/`ButterSwap`/`RelaySwapper`.
- Sealed RFQ txs (maker pre-signed, blockhash pinned): `transactionData:
  { type: 'solana_serialized_tx', serializedTx }` — co-sign as-is, never rebuild. Canonical:
  `BebopSwapper` solana arm.

**Multi-Chain**:
- One swapper spanning namespaces: a single `switch (chainNamespace)` in step data with BOTH arms
  inline per case. Canonical: `ButterSwap` (evm/utxo/solana/tron), `RelaySwapper`, `NearIntentsSwapper`.

**Chain-Specific (Sui/Tron/Starknet/TON)**:
- Un-migrated namespaces: quotes are fee-only (no `transactionData`); execution re-derives from
  `swapperMetadata` or provider re-fetch. Canonical: `CetusSwapper` (sui), `SunioSwapper` (tron —
  the one migrated tron example), `AvnuSwapper` (starknet), `StonfiSwapper` (ton). New chain-specific
  swappers still get the full context split (Cetus/Stonfi prove it applies without an executable payload).

#### Step 2: Study the Canonical Architecture IN DEPTH

**Read the conventions rubric first**: `.claude/skills/swapper-rate-quote-review/SKILL.md` — it is
the authoritative spec for the structure below and its edge cases.

**Then read Across — the reference implementation**:

```bash
packages/swapper/src/swappers/AcrossSwapper/
├── index.ts                        # Barrel: exports { acrossApi, acrossSwapper } at minimum
├── AcrossSwapper.ts                # Swapper interface (shared executors)
├── endpoints.ts                    # SwapperApi: scoped input casts + shared chain exec utils
├── getTradeQuote/
│   └── getTradeQuote.ts            # Quote arm wrapper: assertQuoteAddresses → context → step data → Trade[]
├── getTradeRate/
│   └── getTradeRate.ts             # Rate arm wrapper: owns ?? default-address fallbacks → Trade[]
└── utils/
    ├── types.ts                    # API types + scoped AcrossTrade{Quote,Rate}Input aliases
    ├── helpers.ts                  # PURE helpers: assertValidTrade, address mappers, fee fallbacks
    ├── acrossService.ts            # HTTP client with cache + API key injection
    ├── fetchAcrossTrade.ts         # API wrappers
    ├── getAcrossTradeContext.ts    # Shared core: fetch + derivations, ZERO quoteOrRate checks
    └── getAcrossStepData.ts        # Discriminated rate/quote step data (StepDataArgs, overloaded)
```

**Then read 1-2 swappers of your category** (see canonical examples above).

**Critical things to note while reading**:
1. How the context splits from the arm wrappers (what is shared vs arm-specific)
2. The `StepDataArgs<Base, RateExtra, QuoteExtra>` generic and the overloaded step data returns
3. How errors flow: no throws in step data/context — scoped try/catch mapping to
   `makeNetworkFeeEstimationFailedErr` / `makeTradeStepBuildFailedErr` / `makeSwapErrorRight`
4. What `transactionData` variant the quote carries, and what (if anything) goes in `swapperMetadata`
5. How rates estimate fees (best effort, provider-fee fallback) vs quotes (hard fail)
6. How the API is called (HTTP service pattern, native marker, checksumming, slippage format)

#### Step 3: Review Common Patterns

### Key Pattern: Monadic Error Handling

```typescript
import { Err, Ok } from '@sniptt/monads'
import { makeSwapErrorRight } from '../../../utils'

// ALWAYS return Result<T, SwapErrorRight>, NEVER throw
const result = await someOperation()
if (result.isErr()) {
  return Err(makeSwapErrorRight({
    message: 'What went wrong',
    code: TradeQuoteError.QueryFailed,
    details: { context: 'here' }
  }))
}
return Ok(result.unwrap())
```

### Key Pattern: HTTP Service with Caching

```typescript
import { createCache, makeSwapperAxiosServiceMonadic } from '../../../utils'

const maxAge = 5 * 1000 // 5 seconds
const cachedUrls = ['/quote', '/price'] // which endpoints to cache

const serviceBase = createCache(maxAge, cachedUrls, {
  timeout: 10000,
  headers: {
    'Accept': 'application/json',
    'x-api-key': config.VITE_XYZ_API_KEY
  }
})

export const xyzService = makeSwapperAxiosServiceMonadic(serviceBase)
```

### Key Pattern: Rate Limiting and Throttling

For chain adapters and swappers that directly interact with RPC endpoints or APIs:

```typescript
import PQueue from 'p-queue'

// In constructor or module scope:
private requestQueue: PQueue = new PQueue({
  intervalCap: 1,    // 1 request per interval
  interval: 50,      // 50ms between requests
  concurrency: 1,    // 1 concurrent request at a time
})

// Wrap all external API/RPC calls:
const quote = await this.requestQueue.add(() =>
  swapperService.get('/quote', { params })
)

// For provider calls in chain adapters:
const balance = await this.requestQueue.add(() =>
  this.provider.getBalance(address)
)
```

**When to use**: Any swapper or chain adapter making direct RPC/API calls (especially public endpoints)
**Example implementations**: MonadChainAdapter, PlasmaChainAdapter

### Key Pattern: Rate Calculation

```typescript
import { getInputOutputRate } from '../../../utils'

const rate = getInputOutputRate({
  sellAmountCryptoBaseUnit,
  buyAmountCryptoBaseUnit,
  sellAsset,
  buyAsset
})
```

---

### Phase 3: Implementation (Step by Step)

Follow this EXACT order to avoid rework:

#### Step 1: Create Directory Structure

```bash
mkdir -p packages/swapper/src/swappers/[SwapperName]Swapper/{getTradeQuote,getTradeRate,utils}
```

**Canonical structure** (mirror Across exactly):
```
[SwapperName]Swapper/
├── index.ts                          # Barrel: { [swapperName]Api, [swapperName]Swapper } at minimum
├── [SwapperName]Swapper.ts           # Swapper interface (shared executors)
├── endpoints.ts                      # SwapperApi wiring
├── types.ts                          # Scoped input aliases + metadata type (or utils/types.ts)
├── getTradeQuote/
│   └── getTradeQuote.ts              # Quote arm wrapper
├── getTradeRate/
│   └── getTradeRate.ts               # Rate arm wrapper
└── utils/
    ├── constants.ts                  # Supported chains, native marker, defaults
    ├── helpers.ts                    # PURE helpers only (flat file, not helpers/helpers.ts)
    ├── [swapperName]Service.ts       # HTTP client with cache + API key injection
    ├── fetch[SwapperName]Trade.ts    # API wrappers
    ├── get[SwapperName]TradeContext.ts  # Shared core
    └── get[SwapperName]StepData.ts   # Discriminated rate/quote step data
```

#### Step 2: Implement Files in Order

**2a. `types.ts` - API TypeScript Types**

Define types EXACTLY matching the API response (log actual API responses to verify!):

```typescript
import type { Address, Hex } from 'viem'

// Request types
export type [Swapper]QuoteRequest = {
  sellToken: Address
  buyToken: Address
  sellAmount: string
  slippage: number  // NOTE: document what format! (percentage, decimal, basis points)
  takerAddress: Address
  receiverAddress?: Address
  chainId: number
}

// Response types (match API exactly!)
export type [Swapper]QuoteResponse = {
  // Copy structure from actual API response
  buyAmount: string
  sellAmount: string
  transaction: {
    to: Address
    data: Hex
    value: Hex
    gas?: Hex
  }
  // ... rest of response
}

// Constants
export const [SWAPPER]_SUPPORTED_CHAIN_IDS: Record<number, string> = {
  1: 'ethereum',
  137: 'polygon',
  42161: 'arbitrum',
  // ...
}
```

**2b. `utils/constants.ts` - Configuration**

```typescript
import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { ethChainId, polygonChainId, arbitrumChainId } from '@shapeshiftoss/caip'
import type { Address } from 'viem'

export const SUPPORTED_CHAIN_IDS = [
  ethChainId,
  polygonChainId,
  arbitrumChainId,
] as const

export type [Swapper]SupportedChainId = (typeof SUPPORTED_CHAIN_IDS)[number]

// Native token marker (if API uses one)
export const NATIVE_TOKEN_MARKER = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' as Address

// Dummy address for rates (when no wallet connected)
export const DUMMY_ADDRESS = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045' as Address

// Default slippage if none provided
export const DEFAULT_SLIPPAGE_PERCENTAGE = '0.5' // 0.5%
```

**2c. `utils/helpers.ts` - Pure Helper Functions (incl. `assertValidTrade`)**

```typescript
import { fromAssetId, type AssetId } from '@shapeshiftoss/caip'
import { isToken } from '@shapeshiftoss/utils'
import { getAddress, type Address } from 'viem'
import { NATIVE_TOKEN_MARKER, SUPPORTED_CHAIN_IDS } from '../constants'

// Check if chain is supported
export const isSupportedChainId = (chainId: string): boolean => {
  return SUPPORTED_CHAIN_IDS.includes(chainId as any)
}

// Convert assetId to token address (with native token handling)
export const assetIdToToken = (assetId: AssetId): Address => {
  if (!isToken(assetId)) {
    return NATIVE_TOKEN_MARKER // Native token (ETH, MATIC, etc.)
  }
  const { assetReference } = fromAssetId(assetId)
  return getAddress(assetReference) // Checksum ERC20 address
}

// Convert ShapeShift chainId to API chain identifier
export const chainIdToChainRef = (chainId: string): string => {
  switch (chainId) {
    case ethChainId:
      return 'ethereum' // or '1' or 'mainnet' depending on API
    case polygonChainId:
      return 'polygon'
    // ...
    default:
      throw new Error(`Unsupported chainId: ${chainId}`)
  }
}

// Calculate rate from amounts
import { getInputOutputRate } from '../../../../utils'
export { getInputOutputRate } // Re-export for use in quote/rate files
```

**2d. `utils/[swapperName]Service.ts` - HTTP Service**

```typescript
import { createCache, makeSwapperAxiosServiceMonadic } from '../../../utils'
import type { SwapperConfig } from '../../../types'

// Cache for 5 seconds (adjust based on API)
const maxAge = 5 * 1000

// Which endpoints to cache (usually /quote and /price)
const cachedUrls = ['/quote', '/price']

export const [swapperName]ServiceFactory = (config: SwapperConfig) => {
  const axiosConfig = {
    timeout: 10000,
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...(config.VITE_[SWAPPER]_API_KEY && {
        'x-api-key': config.VITE_[SWAPPER]_API_KEY
      })
    }
  }

  const serviceBase = createCache(maxAge, cachedUrls, axiosConfig)
  return makeSwapperAxiosServiceMonadic(serviceBase)
}

export type [Swapper]Service = ReturnType<typeof [swapperName]ServiceFactory>
```

**2e. `utils/fetchFrom[SwapperName].ts` - API Wrappers**

```typescript
import { type AssetId } from '@shapeshiftoss/caip'
import { bn } from '@shapeshiftoss/utils'
import { Err, Ok, type Result } from '@sniptt/monads'
import { getAddress, type Address } from 'viem'
import { makeSwapErrorRight } from '../../../utils'
import { TradeQuoteError, type SwapErrorRight } from '../../../types'
import type { [Swapper]Service } from './[swapperName]Service'
import type { [Swapper]QuoteRequest, [Swapper]QuoteResponse } from '../types'
import { assetIdToToken, chainIdToChainRef } from './helpers'

// Base URL for API
const BASE_URL = 'https://api.[swapper].com'

export type FetchQuoteParams = {
  sellAssetId: AssetId
  buyAssetId: AssetId
  sellAmountCryptoBaseUnit: string
  chainId: string
  takerAddress: string
  receiverAddress: string
  slippageTolerancePercentageDecimal: string
  affiliateBps: string
}

export const fetchQuote = async (
  params: FetchQuoteParams,
  service: [Swapper]Service
): Promise<Result<[Swapper]QuoteResponse, SwapErrorRight>> => {
  try {
    const {
      sellAssetId,
      buyAssetId,
      sellAmountCryptoBaseUnit,
      chainId,
      takerAddress,
      receiverAddress,
      slippageTolerancePercentageDecimal,
      affiliateBps
    } = params

    // Convert to API format
    const sellToken = assetIdToToken(sellAssetId)
    const buyToken = assetIdToToken(buyAssetId)
    const chainRef = chainIdToChainRef(chainId)

    // CRITICAL: Convert slippage to API format
    // ShapeShift format: 0.005 = 0.5%
    // Check API docs for their format!
    const slippagePercentage = bn(slippageTolerancePercentageDecimal)
      .times(100) // If API expects 0.5 for 0.5%
      .toNumber()

    // Checksum addresses (CRITICAL for many APIs)
    const checksummedTakerAddress = getAddress(takerAddress)
    const checksummedReceiverAddress = getAddress(receiverAddress)

    const requestBody: [Swapper]QuoteRequest = {
      sellToken,
      buyToken,
      sellAmount: sellAmountCryptoBaseUnit,
      slippage: slippagePercentage,
      takerAddress: checksummedTakerAddress,
      receiverAddress: checksummedReceiverAddress,
      chainId: chainRef,
      // Add affiliate if supported
      ...(affiliateBps !== '0' && { affiliateBps })
    }

    const maybeResponse = await service.post<[Swapper]QuoteResponse>(
      `${BASE_URL}/quote`,
      requestBody
    )

    if (maybeResponse.isErr()) {
      return Err(maybeResponse.unwrapErr())
    }

    const { data: response } = maybeResponse.unwrap()

    // Validate response has required fields
    if (!response.buyAmount || !response.transaction) {
      return Err(
        makeSwapErrorRight({
          message: 'Invalid response from API',
          code: TradeQuoteError.InvalidResponse,
          details: { response }
        })
      )
    }

    return Ok(response)
  } catch (error) {
    return Err(
      makeSwapErrorRight({
        message: 'Failed to fetch quote',
        code: TradeQuoteError.QueryFailed,
        cause: error
      })
    )
  }
}

// For rates (no wallet needed)
export type FetchPriceParams = Omit<FetchQuoteParams, 'takerAddress' | 'receiverAddress'> & {
  receiveAddress: string | undefined
}

export const fetchPrice = async (
  params: FetchPriceParams,
  service: [Swapper]Service
): Promise<Result<[Swapper]QuoteResponse, SwapErrorRight>> => {
  // Use dummy address if no wallet connected
  const address = params.receiveAddress
    ? getAddress(params.receiveAddress)
    : DUMMY_ADDRESS

  // IMPORTANT: Use same affiliate for both quote and rate to avoid delta!
  return fetchQuote(
    {
      ...params,
      takerAddress: address,
      receiverAddress: address
    },
    service
  )
}
```

**2f. `utils/get[SwapperName]TradeContext.ts` - Shared Core**

The context holds everything BOTH arms share: the provider fetch (when both arms hit the same
endpoint - Across/Debridge model) or just the assembly (when arms fetch differently - Zrx/Portals
model), error mapping, derived amounts, protocolFees, and the step data args. It contains ZERO
`quoteOrRate` checks and takes already-resolved addresses as params.

```typescript
type [Swapper]TradeContext = {
  tradeCommon: TradeCommon                              // id, rate, affiliateBps, slippage, swapperName...
  stepCommon: Omit<TradeStepCommon, 'feeData'>          // amounts, assets, allowanceContract, source...
  protocolFees: QuoteFeeData['protocolFees']
  stepDataArgs: Omit<Get[Swapper]StepDataArgs, 'type' | 'input'>  // also omit arm-divergent extras
}
```

Rules:
- `allowanceContract` is `''` when there is no approval target, never `undefined`
- `swapperMetadata` (if any) is set here or in the quote wrapper - see Step 3
- Return `Result` - provider errors map to `TradeQuoteError` codes (`QueryFailed`, `NoRouteFound`,
  `SellAmountBelowMinimum`...), never throw

**2g. `utils/get[SwapperName]StepData.ts` - Discriminated Step Data**

The heart of the rate/quote split. Uses the shared `StepDataArgs<Base, RateExtra, QuoteExtra>`
generic from `types.ts`: `Base` carries `deps` + `sellAsset` + everything derived in the context;
the Rate/Quote generics carry arm-specific extras derived in the wrappers (e.g. chainflip's quote
`depositAddress`). Declare TWO overloads over one implementation so callers get precise per-arm
types:

```typescript
type [Swapper]RateStepData = { networkFeeCryptoBaseUnit: string }
type [Swapper]QuoteStepData = { transactionData: TxBuildData; networkFeeCryptoBaseUnit: string }

export function get[Swapper]StepData(
  args: Extract<Get[Swapper]StepDataArgs, { type: 'rate' }>,
): Promise<Result<[Swapper]RateStepData, SwapErrorRight>>
export function get[Swapper]StepData(
  args: Extract<Get[Swapper]StepDataArgs, { type: 'quote' }>,
): Promise<Result<[Swapper]QuoteStepData, SwapErrorRight>>
export async function get[Swapper]StepData(
  args: Get[Swapper]StepDataArgs,
): Promise<Result<[Swapper]RateStepData | [Swapper]QuoteStepData, SwapErrorRight>> { ... }
```

The non-negotiable rules (see the review skill for full nuance):
- **Rates NEVER return `transactionData`** - `TradeRateStep` bans it at the type level
- **Rate arm**: best-effort fee - try the real estimation, catch to the provider-fee fallback.
  Provider-built routes can't be placeholder-estimated; self-built transfers can
- **Quote arm**: ANY estimation/pricing failure fails the quote via
  `makeNetworkFeeEstimationFailedErr(context, cause)` - NEVER a provider-fee fallback (execution
  needs the same fee data). Unbuildable provider payloads (decode failure, missing fields) fail via
  `makeTradeStepBuildFailedErr(context, cause)`
- **No `throw`** - validation misses and unsupported-namespace `default` cases return `Err`;
  `try/catch` is scoped ONLY around the external adapter/estimation call
- **EVM quote invariant**: `transactionData.gasLimit` is always set - pass the transactionData to
  `getEvmNetworkFeeCryptoBaseUnit` (utils/evm), which prices a provider-supplied gasLimit as-is or
  estimates-and-sets the buffered limit in place. Route ALL EVM fee math through it
- **Solana instruction quotes**: strip any provider budget instructions
  (`omitComputeBudgetInstructions`), estimate via `getSolanaNetworkFeeCryptoBaseUnit`, then set the
  static compute unit limit with `withComputeUnitLimit({ instructions, computeUnits,
  includeComputeBudget, computeBudget })` using a per-swapper exported
  `[SWAPPER]_SOLANA_COMPUTE_BUDGET` (margin measured against live drift)
- **UTXO quotes**: `{ type: 'utxo', to, opReturnData?, value }` via `getUtxoNetworkFeeCryptoBaseUnit`;
  guard genuinely-optional memo fields (estimation won't catch their absence)
- **Multi-namespace swappers**: one `switch (chainNamespace)` with both arms inline per case
  (ButterSwap canonical) - never a separate rate helper that re-switches on namespace

**2h. Arm Wrappers - `getTradeQuote/getTradeQuote.ts` + `getTradeRate/getTradeRate.ts`**

Thin assembly, returning `Trade[]` (`Ok([trade])`) so endpoints wire them directly:

```typescript
// Quote wrapper: addresses guarded BEFORE any provider request
export const getTradeQuote = async (
  input: [Swapper]TradeQuoteInput,        // the scoped alias - see types.ts below
  deps: SwapperDeps,
): Promise<Result<TradeQuote[], SwapErrorRight>> => {
  const { accountNumber } = input

  const maybeAddresses = assertQuoteAddresses(input)
  if (maybeAddresses.isErr()) return Err(maybeAddresses.unwrapErr())
  const { sendAddress, receiveAddress } = maybeAddresses.unwrap()

  const maybeContext = await get[Swapper]TradeContext({ input, deps, from: sendAddress, ... })
  if (maybeContext.isErr()) return Err(maybeContext.unwrapErr())
  const { tradeCommon, stepCommon, protocolFees, stepDataArgs } = maybeContext.unwrap()

  const maybeStepData = await get[Swapper]StepData({ ...stepDataArgs, type: 'quote', input })
  if (maybeStepData.isErr()) return Err(maybeStepData.unwrapErr())
  const { transactionData, networkFeeCryptoBaseUnit } = maybeStepData.unwrap()

  const tradeQuote: TradeQuote = {
    ...tradeCommon,
    quoteOrRate: 'quote',
    receiveAddress,
    steps: [{
      ...stepCommon,
      accountNumber,
      transactionData,
      feeData: { networkFeeCryptoBaseUnit, protocolFees },
    }],
  }

  return Ok([tradeQuote])
}
```

Rate wrapper differences:
- Owns the `?? default/dummy address` fallbacks (rate-only - a quote must NEVER request a provider
  route with a defaulted address)
- Steps carry `accountNumber` from the input (`input.accountNumber` - set when a wallet is
  connected, `undefined` walletless; this feeds approval-before-quote flows). Do NOT hardcode
  `accountNumber: undefined`
- No `transactionData` on the step, `quoteOrRate: 'rate'`

Result: no `TradeQuoteStep | TradeRateStep` unions, no `as TradeQuoteStep` casts, no scattered
`input.quoteOrRate === 'quote'` checks anywhere.

**2i. Scoped Input Aliases - `types.ts`**

EVERY swapper (even single-chain) defines scoped input aliases - unions of ONLY the supported
`Get<Chain>Trade{Quote,Rate}Input` members - and casts ONCE at the endpoint boundary:

```typescript
export type [Swapper]TradeQuoteInput = GetEvmTradeQuoteInput | GetSolanaTradeQuoteInput
export type [Swapper]TradeRateInput = GetEvmTradeRateInput | GetSolanaTradeRateInput
```

The wrappers and context take the scoped alias; step data's `input` stays the wide
`GetTradeRateInput`/`GetTradeQuoteInput` (dictated by `StepDataArgs`). `'supportsEIP1559' in input`
narrowing discriminates EVM members from the rest (chainId comparison does NOT narrow the union).

**2j. `endpoints.ts` - SwapperApi Wiring**

```typescript
export const [swapperName]Api: SwapperApi = {
  getTradeQuote: (input, deps) => getTradeQuote(input as [Swapper]TradeQuoteInput, deps),
  getTradeRate: (input, deps) => getTradeRate(input as [Swapper]TradeRateInput, deps),

  // Use the SHARED per-chain executors - do not hand-roll unless the swapper genuinely deviates
  getUnsignedEvmTransaction,        // from '../../utils/evm' - appends permit2 signature if present
  getEvmTransactionFees,            // from '../../utils/evm'
  getUnsignedUtxoTransaction,       // from '../../utils/utxo'
  getUtxoTransactionFees,
  getUnsignedSolanaTransaction,     // from '../../utils/solana' - reads the static limit, fetches priority fee
  getSolanaTransactionFees,

  checkTradeStatus: async ({ config, swap }) => {
    if (!swap) throw new Error('Missing swap')

    // Read tracking data via getSwapMetadata (throws on mismatch - matches all swappers)
    const { swapId } = getSwapMetadata(swap.metadata.swapperMetadata, '[swapperName]')

    // ...poll the provider...

    return {
      status,                       // TxStatus
      buyTxHash,
      // The protocol's own tracker page, constructed HERE next to the provider response:
      swapperTxId,                  // display id (native swap id, relayer hash, order uid)
      swapperTxLink,                // fully-formed URL (e.g. scan.chainflip.io/swaps/<id>)
      message,
    }
  },
}
```

For plain same-chain EVM swappers, `checkTradeStatus: checkEvmSwapStatus` (shared) suffices.

**2k. `[SwapperName]Swapper.ts` - Swapper Interface**

```typescript
import { executeEvmTransaction } from '../../utils'
import type { Swapper } from '../../types'

export const [swapperName]Swapper: Swapper = {
  executeEvmTransaction,   // and/or executeSolanaTransaction etc. - shared executors
}
```

Custom execution logic (e.g. CowSwap's order POST) lives here.

**2l. `index.ts` - Barrel**

Every swapper barrel exports at minimum its api + swapper def, so `constants.ts` imports one line
per swapper:

```typescript
export { [swapperName]Api } from './endpoints'
export { [swapperName]Swapper } from './[SwapperName]Swapper'
export * from './types'
```

#### Step 3: Add Swapper Metadata (ONLY if needed!)

**Skip this step** if execution and status tracking need nothing beyond the transaction hash
(plain same-chain EVM swappers).

**Implement it if** status polling or execution needs a provider-side identifier (deposit address,
order id, swap id, quote id).

The mechanism is the `SwapperMetadata` discriminated union - a single `swapperMetadata` field on the
step. There is NO web-side wiring: `buildSwapMetadata` carries it onto the persisted swap
automatically, and consumers read it with `getSwapMetadata`.

**a. Define the union member** in the swapper's `types.ts`:
```typescript
export type [Swapper]Metadata = {
  name: '[swapperName]'          // the union discriminant
  swapId: string                 // whatever tracking data status/exec needs - keep it minimal,
  depositAddress: string         // every field must have a read site (no write-only fields)
}
```

**b. Register it** in `packages/swapper/src/types.ts`'s `SwapperMetadata` union.

**c. Set it at quote time** (context or quote wrapper):
```typescript
steps: [{ ...stepCommon, accountNumber, transactionData, swapperMetadata: { name: '[swapperName]', swapId, depositAddress }, ... }]
```

**d. Read it** wherever needed - status polling and chain-specific execution:
```typescript
const { swapId } = getSwapMetadata(swap.metadata.swapperMetadata, '[swapperName]')     // status
const { depositAddress } = getSwapMetadata(step.swapperMetadata, '[swapperName]')      // exec
```

#### Step 4: Register the Swapper

**4a. `packages/swapper/src/types.ts` - Add Config Fields + SwapperName**

```typescript
export enum SwapperName {
  // ... existing
  [SwapperName] = '[Display Name]',
}

export type SwapperConfig = {
  // ... existing fields
  VITE_[SWAPPER]_API_KEY: string
}
```

(`SwapperName` lives in `types.ts`, not `constants.ts`.)

**4b. `packages/swapper/src/constants.ts` - Register Swapper**

One barrel import per swapper, spread into the record:

```typescript
import { [swapperName]Api, [swapperName]Swapper } from './swappers/[SwapperName]Swapper'

export const swappers: Record<SwapperName, (SwapperApi & Swapper) | undefined> = {
  // ... existing
  [SwapperName.[SwapperName]]: {
    ...[swapperName]Swapper,
    ...[swapperName]Api,
  },
}
```

Also add the swapper's default slippage to `getDefaultSlippageDecimalPercentageForSwapper` if it
differs from the default.

**4c. `packages/swapper/src/index.ts` - Root Barrel**

Re-export the swapper directory: `export * from './swappers/[SwapperName]Swapper'`

**4c-bis. Public API + Swap Widget enablement (deliberate, separate decisions)**

- **Public API**: a new swapper is NOT served by the public api until added to
  `ENABLED_SWAPPER_NAMES` in `packages/public-api/src/constants.ts`. Before enabling, confirm the
  quote's `transactionData` variant is serialized by
  `packages/public-api/src/routes/quote/extractTransactionData.ts` + the zod schemas - a variant
  the extractor doesn't handle ships silently non-executable quotes.
- **Swap widget**: the widget's own restricted `SwapperName` enum
  (`packages/swap-widget/src/types/index.ts` - members commented out = disabled) is the
  widget allowlist; also add icon/color entries in `packages/swap-widget/src/constants/swappers.ts`
  if enabling there. Only enable swappers the widget can actually execute.

**4d. CSP Headers** (if swapper calls external API)

Create `headers/csps/defi/swappers/[SwapperName].ts`:
```typescript
import type { Csp } from '../../../types'

export const csp: Csp = {
  'connect-src': [
    'https://api.[swapper].com',
    'https://api.[swapper].io', // add all API domains
  ]
}
```

Register in `headers/csps/index.ts`:
```typescript
import { csp as [swapperName] } from './defi/swappers/[SwapperName]'

export const csps = [
  // ... other csps
  [swapperName],
]
```

#### 4e. UI - Feature Flag

Add to `src/state/slices/preferencesSlice/preferencesSlice.ts`:
```typescript
export type FeatureFlags = {
  // ... existing
  BebopSwap: boolean  // Example: use PascalCase swapper name + "Swap" suffix
}

const initialState: Preferences = {
  featureFlags: {
    // ... existing
    BebopSwap: getConfig().VITE_FEATURE_BEBOP_SWAP
  }
}
```

#### 4f. Wire Feature Flag

In `src/state/helpers.ts`:

Add to `isCrossAccountTradeSupported` (if supported):
```typescript
export const isCrossAccountTradeSupported = (swapperName: SwapperName): boolean => {
  switch (swapperName) {
    case SwapperName.Bebop:  // Use enum value, not placeholder
      return true // or false if not supported
    // ...
  }
}
```

Add to `getEnabledSwappers`:
```typescript
export const getEnabledSwappers = (
  {
    BebopSwap,  // ADD THIS - destructure the flag directly
    // ... other existing flags like ChainflipSwap, ThorSwap, etc.
  }: FeatureFlags,
  isCrossAccountTrade: boolean,
  isSolBuyAssetId: boolean
): Record<SwapperName, boolean> => {
  return {
    // ... existing
    [SwapperName.Bebop]:
      BebopSwap &&
      (!isCrossAccountTrade || isCrossAccountTradeSupported(SwapperName.Bebop))
  }
}
```

#### 4g. Test Mocks

In `src/test/mocks/store.ts`:

```typescript
featureFlags: {
  // ... existing
  BebopSwap: false  // Use actual flag name, not placeholder
}
```

#### 4h. Swapper Icon

In UI:

Add icon: `src/components/MultiHopTrade/components/TradeInput/components/SwapperIcon/[swapper]-icon.png`

Update `SwapperIcon.tsx`:
```typescript
import [swapperName]Icon from './[swapper]-icon.png'

const SwapperIcon = ({ swapperName }: Props) => {
  switch (swapperName) {
    // ... existing
    case SwapperName.[SwapperName]:
      return <Image src={[swapperName]Icon} />
  }
}
```

#### 4i. Environment Variables

`.env` (production - both OFF):
```bash
# [Swapper Name]
VITE_[SWAPPER]_API_KEY=
VITE_FEATURE_[SWAPPER]_SWAP=false
```

`.env.development` (development - flag ON):
```bash
# [Swapper Name]
VITE_[SWAPPER]_API_KEY=your-dev-api-key-here
VITE_FEATURE_[SWAPPER]_SWAP=true
```

Add to `src/config.ts`:
```typescript
export const getConfig = (): Config => ({
  // ... existing
  VITE_[SWAPPER]_API_KEY: import.meta.env.VITE_[SWAPPER]_API_KEY || '',
  VITE_FEATURE_[SWAPPER]_SWAP: parseBoolean(import.meta.env.VITE_FEATURE_[SWAPPER]_SWAP)
})
```

#### Step 5: Proactive Gotcha Review

**BEFORE testing**, check for these critical bugs:

1. **Slippage Format**: Verify API format (percentage, decimal, basis points)
2. **Address Checksumming**: Use `getAddress()` from viem
3. **Hex Conversion**: Use `fromHex()` for `tx.value`, `tx.gas`, `tx.gasPrice`
4. **Response Parsing**: Log actual API response, verify structure matches types
5. **Affiliate Fees**: Pass same `affiliateBps` to BOTH quote and rate endpoints
6. **Native Token Marker**: Verify marker address matches API requirements
7. **EVM gasLimit invariant**: every EVM quote's `transactionData.gasLimit` ends up set - via
   `getEvmNetworkFeeCryptoBaseUnit`, never inline gas math
8. **Quote addresses**: `assertQuoteAddresses` before any provider request; rate-only address
   defaults never leak into quotes
9. **Rate vs quote fee semantics**: rate falls back to the provider fee, quote hard-fails
   estimation - never the other way around
10. **No throws**: step data and context return `Err`, `try/catch` scoped to adapter calls only
11. **Trust the provider payload type**: don't guard fields the type marks required; guard only
    genuinely-optional fields whose absence isn't caught downstream (e.g. utxo memo)
12. **Comment vernacular**: "set/supplied/quote-time", "throws at execution" - never "bake(d)" or
    "fail closed"

### Phase 4: Testing & Validation

**4a. Automated Checks**

```bash
# Type checking (MUST pass)
pnpm run type-check

# Linting (MUST pass)
pnpm run lint

# Build swapper package (MUST pass)
pnpm run build:swapper

# Build web (SHOULD pass, may have unrelated errors)
pnpm run build:web
```

Fix ALL type errors and lint errors before manual testing.

**4b. Manual Testing Checklist**

- [ ] Can fetch quotes for supported chain
- [ ] Rates display without wallet connected
- [ ] Approval flow works (if needed)
- [ ] Can execute swap and transaction succeeds
- [ ] Native token swaps work (ETH→USDC, USDC→ETH)
- [ ] Wrapped token swaps work (WETH→USDC)
- [ ] Error handling works (unsupported chain, insufficient liquidity)
- [ ] UI shows swapper icon correctly
- [ ] Feature flag toggles swapper on/off
- [ ] Cross-account trades work (if supported)
- [ ] Rate vs quote delta < 0.1%

**4c. Edge Cases**

- [ ] Very small amounts (near minimum)
- [ ] Very large amounts (near maximum)
- [ ] High slippage scenarios
- [ ] Low liquidity pairs
- [ ] Gas price spikes
- [ ] API timeouts/errors

---

### Phase 5: Documentation

Create `packages/swapper/src/swappers/[SwapperName]Swapper/INTEGRATION.md`:

```markdown
# [Swapper Name] Integration

## Overview
- **Website**: https://[swapper].com
- **API Docs**: https://docs.[swapper].com
- **Supported Chains**: Ethereum, Polygon, Arbitrum, ...
- **Type**: EVM Direct Transaction / Deposit-to-Address / Gasless

## API Details
- **Base URL**: `https://api.[swapper].com`
- **Authentication**: API key in `x-api-key` header
- **Rate Limiting**: X requests per second
- **Endpoints**:
  - `POST /quote` - Get executable quote
  - `GET /price` - Get rate without wallet

## Implementation Notes

### Slippage Format
API expects **percentage** (1 = 1%). ShapeShift internal format is decimal (0.01 = 1%), so we multiply by 100.

### Address Format
API requires **EIP-55 checksummed** addresses. We use `getAddress()` from viem.

### Native Token Handling
API uses marker address `0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE` for native tokens (ETH, MATIC, etc.).

### Response Format
```json
{
  "buyAmount": "1000000",
  "sellAmount": "500000000",
  "transaction": {
    "to": "0x...",
    "data": "0x...",
    "value": "0x0",
    "gas": "0x5208"
  }
}
```

### Gotchas
1. Gas estimates are in **hex**, must convert to decimal with `fromHex()`
2. Affiliate fees must be passed to BOTH `/quote` and `/price` to avoid rate delta
3. Some routes may fail (dual routing), this is normal - use `bestPrice` route

## Testing Notes
- Use USDC/USDT pairs for testing (high liquidity)
- Test both native (ETH) and ERC20 swaps
- Verify slippage is applied correctly (check on-chain vs quoted amount)

## Known Issues
- None currently

## References
- [API Docs](https://docs.[swapper].com)
- [Example Integration](https://github.com/example/integration)
```

---

## Contract Enforcement

**After implementation**, verify your work against the contract at
`.claude/contracts/swapper-integration.md`. The contract contains the
authoritative registration, testing, and completion checklists that must
all pass before the integration is complete.

## Critical Success Factors

1. **Research First**: Understand API thoroughly BEFORE coding
2. **Copy Patterns**: Adapt proven patterns from similar swappers
3. **Type Safety**: Use strict TypeScript types, avoid `any`
4. **Monadic Errors**: ALWAYS return `Result<T, SwapErrorRight>`, never throw
5. **Test Gotchas**: Proactively fix known bugs (slippage, checksumming, hex conversion)
6. **Feature Flag**: Always behind flag for gradual rollout
7. **Documentation**: Write INTEGRATION.md with quirks and gotchas

## Completion Checklist

Before considering integration complete:

**Code Quality**:
- [ ] Package type check passes (`npx tsc --noEmit -p packages/swapper/tsconfig.esm.json` - the
      root `-p packages/swapper` config checks ZERO files and always passes; never trust it)
- [ ] All lint checks pass (`pnpm run lint`)
- [ ] No `any` types used
- [ ] All errors handled monadically; no throws in step data/context
- [ ] Rates carry no transactionData; quote wrapper guards addresses via assertQuoteAddresses

**Functionality**:
- [ ] Can fetch quotes successfully
- [ ] Can fetch rates without wallet
- [ ] Approval flow works (if needed)
- [ ] Transaction execution succeeds
- [ ] Status polling works (if applicable)
- [ ] Native token swaps work
- [ ] Error cases handled gracefully

**Integration**:
- [ ] SwapperName added in types.ts; registered in constants.ts via the swapper barrel
- [ ] Barrel exports { api, swapper }; root index.ts re-exports the directory
- [ ] Scoped [Swapper]Trade{Quote,Rate}Input aliases with the cast at the endpoint boundary
- [ ] SwapperMetadata union member registered (if tracking data needed)
- [ ] CSP headers added
- [ ] Feature flag implemented
- [ ] Test mocks updated
- [ ] Swapper icon added to UI
- [ ] Environment variables configured
- [ ] Public api enablement decided (ENABLED_SWAPPER_NAMES + wire variant serialization verified)
- [ ] Swap widget enablement decided (widget SwapperName enum + icon map)

**Documentation**:
- [ ] INTEGRATION.md created
- [ ] API quirks documented
- [ ] Known issues listed
- [ ] Testing notes included

**Testing**:
- [ ] Manual testing completed
- [ ] Rate vs quote delta verified (< 0.1%)
- [ ] Cross-account trades tested (if supported)
- [ ] Edge cases tested (min/max amounts, errors)

## Common Errors & Solutions

**"Taker address not checksummed"**
→ Use `getAddress(address)` from viem before sending to API

**"Number '0x...' is not a valid decimal"**
→ Convert hex to decimal: `fromHex(value as Hex, 'bigint').toString()`

**"Sell amount lower than fee"**
→ Check response parsing, likely accessing wrong field structure

**Large rate vs quote delta**
→ Pass same `affiliateBps` to both `/quote` and `/price` endpoints

**Quote succeeds but execution throws 'missing gas limit in evm transaction'**
→ The quote arm didn't route through `getEvmNetworkFeeCryptoBaseUnit` with the transactionData - it
estimates-and-sets the buffered gasLimit in place when the provider omits gas

**"$0 showing in UI"**
→ Response parsing bug, log actual response and verify structure

**"Transaction fails with slippage exceeded"**
→ Wrong slippage format sent to API (check docs for percentage/decimal/bps)

**Type error: "Property 'xyz' does not exist on type"**
→ Define proper TypeScript types matching actual API response

**"Cannot read property 'chainId' of undefined"**
→ Check null safety, add optional chaining or validation

---

## Need Help?

1. Read similar swapper implementations in packages/swapper/src/swappers/
2. Review the gotchas and patterns documented throughout this skill
3. Grep for similar patterns: `grep -r "pattern" packages/swapper/src/swappers/`
4. Ask user for API behavior clarification
5. Test with curl to verify API responses

---

**Remember**: Most bugs come from assumptions about API behavior. ALWAYS verify with actual API calls and log responses!
