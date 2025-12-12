# Bebop Solana Integration Implementation Plan

## Overview
Add Solana support to the existing Bebop swapper, enabling swaps on Solana using Bebop's PMM API v3.

## API Details

### Base URL
- **Solana**: `https://api.bebop.xyz/pmm/solana/v3`
- **Docs**: https://api.bebop.xyz/pmm/solana/docs
- **OpenAPI**: https://api.bebop.xyz/pmm/solana/openapi.json

### Key Differences from EVM
1. **Endpoint Path**: `/pmm/solana/v3/quote` vs `/router/{chain}/v1/quote`
2. **Transaction Format**: Returns `solana_tx` (base64 serialized VersionedTransaction) instead of `tx.data/to/value`
3. **No Multi-token Support**: Only 1:1 swaps supported (no multiple sell/buy tokens)
4. **Self-Execute Mode**: Use `gasless=false` (same as EVM) - gas fees excluded from quote
5. **Native Token**: Uses WSOL address `So11111111111111111111111111111111111111112`

### Tested & Confirmed Working
- ✅ Transaction deserialization works (VersionedTransaction format with 3 instructions)
- ✅ Supports tokens beyond the 3 listed in token-info (JUP tested successfully)
- ✅ `gasless=false` returns `QUOTE_INDIC_ROUTE` status with `gasFee.native: "0"`
- ✅ Affiliate fees supported via `fee` parameter
- ❌ Buy-side quotes (`buy_amounts`) return error 500
- ❌ Large amounts hit liquidity limits (102 error)
- ❌ Multi-token swaps not supported (101 error)

## Implementation Architecture

Based on analysis of existing Solana swappers:

### Pattern Analysis from Other Swappers

| Swapper | Transaction Storage | Execution Method | Pattern |
|---------|-------------------|------------------|---------|
| **Jupiter** | `jupiterQuoteResponse` + `solanaTransactionMetadata.instructions` | `getUnsignedSolanaTransaction` | Instructions built from swap API |
| **ButterSwap** | `butterSwapTransactionMetadata` (EVM) + `solanaTransactionMetadata.instructions` | `getUnsignedSolanaTransaction` | Decompiles VersionedTransaction |
| **Relay** | `relayTransactionMetadata` + `solanaTransactionMetadata.instructions` | `getUnsignedSolanaTransaction` | Uses Jupiter under the hood |
| **NearIntents** | `nearIntentsSpecific` (deposit address) | `buildSendApiTransaction` | Simple send to deposit address |

**Bebop should follow the ButterSwap pattern** - deserialize the `solana_tx` and store instructions in `solanaTransactionMetadata`.

## Implementation Steps

### 1. Create Branch
```bash
git checkout -B feat_bebop_solana
```

### 2. Update Types (`types.ts`)

```typescript
// Add to bebopSupportedChainIds
export const bebopSupportedChainIds = [
  // ... existing EVM chains
  KnownChainIds.SolanaMainnet,
] as const

// Add Solana-specific response type (based on actual API response)
export type BebopSolanaQuoteResponse = {
  requestId: string
  type: string // "121"
  status: 'QUOTE_SUCCESS' | 'QUOTE_INDIC_ROUTE' // INDIC_ROUTE for gasless=false
  quoteId: string // e.g. "121-xxx"
  chainId: 2 // Solana
  approvalType: 'Standard'
  nativeToken: 'SOL'
  taker: string
  receiver: string
  expiry: number // Unix timestamp
  slippage: number
  gasFee: {
    native: string // "0" for gasless=false
    usd: number
  }
  buyTokens: Record<string, {
    amount: string
    decimals: number
    priceUsd: number
    symbol: string
    minimumAmount: string
    price: number
    priceBeforeFee: number
    amountBeforeFee: string
    deltaFromExpected: number
  }>
  sellTokens: Record<string, {
    amount: string
    decimals: number
    priceUsd: number
    symbol: string
    price: number
    priceBeforeFee: number
  }>
  settlementAddress: string // "BEboPej97QDH5PS9xzCVxM5vvorvwENjtt3PV5n8b62"
  approvalTarget: string // Empty for Solana
  requiredSignatures: string[]
  priceImpact: number
  warnings: string[]
  solana_tx: string // Base64 encoded VersionedTransaction
  blockhash: string
  makers: string[] // e.g. ["whirlpool-rfqm", "🦊"]
  partnerFee?: Record<string, string>
  protocolFee?: Record<string, string>
}

// Update chainIdToBebopChain
export const chainIdToBebopChain: Record<BebopSupportedChainId, string> = {
  // ... existing mappings
  [KnownChainIds.SolanaMainnet]: 'solana', // Not used in URL but good for consistency
}
```

### 3. Add Solana Helpers (`utils/helpers/helpers.ts`)

```typescript
import { solAssetId, wrappedSolAssetId, fromAssetId } from '@shapeshiftoss/caip'
import { KnownChainIds } from '@shapeshiftoss/types'

// Add Solana token conversion (similar to Jupiter pattern)
export const assetIdToBebopSolanaToken = (assetId: AssetId): string => {
  // Native SOL uses WSOL address
  if (assetId === solAssetId) {
    return 'So11111111111111111111111111111111111111112'
  }
  const { assetReference } = fromAssetId(assetId)
  return assetReference // SPL token mint address
}

// Check if Solana chain
export const isSolanaChainId = (chainId: ChainId): boolean => {
  return chainId === KnownChainIds.SolanaMainnet
}
```

### 4. Update Fetch Layer (`utils/fetchFromBebop.ts`)

```typescript
export const fetchBebopSolanaQuote = async ({
  buyAsset,
  sellAsset,
  sellAmountIncludingProtocolFeesCryptoBaseUnit,
  takerAddress,
  receiverAddress,
  slippageTolerancePercentageDecimal,
  affiliateBps,
  apiKey,
}: {
  buyAsset: Asset
  sellAsset: Asset
  sellAmountIncludingProtocolFeesCryptoBaseUnit: string
  takerAddress: string
  receiverAddress: string
  slippageTolerancePercentageDecimal: string
  affiliateBps?: string
  apiKey: string
}): Promise<Result<BebopSolanaQuoteResponse, SwapErrorRight>> => {
  try {
    const sellToken = assetIdToBebopSolanaToken(sellAsset.assetId)
    const buyToken = assetIdToBebopSolanaToken(buyAsset.assetId)

    const sellAmountFormatted = bn(sellAmountIncludingProtocolFeesCryptoBaseUnit).toFixed(0)
    // Bebop expects percentage (0.5 for 0.5%), not decimal (0.005)
    const slippagePercentage = bn(slippageTolerancePercentageDecimal ?? 0.003)
      .times(100)
      .toNumber()

    const url = 'https://api.bebop.xyz/pmm/solana/v3/quote'

    const params = new URLSearchParams({
      sell_tokens: sellToken,
      buy_tokens: buyToken,
      sell_amounts: sellAmountFormatted,
      taker_address: takerAddress,
      receiver_address: receiverAddress,
      slippage: slippagePercentage.toString(),
      approval_type: 'Standard',
      skip_validation: 'false',
      gasless: 'false', // Always false for self-execute
      source: 'shapeshift',
    })

    if (affiliateBps && affiliateBps !== '0') {
      params.set('fee', affiliateBps)
    }

    const bebopService = bebopServiceFactory({ apiKey })
    const maybeResponse = await bebopService.get<BebopSolanaQuoteResponse>(`${url}?${params}`)

    if (maybeResponse.isErr()) {
      return Err(
        makeSwapErrorRight({
          message: 'Failed to fetch quote from Bebop Solana',
          cause: maybeResponse.unwrapErr().cause,
          code: TradeQuoteError.QueryFailed,
        }),
      )
    }

    const response = maybeResponse.unwrap()

    // Validate response
    if (response.data.status !== 'QUOTE_INDIC_ROUTE') {
      console.warn('Expected QUOTE_INDIC_ROUTE for gasless=false, got:', response.data.status)
    }

    if (!response.data.solana_tx) {
      return Err(
        makeSwapErrorRight({
          message: 'Missing solana_tx in response',
          code: TradeQuoteError.InvalidResponse,
        }),
      )
    }

    return Ok(response.data)
  } catch (error) {
    return Err(
      makeSwapErrorRight({
        message: 'Unexpected error fetching Bebop Solana quote',
        cause: error,
        code: TradeQuoteError.QueryFailed,
      }),
    )
  }
}

// Similar for fetchBebopSolanaPrice (for rate quotes)
export const fetchBebopSolanaPrice = ({
  buyAsset,
  sellAsset,
  sellAmountIncludingProtocolFeesCryptoBaseUnit,
  receiveAddress,
  affiliateBps,
  apiKey,
}: {
  buyAsset: Asset
  sellAsset: Asset
  sellAmountIncludingProtocolFeesCryptoBaseUnit: string
  receiveAddress: string | undefined
  affiliateBps?: string
  apiKey: string
}): Promise<Result<BebopSolanaQuoteResponse, SwapErrorRight>> => {
  // Use dummy address for rate quotes (same as EVM)
  const address = receiveAddress || '11111111111111111111111111111112'

  return fetchBebopSolanaQuote({
    buyAsset,
    sellAsset,
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
    takerAddress: address,
    receiverAddress: address,
    slippageTolerancePercentageDecimal: '0.01',
    affiliateBps,
    apiKey,
  })
}
```

### 5. Create Solana Trade Quote Handler (`getBebopSolanaTradeQuote/getBebopSolanaTradeQuote.ts`)

**Following ButterSwap's VersionedTransaction decompilation pattern:**

```typescript
import {
  VersionedTransaction,
  TransactionMessage,
  AddressLookupTableAccount,
  PublicKey
} from '@solana/web3.js'
import type { solana } from '@shapeshiftoss/chain-adapters'
import { v4 as uuid } from 'uuid'

export async function getBebopSolanaTradeQuote(
  input: CommonTradeQuoteInput & { chainId: KnownChainIds.SolanaMainnet },
  assertGetSolanaChainAdapter: (chainId: ChainId) => solana.ChainAdapter,
  assetsById: AssetsByIdPartial,
  apiKey: string,
): Promise<Result<TradeQuote, SwapErrorRight>> {
  const {
    sellAsset,
    buyAsset,
    accountNumber,
    sendAddress,
    receiveAddress,
    affiliateBps,
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
  } = input

  // Validate Solana chains
  if (!isSolanaChainId(sellAsset.chainId) || !isSolanaChainId(buyAsset.chainId)) {
    return Err(
      makeSwapErrorRight({
        message: 'Both assets must be on Solana',
        code: TradeQuoteError.UnsupportedChain,
      }),
    )
  }

  if (!sendAddress || !receiveAddress) {
    return Err(
      makeSwapErrorRight({
        message: 'sendAddress and receiveAddress are required for Solana',
        code: TradeQuoteError.UnknownError,
      }),
    )
  }

  const slippageTolerancePercentageDecimal =
    input.slippageTolerancePercentageDecimal ??
    getDefaultSlippageDecimalPercentageForSwapper(SwapperName.Bebop)

  const maybeBebopQuoteResponse = await fetchBebopSolanaQuote({
    buyAsset,
    sellAsset,
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
    takerAddress: sendAddress,
    receiverAddress: receiveAddress,
    slippageTolerancePercentageDecimal,
    affiliateBps,
    apiKey,
  })

  if (maybeBebopQuoteResponse.isErr()) return Err(maybeBebopQuoteResponse.unwrapErr())
  const bebopQuoteResponse = maybeBebopQuoteResponse.unwrap()

  // Extract token data (only one each for Solana)
  const sellTokenAddress = Object.keys(bebopQuoteResponse.sellTokens)[0]
  const buyTokenAddress = Object.keys(bebopQuoteResponse.buyTokens)[0]
  const sellTokenData = bebopQuoteResponse.sellTokens[sellTokenAddress]
  const buyTokenData = bebopQuoteResponse.buyTokens[buyTokenAddress]

  // Deserialize transaction to get instructions (following ButterSwap pattern)
  const adapter = assertGetSolanaChainAdapter(sellAsset.chainId)

  const maybeSolanaTransactionMetadata = await (async () => {
    try {
      const txBytes = Buffer.from(bebopQuoteResponse.solana_tx, 'base64')
      const versionedTransaction = VersionedTransaction.deserialize(txBytes)

      // Get address lookup table accounts if present
      const addressLookupTableAccountKeys = versionedTransaction.message.addressTableLookups.map(
        lookup => lookup.accountKey.toString(),
      )

      const addressLookupTableAccountsInfos = await adapter.getAddressLookupTableAccounts(
        addressLookupTableAccountKeys,
      )

      const addressLookupTableAccounts = addressLookupTableAccountsInfos.map(
        info =>
          new AddressLookupTableAccount({
            key: new PublicKey(info.key),
            state: AddressLookupTableAccount.deserialize(new Uint8Array(info.data)),
          }),
      )

      // Decompile VersionedMessage to get instructions
      const instructions = TransactionMessage.decompile(versionedTransaction.message, {
        addressLookupTableAccounts,
      }).instructions

      return Ok({
        instructions,
        addressLookupTableAddresses: addressLookupTableAccountKeys,
      })
    } catch (error) {
      return Err(
        makeSwapErrorRight({
          message: `Error decompiling Bebop transaction: ${error}`,
          code: TradeQuoteError.InvalidResponse,
        }),
      )
    }
  })()

  if (maybeSolanaTransactionMetadata.isErr()) {
    return Err(maybeSolanaTransactionMetadata.unwrapErr())
  }

  const solanaTransactionMetadata = maybeSolanaTransactionMetadata.unwrap()

  const rate = calculateRate({
    buyAmount: buyTokenData.amount,
    sellAmount: sellTokenData.amount,
    buyAsset,
    sellAsset,
  })

  // Network fee should be 0 for gasless=false
  const networkFeeCryptoBaseUnit = bebopQuoteResponse.gasFee.native || '0'

  return Ok({
    id: uuid(),
    quoteOrRate: 'quote' as const,
    receiveAddress,
    affiliateBps,
    slippageTolerancePercentageDecimal,
    rate,
    swapperName: SwapperName.Bebop,
    priceImpactPercentageDecimal: bebopQuoteResponse.priceImpact?.toString(),
    steps: [
      {
        estimatedExecutionTimeMs: undefined, // Solana is fast
        allowanceContract: '0x0', // No allowances on Solana
        buyAsset,
        sellAsset,
        accountNumber,
        rate,
        feeData: {
          protocolFees: {}, // Bebop doesn't charge visible protocol fees
          networkFeeCryptoBaseUnit,
          chainSpecific: {
            computeUnits: '200000', // Will be calculated properly in getUnsignedSolanaTransaction
            priorityFee: '0',
          },
        },
        buyAmountBeforeFeesCryptoBaseUnit: buyTokenData.amountBeforeFee || buyTokenData.amount,
        buyAmountAfterFeesCryptoBaseUnit: buyTokenData.amount,
        sellAmountIncludingProtocolFeesCryptoBaseUnit: sellTokenData.amount,
        source: SwapperName.Bebop,
        solanaTransactionMetadata, // Store deserialized instructions
      },
    ] as SingleHopTradeQuoteSteps,
  })
}
```

### 6. Create Solana Trade Rate Handler (`getBebopSolanaTradeRate/getBebopSolanaTradeRate.ts`)

Similar to quote but:
- Use dummy address if no receiveAddress
- Return `accountNumber: undefined`
- Skip transaction deserialization (not needed for rates)

### 7. Update API Endpoints (`endpoints.ts`)

```typescript
import { getSolanaTransactionFees } from '../../solana-utils/getSolanaTransactionFees'
import { getUnsignedSolanaTransaction } from '../../solana-utils/getUnsignedSolanaTransaction'
import { isSolanaChainId } from './utils/helpers/helpers'
import { getBebopSolanaTradeQuote } from './getBebopSolanaTradeQuote/getBebopSolanaTradeQuote'
import { getBebopSolanaTradeRate } from './getBebopSolanaTradeRate/getBebopSolanaTradeRate'

export const bebopApi: SwapperApi = {
  getTradeQuote: async (input, deps) => {
    // Route to Solana handler if Solana chain
    if (isSolanaChainId(input.sellAsset.chainId)) {
      const tradeQuoteResult = await getBebopSolanaTradeQuote(
        input as CommonTradeQuoteInput & { chainId: KnownChainIds.SolanaMainnet },
        deps.assertGetSolanaChainAdapter,
        deps.assetsById,
        deps.config.VITE_BEBOP_API_KEY,
      )
      return tradeQuoteResult.map(tradeQuote => [tradeQuote])
    }

    // Existing EVM logic
    const tradeQuoteResult = await getBebopTradeQuote(
      input as GetEvmTradeQuoteInputBase,
      deps.assertGetEvmChainAdapter,
      deps.assetsById,
      deps.config.VITE_BEBOP_API_KEY,
    )
    return tradeQuoteResult.map(tradeQuote => [tradeQuote])
  },

  getTradeRate: async (input, deps) => {
    // Similar routing for rate quotes
    if (isSolanaChainId(input.sellAsset.chainId)) {
      const tradeRateResult = await getBebopSolanaTradeRate(
        input,
        deps.assertGetSolanaChainAdapter,
        deps.assetsById,
        deps.config.VITE_BEBOP_API_KEY,
      )
      return tradeRateResult.map(tradeRate => [tradeRate])
    }

    // Existing EVM logic
    const tradeRateResult = await getBebopTradeRate(
      input as GetEvmTradeRateInput,
      deps.assertGetEvmChainAdapter,
      deps.assetsById,
      deps.config.VITE_BEBOP_API_KEY,
    )
    return tradeRateResult.map(tradeRate => [tradeRate])
  },

  // Add Solana transaction methods (following Jupiter/Relay/ButterSwap pattern)
  getUnsignedSolanaTransaction,
  getSolanaTransactionFees,

  // Existing EVM methods
  getUnsignedEvmTransaction: async ({ /* ... */ }) => { /* existing */ },
  getEvmTransactionFees: async ({ /* ... */ }) => { /* existing */ },

  checkTradeStatus: (input) => {
    const { chainId } = input
    return isSolanaChainId(chainId)
      ? checkSolanaSwapStatus(input)
      : checkEvmSwapStatus(input)
  },
}
```

### 8. Update Swapper (`BebopSwapper.ts`)

```typescript
import { executeSolanaTransaction } from '../../utils'

export const bebopSwapper: Swapper = {
  executeEvmTransaction,
  executeSolanaTransaction, // Add Solana execution (standard pattern)
}
```

### 9. Testing Checklist

- [ ] Native SOL → Token swaps (use `solAssetId`)
- [ ] Token → Native SOL swaps
- [ ] Token → Token swaps (USDC ↔ USDT)
- [ ] Large amounts (check liquidity error handling)
- [ ] Invalid token addresses (proper error messages)
- [ ] Missing required parameters
- [ ] Affiliate fee handling (`fee` parameter)
- [ ] Transaction deserialization (VersionedTransaction)
- [ ] Address lookup table handling
- [ ] Instruction parsing and storage
- [ ] Network fee calculation (should be 0 for gasless=false)

### 10. Type Checks and Validation

```bash
yarn type-check
yarn lint --fix
```

## Key Implementation Notes

### Transaction Handling Pattern
Following the **ButterSwap pattern** (most similar to Bebop's response):
1. Deserialize base64 `solana_tx` → `VersionedTransaction`
2. Load address lookup tables if present
3. Decompile message to get instructions
4. Store in `solanaTransactionMetadata.instructions`
5. Use standard `getUnsignedSolanaTransaction` for execution

### Critical Details
1. **Always use `gasless=false`** - We handle transaction execution ourselves
2. **WSOL Address** - Native SOL uses `So11111111111111111111111111111111111111112`
3. **No Multi-token** - Solana only supports 1:1 swaps (returns error 101)
4. **Status Codes**:
   - `QUOTE_SUCCESS` - gasless=true (Bebop executes)
   - `QUOTE_INDIC_ROUTE` - gasless=false (self-execute) ✅
5. **Error Codes**:
   - 102: `InsufficientLiquidity` (tested with large amounts)
   - 101: `InvalidApiRequest` (invalid addresses, multi-token)
   - 500: `UnknownError` (buy_amounts parameter)
6. **Transaction Format** - Base64 encoded VersionedTransaction with:
   - Version: 0
   - ~8 static account keys
   - 3 compiled instructions
   - 1 address lookup table
7. **Token Support** - Works with tokens beyond the 3 in token-info (JUP tested)

## API Response Example (gasless=false)

```json
{
  "quoteId": "121-130947180405096496844699833776839001867",
  "status": "QUOTE_INDIC_ROUTE",
  "chainId": 2,
  "taker": "DRpbCBMxVnDK7maPM5tGv6MvB3v1sRMC86PZ8okm21KW",
  "receiver": "CuieVDEDtLo7FypA9SbLM9saXFdb1dsshEkyErMqkRQq",
  "expiry": 1765541175,
  "slippage": 0,
  "gasFee": { "native": "0", "usd": 0 },
  "buyTokens": {
    "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v": {
      "amount": "13845232",
      "symbol": "USDC",
      "priceImpact": -0.0013225011698168277
    }
  },
  "sellTokens": {
    "So11111111111111111111111111111111111111112": {
      "amount": "100000000",
      "symbol": "WSOL"
    }
  },
  "solana_tx": "AgAAAAA...", // 872 chars base64
  "blockhash": "6ospwWHQZmsK3Qe4wGgbfdoddj2C79CozdBUvpB4gXpS",
  "makers": ["🦊"]
}
```

## Next Steps

1. Implement according to this plan
2. Run type checks after each major component
3. Test with real transactions
4. Add unit tests for new functions
5. Update README with Solana support notes

## Post-Implementation
- Consider adding more Solana tokens as they become available
- Monitor for API updates that might add buy_amounts support
- Watch for multi-token support (currently returns error)