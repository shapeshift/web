# Fix: Native BERA receive detection when debug_traceTransaction is unavailable

## Problem
Berachain's public RPC doesn't support `debug_traceTransaction`, causing `fetchInternalTransactions()` to silently return `[]`. For cross-chain Relay swaps where the user receives native BERA via an internal call from a fill contract, this means:
1. No native receive transfer is detected in `parseTx()` → missing execution price in action center
2. No Receive transfer in tx history → missing BERA receive entry

## Root Cause
In `SecondClassEvmAdapter.parseTx()`, native receives via internal calls are only detected through `debug_traceTransaction` traces. When that RPC method is unavailable, the adapter falls back to `[]`, and the `parse()` method has no data to create Receive transfers from.

## Fix (targeted to Berachain)

### File: `packages/chain-adapters/src/evm/SecondClassEvmAdapter.ts`

**Approach**: When on Berachain and `fetchInternalTransactions` returns empty, parse WBERA `Withdrawal(address indexed src, uint256 wad)` events from the tx receipt as a fallback. These events indicate WBERA was unwrapped to native BERA during the tx (e.g., by a DEX/bridge fill contract), and the withdrawn amount was forwarded to the user.

Create synthetic internal txs from these events (with `to: userAddress`) so that `parse()` naturally creates Receive transfers.

**Changes**:
1. Add imports: `berachainChainId` from `@shapeshiftoss/caip`, `WETH_ABI` from `@shapeshiftoss/contracts`
2. Add `WBERA_CONTRACT` constant: `0x5806E130568fEB0aa29b4063e5652Ceaf61f1e4e`
3. In `parseTx()`, after the `Promise.all` that fetches `internalTxs`, add Berachain-specific fallback:
   - If `this.chainId === berachainChainId && internalTxs.length === 0`
   - Parse `Withdrawal` events from receipt logs filtered to the WBERA contract
   - For each event, push a synthetic internal tx `{ from: WBERA_CONTRACT, to: pubkey, value: wad }`
   - `parse()` then picks these up and creates native Receive transfers automatically

### Cleanup
- Remove all debug `console.log`/`console.warn` statements added during investigation from:
  - `SecondClassEvmAdapter.ts` (lines 380, 464, 468)
  - `RelaySwapper/endpoints.ts` (lines 256-257)
  - `useSwapActionSubscriber.tsx` (lines 267, 306)
  - `useActualBuyAmountCryptoPrecision.ts` (lines 52, 67)
