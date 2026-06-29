# TODO

Untracked working notes — pending work pulled from auto-memory plus the in-flight
refactor identified in this session. Not for commit.

---

## Refactor: split `*TransactionMetadata` from `SwapperSpecificMetadata`

**Origin**: 2026-05-08 review of `packages/swapper/src/types.ts` while threading
THORChain transaction data through the public-api.

**Problem**: today's `*TransactionMetadata` structs (e.g. `RelayTransactionMetadata`,
`DebridgeTransactionMetadata`, `nearIntentsSpecific`) bag two unrelated concerns
into a single shape:

1. **Build-time tx params** — `to`, `data`, `value`, `gasLimit`, `psbt`, `opReturnData`
2. **Post-submission tracking tokens** — `relayId`, `orderId`, `isSameChainSwap`, etc.

The same struct lives on both `TradeQuoteStep` (where the build half is consumed)
and on `Swap.metadata` / `StoredQuote.metadata` via `SwapperSpecificMetadata` (where
only the tracking half is consumed). Each phase ignores the irrelevant half.

**Cruft confirmed**: `acrossTransactionMetadata` is copied into
`SwapperSpecificMetadata` (`packages/public-api/src/routes/quote/getQuote.ts:202`)
but `AcrossSwapper.checkTradeStatus` (`endpoints.ts:71-140`) never reads it — it
polls by tx hash. Field is fully dead post-submission.

**Plan**:

1. Split each `*TransactionMetadata` into `*TxBuild` (step-only) and
   `*Tracking` (swap-only).
2. Keep build halves on `TradeQuoteStep`. Keep tracking halves on
   `SwapperSpecificMetadata`.
3. Update all `step.<x>TransactionMetadata` consumers
   (`packages/swapper/src/swappers/*/endpoints.ts`,
   `packages/public-api/src/routes/quote/extractTransactionData.ts`) to read
   from the build half.
4. Update all `swap.metadata.<x>TransactionMetadata` consumers
   (`RelaySwapper/endpoints.ts:189-223`, `DebridgeSwapper/endpoints.ts:140`,
   `useSwapActionSubscriber.tsx:256`) to read from the tracking half.
5. Drop `acrossTransactionMetadata` from `SwapperSpecificMetadata` entirely +
   stop copying it in `getQuote.ts`.

**Why bother**: real, modest readability win — types tell the truth about
lifecycle. Step has only what's needed to build a tx; swap has only what's needed
to track one. `thorchainTransactionMetadata` (just added) is already on the clean
side of this and stays step-only.

**Cost**: medium churn. Touches all `*Swapper` packages plus `public-api`.
Defer until the THORChain widget integration work has settled.

---

## Quote expiry enforcement (widget + public-api contract)

**Origin**: 2026-05-08 discussion of why the swap-widget doesn't call
`swapper.getUnsigned*Transaction` at sign time. Conclusion: trusting the
public-api response is correct (external consumers can't reach the swapper
directly), but staleness must be guarded by an enforced quote expiry.

**Problem**: today's expiry data is plumbed but not load-bearing.

- THORNode returns an `expiry` on `/quote/swap`; we capture it on
  `thorchainTransactionMetadata.expiry`
  (`packages/swapper/src/types.ts:427`, set in
  `packages/swapper/src/thorchain-utils/getL1RateOrQuote.ts:301,348`).
- Public-api response carries an envelope-level `expiresAt`
  (`packages/public-api/src/routes/quote/types.ts:152`), but it's the
  **server cache TTL** (`QuoteStore.QUOTE_TTL_MS` = 15 min), not the
  THORChain vault expiry. Server TTL can outlast the network's accept window.
- `QuoteStepSchema` exposes no expiry — external API consumers can't see
  the binding deadline even if they want to honor it.
- Widget mirrors `expiresAt` in its types
  (`packages/swap-widget/src/types/index.ts:222`) but never reads it: no
  countdown, no pre-sign guard, no auto re-quote.

**Risk**: signing against a rotated THORChain vault (funds lost/delayed)
or against stale fees.

**Plan**:

1. Surface per-step expiry on the public-api response. Either lift
   `thorchainTransactionMetadata.expiry` onto the step, or compute envelope
   `expiresAt = min(server TTL, all step expiries)` so the envelope is the
   binding deadline. Latter keeps the contract surface small.
2. Widget: block sign when `Date.now() >= expiresAt`, auto-refetch quote,
   show a countdown in the UI.
3. Document the contract for external API consumers in the public-api
   README: "do not sign after `expiresAt`; re-fetch the quote."

**Note**: the existing "getQuote: quote expiry mismatch" item in the
edge-cases list (response says 1 min, stored 15 min) is a related but
distinct bug — this section is the broader design fix that subsumes it.

---

## THORChain widget integration — remaining gaps

- **swap-widget execution hook**: `useSwapExecution.ts` throws "not yet
  supported" for `utxo_psbt` and `cosmos` `transactionData.type` values.
- **THORChain native (RUNE/TCY/RUJI)** — uses `MsgDeposit` with no `to`
  address. Current `CosmosTransactionData` type doesn't model this shape, so
  cosmos execution can't dispatch THORChain native swaps.

---

## swap-widget execution/approval refactor (deferred)

`useSwapExecution.ts` and `useSwapApproval.ts` should move from `useEffect`-driven
("watch for `stateValue === 'executing'` and react") to imperative async functions
returned for direct `onClick` invocation. Local `isPending` replaces the
`executingRef`/`approvingRef` guards; try/catch at the call site replaces the
actor-send error dispatch.

**Why**: execution is a user-initiated mutation. Modeling it as effect-driven
inverts the call flow, requires refs to guard against dep-array re-fires that
wouldn't exist outside an effect, and forces awkward eslint dep choices.
Discussed and parked 2026-05-07 after cleaning up the existing hook (THORChain
pass-through + dispatch on `transactionData.type` + `getErrorMessage` helper).

**Before refactoring, verify**:

1. Who currently sends `FETCH_QUOTE` / `APPROVE`? The machine auto-transitions
   `quoting → executing` on `QUOTE_SUCCESS` and `approving → executing` on
   `APPROVAL_SUCCESS` (`packages/swap-widget/src/machines/swapMachine.ts`). If
   the UX is "quote success auto-fires execution" with no second confirm click,
   the dispatcher of `QUOTE_SUCCESS` / `APPROVAL_SUCCESS` must also invoke the
   new imperative `executeSwap()`, or the user gains a click they didn't have.
2. Is the `executing` machine state referenced for UI elsewhere (e.g.
   "Submitting..." in `SwapWidget.tsx`)? If so, either keep tracking via local
   `isPending` on the button or send an `EXECUTE_START` event into the machine
   before awaiting.

**Target shape**:

```ts
export const useSwapExecution = () => {
  const actorRef = SwapMachineCtx.useActorRef()
  const { walletClient, walletAddress, bitcoin, solana } = useSwapWallet()
  return useCallback(async () => { /* same body */ }, [actorRef, walletClient, walletAddress, bitcoin, solana])
}
```

Caller: `const executeSwap = useSwapExecution()` →
`<Button onClick={executeSwap} disabled={isPending} />`.

---

## swap-widget read-path decoupling from wagmi (BYO-ready)

**Origin**: 2026-05-14 session that collapsed AppKit internal/external modes
and switched EVM signing from wagmi's `useWalletClient()` to AppKit's
namespace API (`useAppKitProvider('eip155')` → local `createWalletClient`).
Signing path now matches BTC/Solana. Read path is the remaining wagmi
dependency.

**Current state after the signing-side refactor**:

- `useEvmSigning` reads EIP-1193 from AppKit directly; constructs viem
  `WalletClient` locally. No wagmi React imports in `SwapWidget.tsx`.
- `WalletProvider.tsx` still wraps the tree in `WagmiProvider`. Its
  sole job is letting `useBalances.ts` call `useConfig()` to read the
  wagmi `Config` and hand it to `getBalance` / `readContract` from
  `@wagmi/core`.
- That config is also a module singleton (`getWagmiAdapter()?.wagmiConfig`
  in `config/appkit.ts`). React context here is redundant with the
  singleton.

**Problem this is heading toward**: BYO wallet support (planned). Partners
who supply their own EVM wallet (`{ provider, address }`) but do not init
AppKit at all have no wagmi adapter and no read transports. Today's reads
would silently break in that scenario.

**Decision (2026-05-14)**: integrators should not care about the read
path. We declare which chains we support; we own how to read from them.
No partner-facing read/transport prop. Reads must work in all three
scenarios: AppKit-only, partial BYO (BYO EVM + AppKit BTC/Solana), full
BYO (no AppKit).

**Plan**:

1. New `config/publicClients.ts` — `Record<ChainId, viem.PublicClient>`
   built from viem's `http()` over each supported chain's default RPC
   (`viem/chains` already exposes free public endpoints). Curated/proxied
   RPCs can land later if reliability becomes an issue; the abstraction
   is the same.
2. Rewrite `useBalances.ts` (3 call sites) to use those PublicClients:
   - `getBalance(config, { address, chainId })` →
     `clients[chainId].getBalance({ address })`
   - `readContract(config, { abi, address, chainId, functionName, args })`
     → `clients[chainId].readContract({ abi, address, functionName, args })`
3. Delete `WagmiProvider` from `WalletProvider.tsx` (no consumers left).
4. Remove `wagmi` and `@wagmi/core` from `packages/swap-widget/package.json`
   peerDeps. AppKit still pulls in `WagmiAdapter` internally — that's its
   own dependency tree, unaffected.

**End state**: widget's direct deps are AppKit + viem. The read path is
identical regardless of AppKit's presence, so BYO becomes a single
optional prop (`evmWallet?: { provider, address }`) wired into
`useEvmSigning`'s fallback chain without touching reads.

**Why deferred**: only matters when full-BYO partners arrive; today's
AppKit-always setup works fine via the wagmi adapter. Pick this up when
BYO ships or as housekeeping if appetite arises.

---

## swap-widget & public-api edge cases

Identified 2026-04-10. To be addressed before final validation. Re-verify against
current code before fixing — file:line refs may have drifted.

### High severity

#### swap-widget

- [ ] **useStatusPolling: no polling timeout** — stuck-in-mempool tx polls forever.
- [ ] **useStatusPolling: single transient error kills the swap** — one network blip dispatches `STATUS_FAILED`.
- [ ] **useStatusPolling: timer leak on unmount** — `setTimeout` fires after cleanup.
- [ ] **useSwapApproval: no `waitForTransactionReceipt` timeout** — stuck approval hangs UI.
- [ ] **useSwapExecution: solana connection null-check missing** — stale/null connection unrecoverable.
- [ ] **swapMachine: cosmos / other chain types have no execution path** — machine stuck without feedback.

#### public-api

- [ ] **getQuote: quote expiry mismatch** — stored 15 min TTL, response says 1 min; client over-retries.
- [ ] **getQuote: steps array not length-checked** — empty steps crashes at `steps[steps.length - 1]`.
- [ ] **getQuote: quote stored before deposit context validation** — orphaned quotes on resolution failure.
- [ ] **getSwapStatus: registration failure + store success = desync** — swap-service never learns of the swap.
- [ ] **QuoteStore: txHash index orphaning** — re-binding a new txHash leaves stale index entries.

### Medium severity

#### swap-widget

- [ ] **useSwapQuoting: silent receive address fallback** — falls back to `sendAddress` on invalid receive without notifying.
- [ ] **useSwapQuoting: no slippage upper bound** — user can set 99 % silently.
- [ ] **useSwapQuoting: stale rate reference** between quote fetch trigger and execution.
- [ ] **useSwapQuoting: balance check race** — balance can change between check and submit.
- [ ] **SwapWidget: initial state sync race** — `FETCH_QUOTE` could fire before initial assets are set.
- [ ] **SwapWidget: receive address memoization stale closure** — `buyChainType` change without `chainId` change misses invalidation.
- [ ] **SwapWidget: `SET_RECEIVE_ADDRESS` fires before machine ready** on mount.
- [ ] **useSwapExecution: gas estimation error not distinguished** from generic "Transaction failed".
- [ ] **useSwapExecution: UTXO field validation missing** — `depositAddress`, `value`, `memo` not validated before `sendTransfer()`.
- [ ] **useSwapApproval: double-approval race** — rapid state transitions can fire duplicate approval txs.
- [ ] **Mid-flow EVM account switch (e.g. MetaMask)** — once the machine leaves `input`, switching accounts in the wallet propagates `evm.address` → `sendAddress` reactively but the quote isn't re-fetched. Concrete failure modes:
  - `approval.isRequired` was computed against account A's allowance; if user switches to B before executing, machine skips approval and the execution tx reverts (B has zero allowance).
  - Approval granted as A then switch to B before execute → allowance is on A's slot; B's tx reverts.
  - viem's `sendTransaction({ account })` sends `from = A`; wallet selected is B → wallet rejects with "from mismatch" / "unknown account".
  - `polling_status` is fine — tx already on-chain.

  Fix: detect+nudge before each signing call in `useSwapApproval`/`useSwapExecution` — compare live `evm.address` against `context.sendAddress`; if mismatch, short-circuit with user-facing error ("This swap was started from 0x1234…5678 — switch back in your wallet or reset"). Optional: non-blocking banner in `approval_needed`/`approving`/`executing` states. No way to programmatically force MetaMask onto a specific account (`wallet_requestPermissions` only re-pops the picker).
- [ ] **swapMachine: retry guard race** — multiple error sources compete; can fall back to `executing` without valid context.
- [ ] **useStatusPolling: stale solana connection reference** — captured at hook level, not refreshed.
- [ ] **useStatusPolling: API registration race** — slow registration + next poll cycle = duplicate registration.

#### public-api

- [ ] **getRates: all swappers fail → 200 OK** — empty `rates: []` indistinguishable from "no routes".
- [ ] **getSwapStatus: quote TTL < polling window** — eviction during poll → 404 instead of confirmed/failed.
- [ ] **getSwapStatus: 404 → infinite re-registration** with no backoff or max attempts.
- [ ] **getSwapStatus: IDLE status not handled** — falls through without status update.
- [ ] **getSwapStatus: 'submitted' not persisted on second poll** — visible status regression.
- [ ] **QuoteStore: race in set/evict** — concurrent requests can both pass capacity check.
- [ ] **auth middleware: invalid partner codes not logged** — no audit trail.

### Low severity

- [ ] **useSwapApproval: spender format not validated** — malformed spender → cryptic viem error.
- [ ] **getRates: BigInt parsing rejects scientific notation** — incorrect sorting if upstream sends `"1.5e18"`.
- [ ] **QuoteStore: LRU eviction non-deterministic** for identical timestamps (Map iteration order).

---

## Surface refund tx hash in trade status (BobGateway + generic)

**Origin**: 2026-06-08 review of `BobGatewaySwapper/endpoints.ts` `checkTradeStatus`.
The code was assigning a refund tx hash into `buyTxHash` on non-success
(`buyTxHash: status === Confirmed ? buyTxHash : refundTxHash`). Fixed in-branch to
never put a refund into `buyTxHash` (refund now only drives `message: 'Trade
refunded'`).

**Why it was wrong**: `buyTxHash` renders via `TxLabel` against
`buyAsset.explorerTxLink` (`ExpandedStepperSteps.tsx:468-477`). A refund lands on
the *sell/origin* chain, so a refund hash there produces a broken, wrong-chain
explorer link. `buyTxHash` is buy-side-specific, not a generic "out/result" hash.
BobGateway was the only swapper doing this; Relay/Across surface refunds via status
`Failed` + `message`, never via `buyTxHash`.

**Follow-up (the actual feature)**: refunds have no first-class surface today.
`TradeStatus` (`packages/swapper/src/types.ts:826`) has `buyTxHash`/`relayerTxHash`
but no `refundTxHash`. To show a clickable refund link in the action center:

1. Add `refundTxHash?: string` to `TradeStatus`.
2. Populate it in `checkTradeStatus` (BobGateway has `swap.sellAsset` available to
   pair with it; the refund hash comes from `orderInfo.status.refunded.refundedTokens[0]`).
3. Render via `TxLabel` against **`sellAsset.explorerTxLink`** (not buy) wherever
   `buyTxHash` is rendered, plus the action center.

Note: message rendering is plain truncated text (`<Text translation={...}
noOfLines={2}>` in `ExpandableStepperSteps.tsx:245`), so a raw URL in `message` is
not a usable link — the dedicated field + `TxLabel` is the right path.

---

## Release script follow-ups

`scripts/release.ts` after the merge-based release flow ships:

1. **Add `release-fix` subcommand** that cherry-picks a develop commit onto
   release with `-x` automatically. Closes the only human-in-the-loop gap in the
   new flow — without `-x` the trailer is missing and the next regular release
   re-includes the commit from develop.

2. **Broader safety checks throughout the flow** to prevent landing in a broken
   git state. Examples:
   - Warn in `handleReleaseReady` if any commit on release between the last
     merge and release tip lacks a `(cherry picked from commit ...)` trailer.
   - Warn if a develop tag points somewhere with no corresponding release merge.
   - Warn if release branch is ahead of main without an open PR after a long
     delay.
   - Warn on hotfix cherry-picks on release without a matching hotfix PR.

**Why**: the merge-based flow is bulletproof for regular releases; the
script-driven hotfix flow handles trailers itself. Release fixes (fix lands on
develop while release PR is open, then cherry-picked into the open release) are
the only path that depends on the human remembering `-x`.

---

## Affiliate fee split — remaining work

Created 2026-04-10. Split model landed in `feat/affiliate-fee-split`: partner's
configured bps is partner's share only (variant b); swap-service stamps
`shapeshiftBps` per-swap and `affiliateBps = partnerBps + shapeshiftBps`.
Resolved this session/branch:

- ✅ `AbortController` 5s timeout on `resolvePartnerCodeFromService` (auth.ts)
- ✅ Swap-service stores per-swap `shapeshiftBps`/`partnerBps`/`affiliateBps`
- ✅ Web sends full split in `tradeExecution.ts` POST /swaps payload
- ✅ Public-api `calculatePartnerFeeAmountUsd` guards on `affiliateBps === 0`
- ✅ `affiliateBps` exposed on `getAffiliateSwaps` response so dashboard can
  detect fee-exempt swaps

### Still open

1. **`partnerCode` plumbed into `StoredQuote` and forwarded in registration**
   — middleware sets `req.affiliateInfo.partnerCode` but it isn't carried
   through `quoteStore` and isn't in the public-api `POST /swaps` body. Today
   swap-service re-resolves from `partnerAddress`; explicit is better for audit.
2. **Expose `affiliateBps` / `partnerBps` / `shapeshiftBps` on quote and rate
   responses** for partner integrators that want to display the fee breakdown
   pre-trade. Optional, no blocker.
3. **`origin: 'widget'` vs `'api'`** — public-api hardcodes `'api'` for
   registration; widget-originated swaps may want their own commission rule.
   Defer until widget partner program ships.
4. **Affiliate dashboard: fee-exempt swap UX** — swaps with `affiliateBps === 0`
   and non-zero `partnerBps` should render a clear "Fee-exempt bridge swap"
   badge instead of an empty `affiliateFeeAmountUsd` cell. Schema now carries
   `affiliateBps` so the component can detect the case.
5. **Settlement infrastructure** — see `## Swap-service changes` below.

### Edge cases & gotchas

1. Verified BPS can differ from intended BPS — settlement must use verified.
2. THORChain zeroes affiliate fees below outbound; check `hasAffiliate`, not
   just `isAffiliateVerified`.
3. USD values freeze on 5th of each month; `resolveSwapUsdValue()` already
   handles boundary swaps.
4. Jupiter verification is TODO — `swap-verification.service.ts` returns
   `isVerified: false`. Either implement or exclude from affiliate program.
5. Relay uses `fixed_base` fee strategy (Base USDC). Settlement display must
   show fee asset, not assume swap asset.
6. Multiple origins → different formulas. Public-api currently sends `'api'`.
7. Disputes need recalc-from-verified-on-chain capability.
8. Double-counting prevention: `@@unique([affiliateAddress, periodStart])`.
9. Price volatility between collection and payout — treasury concern.
10. Partner code claimed after swaps recorded — settlement keys on
    `affiliateAddress`, not code.

---

## Migrate per-swap fee USD calc from public-api to swap-service

**Origin**: 2026-05-28 audit of `calculatePartnerFeeAmountUsd` while fixing the
fee-exempt swap bug.

**Problem**: public-api's `calculatePartnerFeeAmountUsd`
(`packages/public-api/src/routes/affiliate/calculatePartnerFeeAmountUsd.ts`)
re-implements partner-share USD math that swap-service already owns for
settlement (`calculateFeeForSwap` in `swaps/utils.ts`, `getPartnerFeeRate` and
`calculateAffiliateFees` in `swaps.service.ts`). Two services with two
implementations of the same calc means they can disagree — exactly what
produced the same-asset phantom-fee bug fixed in this branch (Path 2 of
`calculatePartnerFeeAmountUsd` computed `volume × partnerBps / 10000` while
settlement correctly returned 0 via the `verifiedBps` guard).

**Plan**:

1. Have swap-service stamp `affiliateFeeAmountUsd` on the `Swap` row at
   finalization time (when verification completes and the swap reaches a
   terminal status). Use the same `calculateFeeForSwap` + `getPartnerFeeRate`
   that drives settlement, so dashboard and payout reconcile by construction.
2. Add the field to `SwapServiceAffiliateSwap` and read it through in
   `getAffiliateSwaps`. Delete `calculatePartnerFeeAmountUsd` and its test.
3. Backfill historical rows with a one-shot script over `isAffiliateVerified
   = true` swaps, or accept that pre-migration rows render `null` until they
   get touched by verification.

**Why deferred**: the Path 2 guard fix unblocks correctness now. This migration
is the durable structural fix and earns its keep when settlement payouts start
shipping, since divergence between "what the dashboard shows" and "what we
actually pay" will then be a real incident.

---

## Swap-service changes (microservices repo)

Repo: `/home/kevin/github/shapeshift/microservices/`. Service: `apps/swap-service/`.

### Task 1 — Verify `origin` semantics

- Public-api hardcodes `origin: 'api'` (`status/utils.ts:39`).
- Web app sends `origin: 'web'` (`tradeExecution.ts:234`).
- Decision needed: should swap-widget swaps (embedded by partners) be
  `origin: 'widget'` instead of `'api'`? If so, the commission formula needs a
  `'widget'` case.

### Task 2 — Settlement infrastructure (future)

Per-swap `shapeshiftBps`/`partnerBps`/`affiliateBps` are now stored, unblocking
this work:

```prisma
model Settlement {
  id                     String    @id @default(cuid())
  affiliateAddress       String
  periodStart            DateTime
  periodEnd              DateTime
  totalSwaps             Int
  totalFeeUsd            String
  platformFeeUsd         String
  affiliateCommissionUsd String
  status                 String    @default("pending")  // pending | approved | paid | disputed
  payoutTxHash           String?
  payoutAsset            String?
  paidAt                 DateTime?
  approvedBy             String?
  createdAt              DateTime  @default(now())
  updatedAt              DateTime  @updatedAt

  @@unique([affiliateAddress, periodStart])
  @@index([affiliateAddress])
  @@index([status])
}
```

Endpoints:
- `GET /v1/settlement/:address?period=2026-04` — calculate settlement.
- `POST /v1/admin/settlement/approve` — admin approves.
- `POST /v1/admin/settlement/mark-paid` — record payout tx hash.
- `GET /v1/admin/settlement/pending` — list pending.

Accounting rules:
- Only count `isAffiliateVerified = true` AND `status = 'SUCCESS'`.
- Use frozen `sellAmountUsd` (frozen on 5th of month).
- Use stored `shapeshiftBps` per-swap.
- Settlements immutable once approved.

### Task 3 — Jupiter on-chain verification (lower priority)

`swap-verification.service.ts:~1340` returns `isVerified: false` for Jupiter.
Implement or document the gap and exclude from affiliate program.

### Key files

| File | Purpose |
|------|---------|
| `prisma/schema/swap-service.prisma` | Schema |
| `apps/swap-service/src/swaps/swaps.service.ts` | Core swap + fee logic |
| `apps/swap-service/src/swaps/swaps.controller.ts` | Route handlers |
| `apps/swap-service/src/verification/swap-verification.service.ts` | On-chain verification |
| `apps/swap-service/src/utils/affiliateFeeAsset.ts` | Fee strategy per swapper |
| `apps/swap-service/src/utils/pricing.ts` | CoinGecko prices |
| `apps/swap-service/src/affiliate/affiliate.service.ts` | Partner CRUD |

---

## EIP-1559 displayed network fee overstates the typical cost

**Origin**: 2026-06-23 review of EVM network fee display.

**Problem**: the displayed network fee is computed as
`max(gasPrice, maxFeePerGas) · gasLimit`
(`packages/chain-adapters/src/evm/EvmBaseAdapter.ts:1066,1072,1078` — `txFee` for
fast/average/slow). For EIP-1559 this is `maxFeePerGas · gasLimit`, and
`maxFeePerGas = baseFeePerGas · BASE_FEE_MULTIPLIER + maxPriorityFeePerGas` with
`BASE_FEE_MULTIPLIER = 2` (math lives in another repo). So we display
`(2·baseFee + priority) · gasLimit`.

Under EIP-1559 the user is never charged `maxFeePerGas`. Effective price per gas is
`baseFee(block) + min(priority, maxFee − baseFee)`, which with our cap reduces to
`baseFee + priority` (the full tip always clears; the extra base-fee headroom is
refunded). So `maxFeePerGas · gasLimit` is the **worst-case ceiling**, not the
expected cost — the 2x base-fee buffer exists to keep the tx valid through a rising
base fee (~12.5%/block), not because we expect to pay it.

**Fix**: display the "most likely" fee as `(baseFee + maxPriorityFee) · gasLimit`,
while keeping `maxFeePerGas · gasLimit` for anything that gates affordability.

- **Display** ("Network fee"): `(baseFee + priority) · gasLimit` — expected cost.
- **Balance / insufficient-gas checks / max-send**: keep `maxFeePerGas · gasLimit`
  (conservative ceiling), or a base-fee spike could make a "displayed-affordable" tx
  fail at broadcast. NB: the gas-balance logic in
  `src/state/apis/swapper/helpers/validateTradeQuote.ts` must stay on the max.
- Optional, most honest UX: range "~$X (up to $Y)" where
  `X = (baseFee+priority)·gasLimit`, `Y = maxFee·gasLimit`.

**Caveats**:
- `gasLimit` itself overstates contract-call fees (charged `gasUsed`, not
  `gasLimit`) — separate, smaller, not pre-execution-fixable; leave it.
- L2s (Arbitrum/Optimism/Base): base fee is tiny/stable + separate L1 data fee, so
  the overstatement is negligible there. Win is mainnet / volatile-base-fee chains.

**Why deferred**: display-only correctness improvement; needs care to split the
"display" value from the "reserve/affordability" value so we don't under-reserve.
