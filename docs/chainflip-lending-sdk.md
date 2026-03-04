# Chainflip Lending SDK

Internal SDK for interacting with the Chainflip State Chain lending protocol via EIP-712 Non-Native Signed Calls.

## Architecture

All Chainflip lending operations are State Chain extrinsics submitted through the public RPC (`rpc.mainnet.chainflip.io`). The flow:

1. **SCALE encode** the call (pallet + call index + params)
2. **EIP-712 sign** via `cf_encode_non_native_call` RPC + wallet signature
3. **Submit** via `author_submitExtrinsic` RPC
4. **Poll** for confirmation (balance changes, position changes)

No `@polkadot` dependencies. SCALE encoding is hand-rolled for the specific pallets we use.

## File Layout

```
src/lib/chainflip/
  types.ts       Type definitions for all RPC responses
  constants.ts   Pallet indices, call indices, asset mappings, contract addresses
  rpc.ts         JSON-RPC wrappers for all cf_* endpoints
  scale.ts       SCALE encoders for each extrinsic call
  eip712.ts      EIP-712 signing flow + nonce retry
  account.ts     ETH address -> SS58 account derivation
```

## Core Primitives

### Account Derivation (`account.ts`)

```
ethAddressToNodeId(ethAddress)     -> 0x-prefixed 32-byte node ID
ethAddressToScAccount(ethAddress)  -> SS58-encoded State Chain account (prefix 2112)
isAccountFunded(freeBalances)      -> boolean (any non-zero balance)
getChainflipAccountStatus(ethAddr) -> { registered, funded, scAccount }
```

An Ethereum address deterministically maps to a Chainflip State Chain account via blake2 hashing + SS58 encoding.

### RPC Calls (`rpc.ts`)

| Function | RPC Method | Returns |
|----------|-----------|---------|
| `cfLendingPools(asset?)` | `cf_lending_pools` | Pool stats (supply, borrow, APY, utilisation) |
| `cfLendingConfig()` | `cf_lending_config` | Minimum amounts, LTV thresholds, interest curves |
| `cfLoanAccounts(accountId?)` | `cf_loan_accounts` | Loan positions, collateral, liquidation status |
| `cfLendingPoolSupplyBalances(accountId)` | `cf_lending_pool_supply_balances` | Supply positions per pool |
| `cfAccountInfo(accountId)` | `cf_account_info_v2` | Nonce, role, lending_positions |
| `cfFreeBalances(accountId)` | `cf_free_balances` | Free balance per asset (normalized from hex) |
| `cfOraclePrices()` | `cf_oracle_prices` | USD prices per asset (hex u128) |
| `cfSafeModeStatuses()` | `cf_safe_mode_statuses` | Whether lending pools are paused |
| `cfEnvironment()` | `cf_environment` | Minimum deposit amounts, ingress/egress config |
| `cfEncodeNonNativeCall(...)` | `cf_encode_non_native_call` | EIP-712 typed data payload + tx metadata |
| `stateGetRuntimeVersion()` | `state_getRuntimeVersion` | Spec version (must be >= 20012) |
| `authorSubmitExtrinsic(hex)` | `author_submitExtrinsic` | TX hash |
| `cfAllOpenDepositChannels()` | `cf_all_open_deposit_channels` | Active deposit channels |

### SCALE Encoders (`scale.ts`)

Each encoder returns a hex string of the SCALE-encoded call.

**Lending Pools Pallet (index 53):**
- `encodeAddLenderFunds(asset, amount)` - Supply to pool
- `encodeRemoveLenderFunds(asset, amount)` - Withdraw from pool
- `encodeAddCollateral(collateral[])` - Add collateral (array of {asset, amount})
- `encodeRemoveCollateral(collateral[])` - Remove collateral
- `encodeRequestLoan(asset, amount)` - Borrow from pool

**Liquidity Provider Pallet (index 31):**
- `encodeWithdrawAsset(amount, asset, destination)` - Withdraw free balance to external chain
- `encodeRequestLiquidityDepositAddress(asset)` - Get deposit channel address
- `encodeRegisterLpAccount()` - Register LP account
- `encodeRegisterLiquidityRefundAddress(address)` - Set refund address

**Utility:**
- `encodeBatch(calls[])` - Batch multiple calls (pallet 2, call 11)
- `encodeNonNativeSignedCall(call, metadata, signature)` - Wrap for non-native submission

### EIP-712 Signing (`eip712.ts`)

```typescript
// Sign a single call
const result = await signChainflipCall({
  wallet,             // HDWallet instance
  accountMetadata,    // BIP44 account metadata
  encodedCall,        // hex from any SCALE encoder
  blocksToExpiry,     // default 120 blocks (~10 min)
  nonceOrAccount,     // number (explicit nonce) or string (account, auto-resolves nonce)
})
// Returns: { signedExtrinsicHex, signature, signer, transactionMetadata: { nonce, expiryBlock } }

// Submit a signed call
const txHash = await submitSignedCall(signedExtrinsicHex)

// Sign + submit with auto nonce retry
const { txHash, nonce } = await signAndSubmitChainflipCall(input)
// Auto-retries once on nonce errors (Priority too low, Stale, 1010)
```

## Asset Mapping

Assets are identified by `{ chain, asset }` pairs on Chainflip:

| Chain | Asset | ShapeShift AssetId |
|-------|-------|--------------------|
| Ethereum | ETH | `eip155:1/slip44:60` |
| Ethereum | USDC | `eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48` |
| Ethereum | USDT | `eip155:1/erc20:0xdac17f958d2ee523a2206206994597c13d831ec7` |
| Ethereum | FLIP | `eip155:1/erc20:0x826180541412d574cf1336d22c0c0a287822678a` |
| Bitcoin | BTC | `bip122:000000000019d6689c085ae165831e93/slip44:0` |

Mapping constants: `CHAINFLIP_LENDING_ASSET_BY_ASSET_ID` and `CHAINFLIP_LENDING_ASSET_IDS_BY_ASSET`.

## On-Chain Minimums

From `cf_lending_config`:
- Minimum supply: $100 USD
- Minimum collateral update: $10 USD
- Minimum loan: $100 USD
- Minimum loan update: $10 USD

## LTV Thresholds (Permill)

- Target LTV: 80%
- Topup LTV: 85%
- Soft Liquidation: 90% (abort at 88%)
- Hard Liquidation: 95% (abort at 93%)
- Low LTV: 50%

## UI Architecture

### State Machines (xstate v5)

Each lending operation has its own xstate machine following a consistent pattern:

```
input -> confirm -> signing -> confirming -> success/error
```

Common features across all machines:
- `SYNC_FREE_BALANCE` event handled at root level (updates from any state)
- `CONFIRM_STEP` for native wallet manual confirmation
- `RETRY` from error state routes back to the failed step (signing or confirming)
- `BACK` from confirm/error returns to input
- `DONE` from success resets and returns to input
- `executing` tag on signing + confirming states

Machines: `supplyMachine`, `withdrawMachine`, `depositMachine`, `egressMachine`

### Modal System

All operations open via `useModal('chainflipLending')` with a mode prop:

```typescript
type ChainflipLendingModalMode =
  | 'supply' | 'withdrawSupply'
  | 'deposit' | 'withdrawFromChainflip'
  | 'addCollateral' | 'removeCollateral'
  | 'borrow' | 'repay'
  | 'voluntaryLiquidation'
```

The modal shell (`ChainflipLendingModal.tsx`) uses a `Dialog` component and delegates to mode-specific components, each bringing their own xstate machine context.

### Hook Patterns

**Sign hooks** (e.g. `useSupplySign`, `useEgressSign`):
- Watch machine state for `signing`
- Guard on `isNativeWallet && !stepConfirmed` for manual wallets
- Use `executingRef` to prevent double execution
- Call encoder -> `signAndSubmit` -> send `SIGN_BROADCASTED` + `SIGN_SUCCESS`
- On error: send `SIGN_ERROR`

**Confirmation hooks** (e.g. `useSupplyConfirmation`, `useEgressConfirmation`):
- Poll relevant RPC (free balances, supply positions) at 6s intervals
- Compare against initial snapshot captured at CONFIRM time
- Send confirmed event when change detected
