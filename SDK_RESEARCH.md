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

---

## PR2 Learnings - Deposit to State Chain (Write Path)

Implementing the full first-time + returning user deposit flow surfaced the most significant pain points yet. The read path was tedious but workable; the write path is where things get genuinely painful.

### Pain Points

#### `cf_free_balances` returns non-array for non-existent accounts
- For accounts that don't exist on State Chain, `cf_free_balances` returns `{}` (empty object) instead of `[]` (empty array).
- This causes `.find()` / `.map()` crashes at runtime. We had to add `Array.isArray()` guards in every consumer.
- Our `cfFreeBalances` RPC wrapper normalizes the response via `Object.entries().flatMap()`, but if the raw response is `{}`, that produces `[]` correctly. However, the actual crash was the raw response being an object with a different shape than expected for new accounts.
- **SDK ask**: Always return `[]` for accounts with no balances, never `{}` or `null`.

#### Deposit channel polling is a firehose
- After submitting `requestLiquidityDepositAddress` via EIP-712, there's no way to get YOUR channel back. The only option is `cf_all_open_deposit_channels` which returns ALL open channels for ALL accounts on the entire network.
- We poll this every 6s up to 30 times (3 min timeout), filtering for our account ID each time.
- The response is massive and the address data is deeply nested: `[accountId, channelId, { chain_accounts: [[encodedAddress, asset], ...] }]`.
- Address encoding varies by chain: ETH/Arb addresses come as byte arrays needing `0x` hex prefix, BTC as variable-length byte arrays needing string decode, SOL as 32-byte arrays.
- **SDK ask**: `cf_open_deposit_channels(accountId)` endpoint that returns only channels for a specific account. Or better: `requestLiquidityDepositAddress` should return the deposit address directly in the response instead of requiring polling.

#### No event subscription for deposit confirmation
- After sending funds to the deposit channel, we poll `cf_free_balances` every 6s comparing against the initial balance snapshot to detect when funds land.
- There's no websocket subscription, no event stream, no webhook. Pure polling.
- For a good UX this means we snapshot the initial free balance BEFORE starting the flow, then poll until `current > initial`.
- **SDK ask**: `sdk.waitForDeposit({ accountId, asset, minAmount })` that handles the polling internally, or a subscription mechanism.

#### Nonce management for sequential extrinsics
- First-time users need 3 sequential EIP-712 submissions: `registerLpAccount` -> `registerLiquidityRefundAddress` -> `requestLiquidityDepositAddress`.
- Each needs an incrementing nonce. The first call uses the SS58 account ID (string) as the `nonceOrAccount` param, which auto-assigns nonce 0. Subsequent calls must pass `lastNonce + 1` (number).
- If you query `cf_account_info` for the nonce between calls, it may not have updated yet (extrinsic still being processed). So we track `lastUsedNonce` client-side and increment manually.
- The dual `nonceOrAccount` parameter (string = account lookup, number = explicit nonce) is confusing and undocumented.
- **SDK ask**: SDK should handle nonce management internally. `sdk.lp.registerAccount()` -> `sdk.lp.registerRefundAddress(...)` -> `sdk.lp.requestDepositAddress(...)` should just work in sequence without the caller worrying about nonces.

#### `cf_encode_non_native_call` returns EIP-712 types with `EIP712Domain` included
- The RPC returns full EIP-712 typed data including the `EIP712Domain` type definition.
- But wallets (MetaMask, WalletConnect) auto-add `EIP712Domain` to the types. If you pass it through, the wallet sees a duplicate type and may reject or produce wrong signatures.
- We have to strip `EIP712Domain` from the types object before calling `signTypedData`.
- This gotcha cost hours of debugging. Zero documentation about it.
- **SDK ask**: Either don't include `EIP712Domain` in the response (since wallets always add it), or document this clearly.

#### FLIP funding requires Gateway contract knowledge
- `fundStateChainAccount(bytes32 nodeID, uint256 amount)` on the Chainflip Gateway contract is how you create a State Chain account.
- The `nodeID` is the ETH address left-padded to 32 bytes. This is not documented anywhere.
- The Gateway ABI isn't published in any npm package. We inline the relevant function ABI.
- The Gateway contract address is hardcoded (not discoverable via RPC).
- Prior to funding, you also need to ERC-20 approve FLIP for the Gateway contract (standard, but still 2 transactions for what's conceptually "create account").
- **SDK ask**: `sdk.account.fund({ ethAddress, amount })` that handles the approval + funding. Or expose the Gateway ABI + address via the SDK.

#### No "does this account exist?" endpoint
- To determine account state (funded? registered as LP? has refund address?), you call `cf_account_info` which returns an object even for non-existent accounts.
- You then check: `flip_balance > 0` for funded, `role === 'liquidity_provider'` for registered, `refund_addresses` object for per-chain refund addresses.
- `refund_addresses` is `Record<chain, address | null>` - you check `Object.values(refundAddresses).some(addr => addr !== null)`.
- `flip_balance` is a hex string. `role` is a string enum. All different formats.
- **SDK ask**: `sdk.account.status(ethAddress)` returning `{ exists: boolean, isFunded: boolean, isLpRegistered: boolean, refundAddresses: Record<chain, string> }`.

#### Batch encoding is multi-layer
- To batch multiple calls (e.g., register + set refund + open channel), you:
  1. SCALE-encode each individual call
  2. SCALE-encode the `Environment.batch` wrapping those calls
  3. Pass the batch hex to `cf_encode_non_native_call` for EIP-712
  4. Sign the EIP-712 data
  5. SCALE-encode the `Environment.nonNativeSignedCall` outer extrinsic
  6. Submit via `author_submitExtrinsic`
- That's 3 layers of SCALE encoding + 1 EIP-712 sign for a single user action.
- Batch is limited to 10 calls (we enforce this client-side).
- **SDK ask**: `sdk.batch([sdk.lp.registerAccount(), sdk.lp.registerRefundAddress(...)])` that handles all encoding layers.

#### Address serialization per chain
- `encodeRegisterLiquidityRefundAddress` takes a `{ chain, address }` where the address must be SCALE-encoded differently per chain:
  - Ethereum/Arbitrum: 20 bytes (strip `0x`, decode hex)
  - Bitcoin: variable-length bytes (script encoding)
  - Solana: 32 bytes (base58 decode)
  - Polkadot/Assethub: 32 bytes (SS58 decode)
- Each chain has a different SCALE tag (`Eth`, `Btc`, `Sol`, `Arb`, `Dot`, `Hub`) that doesn't match the `ChainflipChain` type (`Ethereum`, `Bitcoin`, `Solana`, etc.).
- **SDK ask**: Accept standard address strings and handle encoding internally.

### Updated SDK API Suggestions (Write Path)

```typescript
// Account lifecycle
sdk.account.fund({ ethAddress })                     // handles FLIP approve + Gateway funding
sdk.account.status(ethAddress)                       // { exists, isFunded, isLpRegistered, refundAddresses }
sdk.account.register({ wallet })                     // registerLpAccount via EIP-712
sdk.account.setRefundAddress({ wallet, chain, address }) // handles per-chain address encoding

// Deposit (the big one)
sdk.deposit({
  wallet,
  asset: 'USDC',
  amount: '1000000000',          // base units
  onStep: (step) => void,       // callback for UI progress
  onTxHash: (hash) => void,     // callback for explorer links
})
// internally: check account state -> fund if needed -> register if needed ->
// set refund address if needed -> open channel -> wait for address ->
// send deposit -> poll for confirmation
// returns: Promise<{ txHash, depositAddress, finalBalance }>

// Or granular control:
const channel = await sdk.lp.requestDepositAddress({ wallet, asset: 'USDC' })
// channel.address is already decoded and ready to use
const txHash = await sdk.deposit.send({ wallet, to: channel.address, asset: 'USDC', amount })
await sdk.deposit.waitForConfirmation({ accountId, asset: 'USDC', minBalance })
```

### Updated Open Questions

10. Can `cf_all_open_deposit_channels` be filtered by account ID? If not, is there a per-account endpoint planned?
11. Is there a plan for websocket subscriptions for balance changes / deposit confirmations?
12. The `nonceOrAccount` dual-type parameter in `cf_encode_non_native_call` - is this documented anywhere? What's the recommended pattern for sequential calls?
13. Should the EIP-712 response from `cf_encode_non_native_call` include or exclude `EIP712Domain`? Current behavior (including it) conflicts with wallet implementations.
14. Is the Gateway contract ABI published anywhere? Will it be part of the SDK?
15. Is batch limited to 10 calls in the runtime, or is that a client-side convention?
