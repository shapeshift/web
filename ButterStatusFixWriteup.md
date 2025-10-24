# ButterSwap Status Detection Fix

## The Problem

ButterSwap cross-chain swaps were stuck showing "Unknown" status indefinitely, breaking trade completion detection and event metrics.

## Root Cause

The code was calling **two API endpoints** to check swap status:

1. **First call:** `/api/queryBridgeInfoBySourceHash?hash=<txHash>` ✅ (working)
   - Returns basic bridge info with a `butterId`
   - Used to get the ID for the second call

2. **Second call:** `/api/queryBridgeInfoById?id=<butterId>` ❌ (404 NOT FOUND)
   - **This endpoint does not exist on Butter's servers**
   - Always returns 404, causing the status check to fail
   - Returns `status: TxStatus.Unknown` on every polling attempt

### Why Swaps Were Stuck in Limbo

The code was waiting for the `toHash` (destination transaction hash) to mark swaps as complete:

```typescript
// This was checking detailedInfo from the BROKEN endpoint
if (!!destinationTxHash) return TxStatus.Confirmed
```

**But `toHash` was never going to exist** because:
- The broken endpoint (`/api/queryBridgeInfoById`) returns 404
- When the API call fails, we return `TxStatus.Unknown`
- The polling loop keeps retrying the same broken endpoint forever
- The swap remains in "Unknown" status indefinitely, even after completing on-chain

## The Solution

**Remove the broken second API call entirely.** The first endpoint already contains all the data we need!

### Endpoint We Now Use

`/api/queryBridgeInfoBySourceHash?hash=<txHash>` contains everything:

```typescript
{
  id: number,           // Bridge swap ID
  state: number,        // 0=pending, 1=confirmed, 6=failed
  toHash: string | null,      // ✅ Destination tx hash
  relayerHash: string | null, // ✅ Relayer tx hash
  relayerChain: ChainInfo,    // ✅ Relayer chain info
  // ... all other fields
}
```

### How the Fix Works

Now we make **one API call** and get complete status:

```typescript
const bridgeInfo = await getBridgeInfoBySourceHash(txHash)

// Optimistically confirm when destination tx exists
if (bridgeInfo.toHash) {
  return TxStatus.Confirmed
}

// Otherwise use the state field
switch (bridgeInfo.state) {
  case 1: return TxStatus.Confirmed
  case 0: return TxStatus.Pending
  case 6: return TxStatus.Failed
}
```

**Key insight:** The `toHash` field now actually populates because we're calling a working endpoint. When the bridge completes the swap, `toHash` appears in the response, and we immediately detect completion.

## What Changed

### Removed:
- ❌ `getBridgeInfoById()` function (calls broken 404 endpoint)
- ❌ `butterIdCache` Map (no longer need to cache IDs between calls)
- ❌ Second API call logic
- ❌ Excessive debug logging

### Updated:
- ✅ `BridgeInfo` type - Made fields nullable, added relayer fields
- ✅ `checkTradeStatus()` - Simplified to single API call
- ✅ Tests - Updated mocks to reflect new flow

### Net Result:
```
4 files changed, 46 insertions(+), 105 deletions(-)
```

**-59 lines of code removed** 🎉

## Impact

- ✅ Cross-chain swaps now properly detect completion
- ✅ Trade event metrics now track correctly
- ✅ Users see "Completed" status instead of stuck "Unknown"
- ✅ Destination tx hash shows when available
- ✅ Relayer tx hash and explorer link now visible
- ✅ Same-chain swaps unaffected (they bypass bridge API entirely)

## References

- **Issue:** #10909 - Butter swaps not detecting completed swap
- **Butter API Docs:** https://docs.butternetwork.io/butter-swap-integration/butter-api-for-swap-data/get-swap-history-by-source-hash
- **Working Endpoint:** `https://bs-app-api.chainservice.io/api/queryBridgeInfoBySourceHash?hash=<txHash>`
- **Broken Endpoint:** `https://bs-app-api.chainservice.io/api/queryBridgeInfoById?id=<id>` (404)
