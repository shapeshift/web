# Swap Notification Amount Discrepancy Bug - Investigation Findings

**Issue**: GitHub #11488 - Swap notifications show different amounts than what user saw on confirm screen

**Date**: 2025-12-22

## Root Cause

**Swap and Quote are two separate entities that are OUT OF SYNC.**

- **Quote** gets updated with final amount from Relay API
- **Swap** is created with OLD/stale quote amount
- **Notification** displays swap's amount (which is wrong)

## Example from Latest Test

### What User Saw
- TradeConfirm screen: **2.107790 XPL** (from Relay API response)

### What Got Created
- Swap object: **2.107741 XPL** (old quote)
- Notification: **2.107741 XPL** (from swap object)

### Discrepancy
- **0.000049 XPL difference** (~0.0023%)

## Timeline from Logs

```
22:41:41.736Z - Quote update: "Relay", 2.107741 XPL
22:41:43.531Z - User clicks "Sign and Broadcast": activeQuote = 2.107741 XPL
22:41:43.531Z - Swap created: expectedBuyAmount = 2.107741 XPL ✗ OLD!
22:41:48.642Z - TRADE QUOTE UPGRADE: New quote = 2.107790 XPL ✓ CORRECT!
22:42:16.481Z - Notification shows: 2.107741 XPL ✗ WRONG!
```

## Key Observations

1. **Two Quote Types Exist**:
   - **TradeRate**: Fast, indicative (ID = swapper name like "Relay")
   - **TradeQuote**: Executable, final (ID = hash like "0xccd02b...")

2. **Quote Upgrade Flow**:
   - Input screen → Rate quote
   - Navigate to confirm → Fetch Trade quote
   - After "Sign and Broadcast" → Fetch FINAL executable quote
   - This final quote has different amount than what swap was created with!

3. **The "TRADE QUOTE UPGRADE" Effect** (`useGetTradeQuotes.tsx` lines 267-311):
   - Runs when `confirmedTradeExecution` exists
   - Processes quote data from `queryStateMeta.data`
   - Sets new quote as both `activeQuote` AND `confirmedQuote`
   - BUT doesn't update the swap object!

4. **Happens Multiple Times**:
   - Effect runs 5-6 times when quote data arrives
   - Each time updates Redux quote state
   - But swap object remains unchanged

## Why This Happens

1. User clicks "Sign and Broadcast"
2. `handleTradeConfirm` reads current `activeQuote` (2.107741)
3. Creates swap with this amount
4. Dispatches `confirmTrade` → sets `confirmedTradeExecution`
5. ~5 seconds later, final executable quote arrives (2.107790)
6. Effect processes it, updates `activeQuote` and `confirmedQuote`
7. **Swap object NEVER gets updated with new quote!**
8. Notification fires showing swap's old amount

## The Fix

**Option 1: Update Swap When Final Quote Arrives**
```typescript
// In useGetTradeQuotes.tsx effect (line 267-311)
// After setting confirmedQuote, also update the swap:
const activeSwap = swapsById[swapId]
if (activeSwap) {
  dispatch(swapSlice.actions.upsertSwap({
    ...activeSwap,
    expectedBuyAmountCryptoBaseUnit: newQuote.buyAmount,
    expectedBuyAmountCryptoPrecision: fromBaseUnit(...)
  }))
}
```

**Option 2: Don't Create Swap Until Final Quote**
- Wait for `isExecutableTradeQuote(activeQuote) === true` before allowing broadcast
- Only create swap when we have the FINAL executable quote

**Option 3: Lock Quote Before Swap Creation**
- Set `confirmedQuote` BEFORE clicking "Sign and Broadcast"
- Prevent any quote updates once user is on confirm screen
- Use the locked quote for swap creation

## Files Involved

### Quote Management
- `src/state/slices/tradeQuoteSlice/tradeQuoteSlice.ts` - Redux slice managing quotes
- `src/state/slices/tradeQuoteSlice/selectors.ts` - `selectActiveQuote`, `selectConfirmedQuote`
- `src/components/MultiHopTrade/hooks/useGetTradeQuotes/useGetTradeQuotes.tsx` - Quote fetching and upgrade logic

### Swap Creation
- `src/components/MultiHopTrade/components/TradeConfirm/hooks/useTradeButtonProps.tsx:173` - Creates swap object from `activeQuote`
- `src/state/slices/swapSlice/swapSlice.ts` - Redux slice managing swaps

### Notification Display
- `src/components/Layout/Header/ActionCenter/components/Notifications/SwapNotification.tsx:79` - Shows `swap.expectedBuyAmountCryptoPrecision`
- `src/hooks/useActualBuyAmountCryptoPrecision.ts` - Resolves amount to display

### Trade Execution
- `src/components/MultiHopTrade/components/TradeConfirm/hooks/useTradeExecution.tsx:191` - Fires initial notification
- `src/hooks/useActionCenterSubscribers/useSwapActionSubscriber.tsx` - Polls swap status, fires success notification

## Second Class Chains Relevance

Bug appears MORE with second class chains (Plasma, Monad, Tron, Sui, HyperEvm) because:
- These chains require special tx parsing to get actual amounts
- More complex flow increases chance of timing issues
- Quote updates might be more frequent/varied for these chains

## Recommended Solution

**Update the swap object when the final executable quote arrives:**

```typescript
// useGetTradeQuotes.tsx line ~310
dispatch(tradeQuoteSlice.actions.setActiveQuote(quoteData))
dispatch(tradeQuoteSlice.actions.setConfirmedQuote(quoteData.quote))

// ADD THIS: Update swap with new expected amount
const lastStep = quoteData.quote.steps[quoteData.quote.steps.length - 1]
const swapId = confirmedTradeExecution.swapId
const activeSwap = swapsById[swapId]
if (activeSwap && lastStep) {
  dispatch(swapSlice.actions.upsertSwap({
    ...activeSwap,
    expectedBuyAmountCryptoBaseUnit: lastStep.buyAmountAfterFeesCryptoBaseUnit,
    expectedBuyAmountCryptoPrecision: fromBaseUnit(
      lastStep.buyAmountAfterFeesCryptoBaseUnit,
      lastStep.buyAsset.precision
    )
  }))
}
```

This ensures the swap always reflects the FINAL quote that was actually executed, and the notification will show the correct amount.

## Implementation Status

**IMPLEMENTED** - 2025-12-22

The fix has been implemented in `src/components/MultiHopTrade/hooks/useGetTradeQuotes/useGetTradeQuotes.tsx`.

### Changes Made:

1. **Added imports** (lines 29, 34-36):
   - `fromBaseUnit` from `@/lib/math`
   - `selectWalletSwapsById` from selectors
   - `swapSlice` from swap slice

2. **Added selectors** (lines 70-71):
   - `swapsById` to access swap objects
   - `activeSwapId` to get the current active swap ID

3. **Updated quote upgrade effect** (lines 322-366):
   - After updating `activeQuote` and `confirmedQuote`, now also updates the swap object
   - Uses `activeSwapId` to find the correct swap
   - Updates `expectedBuyAmountCryptoBaseUnit` and `expectedBuyAmountCryptoPrecision`
   - Includes debug logging to track the swap update

### Testing:

The fix should be tested by:
1. Performing a swap on a second-class chain (Plasma, Monad, Tron, Sui, HyperEvm)
2. Checking that the notification amount matches the final quote amount shown on the confirm screen
3. Verifying the console logs show the swap being updated with the new amount
4. Confirming no regression for first-class chains
