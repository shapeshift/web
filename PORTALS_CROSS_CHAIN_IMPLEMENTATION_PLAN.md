# Portals Cross-Chain Swap Implementation Plan

## Overview
This plan outlines the implementation of cross-chain swap support for the Portals swapper. Portals API already supports cross-chain swaps via Axelar bridge, but the ShapeShift integration currently rejects cross-chain requests.

## Current State Analysis

### What Works (Same-Chain)
- Portals API integration for same-chain swaps via `/v2/portal` and `/v2/portal/estimate`
- Standard EVM transaction execution via `executeEvmTransaction`
- Status detection via `checkEvmSwapStatus` (checks source chain tx only)
- Quote/rate fetching with validation
- Fee estimation and transaction building

### What Doesn't Work (Cross-Chain)
- Line 70-78 in `getPortalsTradeQuote.ts` explicitly rejects cross-chain swaps with `CrossChainNotSupported` error
- `checkEvmSwapStatus` only checks source chain, doesn't track bridge status or destination chain
- No handling of cross-chain specific metadata (expiry, bridge steps, routing)
- No destination chain transaction hash tracking
- Execution time incorrectly set to 0ms (should be 1-10 minutes for cross-chain)

## Reference Implementations

### ButterSwap Pattern (Most Similar)
**File:** `/packages/swapper/src/swappers/ButterSwap/swapperApi/checkTradeStatus.ts`
- Detects same-chain vs cross-chain by comparing `swap.sellAsset.chainId` with `swap.buyAsset.chainId`
- Same-chain: uses standard `checkEvmSwapStatus`
- Cross-chain: queries ButterSwap's bridge API (`getBridgeInfoBySourceHash`) to get:
  - Bridge state (pending/confirmed/failed)
  - Destination tx hash (`toHash`)
  - Relayer tx hash and explorer link
- Returns `TradeStatus` with:
  - `status`: TxStatus enum (Pending/Confirmed/Failed/Unknown)
  - `buyTxHash`: destination chain tx hash
  - `relayerTxHash`: optional relayer tx
  - `relayerExplorerTxLink`: optional tracking link

### ArbitrumBridge Pattern
**File:** `/packages/swapper/src/swappers/ArbitrumBridgeSwapper/endpoints.ts`
- Custom `checkTradeStatus` implementation
- Checks source chain tx with `checkEvmSwapStatus`
- Uses Arbitrum SDK to get destination tx hash from source tx
- Checks destination tx status
- Returns combined status with `buyTxHash`

## Portals Cross-Chain API Behavior

### Request
Standard `/v2/portal` endpoint with tokens on different networks:
```
inputToken=ethereum:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48
outputToken=arbitrum:0xaf88d065e77c8cc2239327c5edb3a432268e5831
```

### Response Differences (Cross-Chain vs Same-Chain)

**Cross-Chain Response Additions:**
- `context.steps`: Array showing bridge operations (e.g., `["Bridge USDC to Arbitrum", "Swap USDC.axl to USDC"]`)
- `context.route`: Token symbols including bridged tokens (e.g., `["USDC", "USDC.axl", "USDC"]`)
- `context.expiry`: Unix timestamp when quote expires (cross-chain quotes expire faster)
- `tx.value`: Includes bridge fees (e.g., `22714680400726` wei vs `0` for same-chain)

**Tested Example:**
```json
{
  "tx": {
    "value": "22714680400726",  // Bridge fees included
    "gasLimit": "260000"
  },
  "context": {
    "orderId": "6f4ca6339f18f5f23608e1da87343b6c",
    "steps": [
      "Bridge USDC to Arbitrum",
      "Swap USDC.axl to USDC"
    ],
    "route": ["USDC", "USDC.axl", "USDC"],
    "expiry": "1764804836",  // Quote expires
    "slippageTolerancePercentage": 0.18
  }
}
```

## Transaction Status Detection Strategy

### Axelar GMP Tracking
Portals uses Axelar bridge for cross-chain swaps. Two tracking options:

#### Option 1: Axelarscan API (Recommended)
- Endpoint: `https://api.axelarscan.io/gmp/searchGMP?txHash={sourceTxHash}`
- Returns bridge status and destination tx hash
- No SDK dependency required
- Public API, no authentication needed
- May need to handle rate limiting

#### Option 2: AxelarJS SDK
- Package: `@axelar-network/axelarjs-sdk`
- API: `AxelarGMPRecoveryAPI.queryTransactionStatus(txHash)`
- More robust, includes recovery features
- Adds npm dependency
- Status values: `source_gateway_called`, `destination_gateway_approved`, `destination_executed`, `error`, etc.

### Recommended Approach: Axelarscan API
Advantages:
- No new dependencies
- Consistent with other swappers (ButterSwap uses REST API)
- Simpler to maintain
- Public tracking link: `https://axelarscan.io/gmp/{txHash}`

### Fallback: Balance Polling
If Axelarscan API fails or is unavailable:
- Poll recipient's balance on destination chain
- Use existing portfolio balance endpoints
- Less precise but more resilient

## Implementation Steps

### 1. Update Types (`types.ts`)
Add cross-chain metadata to trade quote step:
```typescript
type PortalsTransactionMetadata = {
  to: string
  from: string
  data: string
  value: string
  gasLimit: string
  // Add cross-chain fields
  isCrossChain?: boolean
  buyAssetChainId?: ChainId  // Destination chain for cross-chain
  expiry?: number  // Unix timestamp
  steps?: string[]  // Bridge steps from API
  route?: string[]  // Token route
}
```

### 2. Remove Cross-Chain Rejection (`getPortalsTradeQuote.ts`)
**Current (lines 70-78):**
```typescript
if (sellAssetChainId !== buyAssetChainId) {
  return Err(
    makeSwapErrorRight({
      message: `cross-chain not supported - both assets must be on chainId ${sellAsset.chainId}`,
      code: TradeQuoteError.CrossChainNotSupported,
      details: { buyAsset, sellAsset },
    }),
  )
}
```

**Change to:**
```typescript
const isCrossChain = sellAssetChainId !== buyAssetChainId
```

### 3. Update Network Mapping (if needed)
Verify all Portals supported chains are in `chainIdToPortalsNetwork`:
- Ethereum, Arbitrum, Avalanche, Polygon, BSC, Optimism, Gnosis, Base

### 4. Update Trade Quote Building (`getPortalsTradeQuote.ts`)
**Changes needed:**

a) **Set correct execution time:**
```typescript
// Line ~269, currently:
estimatedExecutionTimeMs: 0,  // Instant for same-chain

// Change to:
estimatedExecutionTimeMs: isCrossChain ? 300000 : 0,  // 5 min average for cross-chain, instant for same-chain
```

b) **Store cross-chain metadata:**
```typescript
portalsTransactionMetadata: {
  ...tx,
  isCrossChain,
  buyAssetChainId: isCrossChain ? buyAssetChainId : undefined,
  expiry: portalsTradeOrderResponse.context.expiry ?
    Number(portalsTradeOrderResponse.context.expiry) : undefined,
  steps: portalsTradeOrderResponse.context.steps,
  route: portalsTradeOrderResponse.context.route,
}
```

### 5. Update Trade Rate (`getPortalsTradeRate.tsx`)
Apply similar changes:
- Remove cross-chain rejection (lines ~70-78)
- Detect cross-chain with `isCrossChain = sellAssetChainId !== buyAssetChainId`
- Don't need to store metadata (rates are non-executable)

### 6. Implement Custom Status Checking (`endpoints.ts`)
**Current:**
```typescript
checkTradeStatus: checkEvmSwapStatus,
```

**Change to custom implementation:**
```typescript
checkTradeStatus: async ({
  txHash,
  chainId,
  swap,
  assertGetEvmChainAdapter,
  address,
  fetchIsSmartContractAddressQuery,
}) => {
  // Detect if this is a cross-chain swap
  const isCrossChain = swap && swap.sellAsset.chainId !== swap.buyAsset?.chainId

  // Same-chain swaps: use standard EVM status check
  if (!isCrossChain) {
    return checkEvmSwapStatus({
      txHash,
      chainId,
      address,
      assertGetEvmChainAdapter,
      fetchIsSmartContractAddressQuery,
    })
  }

  // Cross-chain swaps: need to track bridge status

  // 1. Check source chain tx status
  const sourceTxStatus = await checkEvmSwapStatus({
    txHash,
    chainId,
    address,
    assertGetEvmChainAdapter,
    fetchIsSmartContractAddressQuery,
  })

  // If source tx is still pending or failed, return that status
  if (sourceTxStatus.status === TxStatus.Pending ||
      sourceTxStatus.status === TxStatus.Unknown) {
    return {
      status: TxStatus.Pending,
      buyTxHash: undefined,
      message: 'Source transaction pending',
    }
  }

  if (sourceTxStatus.status === TxStatus.Failed) {
    return sourceTxStatus
  }

  // 2. Source tx confirmed, check bridge status via Axelarscan
  try {
    const axelarscanResponse = await fetch(
      `https://api.axelarscan.io/gmp/searchGMP?txHash=${txHash}`
    )
    const axelarscanData = await axelarscanResponse.json()

    // Handle no data case (bridge indexer hasn't picked it up yet)
    if (!axelarscanData.data || axelarscanData.data.length === 0) {
      return {
        status: TxStatus.Pending,
        buyTxHash: undefined,
        message: 'Bridge processing',
        relayerExplorerTxLink: `https://axelarscan.io/gmp/${txHash}`,
      }
    }

    const bridgeData = axelarscanData.data[0]

    // Extract destination tx hash based on Axelarscan response structure
    const destinationTxHash = bridgeData.call?.transaction_hash ||
                              bridgeData.executed?.transaction_hash ||
                              undefined

    // Determine status from bridge data
    const bridgeStatus = (() => {
      // If we have destination tx hash, it's confirmed
      if (destinationTxHash) return TxStatus.Confirmed

      // Check Axelar status field
      if (bridgeData.status === 'executed' || bridgeData.status === 'destination_executed') {
        return TxStatus.Confirmed
      }
      if (bridgeData.status === 'error') {
        return TxStatus.Failed
      }

      // Still processing
      return TxStatus.Pending
    })()

    return {
      status: bridgeStatus,
      buyTxHash: destinationTxHash,
      relayerExplorerTxLink: `https://axelarscan.io/gmp/${txHash}`,
      message: bridgeStatus === TxStatus.Pending ? 'Bridge in progress' : undefined,
    }
  } catch (error) {
    // If Axelarscan API fails, return pending with tracking link
    console.error('Failed to fetch Axelarscan bridge status:', error)
    return {
      status: TxStatus.Pending,
      buyTxHash: undefined,
      relayerExplorerTxLink: `https://axelarscan.io/gmp/${txHash}`,
      message: 'Bridge status check failed - track manually',
    }
  }
},
```

### 7. Create Helper File for Axelarscan Integration
**File:** `/packages/swapper/src/swappers/PortalsSwapper/utils/fetchAxelarscanStatus.ts`

```typescript
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import type { SwapErrorRight } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'

type AxelarscanGMPData = {
  status: string
  call?: {
    transaction_hash?: string
  }
  executed?: {
    transaction_hash?: string
  }
  error?: {
    message?: string
  }
}

type AxelarscanResponse = {
  data: AxelarscanGMPData[]
  total: number
}

export type AxelarscanBridgeStatus = {
  status: 'pending' | 'confirmed' | 'failed'
  destinationTxHash?: string
  errorMessage?: string
}

export const fetchAxelarscanBridgeStatus = async (
  sourceTxHash: string
): Promise<Result<AxelarscanBridgeStatus, SwapErrorRight>> => {
  try {
    const response = await fetch(
      `https://api.axelarscan.io/gmp/searchGMP?txHash=${sourceTxHash}`
    )

    if (!response.ok) {
      return Err(
        makeSwapErrorRight({
          message: `Axelarscan API error: ${response.statusText}`,
        })
      )
    }

    const data: AxelarscanResponse = await response.json()

    if (!data.data || data.data.length === 0) {
      // Bridge indexer hasn't picked up the tx yet
      return Ok({
        status: 'pending',
      })
    }

    const bridgeData = data.data[0]

    // Extract destination tx hash
    const destinationTxHash = bridgeData.call?.transaction_hash ||
                              bridgeData.executed?.transaction_hash

    // Determine status
    if (bridgeData.status === 'executed' ||
        bridgeData.status === 'destination_executed' ||
        destinationTxHash) {
      return Ok({
        status: 'confirmed',
        destinationTxHash,
      })
    }

    if (bridgeData.status === 'error') {
      return Ok({
        status: 'failed',
        errorMessage: bridgeData.error?.message || 'Bridge failed',
      })
    }

    // Still processing
    return Ok({
      status: 'pending',
    })
  } catch (error) {
    return Err(
      makeSwapErrorRight({
        message: 'Failed to fetch Axelarscan bridge status',
        cause: error,
      })
    )
  }
}

export const getAxelarscanTrackingLink = (sourceTxHash: string): string =>
  `https://axelarscan.io/gmp/${sourceTxHash}`
```

### 8. Update Trade Quote/Rate Response Types
Ensure `PortalsTradeOrderResponse` type in `fetchPortalsTradeOrder.ts` includes cross-chain fields:
```typescript
type PortalsTradeOrderResponse = {
  context: {
    // ... existing fields
    steps: string[]  // Already present, verify
    route: string[]  // Already present, verify
    expiry?: string  // May need to add if not present
  }
  // ... rest
}
```

### 9. Verify Quote Expiry Handling
Cross-chain quotes have an `expiry` timestamp (Unix seconds). Expired quotes will be rejected when submitted to the blockchain.

**Investigation needed:**
- [ ] Verify quote is refreshed at confirm time (not just at preview time)
- [ ] Check if `expiry` timestamp is validated before transaction submission
- [ ] Ensure UI shows warning if quote is stale
- [ ] Test behavior when user waits too long before confirming

**Current understanding:**
- We fetch a final quote at confirm time (should be safe)
- Need to verify this happens for Portals specifically
- Check if there's a time window between final quote fetch and tx submission

**Files to check:**
- Trade confirmation flow
- Quote refresh logic
- Transaction submission timing

### 10. Testing Strategy

#### Unit Tests
1. Test cross-chain quote fetching (ETH → Arbitrum)
2. Test same-chain quote still works
3. Test status detection for:
   - Source tx pending
   - Source tx confirmed, bridge pending
   - Bridge completed
   - Bridge failed
4. Test Axelarscan API error handling

#### Integration Tests
1. Execute test cross-chain swap on testnet
2. Verify quote expiry handling
3. Verify status updates correctly poll bridge
4. Verify destination tx hash appears when available

#### Manual Testing
1. Small cross-chain swap (e.g., $10 USDC Ethereum → Arbitrum)
2. Monitor status updates in UI
3. Verify Axelarscan tracking link works
4. Verify final destination tx appears

### 11. Edge Cases & Error Handling

#### Quote Expiry
- Cross-chain quotes expire (have `expiry` field)
- Need to refresh quote if user waits too long
- UI should show expiry countdown

#### Bridge Failures
- Axelar bridge can fail (insufficient gas, slippage)
- Return `TxStatus.Failed` with clear error message
- Provide Axelarscan link for user to investigate

#### Axelarscan API Unavailable
- Fallback to showing tracking link
- Return `TxStatus.Pending` with message
- Don't block swap execution

#### Long Bridge Times
- Typical: 1-10 minutes
- Some routes may take longer
- Set reasonable polling interval (30 seconds)
- Consider exponential backoff

#### Network-Specific Issues
- Some network pairs may not be supported
- Portals API will return error
- Pass through error to user

## UI/UX Considerations

### Trade Quote Display
- Show "Cross-chain swap" badge/indicator
- Display bridge time estimate (1-10 minutes)
- Show route with bridge step (ETH → USDC → Bridge → USDC)
- Display expiry countdown if applicable

### Status Updates
- "Confirming on Ethereum..." (source chain)
- "Bridging to Arbitrum..." (bridge in progress)
- "Completed on Arbitrum" (destination confirmed)
- Provide Axelarscan tracking link throughout

### Error Messages
- "Bridge failed - check Axelarscan for details"
- "Quote expired - please refresh"
- "Insufficient gas for bridge"

## Risks & Mitigations

### Risk: Axelarscan API Rate Limiting
**Mitigation:**
- Implement exponential backoff
- Cache responses temporarily
- Fallback to manual tracking link

### Risk: Bridge Takes Longer Than Expected
**Mitigation:**
- Don't timeout status checks
- Keep polling until confirmed or failed
- Show "still processing" message after 15 minutes

### Risk: Quote Expiry During User Review
**Mitigation:**
- Show expiry countdown in UI
- Auto-refresh quote when approaching expiry
- Warn user if quote is about to expire

### Risk: Destination Chain RPC Issues
**Mitigation:**
- Don't need to check destination chain directly
- Rely on Axelarscan for status
- Axelarscan aggregates multiple sources

## Performance Considerations

### Quote Fetching
- Cross-chain quotes same speed as same-chain
- API handles routing automatically
- No additional API calls needed

### Status Polling
- Poll every 30 seconds while pending
- Stop polling once confirmed/failed
- Max concurrent polls: 1 per swap

### Gas Estimation
- Bridge fees included in `tx.value` from API
- Don't need separate bridge fee estimation
- Gas limit from API includes buffer

## Rollout Plan

### Phase 1: Core Implementation (This PR)
- Remove cross-chain rejection
- Implement Axelarscan status tracking
- Add cross-chain metadata handling
- Update types and tests

### Phase 2: UI Enhancements (Follow-up)
- Add cross-chain indicators in UI
- Show bridge progress visualization
- Add expiry countdown
- Improve error messages

### Phase 3: Monitoring & Optimization (Post-launch)
- Monitor bridge success rates
- Track common failure modes
- Optimize polling intervals
- Add analytics

## Success Criteria

- [ ] Cross-chain quotes successfully fetched
- [ ] Swaps execute on source chain
- [ ] Bridge status tracked correctly
- [ ] Destination tx hash retrieved when available
- [ ] Axelarscan tracking link provided
- [ ] Same-chain swaps still work
- [ ] Tests pass
- [ ] No new errors in Sentry

## Files to Modify

1. `/packages/swapper/src/swappers/PortalsSwapper/types.ts` - Add cross-chain metadata types
2. `/packages/swapper/src/swappers/PortalsSwapper/getPortalsTradeQuote/getPortalsTradeQuote.ts` - Remove rejection, add metadata
3. `/packages/swapper/src/swappers/PortalsSwapper/getPortalsTradeRate/getPortalsTradeRate.tsx` - Remove rejection
4. `/packages/swapper/src/swappers/PortalsSwapper/endpoints.ts` - Implement custom status check
5. `/packages/swapper/src/swappers/PortalsSwapper/utils/fetchAxelarscanStatus.ts` - New file for Axelarscan integration
6. `/packages/swapper/src/swappers/PortalsSwapper/utils/fetchPortalsTradeOrder.ts` - Verify response types

## Timeline Estimate

- Core implementation: 4-6 hours
- Testing: 2-3 hours
- Code review & revisions: 1-2 hours
- **Total: ~8-11 hours**

## References

- Portals Cross-Chain Docs: https://build.portals.fi/docs/cross-chain
- Axelarscan GMP Tracker: https://axelarscan.io/gmp
- Axelar SDK Docs: https://docs.axelar.dev/dev/axelarjs-sdk/tx-status-query-recovery
- ButterSwap Implementation: `/packages/swapper/src/swappers/ButterSwap/swapperApi/checkTradeStatus.ts`
- ArbitrumBridge Implementation: `/packages/swapper/src/swappers/ArbitrumBridgeSwapper/endpoints.ts`
