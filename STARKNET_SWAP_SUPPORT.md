# Starknet Swap Support Implementation

## Overview
Starknet has been integrated as a second-class citizen chain with full NEAR Intents swap support (both buy and sell).

## Key Implementation Files

### 1. Trade Quote/Rate Input Builder
**File**: `src/components/MultiHopTrade/hooks/useGetTradeQuotes/getTradeQuoteOrRateInput.ts`

**Critical Implementation**: Lines 239-256
```typescript
case CHAIN_NAMESPACE.Starknet: {
  const sellAssetChainAdapter = assertGetStarknetChainAdapter(sellAsset.chainId)

  const sendAddress =
    wallet && sellAccountNumber !== undefined
      ? await sellAssetChainAdapter.getAddress({
          accountNumber: sellAccountNumber,
          wallet,
          pubKey,
        })
      : undefined

  return {
    ...tradeQuoteInputCommonArgs,
    chainId: sellAsset.chainId,
    sendAddress,
  } as GetTradeQuoteInput
}
```

**What This Does**: Enables the swap UI to build trade input objects for Starknet, allowing users to sell STRK and other Starknet tokens.

### 2. NEAR Intents Swapper Integration

#### Supported Chains
**File**: `packages/swapper/src/swappers/NearIntentsSwapper/types.ts`
- Starknet added to `nearIntentsSupportedChainIds` (line 24)
- Chain mapping: `starknetChainId` → `'starknet'` (line 45)

#### Asset ID Resolution
**File**: `packages/swapper/src/swappers/NearIntentsSwapper/utils/helpers/helpers.ts`
- Starknet added to `TOKEN_LOOKUP_CHAINS` (line 43)
- Uses API token lookup due to hashed asset ID format (lines 52-93)

#### Fee Estimation
**File**: `packages/swapper/src/swappers/NearIntentsSwapper/swapperApi/getTradeQuote.ts`
- Starknet fee handling (lines 254-260)
- Uses hardcoded fees from chain adapter (no dynamic estimation)

#### Transaction Building
**File**: `packages/swapper/src/swappers/NearIntentsSwapper/endpoints.ts`
- `getUnsignedStarknetTransaction` implementation
- `getStarknetTransactionFees` implementation

#### Transaction Execution
**File**: `packages/swapper/src/utils.ts`
- `executeStarknetTransaction` utility function (lines 198-203)

**File**: `packages/swapper/src/swappers/NearIntentsSwapper/NearIntentsSwapper.ts`
- Wired up `executeStarknetTransaction` to swapper

### 3. Chain Adapter Utilities
**File**: `src/lib/utils/starknet.ts` (CREATED)
- `assertGetStarknetChainAdapter`: Type-safe accessor for Starknet chain adapter
- `isStarknetChainAdapter`: Type guard for Starknet adapter
- `getStarknetTransactionStatus`: Transaction status polling utility

### 4. Type Definitions
**File**: `packages/swapper/src/types.ts`
- `StarknetSwapperDeps` (lines 304-306)
- `StarknetTransactionExecutionProps` (lines 458-460)
- `StarknetTransactionExecutionInput` (lines 795-797)
- `GetUnsignedStarknetTransactionArgs` (lines 495-497)
- `executeStarknetTransaction` in Swapper interface (lines 715-718)
- `getUnsignedStarknetTransaction` in SwapperApi (lines 606-608)
- `getStarknetTransactionFees` in SwapperApi (line 616)

### 5. Swapper Dependencies Wiring
**File**: `src/state/apis/swapper/helpers/swapperApiHelpers.ts`
- Added `assertGetStarknetChainAdapter` to `createSwapperDeps`

**File**: `src/lib/tradeExecution.ts`
- Added `assertGetStarknetChainAdapter` to trade status checking

**File**: `src/pages/RFOX/components/Stake/Bridge/hooks/useRfoxBridge.ts`
- Added `assertGetStarknetChainAdapter` to swapper dependencies

### 6. Transaction Status Polling
**File**: `src/hooks/useActionCenterSubscribers/useSendActionSubscriber.tsx`
- Added Starknet case for transaction status polling (uses `getStarknetTransactionStatus`)

## Second-Class Citizen Status

Starknet is configured as a "second-class citizen" chain in `src/constants/chains.ts` (line 14).

**What This Means**:
- Special transaction handling and polling
- Initially supported only as receive-only (buy-side)
- **Now fully supports both buy AND sell** via NEAR Intents

**Important**: Second-class chains CAN be used as source chains for swaps via NEAR Intents. The "second-class" designation refers to transaction handling, not swap capability.

## Common Troubleshooting

### Issue: "Starknet swaps are not yet supported" Error
**Location**: `src/components/MultiHopTrade/hooks/useGetTradeQuotes/getTradeQuoteOrRateInput.ts`

**Solution**: Implement the `CHAIN_NAMESPACE.Starknet` case in the switch statement (lines 239-256) as shown above.

### Issue: No Quotes Appearing
**Potential Causes**:
1. Missing Starknet case in `getTradeQuoteOrRateInput.ts` (most common)
2. NEAR Intents API key not configured (`VITE_NEAR_INTENTS_API_KEY`)
3. Feature flag disabled (`VITE_FEATURE_NEAR_INTENTS_SWAP`)
4. Missing asset in NEAR Intents token list

### Issue: Token Not Found in NEAR Intents
**Check**: `assetToNearIntentsAsset` function in `helpers.ts` - Starknet uses API token lookup
**Debug**: Add console logs to see token matching results

## Testing

To test Starknet swap support:
1. Enable feature flag: `VITE_FEATURE_NEAR_INTENTS_SWAP=true`
2. Configure API key: `VITE_NEAR_INTENTS_API_KEY=<key>`
3. Select STRK (Starknet) or any Starknet token as sell asset
4. Select a destination asset on any supported chain
5. Enter amount and verify quotes appear from NEAR Intents

## References

- NEAR Intents Starknet Integration Announcement: December 2024
- NEAR Intents supports 20+ chains including Starknet
- Starknet uses hashed asset IDs requiring API token lookup
