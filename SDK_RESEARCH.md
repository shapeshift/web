# Chainflip Lending SDK Research

Living doc tracking pain points, SDK candidates, and DX feedback as we integrate Chainflip lending.
Updated every commit/milestone.

---

## Current State (PR1 - infra)

No official Lending SDK exists. CF team plans to build one (Phase 2). We're building directly against the State Chain JSON-RPC and SCALE encoding.

### What We're Using

| Layer | Tool | Notes |
|-------|------|-------|
| RPC transport | Raw `fetch` + JSON-RPC 2.0 | No official typed client for lending RPCs |
| SCALE encoding | `scale-ts@^1.6.1` | Zero deps, ~183 KB. Handles all pallet call encoding |
| Extrinsic types | `@chainflip/extrinsics@^1.6.2` | Types only, zero runtime deps. Useful for TS guidance |
| EIP-712 signing | Hand-rolled pipeline | `cf_encode_non_native_call` -> wallet signTypedData -> SCALE wrap |
| SS58 encoding | Manual (no lib) | Left-pad ETH addr 20->32 bytes, SS58 with prefix 2112 |

### What a Lending SDK Should Provide

If CF builds a lending SDK, here's what would save us the most pain:

#### 1. Typed RPC Client (highest value)

The biggest friction is hand-typing every RPC response. The actual shapes diverge from what you'd guess:

- **`cf_oracle_prices`** returns `{ base_asset: "Btc", quote_asset: "Usd", price_status: "UpToDate" }` - not `{ chain, asset }` objects like other RPCs. The asset format is inconsistent across endpoints (some use `{ chain, asset }` objects, oracle uses short strings like `"Btc"`, `"Eth"`).
- **`cf_safe_mode_statuses`** returns deeply nested per-pallet objects with arrays of `{ chain, asset }` for each operation type - not the simple `Record<string, boolean>` you'd expect from the name.
- **`cf_lending_pool_supply_balances`** takes an **asset** param (not account ID like the name suggests), returns positions grouped by asset with `{ lp_id, total_amount }`.
- **`cf_lending_config`** has 15+ fields across LTV thresholds, fee config, swap config, and minimum amounts. Easy to miss fields without typed responses.

An SDK with a typed client (`sdk.lending.pools()`, `sdk.lending.config()`, etc.) that returns proper TypeScript types would eliminate the biggest source of bugs.

#### 2. SCALE Encoding Helpers

We hand-encode every extrinsic call (addLenderFunds, removeLenderFunds, addCollateral, requestLiquidityDepositAddress, etc.) by looking up pallet indices and call indices from runtime metadata.

Pain points:
- **1-indexed asset enum discriminants** - CF's runtime asset enum starts at 1 (Eth=1, Flip=2, Usdc=3...), not 0. Easy to get wrong.
- **Pallet/call indices are magic numbers** - We hardcode `LENDING_POOLS_PALLET_INDEX = 53`, `LIQUIDITY_PROVIDER_PALLET_INDEX = 31`, etc. These are stable across upgrades but undiscoverable without reading runtime metadata.
- **u128 amount encoding** - Amounts are SCALE-encoded as little-endian u128 (16 bytes). Off-by-one in byte count = wrong encoding.
- **Compact length prefixes** for batch calls and outer extrinsic wrapping are fiddly.
- **specVersion must match** - The EIP-712 pipeline checks `state_getRuntimeVersion().specVersion >= 20012`. An SDK could handle version negotiation.

Ideal: `sdk.lending.encodeAddLenderFunds({ asset: 'BTC', amount: 100000000n })` returning the call hex.

#### 3. EIP-712 Sign + Submit Pipeline

Our current pipeline:
1. SCALE-encode the call
2. `cf_encode_non_native_call(hexCall, blocksToExpiry, nonceOrAccount, { Eth: 'Eip712' })`
3. Strip `EIP712Domain` from types (wallet already adds it)
4. `wallet.signTypedData(domain, types, message)`
5. SCALE-encode the outer `environment.nonNativeSignedCall` extrinsic with signature + signer
6. `author_submitExtrinsic(extrinsicHex)`

This is 6 steps with 3 different encoding layers. An SDK wrapping this into `sdk.lending.addLenderFunds({ asset, amount, signer })` would be huge.

#### 4. Account Derivation

ETH address -> SC account (SS58 with prefix 2112) derivation is undocumented. We reverse-engineered it from the bouncer test fixtures. An `sdk.deriveAccount(ethAddress)` helper would be nice.

### SDK Candidates

| Package | Notes |
|---------|-------|
| `@chainflip/rpc` | Exists for swap RPCs. Doesn't cover lending yet. |
| `@chainflip/extrinsics` | Type defs only. No runtime encoding. |
| `@chainflip/sdk` | Swap SDK. No lending support. |
| Future lending SDK | CF team confirmed this is planned (Phase 2). |

### Method Name Suggestions

If we were designing the SDK API:

```typescript
// Read
sdk.lending.pools()                      // cf_lending_pools
sdk.lending.config()                     // cf_lending_config
sdk.lending.supplyBalances(asset)         // cf_lending_pool_supply_balances
sdk.lending.loanAccounts(accountId)       // cf_loan_accounts
sdk.lending.oraclePrices()               // cf_oracle_prices
sdk.lending.safeModeStatuses()           // cf_safe_mode_statuses

// Account
sdk.account.fromEthAddress(ethAddr)      // SS58 derivation
sdk.account.info(accountId)              // cf_account_info_v2
sdk.account.freeBalances(accountId)      // cf_free_balances

// Write (encode + sign + submit in one call)
sdk.lending.addLenderFunds({ wallet, asset, amount })
sdk.lending.removeLenderFunds({ wallet, asset, amount? })
sdk.lending.addCollateral({ wallet, loanId?, collateral[] })
sdk.lending.requestLoan({ wallet, loanAsset, collateralAsset, amount })

// LP operations
sdk.lp.requestDepositAddress({ wallet, asset, boostFee? })
sdk.lp.registerAccount({ wallet })
sdk.lp.registerRefundAddress({ wallet, chain, address })
sdk.lp.withdrawAsset({ wallet, asset, amount, destinationAddress })
```

### Open Questions for CF Team

1. Is there a stable way to discover pallet/call indices at runtime (other than parsing full metadata)?
2. Will lending RPCs be added to `@chainflip/rpc`?
3. Is the `base_asset: "Btc"` format in oracle prices intentional, or will it align with `{ chain, asset }` used elsewhere?
4. What's the timeline for a lending SDK?
5. Will deposit channel events be surfable via RPC subscription, or do we need to poll?

---

## PR2 Learnings - Data Layer & Pool Display

Integrating the read-side (pool data, balances, rates, minimums) for the lending UI surfaced a fresh batch of DX pain points.

### Pain Points

#### Hex encoding everywhere
- Nearly all numeric values from RPC responses come as hex strings (`0x...`): balances, amounts, thresholds, rates, minimums.
- Every value needs manual `BigInt(hexString).toString()` conversion, then precision division for human-readable amounts.
- Different assets have different precisions (BTC=8, ETH=18, USDC/USDT=6, FLIP=18, DOT=10, SOL=9) and nothing in the RPC response tells you the precision. You just have to know.
- **SDK ask**: Return human-readable decimal strings, or at minimum include precision metadata alongside values.

#### Minimum deposit amounts are buried in `cf_environment`
- `cf_environment` is a massive kitchen-sink response (contains everything from ingress/egress config to pool configs to governance params).
- Minimum deposit amounts per asset live at `result.ingress_egress.minimum_deposit_amounts[chain][asset]` - deeply nested, hex-encoded base units.
- You have to cross-reference the asset's precision to convert these to human-readable amounts.
- No dedicated endpoint like `cf_minimum_deposit_amount(asset)` exists.
- **SDK ask**: `sdk.lending.getMinimumDepositAmount(asset)` returning a human-readable string.

#### Oracle prices use inconsistent asset identifiers
- `cf_oracle_prices` returns `{ base_asset: "Btc", quote_asset: "Usd", price_status: "UpToDate" }` using plain string identifiers.
- Every other RPC endpoint uses structured `{ chain: "Bitcoin", asset: "BTC" }` objects for asset identification.
- Mapping between the two formats is manual and brittle - if CF adds a new asset, the mapping breaks silently.
- **SDK ask**: Consistent asset identifiers across all endpoints, or at minimum a canonical mapping function.

#### Interest rates are Perbill/Permill (undocumented which is which)
- `current_interest_rate` fields use Substrate's Perbill (parts per billion, divide by 1e9) or Permill (parts per million, divide by 1e6).
- Nothing in the response or docs tells you which scale a given rate uses. Had to figure it out by looking at live values and sanity-checking the resulting percentages.
- Some rates are per-block, others annualized - also undocumented.
- **SDK ask**: Normalize all rates to percentage or decimal. Include `rateType: "annual" | "perBlock"` metadata.

#### `cf_lending_config` minimums are hex-encoded USD with implicit precision
- `minimum_supply_amount_usd` is a hex string representing USD with 6 decimal precision (same as USDC).
- Nothing in the response indicates the precision or denomination. You only discover the "6 decimals" part by checking live values against pool UIs.
- **SDK ask**: Return decoded USD amounts as decimal strings, or document the precision.

#### Free balances require manual asset mapping
- `cf_free_balances` returns per-asset balances as hex strings with `{ chain, asset }` identifiers (e.g., `{ chain: "Ethereum", asset: "USDC" }`).
- Mapping these to external asset standards (CAIP-19, ShapeShift AssetIds) requires a hand-built mapping table.
- **SDK ask**: Support CAIP-19 identifiers, or at minimum expose a `cfAssetToChainId(cfAsset)` mapping.

#### No deposit channel endpoint for lending
- Opening a deposit channel for lending requires `requestLiquidityDepositAddress` via SCALE encoding + EIP-712 signing - the full 6-step pipeline.
- There's no simple REST or dedicated RPC endpoint. BaaS (Broker as a Service) doesn't expose lending deposit channel endpoints yet.
- For the PoC we're building the full encode/sign/submit pipeline ourselves.
- **SDK ask**: `sdk.lending.openDepositChannel({ asset, boostFee? })` that handles the full pipeline.

#### Account derivation is non-trivial
- Converting an ETH address to a State Chain account ID requires: left-pad 20 bytes to 32 bytes, blake2b hash for checksum, SS58 encode with network prefix 2112, base58check encode.
- This is completely undocumented. We reverse-engineered it from bouncer test fixtures and the Substrate SS58 spec.
- **SDK ask**: `sdk.account.fromEthAddress(ethAddress)` returning the SS58-encoded account ID.

### Updated "What We're Using" (PR2)

| Layer | Tool | Notes |
|-------|------|-------|
| RPC transport | Raw `fetch` + JSON-RPC 2.0 | Same as PR1 |
| SCALE encoding | `scale-ts@^1.6.1` | Same as PR1 |
| Extrinsic types | `@chainflip/extrinsics@^1.6.2` | Same as PR1 |
| EIP-712 signing | Hand-rolled pipeline | Same as PR1 |
| SS58 encoding | Manual (blake2b + bs58) | Same as PR1 |
| Hex decoding | `BigInt(hex).toString()` | Every numeric field. Tedious. |
| Asset mapping | Hand-built `CF_ASSET_TO_SS_ASSET_ID` map | Maps CF `{chain,asset}` to ShapeShift AssetIds |
| Precision lookup | Per-asset constant map | BTC=8, ETH=18, USDC=6, etc. |

### Updated SDK API Suggestions

```typescript
// New: minimum amounts
sdk.lending.getMinimumDepositAmount(asset)    // -> "0.0001" (human-readable)
sdk.lending.getMinimumSupplyAmountUsd()       // -> "100.00" (decoded USD)

// New: normalized rates
sdk.lending.getInterestRate(asset)            // -> { annual: 0.0523, perBlock: 0.0000000827 }
sdk.lending.getCollateralizationRatio(asset)  // -> { current: 1.5, liquidation: 1.1 }

// New: asset mapping
sdk.assets.toCaip19(cfAsset)                 // { chain: "Ethereum", asset: "USDC" } -> "eip155:1/erc20:0xa0b8..."
sdk.assets.fromCaip19(caip19Id)              // reverse mapping
sdk.assets.precision(cfAsset)                // -> 6 (for USDC)
```

### Updated Open Questions

6. What precision does `minimum_supply_amount_usd` use? (We're assuming 6 based on live values, but this isn't documented.)
7. Are interest rates in Perbill or Permill? Is `current_interest_rate` per-block or annualized?
8. Will BaaS expose `requestLiquidityDepositAddress` for lending operations?
9. Is there a plan to add precision metadata to RPC responses alongside hex-encoded amounts?
