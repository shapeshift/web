# MetaMask Native Multichain Migration Plan

> **GitHub Issues**:
> - #12121 - feat: metamask native multichain support (main)
> - #12122 - feat: metamask native tron support via multichain api (deferred)
> - #12123 - feat: migrate to caip-25 multichain api when production-ready (future)
> **Branch**: `feat/mm_multichain`
> **Worktree**: `.worktrees/mm_multichain`
> **Tracking**: Use beads for implementation tasks

## #1 Rule: Zero Regression Risk

**Flag off (prod) = completely untouched existing code paths. No regressions. Period.**

The feature flag gates ALL new behavior. When the flag is off, the entire MetaMask multichain snap flow remains exactly as it is today. No conditional branches in existing code, no shared utilities that could leak behavior, no refactored interfaces that could change semantics.

---

## Table of Contents

1. [Context & Motivation](#context--motivation)
2. [Current Architecture (Snap-based)](#current-architecture-snap-based)
3. [Target Architecture (Native Multichain)](#target-architecture-native-multichain)
4. [Chain Coverage Comparison](#chain-coverage-comparison)
5. [Feature Flag Strategy](#feature-flag-strategy)
6. [Implementation Phases](#implementation-phases)
7. [Account Migration Strategy](#account-migration-strategy)
8. [UX Migration Plan](#ux-migration-plan)
9. [Open Questions & Decisions](#open-questions--decisions)

---

## Context & Motivation

MetaMask rearchitected its account model in 2025, moving from **(1 account = 1 address)** to **(1 account = multiple addresses across chains)**. Non-EVM chains are now supported natively:

| Chain | Native Since | Address Type |
|-------|-------------|--------------|
| All EVM | Always | 0x... (shared across all EVM) |
| Solana | May 2025 | Base58 |
| Bitcoin | Dec 2025 | Native SegWit (bech32) |
| TRON | Jan 2026 | T-address |

MetaMask Extension v13.5+ and Mobile v7.57+ both support multichain accounts.

ShapeShift currently uses a custom **MetaMask Snap** (`@shapeshiftoss/metamask-snaps`) to support non-EVM chains through MetaMask. This snap:
- Derives keys via `snap_getBip32Entropy` + `@shapeshiftoss/hdwallet-native`
- Signs transactions locally and broadcasts via Unchained
- Supports: BTC, LTC, DOGE, BCH, ATOM, THOR (non-EVM); ETH, AVAX (passthrough to MM native)

With MetaMask's native multichain support, the snap is no longer needed for BTC (and potentially SOL in the future). The snap's approach of extracting BIP-32 entropy and signing locally is more fragile and requires snap installation/updates. Native support is better UX.

---

## Current Architecture (Snap-based)

```
MetaMaskAdapter (KeyManager.MetaMask)
    |
    +-- MIPD Store (EIP-6963) -- finds io.metamask provider
    |
    +-- MetaMaskMultiChainHDWallet
            |
            +-- EVM chains --> Direct EIP-1193 RPC (eth_sendTransaction, personal_sign, etc.)
            |
            +-- UTXO chains --> ShapeShift Snap (wallet_invokeSnap)
            |                   snap_getBip32Entropy -> hdwallet-native -> sign -> Unchained broadcast
            |
            +-- Cosmos chains --> ShapeShift Snap (wallet_invokeSnap)
                                  snap_getBip32Entropy -> hdwallet-native -> sign -> Unchained broadcast
```

### Key Files

| File | Purpose |
|------|---------|
| `packages/hdwallet-metamask-multichain/src/adapter.ts` | MetaMaskAdapter - MIPD provider detection, keyring integration |
| `packages/hdwallet-metamask-multichain/src/shapeshift-multichain.ts` | Core wallet class (800+ lines) |
| `packages/hdwallet-metamask-multichain/src/ethereum.ts` | EVM signing via EIP-1193 |
| `packages/hdwallet-metamask-multichain/src/bitcoin.ts` | BTC via snap |
| `packages/hdwallet-metamask-multichain/src/cosmos.ts` | Cosmos via snap |
| `packages/hdwallet-metamask-multichain/src/thorchain.ts` | THORChain via snap |
| `packages/hdwallet-metamask-multichain/src/utxo.ts` | UTXO BIP44/49/84 path derivation |
| `src/utils/snaps.ts` | Snap enablement/version checking |
| `src/hooks/useIsSnapInstalled/useIsSnapInstalled.tsx` | Snap install detection (3s polling) |
| `src/context/AppProvider/hooks/useSnapStatusHandler.tsx` | Snap state monitoring |
| `src/context/AppProvider/hooks/useDiscoverAccounts.tsx` | Account discovery with snap awareness |

### MIPD Dual-Purpose Architecture

**Critical understanding**: The `MetaMaskMultiChainHDWallet` adapter is NOT just for MetaMask. It serves as a **generalized MIPD (EIP-6963) adapter** for other MetaMask-like wallets (Rabby, Ctrl/XDEFI, etc.). The snap functionality is specific to MetaMask (`io.metamask` RDNS), but EVM functionality works for any MIPD-compatible wallet.

This means:
- **Native multichain is ONLY for MetaMask** (`io.metamask` RDNS)
- **The MIPD/EVM adapter must continue working for all other wallets**
- The adapter's dual nature must be preserved

---

## Target Architecture (Native Multichain)

```
MetaMaskAdapter (KeyManager.MetaMask)
    |
    +-- MIPD Store (EIP-6963) -- finds io.metamask provider
    |
    +-- [FLAG OFF] MetaMaskMultiChainHDWallet (existing, 100% UNTOUCHED)
    |       |
    |       +-- EVM chains --> Direct EIP-1193 RPC
    |       +-- UTXO/Cosmos --> ShapeShift Snap
    |
    +-- [FLAG ON] MetaMaskNativeMultiChainHDWallet (NEW CLASS, separate file)
            |
            +-- EVM chains --> Direct EIP-1193 RPC (unchanged)
            |
            +-- Bitcoin --> Bitcoin Wallet Standard (@metamask/bitcoin-wallet-standard)
            |               PSBT signing, native SegWit
            |
            +-- Solana --> Wallet Standard (standard:connect, signTransaction, etc.)
            |
            +-- UTXO (non-BTC) --> REMOVED (LTC, DOGE, BCH not natively supported by MM)
            |
            +-- Cosmos chains --> REMOVED (ATOM, THOR not natively supported by MM)
```

### Integration Standards Per Chain

| Chain | Standard | Library | Signing |
|-------|----------|---------|---------|
| EVM (all) | EIP-1193 + EIP-6963 | Native provider | eth_sendTransaction, personal_sign, eth_signTypedData_v4 |
| Bitcoin | Bitcoin Wallet Standard | `@metamask/bitcoin-wallet-standard` | PSBT (Partially Signed Bitcoin Transactions) |
| Solana | Wallet Standard | `@solana/wallet-standard` | signTransaction, signAllTransactions |
| TRON | TBD | TBD | TBD (newly added Jan 2026, needs research) |

---

## Chain Coverage Comparison

### What we GAIN with native multichain

| Chain | Snap | Native | Notes |
|-------|------|--------|-------|
| Bitcoin | Yes (snap BIP-32 entropy + hdwallet-native) | Yes (Bitcoin Wallet Standard, PSBT) | Better UX, no snap install needed |
| Solana | No | Yes (Wallet Standard) | NEW chain support via MM |
| TRON | No | Yes (native since Jan 2026) | NEW chain support via MM |

### What we LOSE with native multichain

| Chain | Snap | Native | Notes |
|-------|------|--------|-------|
| Litecoin | Yes | No | MM doesn't support LTC natively |
| Dogecoin | Yes | No | MM doesn't support DOGE natively |
| Bitcoin Cash | Yes | No | MM doesn't support BCH natively |
| Cosmos | Yes | No | MM doesn't support ATOM natively |
| THORChain | Yes | No | MM doesn't support RUNE natively |
| Osmosis | Yes (partial) | No | MM doesn't support OSMO natively |

### What stays the SAME

| Chain | Notes |
|-------|-------|
| All EVM chains | EIP-1193 passthrough, identical behavior |

### Decision: Chain Loss Acceptance

With flag ON (native multichain), MetaMask users will lose access to LTC, DOGE, BCH, ATOM, THOR, OSMO. This is acceptable because:
1. These chains had limited usage via the snap
2. The snap UX was inferior (install/update prompts, confirmation dialogs)
3. Users can still access these chains via other wallets (Native, Ledger, etc.)
4. We gain Solana and TRON support which are higher value

**TODO: Validate this assumption with product/community. May want to keep snap as fallback for specific chains.**

---

## Feature Flag Strategy

### Flag Name

```
VITE_FEATURE_MM_NATIVE_MULTICHAIN
```

### Flag Semantics

| Flag State | Behavior |
|------------|----------|
| **OFF (default, prod)** | Existing MetaMaskMultiChainHDWallet with snap support. Zero changes to any code path. |
| **ON (dev)** | New MetaMaskNativeMultiChainHDWallet. No snap. Native BTC/SOL (TRX deferred). No LTC/DOGE/BCH/ATOM/THOR. |

### Flag Enforcement Points

1. **Adapter factory** (`MetaMaskAdapter.useKeyring`): Instantiate the correct wallet class based on flag
2. **Chain support** (`_supportsBTC`, `_supportsCosmos`, etc.): Different support matrix per flag
3. **Snap code** (`useIsSnapInstalled`, `useSnapStatusHandler`, snap modals): Completely disabled when flag ON
4. **Account discovery**: Different logic for which chains to discover
5. **Signing paths**: BTC uses PSBT instead of snap, SOL uses Wallet Standard, etc.

### Flag Safety

- The flag check happens at the **adapter level**, before any wallet instance is created
- When OFF, the new wallet class is never instantiated, never imported (dynamic import)
- No shared mutable state between old and new wallet classes
- Tests must cover both flag states

---

## Implementation Phases

### Phase 1: Foundation

- [ ] Create feature flag `VITE_FEATURE_MM_NATIVE_MULTICHAIN`
- [ ] Create new wallet class `MetaMaskNativeMultiChainHDWallet` (or extend existing with flag-gated behavior)
- [ ] Wire up adapter factory to choose wallet class based on flag
- [ ] EVM passthrough (copy from existing, should be identical)

### Phase 2: Bitcoin via Bitcoin Wallet Standard

- [ ] Add `@metamask/bitcoin-wallet-standard` dependency
- [ ] Implement `bitcoin:connect` for address derivation
- [ ] Implement `bitcoin:signTransaction` (PSBT signing)
- [ ] Implement BTC address retrieval (native SegWit / bech32)
- [ ] Wire up to hdwallet BTC interfaces (`btcGetAddress`, `btcSignTx`, `btcGetPublicKeys`)
- [ ] Handle the PSBT <-> hdwallet transaction format translation

### Phase 3: Solana via Wallet Standard

- [ ] Implement Wallet Standard connection for Solana
- [ ] Implement `signTransaction`, `signAllTransactions`, `signMessage`
- [ ] Wire up to hdwallet Solana interfaces
- [ ] Address derivation and public key retrieval

### Phase 4: Account Migration

- [ ] Detect old MetaMaskMultichain + snap accounts
- [ ] Programmatically nuke snap-derived accounts
- [ ] Re-derive accounts using native multichain
- [ ] Only trigger migration when flag is ON AND old snap accounts exist
- [ ] **TODO**: Determine if we can detect snap vs native accounts reliably

### Phase 5: Snap Removal (flag ON only)

- [ ] Disable all snap install/update modals
- [ ] Disable `useIsSnapInstalled` polling
- [ ] Disable `useSnapStatusHandler`
- [ ] Remove snap-related UI routes (`/metamask/snap/install`, `/metamask/snap/update`)
- [ ] Skip snap chain discovery for LTC, DOGE, BCH, ATOM, THOR

### Phase 6: TRON via MM Native (DEFERRED)

**Status: Deferred to follow-up.** MetaMask TRON dapp connectivity is NOT live yet (only send/receive/stake from within MM UI). When it launches, MM will use CAIP-25 Multichain API via `@metamask/connect-tron` (NOT TronLink-compatible, NOT Wallet Standard).

**When ready:**
- [ ] Add `@metamask/connect-tron` + `@metamask/multichain-api-client` dependencies
- [ ] Implement TRON address retrieval via `MetaMaskAdapter.connect()`
- [ ] Implement TRON signing via `MetaMaskAdapter.signTransaction()` (receives `raw_data_hex` + contract type, returns signature)
- [ ] Wire up to `TronWallet` interface in the new wallet class
- [ ] ShapeShift already has full TRON chain adapter, hdwallet interfaces, and asset data - no chain-level work needed

### Phase 7: Multi-Account Discovery

- [ ] Query MM for all available multichain accounts (not just account 0)
- [ ] Map MM account indexes to ShapeShift account discovery
- [ ] Each MM account = 1 EVM + 1 BTC + 1 SOL + 1 TRX address set

### Phase 8: i18n & Copy

- [ ] Add all new strings to `src/assets/translations/en/main.json`
- [ ] Deprecation modal copy (title, body, buttons, warnings)
- [ ] Settings toggle copy (mode label, switch buttons)
- [ ] Confirmation modal copy (both directions: snap->native, native->snap)
- [ ] Banner copy for deprecated snap mode
- [ ] Run `/translate` to generate translations for all supported languages
- [ ] Review translations for accuracy (wallet/crypto terminology is tricky)

---

## Account Migration Strategy

### Problem

When switching from snap to native multichain, accounts derived via `snap_getBip32Entropy` need to be replaced with natively-derived accounts. The derivation paths differ (snap uses BIP-44 legacy, native uses BIP-84 native SegWit), so addresses WILL be different.

### Account Store Architecture

The portfolio slice stores accounts in a normalized structure:
- `portfolio.wallet.byId[walletId]` = all `AccountId[]` for a wallet (master list)
- `portfolio.accountMetadata.byId[accountId]` = BIP44 params, account type, label
- `portfolio.accountBalances.byId[accountId]` = balances per asset
- `portfolio.accounts.byId[accountId]` = asset IDs, activity flag
- `portfolio.enabledAccountIds[walletId]` = which accounts are active

**AccountId format**: `chainId:account` (e.g. `eip155:1:0xaddress`, `bip122:...:xpub...`)

### Existing Utilities

- `selectPartitionedAccountIds()` in `common-selectors.ts` already splits EVM vs non-EVM accounts
- `selectAccountIdsWithoutEvms()` gets only non-EVM accounts
- `clearWalletPortfolioState(walletId)` exists but nukes EVERYTHING (too aggressive)
- `clearWalletMetadata(walletId)` clears wallet mapping but preserves metadata
- `useSnapStatusHandler` already handles snap install/uninstall state changes and invalidates discovery queries

### Nuke/Re-derive Flow

**Step 1: Identify snap-derived accounts**
```
allMetaMaskAccountIds = portfolio.wallet.byId[metaMaskWalletId]
snapAccountIds = allMetaMaskAccountIds.filter(id => {
  const { chainId } = fromAccountId(id)
  return !isEvmChainId(chainId)  // Everything non-EVM is snap-derived
})
```

**Step 2: Selective clearing (new portfolio action)**
```typescript
// New action: clearNonEvmAccountsForWallet(walletId, nonEvmAccountIds)
// Removes ONLY non-EVM accounts from all portfolio state
// Preserves EVM accounts completely untouched
```

**Step 3: Trigger re-discovery**
```typescript
queryClient.invalidateQueries({
  queryKey: ['useDiscoverAccounts', { deviceId }],
  exact: false,
  refetchType: 'all',
})
// useDiscoverAccounts() re-runs with the NEW wallet class
// Derives native BTC/SOL accounts via Wallet Standard
```

### What Survives the Nuke

| Data | Preserved? | Notes |
|------|-----------|-------|
| EVM account metadata | Yes | Same address, same everything |
| EVM balances | Yes | Untouched |
| EVM wallet mapping | Yes | Same deviceId |
| Non-EVM metadata | No | Cleared, re-derived |
| Non-EVM balances | No | Cleared, re-fetched |
| Wallet ID & name | Yes | Same device |
| Stored mode preference | Yes | localStorage, separate from Redux |

### Addresses Will Change

- **Snap BTC**: `m/44'/0'/0'/0/0` via secp256k1 from `snap_getBip32Entropy` -> legacy/P2PKH address
- **Native BTC**: MM internal BIP-84 derivation -> native SegWit (bc1q...) address
- **Snap Cosmos/THOR**: `m/44'/118'/0'/0/0` or `m/44'/931'/0'/0/0` via snap -> bech32 address
- **Native SOL**: MM internal BIP-44 `m/44'/501'/0'/0'` -> base58 address (NEW, didn't exist with snap)

---

## UX Migration / Snap Deprecation Plan

**TODO: Full UX design later. Below is the high-level flow.**

### Deprecation Flow (flag ON only)

When the flag is ON and a user connects MetaMask:

1. **Detect snap**: Check `wallet_getSnaps` for the ShapeShift snap (`npm:@shapeshiftoss/metamask-snaps`)
2. **If snap is installed**: Show a **deprecation modal** explaining:
   - MetaMask now natively supports multichain (BTC, SOL, TRX)
   - The ShapeShift snap is being deprecated
   - Native support = better UX, no snap updates, more chains
   - **Option A**: "Switch to native multichain" (recommended) - nukes snap-derived accounts, re-derives natively
   - **Option B**: "Keep using snap for now" - stays on old path, but with a warning that this will go away
3. **If snap is NOT installed**: Use native multichain directly, no modal needed
4. **Eventually**: Remove Option B, snap support fully deprecated

### Modal Design

**TODO: Design the actual modal. Should be sexy, informative, not scary.**

Key points to communicate:
- Your EVM addresses stay the same
- Your non-EVM addresses WILL change (different derivation)
- If you have funds on old snap-derived BTC addresses, you'll need to move them first
- Native multichain gives you Solana + TRON support that the snap didn't have

### Connection Flow (flag ON, io.metamask RDNS only)

```
User connects MetaMask (io.metamask)
  |
  +-- Is snap installed?
  |     |
  |     +-- YES: Is there a stored preference for this deviceId?
  |     |     |
  |     |     +-- "use_native" -> New class, done
  |     |     +-- "keep_snap" -> Old class (snap), done
  |     |     +-- No preference -> Show deprecation modal (choice: native vs snap)
  |     |           |
  |     |           +-- "Switch to native" -> New class, store pref, nuke snap accounts
  |     |           +-- "Keep using snap" -> Old class, store pref
  |     |
  |     +-- NO: New class (native). Show one-time info modal:
  |           "MetaMask now natively supports multichain!"
  |           [BTC icon] Bitcoin  [SOL icon] Solana
  |           "You'll automatically get these chains with your MetaMask wallet."
  |           [Got it]
  |           (stored in localStorage, never shown again for this deviceId)
```

**Non-MetaMask MIPD wallets** (Rabby, Ctrl, etc.): Use new class for EVM, no modal, no multichain features. The info/deprecation modals are io.metamask ONLY.

### Deprecation Modal Copy (draft)

> **MetaMask now supports multichain natively!**
>
> Your MetaMask wallet can now manage Bitcoin and Solana accounts without the ShapeShift snap.
>
> **What changes:**
> - Your EVM addresses stay the same
> - You'll get new BTC, SOL, and TRX addresses derived natively by MetaMask
> - If you have BTC on your current snap-derived address, transfer it to another wallet first
>
> [Switch to native multichain] (recommended)
> [Keep using snap for now]

### Mode Switch Confirmation Modal (draft)

When switching modes (from settings or initial deprecation prompt), show a confirmation modal with chain icons:

**Switching to Native Multichain:**
> **Supported chains with native multichain:**
> [BTC icon] Bitcoin  [SOL icon] Solana  [ETH icon] All EVM chains
>
> **Only available with Snap:**
> [LTC icon] Litecoin  [DOGE icon] Dogecoin  [BCH icon] Bitcoin Cash  [ATOM icon] Cosmos  [RUNE icon] THORChain  [OSMO icon] Osmosis
>
> Your EVM addresses will stay the same. Non-EVM addresses will be re-derived.

**Switching back to Snap:**
> **Supported chains with Snap:**
> [BTC icon] Bitcoin  [LTC icon] Litecoin  [DOGE icon] Dogecoin  [BCH icon] Bitcoin Cash  [ATOM icon] Cosmos  [RUNE icon] THORChain  [ETH icon] All EVM chains
>
> **Only available with native multichain:**
> [SOL icon] Solana
>
> Your EVM addresses will stay the same. Non-EVM addresses will be re-derived.

### UX Quality Bar

The entire flow should look and feel great. This is a premium feature transition, not a janky config toggle.

- **Modals**: Use the existing ShapeShift modal system. Consistent styling, proper animations, responsive.
- **Chain icons**: Real chain icons from the asset service, not text. Displayed in a clean grid/row with chain names.
- **Copy**: Friendly, non-technical, reassuring. No jargon. Users shouldn't feel like they're making a scary technical choice.
- **Loading states**: When nuking/re-deriving accounts, show a proper loading state with a message like "Setting up your accounts..." - not a blank screen.
- **Success state**: After switching, show a brief success confirmation before closing the modal.
- **Settings toggle**: Should feel native to the existing wallet menu drawer. Not bolted on.
- **Banner (snap deprecated)**: If user is on snap mode, show a tasteful, dismissible banner - not aggressive or ugly.
- **i18n**: ALL strings through `en/main.json`. Run `/translate` for all supported languages. Review crypto/wallet terminology per language.
- **Animations**: Follow existing app patterns. No custom animations unless the design system supports them.
- **Error handling**: If native multichain connection fails (e.g. MM doesn't support BTC yet on user's version), degrade gracefully. Show what worked, explain what didn't.
- **Mobile**: Test the modals and settings on mobile viewport. MetaMask mobile v7.57+ supports native multichain.

### Settings Toggle (MM Menu Drawer)

When flag is ON, the MetaMask wallet menu drawer gets a new section:

**If currently using native:**
> Multichain Mode: **Native**
> [Switch to Multichain Snap] -> Opens mode switch confirmation modal (see above)

**If currently using snap:**
> Multichain Mode: **Snap (deprecated)**
> [Switch to Native Multichain] -> Opens mode switch confirmation modal (see above)

Each switch triggers:
1. Confirmation modal with chain icons and clear copy about what changes
2. Nuke non-EVM accounts
3. Re-derive accounts with the chosen mode
4. Update stored preference
5. EVM accounts remain untouched

### Technical Notes

- **Preference persistence**: Store choice in localStorage, keyed by deviceId. Per-wallet, not global.
- **Dual class support**: Flag ON = BOTH classes available. Adapter factory checks stored preference.
- **Flag ON + no snap installed**: Always use new class. NEVER propose snap installation.
- **Flag OFF**: Always use old class. Zero changes. Snap install/update modals work as before.
- When user switches modes:
  1. Nuke all non-EVM accounts from the account store
  2. Instantiate the correct wallet class
  3. Re-derive accounts using the chosen mode
  4. EVM accounts remain untouched (same address from same seed)
  5. Store/update preference
  6. Do NOT touch the snap installation itself

---

## Open Questions & Decisions

### Decided

1. **Flag approach**: Single feature flag `VITE_FEATURE_MM_NATIVE_MULTICHAIN`, flag OFF in prod
2. **Chain loss**: Acceptable to lose LTC, DOGE, BCH, ATOM, THOR, OSMO when flag ON
3. **MIPD dual-purpose**: Native multichain is MetaMask-only (`io.metamask`), other MIPD wallets use existing EVM-only path
4. **No UX migration plan now**: TODO for later
5. **Account migration**: Nuke snap accounts, re-derive natively. Programmatic only.
6. **Zero regression**: Flag OFF = zero changes to existing behavior
7. **New wallet class**: New `MetaMaskNativeMultiChainHDWallet` class. Cleanest separation, zero risk of flag leaking into existing code paths. The adapter factory decides which class to instantiate based on the flag. Existing class remains 100% untouched.
8. **Per-chain standards**: Use Bitcoin Wallet Standard + Solana Wallet Standard (whatever is on prod MM today). No CAIP-25/Flask dependency. Battle-tested, works now.
9. **Hardware wallet gap**: Accept it gracefully. If we can't get non-EVM addresses from MM (e.g. HW-backed account), we simply don't show those chains. The implementation handles failure naturally - no special-casing needed.

10. **PSBT translation in wallet class**: The wallet class receives `BTCSignTx`, internally converts to PSBT, sends to MM via Bitcoin Wallet Standard, gets back signed PSBT. Chain adapter stays untouched. This follows the existing abstraction boundary where wallet classes handle wallet-specific signing formats.
11. **Solana in v1**: Full BTC + SOL support. Implement `SolanaWallet` interface in the new wallet class using Solana Wallet Standard.
12. **Same package**: Both classes in `packages/hdwallet-metamask-multichain`. The adapter factory (already there) handles class selection via flag. Shared MIPD/EIP-6963 infra. Separate source files. Zero coupling between old and new wallet classes beyond shared types.

13. **Multi-account: match MM's model**: Discover as many accounts as MM exposes. If MM has 3 multichain accounts, we see 3. Each account has 1 EVM address + 1 BTC address + 1 SOL address + 1 TRX address.
14. **TRON: deferred**: MM TRON dapp connectivity isn't live yet. Skip TRON in v1, add in follow-up when MM ships it. Uses CAIP-25 Multichain API (NOT Wallet Standard like BTC/SOL), via `@metamask/connect-tron`.
15. **Snap cleanup: leave it installed**: Don't auto-uninstall the snap. But show a deprecation modal when snap is detected, letting user choose between native multichain and legacy snap path. The snap itself stays installed - user's choice to uninstall.

16. **Deprecation modal persistence**: Ask once, remember choice in localStorage (deviceId-scoped). Show dismissible banner on subsequent connects if user chose "keep snap".
17. **Fund warning**: Simple warning in modal: "If you have BTC on your current snap-derived address, transfer it first." No balance check, no extra flow.
18. **Dual class with flag ON**: Both old and new classes available when flag ON. User preference (from deprecation modal) decides which to instantiate. Flag OFF = old class only, zero changes.
19. **TRON already integrated**: TRON has full chain adapter, hdwallet interfaces (native + Ledger), no feature flag. Just wire up TronWallet interface in the new MM native wallet class.

20. **New class for all MIPD wallets**: When flag ON, ALL MIPD wallets (MetaMask, Rabby, Ctrl, etc.) use the new class. EVM behavior is identical. Non-MM wallets just won't get BTC/SOL (TRX deferred) features since those are MM-specific standards.
21. **Reversible mode**: Users can switch between native and snap modes via the MM wallet menu drawer settings. Each switch nukes non-EVM accounts and re-derives. Modal confirmation for each direction.
22. **Flag ON = never propose snap install**: If flag is ON and snap is not installed, use native derivation. Never show snap install/update modals.
23. **Tracking**: One epic with sub-tasks per phase in beads.
24. **Display name**: New class shows as `MetaMask (Native Multichain)` in the UI. Old class keeps `MetaMask(ShapeShift Multichain)`.
25. **i18n**: ALL user-facing copies (deprecation modal, settings toggle, confirmation modals, banners, warnings) go through `en/main.json` and must be translated via `/translate`. No hardcoded English strings in components.
26. **Explicit chain list in modals**: Show chain icons + names for both "available with this mode" and "only available with the other mode". Clean grid layout, not a wall of text.
27. **Accept any BTC address format from MM**: Whatever address format MM returns (bc1q, bc1p, 1..., 3...), we accept and handle. No restrictions.
28. **UX quality**: The entire flow (modals, settings, transitions, loading states, success states) must look and feel polished and native to the ShapeShift design system.
29. **MM capability detection via Wallet Standard**: There is NO way to get MM extension version from a dapp (`web3_clientVersion` returns node version, not extension version). Use feature detection instead: `findWalletStandardWallet('MetaMask', 'bitcoin')` returns null if MM doesn't support native BTC. Same for SOL. If neither BTC nor SOL wallet registrations exist, MM is too old for native multichain - fall back to snap or show "update MetaMask" prompt.

### To Decide

(none currently - will add as they come up during implementation)

---

## Technical Deep Dive: Wallet Standard Discovery

### How It Works

The Wallet Standard is chain-agnostic EIP-6963. Same event-based discovery, but extends beyond EVM.

**Packages needed (app side only):**

| Package | Purpose |
|---------|---------|
| `@wallet-standard/app` | `getWallets()` - wallet discovery |
| `@wallet-standard/base` | TypeScript types (`Wallet`, `WalletAccount`) |
| `@solana/wallet-standard-features` | Solana feature type definitions |

We do NOT need `@metamask/bitcoin-wallet-standard` or `@metamask/solana-wallet-standard` - those run inside the MM extension.

### Key Architecture: MM Registers SEPARATE Wallets

MetaMask registers SEPARATE Wallet Standard wallet objects for Bitcoin and Solana:
- `getWallets().get()` returns two entries named "MetaMask" - one with `bitcoin:*` chains/features, one with `solana:*` chains/features
- This is by design

### Discovery Flow

```typescript
import { getWallets } from '@wallet-standard/app';

const { get, on } = getWallets();

// Find MetaMask Bitcoin wallet
const mmBtc = get().find(w => w.name === 'MetaMask' && w.chains.some(c => c.startsWith('bitcoin:')));

// Find MetaMask Solana wallet
const mmSol = get().find(w => w.name === 'MetaMask' && w.chains.some(c => c.startsWith('solana:')));
```

### Parallel Discovery Systems

- **MIPD (EIP-6963)**: Continues to handle EVM wallet discovery. Untouched.
- **Wallet Standard**: NEW, handles BTC/SOL discovery via MetaMask native multichain.
- The two systems are independent and coexist.

### New Utility File: `src/lib/walletStandard.ts`

```typescript
import { getWallets, type Wallets } from '@wallet-standard/app';
import type { Wallet } from '@wallet-standard/base';

let walletsApi: Wallets | undefined;

export function getWalletStandardApi(): Wallets {
  if (!walletsApi) walletsApi = getWallets();
  return walletsApi;
}

export function findWalletStandardWallet(
  name: string,
  chainPrefix: 'bitcoin' | 'solana',
): Wallet | undefined {
  return getWalletStandardApi().get().find(
    w => w.name === name && w.chains.some(c => c.startsWith(`${chainPrefix}:`)),
  );
}
```

---

## Technical Deep Dive: BTC PSBT Translation

### Existing PSBT Usage in Codebase

Good news: the codebase ALREADY constructs PSBTs in three wallet implementations:
- **Phantom** (`packages/hdwallet-phantom/src/bitcoin.ts:101-173`) - simplest, p2wpkh only
- **Vultisig** (`packages/hdwallet-vultisig/src/bitcoin.ts:103-175`) - identical to Phantom
- **Native** (`packages/hdwallet-native/src/bitcoin.ts:220-357`) - most comprehensive, handles all script types

Library: `@shapeshiftoss/bitcoinjs-lib@7.0.0-shapeshift.2` (custom fork, already in deps)

### BTCSignTx -> PSBT Mapping

| BTCSignTx Field | PSBT Equivalent | Notes |
|---|---|---|
| `inputs[].txid` | `addInput({ hash })` | Direct 1:1 |
| `inputs[].vout` | `addInput({ index })` | Direct 1:1 |
| `inputs[].hex` | `addInput({ nonWitnessUtxo })` | Full prev tx for legacy |
| `inputs[].amount` | `addInput({ witnessUtxo.amount })` | For segwit inputs |
| `inputs[].sequence` | `addInput({ sequence })` | Direct (RBF) |
| `outputs[].address` | `addOutput({ address })` | Direct |
| `outputs[].amount` | `addOutput({ value: BigInt() })` | Convert to BigInt |
| `opReturnData` | `addOutput({ script })` | OP_RETURN via `bitcoin.payments.embed()` |

### Implementation Strategy

**Phase 1 (MVP): Native SegWit only (p2wpkh)**
- Follow Phantom's pattern exactly - it's the simplest and most battle-tested
- ~200 LOC, low risk
- Covers the majority of modern BTC usage

**Phase 2: Add legacy support**
- Accept non-segwit inputs with `nonWitnessUtxo` directly
- ~50 LOC additional

**Note on MM Bitcoin Wallet Standard**: MM returns signed PSBTs. We receive the PSBT back, extract the signed transaction, and return it in hdwallet's expected format (`{ serializedTx, signatures }`). The Phantom pattern for signature extraction works: `signedPsbt.data.inputs[].partialSig`.

---

## Technical Deep Dive: Solana Wallet Standard Integration

### SolanaWallet Interface (hdwallet-core)

```typescript
interface SolanaWallet {
  solanaGetAddress(msg: SolanaGetAddress): Promise<string | null>
  solanaSignTx(msg: SolanaSignTx): Promise<SolanaSignedTx | null>
  solanaSignSerializedTx?(msg: SolanaSignSerializedTx): Promise<SolanaSignedTx | null>
  solanaSendTx?(msg: SolanaSignTx): Promise<SolanaTxSignature | null>
}
```

### Phantom Implementation (Reference)

Phantom's pattern is our template:
1. Build `VersionedTransaction` via `core.solanaBuildTransaction(msg)`
2. Call `provider.signTransaction(transaction)` - returns signed `VersionedTransaction`
3. Serialize + extract signatures, return as base64

### MM Wallet Standard Equivalent

```typescript
// Connect
const accounts = await wallet.features['standard:connect'].connect()
// accounts[0].address = base58 Solana address
// accounts[0].publicKey = Uint8Array

// Sign
const [result] = await wallet.features['solana:signTransaction'].signTransaction({
  account: accounts[0],
  transaction: serializedVersionedTransaction, // Uint8Array
})
// result.signedTransaction = Uint8Array (signed VersionedTransaction)
```

### Translation Flow

```
SolanaSignTx (hdwallet format)
  -> core.solanaBuildTransaction() -> VersionedTransaction
  -> serialize() -> Uint8Array
  -> wallet.features['solana:signTransaction'] -> signed Uint8Array
  -> VersionedTransaction.deserialize() -> extract signatures
  -> SolanaSignedTx { serialized: base64, signatures: [base64] }
```

No changes to `hdwallet-core` interfaces needed. The new wallet class handles all translation internally.

---

## Technical Deep Dive: Integration Standards

### Bitcoin Wallet Standard

```typescript
import { registerBitcoinWalletStandard } from '@metamask/bitcoin-wallet-standard';

// Registration
registerBitcoinWalletStandard({ client: multichainClient });

// Connect
const connectResult = await wallet.features['bitcoin:connect'].connect({
  purposes: ['payment'] // 'payment' = native SegWit, 'ordinals' = Taproot (coming soon)
});
// Returns: { addresses: [{ address: 'bc1q...', publicKey: Uint8Array }] }

// Sign Transaction (PSBT)
const signResult = await wallet.features['bitcoin:signTransaction'].signTransaction({
  psbt: base64EncodedPSBT,
  inputsToSign: [{ address: 'bc1q...', signingIndexes: [0, 1], sigHash: 0x01 }]
});
// Returns: { psbt: signedBase64PSBT }

// Sign Message
const msgResult = await wallet.features['bitcoin:signMessage'].signMessage({
  message: 'Hello',
  address: 'bc1q...'
});
```

### Solana Wallet Standard

```typescript
// MetaMask appears as a Wallet Standard wallet automatically
// Use @solana/wallet-adapter or direct Wallet Standard

const wallet = getWallets().find(w => w.name === 'MetaMask');

// Connect
const accounts = await wallet.features['standard:connect'].connect();
// Returns: { accounts: [{ address: 'base58...', publicKey: Uint8Array }] }

// Sign Transaction
const signedTx = await wallet.features['solana:signTransaction'].signTransaction({
  transaction: serializedTransaction
});

// Sign Message
const signature = await wallet.features['solana:signMessage'].signMessage({
  message: new TextEncoder().encode('Hello')
});
```

### MetaMask Multichain API (CAIP-25) - Flask Only

```typescript
// Extension port communication (not window.ethereum!)
const FLASK_ID = "ljfoeinjpaedjfecbmggjgodbgkmjkjk";
const port = chrome.runtime.connect(FLASK_ID);

// Create session
port.postMessage({
  type: "caip-348",
  data: {
    jsonrpc: "2.0",
    method: "wallet_createSession",
    params: {
      optionalScopes: {
        "eip155:1": { methods: ["eth_sendTransaction"], notifications: [], accounts: [] },
        "bip122:000000000019d6689c085ae165831e93": { methods: ["sendTransfer"], notifications: [], accounts: [] },
        "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp": { methods: ["signTransaction"], notifications: [], accounts: [] }
      }
    }
  }
});

// Invoke method on specific chain
port.postMessage({
  type: "caip-348",
  data: {
    jsonrpc: "2.0",
    method: "wallet_invokeMethod",
    params: {
      scope: "bip122:000000000019d6689c085ae165831e93",
      request: { method: "sendTransfer", params: { ... } }
    }
  }
});
```

---

## Future: CAIP-25 Multichain API

MetaMask's Multichain API (`wallet_createSession` / `wallet_invokeMethod` / `wallet_revokeSession`) implements CAIP-25 and provides a unified interface for all chains. Currently Flask-only (experimental build), but expected to land in production MM eventually.

When it does, it could replace the per-chain standard approach:
- Single session creation with all chain scopes
- Unified `wallet_invokeMethod` for any chain-specific call
- Event-based account/session changes via `wallet_sessionChanged`
- Chrome extension port communication (not `window.ethereum`)

**TODO**: Monitor CAIP-25 production readiness. When stable in production MM, consider migrating from per-chain standards to the unified Multichain API for cleaner code and better multi-chain UX (e.g. simultaneous multi-network interactions without chain switching).

---

## Snap Repository Reference

- **Repo**: `shapeshift/metamask-snaps` (GitHub)
- **Package**: `@shapeshiftoss/metamask-snaps` (npm)
- **Version**: 1.0.13
- **Snap ID**: `npm:@shapeshiftoss/metamask-snaps`
- **Key insight**: EVM chains in the snap are NO-OPS - they just proxy to `window.ethereum`. Only UTXO and Cosmos chains actually use snap-derived keys.
- **Manifest declares 6 BIP-32 paths**: `m/44'/0'` (BTC), `m/44'/2'` (LTC), `m/44'/3'` (DOGE), `m/44'/118'` (ATOM/OSMO), `m/44'/145'` (BCH), `m/44'/931'` (THOR)
- **No ed25519 support** - all secp256k1

---

## MetaMask Native Multichain Reference

- **Extension**: v13.5+ (multichain accounts)
- **Mobile**: v7.57+ (full parity)
- **Supported natively**: All EVM, Solana, Bitcoin, TRON
- **Account model**: 1 account = 1 EVM address + 1 SOL address + 1 BTC address + 1 TRX address
- **BTC address type**: Native SegWit (bech32). Taproot coming soon.
- **Hardware wallets**: EVM-only (no non-EVM via HW in MM)
- **No multi-account for non-EVM**: Each account has exactly one address per chain
- **Key derivation**: BIP-44, indexes kept in sync across chains
