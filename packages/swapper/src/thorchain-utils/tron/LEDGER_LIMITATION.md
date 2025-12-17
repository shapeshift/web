# TRON + Ledger + THORChain/MAYAChain Limitation

## Issue

TRON transactions that include a memo field fail when signed with a Ledger hardware wallet, resulting in error:
```
TransportStatusError: Ledger device: UNKNOWN_ERROR (0x6a8b)
```

## Root Cause

The Ledger TRON app cannot parse transactions that contain data in the `raw_data.data` field. This field is populated when using TronWeb's `transactionBuilder.addUpdateData()` method to add memos to transactions.

THORChain and MAYAChain require memos to route swaps correctly, making them incompatible with Ledger devices for TRON transactions.

## Technical Details

### How Memos Are Added

In @packages/chain-adapters/src/tron/TronChainAdapter.ts:
```typescript
if (memo) {
  txData = await tronWeb.transactionBuilder.addUpdateData(txData, memo, 'utf8')
}
```

This adds UTF-8 encoded memo data to the `raw_data.data` field of the transaction.

### Ledger App Limitation

The Ledger TRON app (LedgerHQ/app-tron) has a limited transaction parser that:
- Only supports basic transaction types
- Cannot handle the `raw_data.data` field
- Rejects transactions with `0x6a8b` error before displaying them for signing

### Error Code Meaning

- `0x6a8b`: UNKNOWN_ERROR - The Ledger app cannot parse the transaction structure

## Affected Combinations

| Wallet Type | Swapper | TRON Asset | Result |
|------------|---------|------------|--------|
| Ledger | THORChain | Any | ❌ **Blocked** |
| Ledger | MAYAChain | Any | ❌ **Blocked** |
| Ledger | NearIntents | Any | ✅ Works (no memo) |
| Ledger | Sun.io | Any | ✅ Works (no memo) |
| Native/Mobile | THORChain | Any | ✅ Works |
| Native/Mobile | MAYAChain | Any | ✅ Works |

## Solution Implemented

### Detection & Prevention

Added Ledger detection in @src/components/MultiHopTrade/components/TradeConfirm/hooks/useTradeExecution.tsx:

```typescript
if (isLedger(wallet) && (swapperName === SwapperName.Thorchain || swapperName === SwapperName.Mayachain)) {
  throw new Error(translate('trade.errors.ledgerTronMemoNotSupported'))
}
```

This check runs before transaction execution and displays a user-friendly error message:

> "TRON transactions with memos are not supported on Ledger devices. Please use a different wallet or choose a swapper that doesn't require memos (like NEAR Intents or Sun.io)."

### Translation

Added to @src/assets/translations/en/main.json:
```json
{
  "trade": {
    "errors": {
      "ledgerTronMemoNotSupported": "TRON transactions with memos are not supported on Ledger devices. Please use a different wallet or choose a swapper that doesn't require memos (like NEAR Intents or Sun.io)."
    }
  }
}
```

## Workarounds for Users

Users with Ledger devices who want to trade TRON assets have three options:

1. **Use a different swapper** - Choose NearIntents or Sun.io which don't require memos
2. **Use a different wallet** - Switch to a software wallet (MetaMask, Native, etc.)
3. **Multi-step approach** - Swap TRON to another chain with Ledger, then swap back with THORChain

## Alternative Solutions Considered

### 1. Remove Memo (❌ Not Viable)
THORChain absolutely requires the memo field to:
- Route the swap to the correct destination
- Identify the recipient address
- Include swap parameters (slippage, affiliate fees, etc.)

Without the memo, funds would be lost.

### 2. Alternative Memo Encoding (❌ Not Supported)
Researched other ways to encode memos:
- Different field locations
- Alternative encoding formats
- Transaction type variations

None are supported by the Ledger TRON app.

### 3. Update Ledger App (❌ Outside Our Control)
Would require:
- Forking LedgerHQ/app-tron
- Adding `raw_data.data` parsing support
- Getting Ledger to review and approve
- Users updating their devices

This is a long-term solution requiring Ledger's cooperation.

## Testing

To verify the fix works correctly:

1. **Ledger + THORChain** - Should display error before signing
2. **Ledger + MAYAChain** - Should display error before signing
3. **Ledger + NearIntents** - Should work normally
4. **Native + THORChain** - Should work normally

## References

- Original Issue: TRON transactions with THORChain swapper fail with Ledger
- Ledger TRON App: https://github.com/LedgerHQ/app-tron
- TronWeb Documentation: https://tronweb.network/docu/docs/intro/
- THORChain Documentation: https://dev.thorchain.org/concepts/memo-length-reduction.html
- SwapKit TRON Implementation: https://github.com/swapkit/SwapKit/tree/develop/packages/toolboxes/src/tron

## Future Improvements

1. **UI Prevention** - Disable THORChain/MAYAChain quotes for TRON when Ledger is connected
2. **Better Error Placement** - Show warning at quote selection stage, not execution
3. **Ledger App Update** - Work with Ledger to add `raw_data.data` support
4. **Alternative Routing** - Automatically suggest compatible swappers when Ledger + TRON is detected

## Related Files

- @packages/chain-adapters/src/tron/TronChainAdapter.ts - Memo addition logic
- @packages/swapper/src/thorchain-utils/tron/getUnsignedTronTransaction.ts - THORChain tx building
- @src/components/MultiHopTrade/components/TradeConfirm/hooks/useTradeExecution.tsx - Ledger detection
- @src/assets/translations/en/main.json - Error message translation
