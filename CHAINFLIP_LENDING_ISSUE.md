## ELI5: How Chainflip Lending Works

- **Two sides**: suppliers deposit assets into lending pools and earn yield. Borrowers post collateral and borrow against it.
- **5 pools**: BTC, ETH, SOL, USDC, USDT. You can supply any of these, and borrow any of these against any collateral combo.
- **Overcollateralized**: max 80% loan-to-value (LTV) at creation. If collateral value drops, thresholds kick in: 85% auto-top-up from your free balance, 90% soft liquidation (DCA sells $10k chunks), 95% hard liquidation ($50k chunks). Liquidations go through Chainflip's own AMM, filled by JIT LPs.
- **Interest**: two-segment utilization curve. Low rates when pools are flush, steep ramp above 95% util kink. Live mainnet values: 0% at 0% util, 4% at 95% (kink), 25% at 100%. Lending upkeep runs every block; interest payments distributed every 10 blocks (~60s). Lender positions use share-based accounting (your pool share grows as interest accrues).
- **Native assets**: no wrapping, no bridging. Your BTC is real BTC sitting in Chainflip's TSS vaults. The State Chain (Substrate app-chain) is just the accounting layer.
- **EVM wallet required**: all lending operations are signed via EIP-712 from an EVM wallet. Even BTC lenders/borrowers need MetaMask (or any EVM wallet) to sign. BTC itself deposits natively to a Taproot address.
- **Three fund buckets**: free balance (on State Chain, unallocated), collateral (backing loans), supplied (in lending pools earning interest). These are separate - supplied funds can't be used as collateral and vice versa. Confirmed in [docs](https://docs.chainflip.io/lending/supply) ("(free) balance"), live RPCs (`cf_account_info_v2`, `cf_loan_accounts`, `cf_lending_pool_supply_balances`), and [pallet source](https://github.com/chainflip-io/chainflip-backend/blob/main/state-chain/pallets/cf-lp/src/lib.rs).
- **LP role + refund address**: account creation auto-registers as LP. Refund address is a **one-time setup per chain** - stored in a persistent `StorageDoubleMap<AccountId, ForeignChain, ForeignChainAddress>`, not consumed after use. Required before `request_loan` and `request_liquidity_deposit_address`, but NOT before `withdraw_asset` (which takes an explicit `destination_address`).
- **FLIP fees**: non-native signed calls **DO consume FLIP** from the signer's State Chain balance. The LP app auto-swaps a portion of the first deposit to FLIP. "1-2 FLIP is enough to get started" ([blog](https://blog.chainflip.io/how-to-create-a-chainflip-lp-account/)).
- **No SDK yet**: write path is direct State Chain RPC interaction via [`cf_encode_non_native_call`](https://deepwiki.com/chainflip-io/chainflip-backend/2.9.3-non-native-signed-calls-and-eip-712) + `author_submitExtrinsic`. CF team will improve SDK for us - build direct integration now, migrate when SDK supports lending.

**Why this matters**: THORChain lending is deprecated (new loans halted Sep 2024). Chainflip lending is live with 5 active pools, real borrowers, and real liquidity on mainnet right now (USDC at ~67% utilization, USDT at ~30%).

---

## Chainflip - User flow

Before reading this, you should understand funds in CF lending land exist in 3 "buckets"

- Free balance. On state chain, but unallocated to anything. It's where those land when you fund the account, and can be egressed (withdrawn) back to on-chain.
- Collateral. Funds allocated to collateral balance.
- Supplied. Funds allocated to a supply position.

### 1. Wallet connection

As a user, I connect an EVM-supporting wallet (for ShapeShift users, that means MIPD wallet, native, or HW). Obviously if EVM only can't do BTC ops.

### 2. Account creation

The following assumes the user doesn't have a state chain account yet.

1. Scale encode a "register as LP" (`registerLpAccount()`) call (`cf_encode_non_native_call(encodedCall, blocksToExpiry=120, nonce=0, {Eth: 'Eip712'})`) - user EIP-712 signs that, submits it.
That *is* different from swap endpoints in the BaaS in that this needs to be signed!
2. We pass that sig + asset to ` request_account_creation_deposit_address`
3. User sends funds to that addess, in the asset the deposit channel was opened for. That is NOT a lending op just yet, just funding the "lending account", as such, lending role is auto-created.
4. A state chain's channel account is opened, tied to the user EVM addy, with some FLIP auto-provisionned
5. With the same EIP-712 flow as above, user signs `register_liquidity_refund_address` call to register their refund addy

NOTE: Deposit channel expires after 24 hours. It's merely a link between on-chain and state-chain. Funds deposited here land in state chain balance but *not* in lending pools just yet, that is not a supply but a funding.

### 3a. Supply

#### Users may need to get funds on state chain, if so:

1. We open a deposit channel for that asset
2. User sends their asset to the deposit channel addy, CF witnesses it, balances updated, same flow as if depositing on account creation above
3. Fund are now on state chain but not on the lending pool just yet - we allocate them with `lendingPools.addLenderFunds(USDC, amount)`, do the typed data dance again, use signs, we submit extrinsic
4. We poll cf_lending_pool_supply_balances('USDC') until balances are updated

NOTE: First time account creation + deposit already deposits into free balance, so can skip 1. and 2. then

### 3b. Remove/Withdraw supplied assets

1. Same dance as above except remove function is encoded, signed and submitted (`lendingPools.removeLenderFunds(USDC, amount)`)
2. Funds move back to free balance
3. User can then use this balance again, OR if they want to actually withdraw them out of free balance to their wallet, we encode `withdraw_asset(amount, USDC, "0xUserEthAddress")`, they sign and submit that, egress is triggered

### 4a. Borrow

As a user I want to borrow <borrow asset> against my <collateral asset>
May need to deposit funds into state chain (free balance) if none, see above

#### Open Loan

- Encode, sign and submit `add_collateral(collateralAsset, amount)` - moves from free balance to collateral
- Encode, sign and submit `request_loan(borrowAsset, amount)` - opens the loan, borrows asset against collateral, which lands into free balance
- If they want the asset on-chain (i.e not to reuse it in CF lending), `withdraw_asset(amount, USDC, ethAddress)`, see above

#### Manage loan

- Can borrow more with `expand_loan(loan_id, amount)`, principal goes ++, LTV too
- Add more collateral: `add_collateral(BTC, amount)`, LTV decreases
- Users can "auto top-up" collateral from free balance using `update_collateral_topup_asset(asset)` - will get added if LTV drifts towards 85%

#### Repay

- Use existing free balance for borrowed asset or land some in (see above)
- `make_repayment(loan_id, borrowedAsset, amount)` reduces pricipal
- Can `remove_collateral(collateralAsset, amount)` once fully repaid, moves from collateral to free balance
- `withdraw_asset(amount, collateralAsset, collateralAssetAddress)` triggers egress (user gets funds back on-chain)

### Liquidations (automatic, but needs to be surfaced in app)

- 85% LTV: auto top-up triggers, see manage loan above
- 90% LTV: soft liquidation starts - collateral gets gradually sold
- 95% LTV: full liquidation
- Any remaining collateral remaining after full liquidation goes to refund addy

There's actually more to the LTV ladder, i.e  80% (max LTV at loan creation), 88% (soft liquidation abort), 93% (hard liquidation abort) but those are the main ones for the sake of simplification.
See `cf_lending_config`:

```sh
 curl -s -X POST 'https://rpc.mainnet.chainflip.io' -H 'Content-Type: application/json' -d '{"jsonrpc":"2.0","method":"cf_lending_config","params":[],"id":1}'
```

---

## Account Creation: Two Paths

### Broker Path (preferred for production)
- Uses `request_account_creation_deposit_address` on the broker
- User deposits ANY asset (BTC, ETH, USDC, etc.) - account created, FLIP auto-provisioned via swap
- **BLOCKER**: BaaS at `chainflip-broker.io` does NOT expose this endpoint today (only swap endpoints like `/swap`, `/quotes-native`, `/assets`)
- **Action item**: reach out to **David (BaaS team)** to get `request_account_creation_deposit_address` exposed on the BaaS HTTP API. This is the blocker for production-quality account creation UX.

### Direct Path (PoC approach, no broker needed)
- State Chain account ID is deterministically derived from ETH address: left-pad to 32 bytes + SS58 encode ([source](https://github.com/chainflip-io/chainflip-backend/blob/main/bouncer/shared/utils.ts))
- User needs ERC-20 FLIP on Ethereum (`0x826180541412d574cf1336d22c0c0a287822678a`)
- User calls `fundStateChainAccount(bytes32 nodeID, uint256 amount)` on the State Chain Gateway contract (`0x6995ab7c4d7f4b03f467cf4c8e920427d9621dbd`)
- Submit `liquidityProvider.registerLpAccount()` via non-native signed call on public RPC ([source](https://github.com/chainflip-io/chainflip-backend/blob/main/state-chain/pallets/cf-lp/src/lib.rs))
- ~85% confidence this works on mainnet (confirmed in [bouncer tests](https://github.com/chainflip-io/chainflip-backend/blob/main/bouncer/tests/signed_runtime_call.ts), not mainnet-tested)
- User needs FLIP specifically (worse UX, but fine for PoC since it won't hit prod)

### PoC Strategy
- Start with direct path: build encode/sign/submit as composable, reusable primitives
- Don't surface FLIP to the user in the PoC (hardcode funding, TODO for BaaS migration)
- When David (BaaS) adds `request_account_creation_deposit_address`, swap out ONLY the account creation step - everything else stays identical
- Code must be evolutive: only the account creation path changes between PoC and prod

---

## The EIP-712 Encode/Sign/Submit Pipeline

Every lending operation follows the same 4-step pipeline. Only the SCALE-encoded call bytes change.

### How it works (from [bouncer test source](https://github.com/chainflip-io/chainflip-backend/blob/main/bouncer/tests/signed_runtime_call.ts))

```typescript
// 1. SCALE-encode the call (e.g. addLenderFunds, requestLoan, etc.)
const call = api.tx.lendingPools.addLenderFunds({ chain: 'Ethereum', asset: 'USDC' }, amount)
const hexCall = u8aToHex(api.createType('Call', call.method).toU8a())

// 2. Get EIP-712 TypedData from public RPC
const [eip712Payload, txMeta] = await api.rpc(
  'cf_encode_non_native_call',
  hexCall,                    // SCALE-encoded call bytes
  120,                        // blocks to expiry (~12 min)
  stateChainAccountOrNonce,   // SS58 account or nonce integer
  { Eth: 'Eip712' }          // encoding type
)

// 3. User signs with EVM wallet (MetaMask popup - structured, not blind)
const { domain, types, message } = eip712Payload.Eip712
delete types.EIP712Domain     // ethers.js/wagmi quirk
const signature = await signer.signTypedData(domain, types, message)

// 4. Submit as unsigned extrinsic on public RPC
await api.tx.environment.nonNativeSignedCall(
  { call: hexCall, transactionMetadata: { nonce: txMeta.nonce, expiryBlock: txMeta.expiry_block } },
  { Ethereum: { signature, signer: userEthAddress, sigType: 'Eip712' } }
).send()
```

### SCALE Encoding: `scale-ts` is the way

Zero `@polkadot` or `@chainflip` packages in the codebase today. EIP-712 signing already exists (CowSwap/Permit2 via chain adapters' `signTypedData`).

**Confirmed approach**: use `scale-ts` (~183 KB, zero runtime deps) instead of `@polkadot/api` (~2MB + massive dep tree). `@polkadot/api` is NOT needed:

| Step | What @polkadot/api does | Replacement | Difficulty |
|------|------------------------|-------------|------------|
| Encode inner call bytes | `createType('Call', ...).toU8a()` | `scale-ts` codecs with pallet/call indices | Medium |
| Call `cf_encode_non_native_call` | `chainflip.rpc(...)` | Raw `fetch` JSON-RPC | Easy |
| Construct unsigned extrinsic | `chainflip.tx.environment.nonNativeSignedCall(...)` | `scale-ts` to encode outer extrinsic bytes | Medium |
| Submit via `author_submitExtrinsic` | `.send()` | Raw `fetch` JSON-RPC | Easy |

**Package landscape** (confirmed from source):
- `@chainflip/extrinsics@1.6.2` - **types only**, zero runtime deps. Good for TypeScript types but no encoding.
- `@chainflip/scale@2.1.0` - built on `scale-ts`, but only vault swap codecs. No lending encoders.
- `@chainflip/rpc@2.1.1` - read-only for lending (4 RPCs). Does NOT support `cf_encode_non_native_call` or `author_submitExtrinsic`.
- `scale-ts@1.6.1` - standalone SCALE codec, used by [CF bouncer tests](https://github.com/chainflip-io/chainflip-backend/blob/main/bouncer/tests/signed_runtime_call.ts). **This is what we'll use.**

**Risk**: pallet/call indices can shift between runtime upgrades. Fetch via `state_getMetadata` for robustness, or hardcode with version guard on `state_getRuntimeVersion` (specVersion: 20012).

### Nonce Behavior (confirmed via live RPC probing + source code)

- `cf_encode_non_native_call` does NOT validate the nonce - it echoes whatever you pass. Validation happens at submission time.
- `NonceOrAccount` is `#[serde(untagged)]`: pass a **number** -> uses that nonce literally; pass an **SS58 string** -> looks up `System::account_nonce()` from storage. Hex strings (0x...) do NOT work.
- For non-existent accounts, `System::account_nonce()` returns default `0`. So both `Nonce(0)` and `Account("non_existent_ss58")` produce identical payloads.
- **Account MUST exist** in `frame_system::Account` before submission (FLIP funding creates it). `validate_unsigned` checks `contains_key(&signer_account)` -> `InvalidTransaction::BadSigner` if missing.
- Nonce validation at submission uses `>=` not `==`: future nonces enter txpool with dependency on previous nonce. So you can encode multiple sequential calls (nonce 0, 1, 2...) and submit them all at once.
- **First call flow**: fund FLIP (creates account) -> encode with nonce=0 -> sign -> submit -> works. `registerLpAccount` can be the very first extrinsic.

### Deposit Channel Event

When `request_liquidity_deposit_address` is submitted via non-native signed call, the deposit address comes back as an event:

**`LiquidityDepositAddressReady`** ([source](https://github.com/chainflip-io/chainflip-backend/blob/main/state-chain/pallets/cf-lp/src/lib.rs)):
- `channel_id: ChannelId`
- `asset: Asset`
- `deposit_address: EncodedAddress`
- `account_id: T::AccountId`
- `deposit_chain_expiry_block: ChainBlockNumber`
- `boost_fee: BasisPoints`
- `channel_opening_fee: T::Amount`

### What's Available vs Blocked

**Public RPC (`rpc.mainnet.chainflip.io`) - no auth, no blocker:**

| What | Method |
|------|--------|
| Encode any call to EIP-712 | `cf_encode_non_native_call` |
| Submit any signed extrinsic | `author_submitExtrinsic` |
| All lending reads | `cf_lending_pools`, `cf_loan_accounts`, `cf_lending_pool_supply_balances`, `cf_lending_config` |
| Account info | `cf_accounts`, `cf_account_info_v2`, `cf_free_balances`, `cf_lp_total_balances` |
| Oracle prices | `cf_oracle_prices` |
| Safe mode status | `cf_safe_mode_statuses` |
| Runtime version | `state_getRuntimeVersion` (specVersion: 20012) |
| Runtime metadata | `state_getMetadata` (for pallet/call index discovery) |

**Can submit via non-native signed calls (all on public RPC):**

| Operation | Pallet call |
|-----------|-------------|
| Register as LP | `liquidityProvider.registerLpAccount()` |
| Register refund address | `liquidityProvider.register_liquidity_refund_address` |
| Open LP deposit channel | `liquidityProvider.request_liquidity_deposit_address` |
| Supply | `lendingPools.addLenderFunds` |
| Remove supply | `lendingPools.removeLenderFunds` |
| Add collateral | `lendingPools.addCollateral` |
| Remove collateral | `lendingPools.removeCollateral` |
| Borrow | `lendingPools.requestLoan` |
| Expand loan | `lendingPools.expandLoan` |
| Repay | `lendingPools.makeRepayment` |
| Set auto-topup | `lendingPools.updateCollateralTopupAsset` |
| Voluntary liquidation | `lendingPools.initiateVoluntaryLiquidation` (confirmed still exists in spec 20012) |
| Stop voluntary liquidation | `lendingPools.stopVoluntaryLiquidation` (confirmed still exists in spec 20012) |
| Withdraw to wallet | `liquidityProvider.withdraw_asset` |
| Batch multiple ops | `environment.batch([call1, call2, ...])` (max 10 calls, no nesting) |

**Broker-only (BLOCKED on BaaS - talk to David):**

| Operation | Why blocked |
|-----------|-------------|
| `request_account_creation_deposit_address` | Broker signs the outer extrinsic. Not on public RPC, not exposed on BaaS HTTP API. Need David (BaaS team) to add this. |

---

## Action Items

### David (BaaS team)
- Get `request_account_creation_deposit_address` exposed on the BaaS HTTP API (`chainflip-broker.io`). This is the only blocker for production-quality account creation. The PoC uses the direct path (Gateway contract + FLIP) as a workaround, but prod needs the broker path so users can deposit ANY asset and get FLIP auto-provisioned.
- Confirm broker fee plumbing for lending operations - source code has `broker_fee` fields in `OriginationFeeTaken`, `InterestTaken`, `LiquidityFeeTaken` events but unclear if wired up for integrators yet.

### Remaining unknowns (nice-to-know, not blockers)
- **EIP-712 domain version**: confirmed the domain `version` field matches `specVersion` ("20012"). Signatures are invalid after a runtime upgrade. Probably just re-encode on failure.

---

## Known Gaps & Resolved Questions

| Gap | Status | Resolution |
|---|---|---|
| **BaaS missing account creation** | OPEN | PoC uses direct path (Gateway + FLIP). Prod needs David (BaaS) to expose endpoint. |
| **LTV units: Perbill vs Permill** | NOTE | Intentional. Loan data (`cf_loan_accounts`) = Perbill (div 1e9), config (`cf_lending_config`) = Permill (div 1e6). Different precision needs. |
| **FLIP fee consumption** | RESOLVED | Non-native signed calls DO consume FLIP. "1-2 FLIP is enough to get started." Broker path auto-swaps to FLIP. Direct path needs explicit FLIP funding. |
| **SCALE encoding** | RESOLVED | Use `scale-ts` (~183 KB, zero deps). Can encode all calls + construct unsigned extrinsics. `@polkadot/api` (~2MB) NOT needed. |
| **Deposit channel events** | RESOLVED | Event: `LiquidityDepositAddressReady` with `channel_id`, `asset`, `deposit_address`, `account_id`, `deposit_chain_expiry_block`, `boost_fee`, `channel_opening_fee`. |
| **Refund address** | RESOLVED | One-time per chain. Persistent `StorageDoubleMap<AccountId, ForeignChain>`. Required before `request_loan` and `request_liquidity_deposit_address`, NOT before `withdraw_asset`. Can be batched with loan ops. |
| **Nonce=0 for new accounts** | RESOLVED | Account MUST exist (FLIP funding creates it). First call with nonce=0 works. Nonce validation is `>=` so future nonces queue in txpool. `registerLpAccount` can be the first extrinsic after funding. |
| **Batching** | RESOLVED | Uses `Environment.batch` (pallet 0x02, call 0x0b), NOT `utility.batch`. Max 10 calls per batch, no nesting. Cross-pallet batching works (e.g. register refund + add collateral + request loan in one sign). |
| **Perquintill share accounting** | NOTE | Lender positions are shares not amounts. Convert shares to amounts using pool total for display. |

---

## Links

- [Chainflip Lending Docs](https://docs.chainflip.io/lending)
- [Chainflip Lending UI](https://lp.chainflip.io/lending)
- [Lending Launch Blog Post](https://blog.chainflip.io/chainflip-lending-is-live-true-native-btc-lending-has-arrived/)
- [Native BTC Lending Announcement](https://blog.chainflip.io/native-btc-lending-cross-chain-liquidity-loans/)
- [EVM Wallet Onboarding Blog](https://blog.chainflip.io/evm-wallet-onboarding-lp/)
- [How to Create LP Account](https://blog.chainflip.io/how-to-create-a-chainflip-lp-account/)
- [Lending Pallet Source (GitHub)](https://github.com/chainflip-io/chainflip-backend/tree/main/state-chain/pallets/cf-lending-pools)
- [LP Pallet Source (registerLpAccount)](https://github.com/chainflip-io/chainflip-backend/blob/main/state-chain/pallets/cf-lp/src/lib.rs)
- [Bouncer EIP-712 Test (full flow)](https://github.com/chainflip-io/chainflip-backend/blob/main/bouncer/tests/signed_runtime_call.ts)
- [Bouncer LP Account Setup](https://github.com/chainflip-io/chainflip-backend/blob/main/bouncer/commands/setup_lp_account.ts)
- [SC Account Derivation (externalChainToScAccount)](https://github.com/chainflip-io/chainflip-backend/blob/main/bouncer/shared/utils.ts)
- [Product Toolkit / @chainflip/rpc (GitHub)](https://github.com/chainflip-io/chainflip-product-toolkit)
- [Non-Native Signed Calls & EIP-712 (DeepWiki)](https://deepwiki.com/chainflip-io/chainflip-backend/2.9.3-non-native-signed-calls-and-eip-712)
- [Bouncer Lending Integration Tests](https://github.com/chainflip-io/chainflip-backend/blob/main/bouncer/tests/lending.ts)
- [Lending Fees Docs](https://docs.chainflip.io/lending/fees)
- [Supply & Borrow Docs](https://docs.chainflip.io/lending/supply)
- **Public RPC (Mainnet)**: `https://rpc.mainnet.chainflip.io` / `wss://rpc.mainnet.chainflip.io`
- **State Chain Gateway (Ethereum)**: `0x6995Ab7c4D7F4B03f467Cf4c8E920427d9621DBd`
- **FLIP ERC-20 (Ethereum)**: `0x826180541412D574cf1336d22c0C0a287822678A`
- **Existing Chainflip swapper code**: `packages/swapper/src/swappers/ChainflipSwapper/`

## Abstract

Integrate Chainflip's cross-chain lending protocol into ShapeShift, enabling users to:
- **Supply** assets (BTC, ETH, SOL, USDC, USDT) to lending pools and earn yield
- **Borrow** against native collateral (e.g., deposit BTC, borrow USDC)
- **Manage** loan positions (add/remove collateral, repay, expand loans)
- **Monitor** position health (LTV ratio, liquidation thresholds, interest accrual)

This is NOT a proxy/read-only integration. Users sign **EIP-712 typed data** from their connected EVM wallet to submit extrinsics directly to the Chainflip State Chain. No intermediary backend needed - the public State Chain RPC at `rpc.mainnet.chainflip.io` handles everything.

Feature flagged under `ChainflipLending`. Full Action Center integration for multi-step deposit/lending flows.

## Acceptance Criteria

- [ ] Feature flag `ChainflipLending` gates all new functionality
- [ ] New "Chainflip Lending" nav item with Chainflip icon and `#46DA93` accent
- [ ] Existing THORChain Lending gets "DEPRECATED" badge on nav item (functionality unchanged) - **NOTE: this should be a separate, preceding PR**
- [ ] **Chainflip Lending page**: display all 5 lending pools (BTC, ETH, SOL, USDC, USDT) with live data (total supplied, utilization, supply APR, borrow APR). This is its own dedicated page, NOT on the existing Markets page.
- [ ] **Supply flow**: users can supply assets to lending pools and earn yield
- [ ] **Borrow flow**: users can post collateral, open loans, manage positions
- [ ] **Repay flow**: partial and full loan repayment
- [ ] **Collateral management**: add/remove collateral, set primary collateral asset
- [ ] **Position dashboard**: active loans, collateral, LTV gauge with threshold markers, health indicator
- [ ] **Deposit channels**: native deposit addresses (BTC Taproot, ETH, SOL) for funding State Chain accounts
- [ ] **Action Center**: full tracking for deposit-to-State-Chain, supply, borrow, repay, withdraw operations
- [ ] **EIP-712 signing**: works with any connected EVM wallet (MetaMask, Rabby, Ledger, WalletConnect, etc.)
- [ ] **Withdrawal**: borrowed funds withdrawable to any supported chain (Ethereum, Bitcoin, Arbitrum, Solana)
- [ ] i18n: all copy uses translation keys

---

<details>
<summary><h2>Full Technical Research</h2></summary>

### Architecture Overview

Chainflip Lending runs on the **Chainflip State Chain**, a Substrate-based application-specific blockchain. All lending logic is in `pallet_cf_lending_pools` (pallet index 53). Assets are held in native-chain vaults secured by a 100-of-150 TSS/MPC validator set.

**Key architectural reality:**
- **No Lending SDK** yet - `@chainflip/sdk` only handles swaps. CF team will improve SDK for us. Build direct integration now, migrate later.
- **No EVM proxy contract** for lending (FAQ mentions it but it's aspirational/future).
- **No Broker API lending endpoints** - broker handles swaps + account creation only.
- **FLIP fees are real** - non-native signed calls consume FLIP from the signer's State Chain balance. The runtime does pre-dispatch fee processing via `GetTransactionPayments` ([source](https://github.com/chainflip-io/chainflip-backend/blob/main/state-chain/pallets/cf-environment/src/lib.rs)).

**The only integration path is direct State Chain interaction** via EIP-712 Non-Native Signed Calls on the public RPC endpoint.

**Important requirements from source code:**
- All lending extrinsics require **LP role** - account creation implicitly registers as LP ([`EnsureOrigin` checks](https://github.com/chainflip-io/chainflip-backend/blob/main/state-chain/pallets/cf-lending-pools/src/lib.rs))
- `request_loan` requires a **refund address** set for the loan asset chain (must call `register_liquidity_refund_address` first - one-time per chain, persistent storage)
- Lender positions use **Perquintill share-based accounting** (not raw amounts) - your share of the pool grows as interest accrues
- State Chain account is deterministically derived from ETH address via left-padding to 32 bytes ([source](https://github.com/chainflip-io/chainflip-backend/blob/main/bouncer/shared/utils.ts))
- The `registerLpAccount()` call lives in `pallet_cf_lp` ([source](https://github.com/chainflip-io/chainflip-backend/blob/main/state-chain/pallets/cf-lp/src/lib.rs))

### Public RPC Endpoints (CONFIRMED WORKING)

From [`@chainflip/rpc@2.1.0`](https://github.com/chainflip-io/chainflip-product-toolkit/tree/main/packages/rpc) (`PUBLIC_RPC_ENDPOINTS` constant):

| Endpoint | Type |
|---|---|
| `https://rpc.mainnet.chainflip.io` | HTTP JSON-RPC |
| `wss://rpc.mainnet.chainflip.io` | WebSocket (subscriptions) |
| `https://archive.mainnet.chainflip.io` | Archive node (HTTP only) |

**221 total RPC methods available**, including 114 custom `cf_*` methods, `author_submitExtrinsic` (for unsigned extrinsic submission), and 30 WebSocket subscription methods. No API key required. No documented rate limits.

**Live data confirmed via curl** (2026-02-23):
- 5 lending pools active (BTC, ETH, SOL, USDC, USDT)
- 17 borrower positions (13 with active loans, 4 with collateral only)
- Highest LTV: 83.2% (one account approaching 85% topup threshold)
- USDC utilization at ~67%, USDT at ~30%
- 1,646 total State Chain accounts
- Runtime: specName=chainflip-node, specVersion=20012, transactionVersion=13
- All read RPCs + `cf_encode_non_native_call` + `author_submitExtrinsic` confirmed working

### Read Path: Lending RPCs ([custom-rpc source](https://github.com/chainflip-io/chainflip-backend/blob/main/state-chain/custom-rpc/src/lib.rs))

| Method | Params | Returns |
|---|---|---|
| `cf_lending_pools` | `[asset?]` | Pool info: `total_amount`, `available_amount`, `utilisation_rate`, `current_interest_rate`, `origination_fee`, `liquidation_fee`, `interest_rate_curve` |
| `cf_loan_accounts` | `[borrower_id?]` | Borrower positions: `collateral`, `loans` (id, asset, principal), `ltv_ratio` (Perbill - divide by 1e9), `liquidation_status`, `collateral_topup_asset` |
| `cf_lending_config` | `[]` | LTV thresholds (Permill - divide by 1e6), fee config, minimum amounts, interest rate curve, swap intervals |
| `cf_lending_pool_supply_balances` | `[asset?]` | Per-account supply positions per pool with share amounts |
| `cf_account_info_v2` | `[ss58_account]` | Full account info including balance, bond, role status |
| `cf_free_balances` | `[ss58_account]` | Per-chain, per-asset free balances |
| `cf_lp_total_balances` | `[ss58_account]` | Total balances including LP positions |
| `cf_oracle_prices` | `[]` | Live oracle prices for all assets vs USD |
| `cf_safe_mode_statuses` | `[]` | Per-operation, per-asset safe mode flags (13 assets tracked) |

### Write Path: EIP-712 Non-Native Signed Calls

See "The EIP-712 Encode/Sign/Submit Pipeline" section above for the full flow with code examples from [bouncer tests](https://github.com/chainflip-io/chainflip-backend/blob/main/bouncer/tests/signed_runtime_call.ts).

Key RPC params for `cf_encode_non_native_call` (confirmed via live probing):
- `call`: hex-encoded SCALE bytes
- `blocks_to_expiry`: integer (e.g. 120)
- `nonce_or_account`: integer nonce OR SS58 account string (untagged enum - pass account for auto-resolve)
- `encoding`: `{ "Eth": "Eip712" }` or `{ "Eth": "PersonalSign" }` or `{ "Sol": "Domain" }`

### Lending Events (from pallet source)

| Event | Fields | When |
|---|---|---|
| `LiquidityDepositAddressReady` | channel_id, asset, deposit_address, account_id, expiry_block, boost_fee, channel_opening_fee | Deposit channel opened |
| `LiquidityRefundAddressRegistered` | account_id, chain, address | Refund address set |
| `LoanCreated` | loan_id, asset, borrower_id, principal_amount | New loan opened |
| `LoanUpdated` | loan_id, extra_principal_amount | Loan expanded |
| `LoanRepaid` | loan_id, amount, action_type | Partial/full repayment |
| `LoanSettled` | loan_id, outstanding_principal, via_liquidation | Loan closed |
| `OriginationFeeTaken` | loan_id, pool_fee, network_fee, broker_fee | Fee charged on loan creation |
| `InterestTaken` | pool_interest, network_interest, broker_interest, low_ltv_penalty | Interest distributed |

### Extrinsic Format (from [source](https://github.com/chainflip-io/chainflip-backend/blob/main/state-chain/pallets/cf-environment/src/submit_runtime_call.rs))

```rust
pub struct ChainflipExtrinsic<C> {
    pub call: C,
    pub transaction_metadata: TransactionMetadata,
}

pub struct TransactionMetadata {
    pub nonce: u32,
    pub expiry_block: BlockNumber,
}

pub enum SignatureData {
    Solana { signature: SolSignature, signer: SolAddress, sig_type: SolEncodingType },
    Ethereum { signature: EthereumSignature, signer: EvmAddress, sig_type: EthEncodingType },
}

pub enum EthEncodingType { PersonalSign, Eip712 }
```

The `non_native_signed_call` dispatch validates the signature, deducts FLIP fees, and dispatches the inner call as `Signed(signer_account)`.

### Protocol Parameters (from live `cf_lending_config`)

**LTV Thresholds:**

| Threshold | Value | Purpose |
|---|---|---|
| Max Creation LTV | 80% | Max LTV when opening loans |
| Auto Top-Up Trigger | 85% | Auto-collateralization begins |
| Soft Liquidation Abort | 88% | Soft liq stops if LTV drops below |
| Soft Liquidation | 90% | Gradual DCA liquidation ($10k chunks, 0.5% max slippage) |
| Hard Liquidation Abort | 93% | Hard liq stops if LTV drops below |
| Hard Liquidation | 95% | Aggressive liquidation ($50k chunks, 5% max slippage) |
| Low LTV Penalty | < 50% | 0-1% APY extra (linear) |

**Fees:**

| Fee | Rate | Distribution |
|---|---|---|
| Origination (general) | 1 bps (0.01%) | 80% lenders, 20% protocol (FLIP buy-and-burn) |
| Origination (BTC) | 5 bps (0.05%) | 80% lenders, 20% protocol |
| Liquidation | 5 bps (0.05%) | 80% lenders, 20% protocol |
| Network Interest | +1% APR on top of supply rate | 100% protocol |
| Low LTV Penalty | 0-1% APY (linear, LTV < 50%) | 100% protocol |

**Note**: BTC origination fee is undocumented in the [fees page](https://docs.chainflip.io/lending/fees) (only mentions 1 bps). Always read from `cf_lending_config`, don't hardcode.

**Minimums:** $100 supply, $100 loan creation, $10 loan update, $10 collateral adjustment.

**Interest Rate Model (from live mainnet `cf_lending_config`):**
- 0% utilization -> 0% APR
- 95% utilization (kink) -> 4% APR
- 100% utilization -> 25% APR

Interest collected every 10 blocks (~60s). Distribution threshold: $0.10 USD minimum.

**Supported lending assets:** BTC, ETH, SOL, USDC, USDT.

### Contract Addresses

**Ethereum Mainnet:**
- State Chain Gateway: `0x6995Ab7c4D7F4B03f467Cf4c8E920427d9621DBd`
- FLIP ERC-20: `0x826180541412D574cf1336d22c0C0a287822678A`
- Vault: `0xF5e10380213880111522dd0efD3dbb45b9f62Bcc`

**Arbitrum:**
- Vault: `0x79001a5e762f3bEFC8e5871b42F6734e00498920`

**Solana:**
- Vault: `AusZPVXPoUM8QJJ2SL4KwvRGCQ22cDg6Y4rg7EvFrxi7`

### NPM Packages

| Package | Version | Contents |
|---|---|---|
| [`@chainflip/rpc`](https://github.com/chainflip-io/chainflip-product-toolkit/tree/main/packages/rpc) | 2.1.1 | Typed Zod schemas for 4 lending RPCs, `PUBLIC_RPC_ENDPOINTS`, HTTP/WS client. Read-only - does NOT support `cf_encode_non_native_call` or `author_submitExtrinsic`. |
| [`@chainflip/extrinsics`](https://github.com/chainflip-io/chainflip-product-toolkit/tree/main/packages/extrinsics) | 1.6.2 | **Types only** - zero runtime deps. TypeScript type definitions for all lending calls (auto-generated from metadata). No encoding functionality. |
| [`@chainflip/processor`](https://github.com/chainflip-io/chainflip-product-toolkit/tree/main/packages/processor) | 2.1.2 | Typed event parsers for ALL lending events (LoanCreated, LoanRepaid, etc.) |
| [`@chainflip/scale`](https://github.com/chainflip-io/chainflip-product-toolkit/tree/main/packages/scale) | 2.1.0 | Built on `scale-ts`. Vault swap codecs only - no lending encoders. |
| [`@chainflip/sdk`](https://github.com/chainflip-io/chainflip-sdk-monorepo/tree/main/packages/sdk) | 2.0.3 | Swap/funding ONLY. No lending functions. Zero lending issues in the SDK monorepo. |
| `scale-ts` | 1.6.1 | Standalone SCALE codec (~183 KB, zero deps). **Recommended for encoding.** |

### Existing Codebase Integration Points

| Component | Location | Relevance |
|---|---|---|
| Chainflip swapper | `packages/swapper/src/swappers/ChainflipSwapper/` | Asset mappings, constants, chain-to-Chainflip network mapping |
| EIP-712 signing | Chain adapters `signTypedData` | Already exists for CowSwap/Permit2 - reuse for lending |
| CSP headers | `headers/csps/chainflip.ts` | Needs `rpc.mainnet.chainflip.io` added |
| Config | `src/config.ts` | `VITE_CHAINFLIP_API_KEY`, `VITE_CHAINFLIP_API_URL` already exist |
| Feature flags | `src/state/slices/preferencesSlice/` | Has `ChainflipSwap`, `ChainflipDca` already |
| THORChain Lending | `src/pages/Lending/` | Reference for UI patterns (will be copied/adapted) |
| Yield pages | `src/pages/Yields/` | Modern patterns (React Query, URL as state) to follow |
| Action Center | `src/state/slices/actionSlice/` + `src/components/Layout/Header/ActionCenter/` | Multi-step action tracking |

### Branding

- Primary accent: `#46DA93` (Chainflip green)
- LP Interface: `lp.chainflip.io/lending` (closed-source Next.js static export, v2.0.37)
- No intermediary backend - static frontend connects directly to State Chain RPC

</details>

---

<details>
<summary><h2>Full Implementation Plan</h2></summary>

### Phase 0: Scaffolding & Feature Flags

**0.1 Feature Flag:**
- Add `ChainflipLending` to `FeatureFlags` type in `src/state/slices/preferencesSlice/preferencesSlice.ts`
- Add `VITE_FEATURE_CHAINFLIP_LENDING: bool({ default: false })` to `src/config.ts`
- Add to initial state + test mock
- Set `false` in all `.env` files

**0.2 Navigation & Routes:**
- Add route `/chainflip-lending/*` in `src/Routes/RoutesCommon.tsx` gated behind `ChainflipLending` flag
- New `RouteCategory.Chainflip` (or extend existing)
- `isNew: true` for pink "NEW" badge
- Rename existing lending route label to "THORChain Lending" with "DEPRECATED" badge
- Add Chainflip icon + `#46DA93` accent

**0.3 Page Skeleton:**
- Copy `src/pages/Lending/` to `src/pages/ChainflipLending/` as starting point
- Strip THORChain-specific logic, keep component structure
- Add i18n keys under `chainflipLending` namespace in `en/main.json`

**0.4 CSP Update:**
- Add `rpc.mainnet.chainflip.io` and `wss://rpc.mainnet.chainflip.io` to `headers/csps/chainflip.ts`

### Phase 1: State Chain RPC Client & Read-Only Data

**1.1 State Chain RPC Client:**
- Create `src/lib/chainflip/stateChainRpc.ts`
- HTTP client for one-shot queries (using existing axios patterns)
- JSON-RPC request/response with Zod validation
- Endpoint: `https://rpc.mainnet.chainflip.io`

**1.2 Type Definitions:**
- Create `src/pages/ChainflipLending/types.ts`
- Use `@chainflip/extrinsics` type definitions as guide
- Asset ID mapping: Chainflip `{ chain, asset }` <-> ShapeShift `AssetId` (CAIP format)
- Reuse mappings from `packages/swapper/src/swappers/ChainflipSwapper/constants.ts`

**1.3 React Query Hooks:**
- `useLendingPoolsQuery` - polls `cf_lending_pools` (~30s interval)
- `useLendingConfigQuery` - polls `cf_lending_config` (~5min interval)
- `useLoanAccountsQuery(accountId)` - polls `cf_loan_accounts` (~15s interval)
- `useSupplyBalancesQuery(asset)` - polls `cf_lending_pool_supply_balances` (~30s interval)
- `useStateChainAccountQuery(evmAddress)` - polls `cf_account_info_v2`
- `useSafeModeQuery` - polls `cf_safe_mode_statuses` (~60s interval)

**1.4 Markets Page:**
- `ChainflipLendingPage.tsx` - tabs: Markets, Your Positions
- `AvailableMarkets.tsx` - grid of 5 lending markets
  - Per card: asset icon, total supplied, utilization %, supply APR, borrow APR
  - Click navigates to market detail
- `YourPositions.tsx` - user's supply + borrow positions

**1.5 Market Detail Page:**
- `Pool/ChainflipLendingPool.tsx` - individual market
- Pool stats, utilization curve visualization, interest rate chart
- Fee breakdown (origination, liquidation, network)
- User position in this market (if any)

### Phase 2: EIP-712 Signing Infrastructure & Supply Flow

**2.1 SCALE Encoding with scale-ts:**
- Add `scale-ts` as dependency (~183 KB, zero deps)
- Create `src/lib/chainflip/scaleCodecs.ts`
  - Codecs for all lending calls (addLenderFunds, requestLoan, etc.)
  - Codecs for LP calls (registerLpAccount, register_liquidity_refund_address, etc.)
  - Codec for ChainflipExtrinsic + TransactionMetadata
  - Codec for SignatureData (Ethereum variant)
  - Fetch pallet/call indices from `state_getMetadata` or hardcode with specVersion guard

**2.2 EIP-712 Signing:**
- Create `src/lib/chainflip/eip712.ts`
  - `encodeNonNativeCall(hexCall, blocksToExpiry, accountOrNonce)` - calls `cf_encode_non_native_call` via raw fetch
  - Returns EIP-712 TypedData + TransactionMetadata
- Create `src/lib/chainflip/submitExtrinsic.ts`
  - Constructs unsigned extrinsic bytes: `compact_len + 0x04 + outer_call_bytes`
  - Submits via `author_submitExtrinsic` raw fetch
  - Watches for extrinsic inclusion / events

**2.3 Account Management:**
- `src/lib/chainflip/account.ts`
  - `getStateChainAccountId(evmAddress)` - derive SS58 account from EVM address (left-pad + SS58 encode)
  - `checkAccountExists(accountId)` - check via `cf_account_info_v2`
  - PoC: `fundStateChainAccount` via Gateway contract + `registerLpAccount` via non-native signed call
  - TODO: migrate to BaaS `request_account_creation_deposit_address` when David exposes it

**2.4 Deposit Channel Flow:**
- `src/lib/chainflip/depositChannel.ts`
  - Self-signed `request_liquidity_deposit_address` via `nonNativeSignedCall`
  - Watch for `LiquidityDepositAddressReady` event to get deposit address
  - Display deposit address with QR code, amount guidance, expiry countdown (24h)
  - Monitor deposit witness via `cf_free_balances` polling

**2.5 Supply Flow UI:**
- `Pool/components/Supply/ChainflipSupply.tsx`
  - Multi-step: check account -> check balance -> deposit if needed -> enter amount -> sign -> confirm
  - EIP-712 sign for `add_lender_funds(asset, amount)`
  - Minimum $100 supply validation
  - Show estimated APR

- `Pool/components/Supply/ChainflipWithdraw.tsx`
  - Enter amount or "Max"
  - EIP-712 sign for `remove_lender_funds(asset, amount)` (null = withdraw all)
  - Option to withdraw from State Chain to native chain via `withdraw_asset`

### Phase 3: Borrow Flow

**3.1 Collateral Management:**
- `AddCollateral.tsx` - select asset(s), enter amounts, sign `add_collateral`
- `RemoveCollateral.tsx` - validate LTV stays under 80%, sign `remove_collateral`
- PCA selector - sign `update_collateral_topup_asset`
- Multi-asset collateral support (`BTreeMap<Asset, Amount>`)

**3.2 Loan Creation:**
- `OpenLoan.tsx` - multi-step:
  1. Ensure collateral posted
  2. Select borrow asset + amount
  3. Show resulting LTV, borrow APR, origination fee (1-5 bps depending on asset)
  4. Optional: batch `add_collateral` + `request_loan` in one signature
  5. Sign EIP-712
  6. Borrowed amount in free balance -> optional withdraw to native chain
- `ExpandLoan.tsx` - increase existing loan amount

**3.3 Repayment:**
- `RepayLoan.tsx` - select loan, partial or full repayment
- From State Chain free balance (deposit more if insufficient)
- Sign `make_repayment(loan_id, { Exact: amount } | 'Full')`

**3.4 Position Dashboard:**
- `YourLoans.tsx` - comprehensive dashboard
- Active loans with principal, interest, creation date
- Collateral positions per asset with USD value (from `cf_oracle_prices`)
- LTV gauge with threshold markers (80/85/88/90/93/95%)
- Health indicator: green/yellow/orange/red
- Liquidation risk alerts

### Phase 4: Action Center Integration

**4.1 New Action Type:**
- Add `ChainflipLending` to `ActionType` enum in `src/state/slices/actionSlice/types.ts`

**4.2 Action Center Subscriber:**
- Create `useChainflipLendingSubscriber.ts` in `src/hooks/useActionCenterSubscribers/`
- Tracks deposit channel operations + State Chain extrinsic inclusion

**4.3 Action Cards:**
- `ChainflipLendingActionCard.tsx` - displays lending operation progress

### Phase 5: Polish & Advanced

- Liquidation monitoring and alerts
- Utilization curve visualization
- Transaction history
- FLIP balance monitoring + low balance warnings
- Browser notifications for approaching thresholds

</details>

---

<details>
<summary><h2>AI Agent Implementation Plan</h2></summary>

### Context Revival for Agents

This section provides everything an AI agent needs to pick up Chainflip lending work from scratch.

**Librarian/Research Steps** (run these to regain full context):

```bash
# 1. Read this GitHub issue for full research + plan

# 2. Check existing Chainflip integration
ls packages/swapper/src/swappers/ChainflipSwapper/
cat packages/swapper/src/swappers/ChainflipSwapper/constants.ts

# 3. Check current feature flags pattern
grep -n "ChainflipSwap\|ChainflipDca\|ThorchainLending" src/state/slices/preferencesSlice/preferencesSlice.ts

# 4. Check existing THORChain lending structure
ls src/pages/Lending/
ls src/pages/Lending/Pool/components/

# 5. Check Action Center types
cat src/state/slices/actionSlice/types.ts

# 6. Check Action Center subscribers
ls src/hooks/useActionCenterSubscribers/

# 7. Verify public RPC works
curl -s -X POST https://rpc.mainnet.chainflip.io \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"cf_lending_pools","params":[],"id":1}' | jq '.result | length'
# Should return 5 (BTC, ETH, SOL, USDC, USDT)

# 8. Check CSP headers
cat headers/csps/chainflip.ts

# 9. Check existing config
grep -n "CHAINFLIP" src/config.ts

# 10. Check yields patterns (reference for modern approach)
ls src/pages/Yields/

# 11. Check EIP-712 signing in chain adapters
grep -rn "signTypedData" packages/hdwallet-*/src/ --include="*.ts" | head -10
```

**Key Technical Facts for Agents:**
- Public RPC: `https://rpc.mainnet.chainflip.io` (HTTP) / `wss://rpc.mainnet.chainflip.io` (WS)
- No API key needed for State Chain RPC (221 methods available)
- Runtime: specVersion 20012, transactionVersion 13
- EIP-712 signing via `cf_encode_non_native_call` RPC - params: `(hexCall, blocksToExpiry, nonceOrAccount, {Eth:'Eip712'})`
- Extrinsic submission via `author_submitExtrinsic` (unsigned)
- All lending calls go through `environment.nonNativeSignedCall`
- `environment.batch` (NOT `utility.batch`) combines multiple operations in one EIP-712 signature (max 10 calls, no nesting, cross-pallet OK)
- SC account derived from ETH address: left-pad to 32 bytes + SS58 encode
- LP registration: `liquidityProvider.registerLpAccount()`
- Use `scale-ts` (~183 KB, zero deps) for SCALE encoding - NO `@polkadot/api` needed
- `@chainflip/extrinsics` provides TypeScript types (zero runtime deps) - use for type guidance
- `@chainflip/rpc` provides read-only lending RPCs - use for queries
- EIP-712 signing already exists in codebase (CowSwap/Permit2 via `signTypedData`)
- Chainflip asset format: `{ chain: "Bitcoin", asset: "BTC" }` -> needs mapping to CAIP AssetId
- Interest updates every 10 State Chain blocks (~60s)
- LTV thresholds: 80% creation, 85% top-up, 88% soft abort, 90% soft liq, 93% hard abort, 95% hard liq
- LTV from `cf_loan_accounts` = Perbill (div 1e9), from `cf_lending_config` = Permill (div 1e6) - intentional
- Feature flag: `ChainflipLending`
- Branding accent: `#46DA93`
- BTC origination fee is 5 bps (not 1 bps like other assets) - read from config, don't hardcode
- Deposit channel event: `LiquidityDepositAddressReady` (channel_id, asset, deposit_address, account_id, expiry_block, boost_fee, channel_opening_fee)
- Deposit channels expire in 24 hours - funds after expiry are lost
- Refund address: one-time per chain, persistent storage. Required before `request_loan` and `request_liquidity_deposit_address`, NOT before `withdraw_asset`. Can be batched with loan ops.
- FLIP balance needed for extrinsic fees - "1-2 FLIP is enough to get started"
- `NonceOrAccount` param: number -> literal nonce, SS58 string -> auto-resolve from chain. Hex strings (0x...) do NOT work.
- Account MUST exist before submission (FLIP funding creates it). First call with nonce=0 works. Nonce validation is `>=` so you can submit nonce 0,1,2... concurrently.
- PoC account creation: Gateway contract `fundStateChainAccount` + `registerLpAccount` via non-native signed call
- TODO: migrate to BaaS `request_account_creation_deposit_address` when David (BaaS team) exposes it
- State Chain Gateway: `0x6995ab7c4d7f4b03f467cf4c8e920427d9621dbd`
- FLIP ERC-20: `0x826180541412d574cf1336d22c0c0a287822678a`
- Voluntary liquidation extrinsics still exist in spec 20012

### Parallelization Opportunities

These can run simultaneously with agent teams:
- **Phase 0 tasks** are all independent of each other
- **Phase 1 queries** (6 React Query hooks) are independent once RPC client + types exist
- **Phase 1 UI** (3 pages) can parallelize once queries exist
- **Phase 2 infra** (scale-ts codecs, EIP-712, submit) should be one focused agent
- **Phase 3 flows** (collateral, loan, repay) can parallelize once Phase 2 infra works
- **Phase 4** (Action Center) can start once Phase 2 supply flow works
- **Phase 5** (polish) is all independent

Recommend: 2-3 parallel agents max per phase, with a lead agent coordinating.

</details>

