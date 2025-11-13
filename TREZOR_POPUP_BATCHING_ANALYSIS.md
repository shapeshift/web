# Trezor Account Discovery Popup Spam: Deep Analysis & Solution Architecture

## Executive Summary

**Problem**: Every `getAddress()`/`getPubKey()` call triggers a Trezor Suite popup during account import:
- **EVM chains**: 6 popups for 5 accounts (1 per account + 1 check for next)
- **UTXO chains**: 18 popups (6 accounts × 3 script types)
- **Total**: 20-30 popups for full multi-chain account import → **UX catastrophe**

**Root Cause**: ShapeShift's chain adapters call Trezor Connect with **single derivation paths** when the API **already supports batching**.

**Solution**: Implement batch public key/address derivation at multiple layers:
1. **hdwallet-trezor**: Add batch methods for ETH/Solana addresses
2. **chain-adapters**: Leverage batch calls (UTXO already has infrastructure)
3. **account derivation logic**: Batch multiple account numbers at once
4. **Caching layer**: Cache results for same derivation path (EVM chains share paths)

**Core Requirement**: For any given derivation path, the device should be queried **exactly once**. All chains sharing that path should reuse the cached result.

**Note**: Parent key caching is NOT viable due to hardened account derivation (requires private keys).

**Expected Impact**:
- Phase 1 (UTXO batching): **67% reduction** (18 → 6 popups for BTC)
- Phase 2 (Multi-account batching): **83% reduction** (30 → 5 popups total)
- **Final result**: 30 popups → 3-5 popups for typical multi-chain import

---

## Part 0: Core User Story - Same Path, Zero Additional Popups

### The Fundamental Rule

**User Story**: As a user, when I import multiple chains that share the same derivation path (e.g., all EVM chains), I should **only see ONE popup** for that path, regardless of how many chains I add.

**Technical Requirement**: For any derivation path (e.g., `m/44'/60'/0'/0/0`), the device should be queried **exactly once per session**. All subsequent requests for the same path must use cached results.

### EVM Chain Example

All EVM chains use **identical derivation paths**:
- Ethereum: `m/44'/60'/0'/0/0`
- Polygon: `m/44'/60'/0'/0/0` ← SAME PATH
- Arbitrum: `m/44'/60'/0'/0/0` ← SAME PATH
- Optimism: `m/44'/60'/0'/0/0` ← SAME PATH
- etc. (all 10+ EVM chains)

**Current Behavior** (Partially Optimized):
```
Import ETH account 0  → Derive m/44'/60'/0'/0/0 → 1 popup ✅
Add Polygon account 0 → Reuse 0x... address    → 0 popups ✅ (already works!)
Add Arbitrum account 0 → Reuse 0x... address   → 0 popups ✅
```

This is **already implemented** in `src/lib/account/evm.ts:62`:
```typescript
// use address if we have it, there is no need to re-derive an address
// for every chainId since they all use the same derivation path
address = address || (await adapter.getAddress({ accountNumber, wallet }))
```

**Problem**: This optimization is **per-account-derivation-loop only**. If I:
1. Import ETH account 0 today → 1 popup
2. Disconnect wallet
3. Reconnect tomorrow
4. Import Polygon account 0 → 1 popup again ❌ (should be 0)

The cache is **not persistent** and only lives within the derivation loop.

### UTXO Chain Counter-Example

UTXO chains use **different paths** even within the same coin:
- BTC Native Segwit account 0: `m/84'/0'/0'`
- BTC Segwit P2SH account 0: `m/49'/0'/0'` ← DIFFERENT PATH
- BTC Legacy account 0: `m/44'/0'/0'` ← DIFFERENT PATH

**Correct Behavior**:
```
Import BTC Native Segwit → Derive m/84'/0'/0' → 1 popup ✅
Import BTC Segwit P2SH   → Derive m/49'/0'/0' → 1 popup ✅ (different path!)
Import BTC Legacy        → Derive m/44'/0'/0' → 1 popup ✅ (different path!)
```

Each script type requires its own popup because they're **different derivation paths**.

But if I add **Litecoin Native Segwit** (`m/84'/2'/0'`), that's also a different path → requires popup.

### Where Should Caching Be Implemented?

**Option A: hdwallet-level cache** ⭐ RECOMMENDED

**Pros**:
- Single source of truth
- Works across all consumers (web, mobile, etc.)
- Wallet-scoped (cleared on disconnect automatically)
- Simplest to reason about

**Implementation**:
```typescript
// File: packages/hdwallet-trezor/src/trezor.ts

private addressCache = new Map<string, string>() // path → address

public async ethGetAddress(msg: core.ETHGetAddress): Promise<string> {
  const path = core.addressNListToBIP32(msg.addressNList)

  // Check cache first
  if (!msg.showDisplay && this.addressCache.has(path)) {
    return this.addressCache.get(path)!
  }

  // Device call
  const address = await ethereum.ethGetAddress(this.transport, msg)

  // Cache result
  if (!msg.showDisplay) {
    this.addressCache.set(path, address)
  }

  return address
}

public clearCache(): void {
  this.addressCache.clear()
}
```

**Option B: web-level cache**

**Pros**:
- Can persist across sessions (localStorage)
- Can cache additional metadata (account activity, balances, etc.)

**Cons**:
- More complex (storage, serialization, invalidation)
- Need to handle cache invalidation on wallet change
- Duplicates caching logic across consumers

**Implementation**:
```typescript
// File: src/lib/cache/derivationCache.ts

interface CacheEntry {
  walletId: string
  path: string
  address: string
  timestamp: number
}

export class DerivationCache {
  private static STORAGE_KEY = 'shapeshift:derivation:cache'
  private static TTL = 7 * 24 * 60 * 60 * 1000 // 7 days

  static get(walletId: string, path: string): string | null {
    const cache = this.load()
    const key = `${walletId}:${path}`
    const entry = cache.get(key)

    if (!entry) return null
    if (Date.now() - entry.timestamp > this.TTL) {
      cache.delete(key)
      this.save(cache)
      return null
    }

    return entry.address
  }

  static set(walletId: string, path: string, address: string): void {
    const cache = this.load()
    cache.set(`${walletId}:${path}`, {
      walletId,
      path,
      address,
      timestamp: Date.now(),
    })
    this.save(cache)
  }

  // ... load/save from localStorage
}
```

**Option C: Hybrid approach**

- hdwallet-level cache for **in-session** (fast, automatic)
- web-level cache for **cross-session** (persistent, optional)

### Recommended Approach

**Start with Option A** (hdwallet-level cache):
1. Simple, clean separation of concerns
2. Works for 95% of use cases (single session imports)
3. Can add Option C later if cross-session persistence is valuable

**Key Implementation Points**:
1. Cache keyed by **derivation path string** (e.g., "m/44'/60'/0'/0/0")
2. Cache scoped to **wallet instance** (cleared on disconnect)
3. **Never cache** when `showDisplay: true` (user verification)
4. Cache applies to **all derivation methods**:
   - `ethGetAddress()`
   - `solanaGetAddress()`
   - `getPublicKeys()` (xpubs)

### Success Criteria

**User Experience**:
- Import ETH account 0 → 1 popup
- Add Polygon account 0 → 0 popups (cached)
- Add all 10 EVM chains → 0 popups (cached)
- Disconnect → Reconnect → Import ETH account 0 → 1 popup (cache cleared)

**Developer Experience**:
- Cache is transparent (no API changes needed)
- Cache invalidation is automatic (wallet disconnect)
- Cache debugging is easy (log hits/misses)

---

## Part 1: Current Architecture & Popup Triggers

### 1.1 ImportAccounts Component Flow

**File**: `src/components/Modals/ManageAccounts/components/ImportAccounts.tsx:224-553`

```
ImportAccounts Component
  └─> useInfiniteQuery (line 275)
      └─> getAccountIdsWithActivityAndMetadata (helpers.ts:35)
          └─> deriveAccountIdsAndMetadata (account.ts:32)
              ├─> deriveEvmAccountIdsAndMetadata (evm.ts:35)
              │   └─> adapter.getAddress() [🚨 POPUP per account]
              │       └─> wallet.ethGetAddress()
              └─> deriveUtxoAccountIdsAndMetadata (utxo.ts:13)
                  └─> adapter.getPublicKey() [🚨 3 POPUPs per account]
                      └─> wallet.getPublicKeys([single item])
```

### 1.2 EVM Popup Triggers

**File**: `src/lib/account/evm.ts:35-89`

```typescript
for (const chainId of chainIds) {
  const adapter = assertGetEvmChainAdapter(chainId)

  // 🚨 POPUP TRIGGER: One per account
  // Line 62 optimization: reuses address across EVM chains (same derivation path)
  address = address || (await adapter.getAddress({ accountNumber, wallet }))
}
```

**Current Optimization**: Address reused across all EVM chains for same account (line 62).

**Problem**: Each account number still requires a new popup.

### 1.3 UTXO Popup Triggers

**File**: `src/lib/account/utxo.ts:13-46`

```typescript
for (const accountType of supportedAccountTypes) {
  // 🚨 POPUP TRIGGER: One per script type per account
  const { xpub: pubkey } = await adapter.getPublicKey(wallet, accountNumber, accountType)
}

// supportedAccountTypes for Bitcoin:
// - UtxoAccountType.SegwitNative (m/84'/0'/n')
// - UtxoAccountType.SegwitP2SH   (m/49'/0'/n')
// - UtxoAccountType.P2pkh        (m/44'/0'/n')
// = 3 popups per BTC account
```

### 1.4 Auto-Discovery Loop

**File**: `ImportAccounts.tsx:332-358`

```typescript
useEffect(() => {
  const isLastAccountActive = accounts.pages[
    accounts.pages.length - 1
  ].accountIdWithActivityAndMetadata.some(account => account.hasActivity)

  // Keep fetching until we find an account without activity
  if (isLastAccountActive || isLastAccountInStore) {
    fetchNextPage() // 🔁 Triggers MORE popups
  }
}, [accounts, fetchNextPage])
```

**Discovery Pattern**: Sequentially check accounts 0, 1, 2... until finding an empty account.

---

## Part 2: Chain Adapter Architecture

### 2.1 EVM Adapter

**File**: `packages/chain-adapters/src/evm/EvmBaseAdapter.ts:543-560`

```typescript
async getAddress(input: GetAddressInput): Promise<string> {
  const { accountNumber, wallet, showOnDevice = false } = input

  // ✅ Existing bypass for read operations
  if (input.pubKey) return input.pubKey

  if (!wallet) throw new Error('wallet is required')
  this.assertSupportsChain(wallet)
  await verifyLedgerAppOpen(this.chainId, wallet)

  const bip44Params = this.getBip44Params({ accountNumber })

  // 🚨 DEVICE CALL - Single address
  const address = await wallet.ethGetAddress({
    addressNList: toAddressNList(bip44Params),
    showDisplay: showOnDevice,
  })

  return address
}
```

**Limitation**: Only supports single address derivation.

### 2.2 UTXO Adapter

**File**: `packages/chain-adapters/src/utxo/UtxoBaseAdapter.ts:599-631`

```typescript
async getPublicKey(
  wallet: HDWallet,
  accountNumber: number,
  accountType: UtxoAccountType,
): Promise<PublicKey> {
  const bip44Params = this.getBip44Params({ accountNumber, accountType })
  const path = toRootDerivationPath(bip44Params)

  // 🚨 DEVICE CALL - Calls wallet.getPublicKeys with SINGLE-element array
  const publicKeys = await wallet.getPublicKeys([
    {
      coin: this.coinName,
      addressNList: bip32ToAddressNList(path),
      curve: 'secp256k1',
      scriptType: accountTypeToScriptType[accountType],
    },
  ])
  // ...
}
```

**Key Observation**: Already uses `getPublicKeys()` (plural) but passes **single-element array**. This is the low-hanging fruit for batching!

---

## Part 3: hdwallet-trezor Deep Dive

### 3.1 Current Batch Support

**File**: `/Users/alexandre.gomes/Sites/shapeshiftHdWallet/packages/hdwallet-trezor/src/trezor.ts:349-382`

```typescript
public async getPublicKeys(msg: Array<core.GetPublicKey>): Promise<Array<core.PublicKey | null>> {
  if (!msg.length) return [];

  // ✅ ALREADY USES BUNDLE - Single popup for entire array!
  const res = await this.transport.call("getPublicKey", {
    bundle: msg.map((request) => ({
      path: request.addressNList,
      coin: request.coin || "Bitcoin",
      crossChain: true,
    })),
  });

  handleError(this.transport, res, "Could not load xpubs from Trezor");

  // Returns array matching input order
  return (res.payload as Array<{ xpubSegwit?: string; xpub?: string }>).map((result, i) => {
    // ... handle script types
  });
}
```

**✅ Status**: Batch support already implemented, but chain adapters only call with single-element arrays.

### 3.2 EVM Address Limitation

**File**: `/Users/alexandre.gomes/Sites/shapeshiftHdWallet/packages/hdwallet-trezor/src/ethereum.ts:15-28`

```typescript
export async function ethGetAddress(transport: TrezorTransport, msg: core.ETHGetAddress): Promise<Address> {
  // 🚨 SINGLE ADDRESS ONLY
  const res = await transport.call("ethereumGetAddress", {
    path: core.addressNListToBIP32(msg.addressNList),
    showOnTrezor: !!msg.showDisplay,
    address: msg.showDisplay
      ? await ethGetAddress(transport, {
          ...msg,
          showDisplay: false,
        })
      : undefined,
  });
  handleError(transport, res, "Could not get ETH address from Trezor");
  return res.payload.address;
}
```

**❌ Missing**: No batch variant of `ethGetAddress`.

### 3.3 Trezor Connect API Confirmation

**Type Definitions**: `@trezor/connect/lib/types/api/ethereumGetAddress.d.ts:1-4`

```typescript
// ✅ BATCH SUPPORTED IN TREZOR CONNECT!
export declare function ethereumGetAddress(params: Params<GetAddress>): Response<Address>;
export declare function ethereumGetAddress(params: BundledParams<GetAddress>): Response<Address[]>;

// BundledParams = CommonParams & { bundle: Array<T> }
```

**Official Docs**: `https://github.com/trezor/connect/blob/develop/docs/methods/ethereumGetAddress.md`

```javascript
TrezorConnect.ethereumGetAddress({
  bundle: [
    { path: "m/44'/60'/0'/0/0", showOnTrezor: false }, // account 0
    { path: "m/44'/60'/1'/0/0", showOnTrezor: false }, // account 1
    { path: "m/44'/60'/2'/0/0", showOnTrezor: false }, // account 2
  ]
});

// Returns:
{
  success: true,
  payload: [
    { address: "0x...", path: [...], serializedPath: "m/44'/60'/0'/0/0" },
    { address: "0x...", path: [...], serializedPath: "m/44'/60'/1'/0/0" },
    { address: "0x...", path: [...], serializedPath: "m/44'/60'/2'/0/0" }
  ]
}
```

**Confirmation**: `ethereumGetAddress` **DOES support bundle parameter** → Single popup for multiple addresses!

### 3.4 Frame Wallet's Alternative Approach

**File**: `/Users/alexandre.gomes/Sites/frame/main/signers/trezor/Trezor/index.ts:196-232`

```typescript
async deriveAddresses() {
  // Fetch parent xpub ONCE
  const publicKey = await TrezorBridge.getPublicKey(this.device, this.basePath())

  // Derive all child addresses LOCALLY (no device interaction)
  this.deriveHDAccounts(publicKey.publicKey, publicKey.chainCode, (err, accounts = []) => {
    // accounts = [addr0, addr1, addr2, ..., addrN]
    // All derived locally from parent key
  })
}
```

**Pattern**:
1. Fetch parent public key at `m/44'/60'` (or `m/84'/0'` for BTC)
2. Use HD key derivation library to derive child addresses locally
3. **Zero additional popups** for accounts 0-∞

**Trade-off**: Requires HD key derivation library (e.g., `hdkey`, `@scure/bip32`), adds complexity.

---

## Part 4: Proposed Solution Architecture

### Phase 1: UTXO Script Type Batching ⭐ **LOW-HANGING FRUIT**

**Impact**: 3 popups → 1 popup per BTC account (67% reduction)

**Complexity**: Low
**Risk**: Low
**Timeline**: 3-5 days

#### Changes Required

**1. Add in-session caching to hdwallet-trezor**

**File**: `packages/hdwallet-trezor/src/trezor.ts`

```typescript
export class TrezorHDWallet implements core.HDWallet {
  // ... existing fields

  // NEW: In-session derivation cache
  private derivationCache = new Map<string, string | core.PublicKey>()

  // ... existing methods

  public async getPublicKeys(msg: Array<core.GetPublicKey>): Promise<Array<core.PublicKey | null>> {
    if (!msg.length) return []

    // Check cache for each request
    const cachedResults: Array<core.PublicKey | null> = []
    const uncachedIndices: number[] = []
    const uncachedRequests: core.GetPublicKey[] = []

    msg.forEach((request, i) => {
      const path = core.addressNListToBIP32(request.addressNList)
      const cached = this.derivationCache.get(path)

      if (cached && typeof cached === 'object' && 'xpub' in cached) {
        cachedResults[i] = cached as core.PublicKey
      } else {
        cachedResults[i] = null // placeholder
        uncachedIndices.push(i)
        uncachedRequests.push(request)
      }
    })

    // If everything cached, return immediately
    if (uncachedRequests.length === 0) {
      return cachedResults
    }

    // Fetch uncached keys from device
    const res = await this.transport.call("getPublicKey", {
      bundle: uncachedRequests.map((request) => ({
        path: request.addressNList,
        coin: request.coin || "Bitcoin",
        crossChain: true,
      })),
    })

    handleError(this.transport, res, "Could not load xpubs from Trezor")

    // Process results and update cache
    const newResults = (res.payload as Array<{ xpubSegwit?: string; xpub?: string }>).map((result, j) => {
      const request = uncachedRequests[j]
      const scriptType = request.scriptType
      const path = core.addressNListToBIP32(request.addressNList)

      let publicKey: core.PublicKey
      switch (scriptType) {
        case core.BTCInputScriptType.SpendP2SHWitness:
        case core.BTCInputScriptType.SpendWitness: {
          const xpub = result.xpubSegwit
          if (!xpub) throw new Error("unable to get public key")
          publicKey = { xpub }
          break
        }
        case core.BTCInputScriptType.SpendAddress:
        default: {
          const xpub = result.xpub
          if (!xpub) throw new Error("unable to get public key")
          publicKey = { xpub }
          break
        }
      }

      // Cache the result
      this.derivationCache.set(path, publicKey)

      return publicKey
    })

    // Merge cached and new results
    uncachedIndices.forEach((originalIndex, j) => {
      cachedResults[originalIndex] = newResults[j]
    })

    return cachedResults
  }

  // Clear cache on disconnect
  public clearCache(): void {
    this.derivationCache.clear()
  }
}
```

**Add cache clearing to adapter disconnect**:

```typescript
// File: packages/hdwallet-trezor-connect/src/adapter.ts

public async pairDevice(): Promise<HDWallet | null> {
  // ... existing pairing logic

  const wallet = new TrezorHDWallet(transport)

  // Clear cache when device changes
  wallet.clearCache()

  return wallet
}
```

**2. Add batch method to UtxoBaseAdapter**

**File**: `packages/chain-adapters/src/utxo/UtxoBaseAdapter.ts`

```typescript
/**
 * NEW METHOD: Batch get public keys for multiple account types
 * Reduces 3 popups (per account) to 1 popup
 */
async batchGetPublicKeys(
  wallet: HDWallet,
  accountNumber: number,
  accountTypes: UtxoAccountType[],
): Promise<Record<UtxoAccountType, PublicKey>> {
  await verifyLedgerAppOpen(this.chainId, wallet)

  // Build requests for all script types
  const requests = accountTypes.map(accountType => {
    const bip44Params = this.getBip44Params({ accountNumber, accountType })
    const path = toRootDerivationPath(bip44Params)

    return {
      coin: this.coinName,
      addressNList: bip32ToAddressNList(path),
      curve: 'secp256k1' as const,
      scriptType: accountTypeToScriptType[accountType],
    }
  })

  // 🎯 SINGLE CALL FOR ALL SCRIPT TYPES
  const publicKeys = await wallet.getPublicKeys(requests)

  // Map results back to account types
  return accountTypes.reduce((acc, accountType, i) => {
    if (!publicKeys[i]) throw new Error(`Failed to get pubkey for ${accountType}`)
    acc[accountType] = {
      xpub: convertXpubVersion(publicKeys[i]!.xpub, accountType)
    }
    return acc
  }, {} as Record<UtxoAccountType, PublicKey>)
}
```

**2. Update UTXO derivation logic**

**File**: `src/lib/account/utxo.ts:13-46`

```typescript
export const deriveUtxoAccountIdsAndMetadata: DeriveAccountIdsAndMetadata = async args => {
  const { accountNumber, chainIds, wallet } = args
  if (!supportsBTC(wallet)) return {}

  let acc: AccountMetadataById = {}

  for (const chainId of chainIds) {
    const adapter = assertGetUtxoChainAdapter(chainId)
    const supportedAccountTypes = adapter.getSupportedAccountTypes()

    // 🎯 BATCH ALL SCRIPT TYPES AT ONCE (was 3 sequential calls)
    const pubKeysByType = await adapter.batchGetPublicKeys(
      wallet,
      accountNumber,
      supportedAccountTypes
    )

    // Process results
    for (const [accountType, { xpub: pubkey }] of Object.entries(pubKeysByType)) {
      const bip44Params = adapter.getBip44Params({
        accountNumber,
        accountType: accountType as UtxoAccountType
      })
      const accountId = toAccountId({ chainId, account: pubkey })
      acc[accountId] = { accountType: accountType as UtxoAccountType, bip44Params }
    }
  }

  return acc
}
```

**Testing**:
- Import BTC account 0 → Verify 1 popup (not 3)
- Verify all 3 script types have correct xpubs
- Test with Ledger (should still work, Ledger also supports batch)

---

### Phase 2: Multi-Account Batching 🚀

**Impact**: 5 account import → 1 popup (90% reduction)

**Complexity**: Medium
**Risk**: Medium (discovery heuristic changes)
**Timeline**: 1-2 weeks

#### 2.1 EVM Multi-Account Batching

**Challenge**: Need to add batch support to hdwallet-trezor for ETH addresses.

**Option A: Add batch method to hdwallet-trezor** ⭐ RECOMMENDED

**File**: `packages/hdwallet-trezor/src/ethereum.ts`

```typescript
/**
 * NEW FUNCTION: Batch get Ethereum addresses
 * Leverages Trezor Connect's bundle parameter
 */
export async function ethGetAddressBatch(
  transport: TrezorTransport,
  msgs: core.ETHGetAddress[]
): Promise<Address[]> {
  // Build bundle request
  const bundle = msgs.map(msg => ({
    path: core.addressNListToBIP32(msg.addressNList),
    showOnTrezor: false, // Never show on device for batch requests
  }))

  // 🎯 SINGLE POPUP FOR ALL ADDRESSES
  const res = await transport.call("ethereumGetAddress", { bundle })

  handleError(transport, res, "Could not get ETH addresses from Trezor")

  // res.payload is Address[] when using bundle
  return (res.payload as Array<{ address: string }>).map(item => item.address)
}
```

**Update trezor.ts wallet class with caching**:

```typescript
// File: packages/hdwallet-trezor/src/trezor.ts

public async ethGetAddress(msg: core.ETHGetAddress): Promise<string> {
  const path = core.addressNListToBIP32(msg.addressNList)

  // Check cache first (unless user wants to verify on device)
  if (!msg.showDisplay && this.derivationCache.has(path)) {
    return this.derivationCache.get(path) as string
  }

  // Device call
  const address = await ethereum.ethGetAddress(this.transport, msg)

  // Cache result (unless showing on device)
  if (!msg.showDisplay) {
    this.derivationCache.set(path, address)
  }

  return address
}

public async ethGetAddressBatch?(msgs: core.ETHGetAddress[]): Promise<string[]> {
  // Check cache for each request
  const cachedAddresses: (string | null)[] = []
  const uncachedIndices: number[] = []
  const uncachedMsgs: core.ETHGetAddress[] = []

  msgs.forEach((msg, i) => {
    const path = core.addressNListToBIP32(msg.addressNList)
    const cached = this.derivationCache.get(path)

    if (cached && typeof cached === 'string') {
      cachedAddresses[i] = cached
    } else {
      cachedAddresses[i] = null // placeholder
      uncachedIndices.push(i)
      uncachedMsgs.push(msg)
    }
  })

  // If everything cached, return immediately (zero device interaction!)
  if (uncachedMsgs.length === 0) {
    return cachedAddresses as string[]
  }

  // Fetch uncached addresses from device
  const newAddresses = await ethereum.ethGetAddressBatch(this.transport, uncachedMsgs)

  // Cache new results
  uncachedMsgs.forEach((msg, j) => {
    const path = core.addressNListToBIP32(msg.addressNList)
    this.derivationCache.set(path, newAddresses[j])
  })

  // Merge cached and new results
  uncachedIndices.forEach((originalIndex, j) => {
    cachedAddresses[originalIndex] = newAddresses[j]
  })

  return cachedAddresses as string[]
}
```

**Update hdwallet-core interface** (optional):

```typescript
// File: packages/hdwallet-core/src/wallet.ts

export interface ETHWallet {
  // Existing methods...
  ethGetAddress(msg: ETHGetAddress): Promise<string | null>

  // New optional batch method
  ethGetAddressBatch?(msgs: ETHGetAddress[]): Promise<string[]>
}
```

**2. Update chain adapter**

**File**: `packages/chain-adapters/src/evm/EvmBaseAdapter.ts`

```typescript
/**
 * NEW METHOD: Batch get addresses for multiple accounts
 */
async batchGetAddresses(
  wallet: HDWallet,
  accountNumbers: number[],
): Promise<Record<number, string>> {
  this.assertSupportsChain(wallet)
  await verifyLedgerAppOpen(this.chainId, wallet)

  // Check if wallet supports batch (Trezor does, others may not)
  if (isTrezor(wallet) && wallet.ethGetAddressBatch) {
    const msgs = accountNumbers.map(accountNumber => {
      const bip44Params = this.getBip44Params({ accountNumber })
      return {
        addressNList: toAddressNList(bip44Params),
        showDisplay: false,
      }
    })

    // 🎯 SINGLE POPUP FOR ALL ACCOUNTS
    const addresses = await wallet.ethGetAddressBatch(msgs)

    return accountNumbers.reduce((acc, num, i) => {
      acc[num] = addresses[i]
      return acc
    }, {} as Record<number, string>)
  }

  // Fallback: sequential calls for wallets without batch support
  const addresses = await Promise.all(
    accountNumbers.map(num => this.getAddress({ accountNumber: num, wallet }))
  )

  return accountNumbers.reduce((acc, num, i) => {
    acc[num] = addresses[i]
    return acc
  }, {} as Record<number, string>)
}
```

**3. Update derivation logic**

**File**: `src/lib/account/account.ts`

```typescript
// NEW TYPE
export type DeriveAccountIdsAndMetadataBatchArgs = {
  accountNumbers: number[]  // [0, 1, 2, 3, 4]
  chainIds: ChainId[]
  wallet: HDWallet
  isSnapInstalled: boolean
}

// NEW FUNCTION
export const deriveAccountIdsAndMetadataBatch = async (
  args: DeriveAccountIdsAndMetadataBatchArgs
): Promise<Record<number, AccountMetadataById>> => {
  const { accountNumbers, chainIds, wallet } = args
  const { chainNamespace } = fromChainId(chainIds[0])

  // Route to chain-specific batch function
  switch (chainNamespace) {
    case 'eip155':
      return deriveEvmAccountIdsAndMetadataBatch(args)
    case 'bip122':
      return deriveUtxoAccountIdsAndMetadataBatch(args)
    // ... other chains
  }
}
```

**File**: `src/lib/account/evm.ts`

```typescript
export const deriveEvmAccountIdsAndMetadataBatch = async (
  args: DeriveAccountIdsAndMetadataBatchArgs
): Promise<Record<number, AccountMetadataById>> => {
  const { accountNumbers, chainIds, wallet } = args

  if (!supportsETH(wallet)) return {}

  // Get first adapter (all EVM use same derivation path)
  const firstAdapter = assertGetEvmChainAdapter(chainIds[0])

  // 🎯 BATCH FETCH ALL ACCOUNT ADDRESSES AT ONCE
  const addressesByAccount = await firstAdapter.batchGetAddresses(wallet, accountNumbers)

  // Build metadata for all accounts × chains
  const result: Record<number, AccountMetadataById> = {}

  for (const accountNumber of accountNumbers) {
    const address = addressesByAccount[accountNumber]
    const accountMetadata: AccountMetadataById = {}

    for (const chainId of chainIds) {
      const adapter = assertGetEvmChainAdapter(chainId)
      const bip44Params = adapter.getBip44Params({ accountNumber })
      const accountId = toAccountId({ chainId, account: address })
      accountMetadata[accountId] = { bip44Params }
    }

    result[accountNumber] = accountMetadata
  }

  return result
}
```

**4. Update ImportAccounts component**

**File**: `src/components/Modals/ManageAccounts/helpers.ts`

```typescript
/**
 * NEW FUNCTION: Batch fetch multiple accounts at once
 */
export const getAccountIdsWithActivityAndMetadataBatch = async (
  accountNumbers: number[],  // [0, 1, 2, 3, 4]
  chainId: ChainId,
  wallet: HDWallet | null,
  isSnapInstalled: boolean,
) => {
  if (!wallet) return []

  const input = { accountNumbers, chainIds: [chainId], wallet, isSnapInstalled }

  // 🎯 BATCH DERIVE ALL ACCOUNTS AT ONCE
  const accountsMetadataByNumber = await deriveAccountIdsAndMetadataBatch(input)

  // Fetch activity for all accounts
  return Promise.all(
    accountNumbers.map(async accountNumber => {
      const accountIdsAndMetadata = accountsMetadataByNumber[accountNumber]

      return Promise.all(
        Object.entries(accountIdsAndMetadata).map(async ([accountId, accountMetadata]) => {
          const account = await queryClient.fetchQuery({
            ...accountManagement.getAccount(accountId),
            staleTime: Infinity,
            gcTime: Infinity,
          })

          const hasActivity = checkAccountHasActivity(account)

          return { accountId, accountMetadata, hasActivity, accountNumber }
        })
      )
    })
  ).then(nested => nested.flat())
}
```

**File**: `src/components/Modals/ManageAccounts/components/ImportAccounts.tsx`

```typescript
// Modify infinite query to use batching
const getAccountIdsWithActivityAndMetadata = async ({ pageParam = 0 }) => {
  // Batch size: 5 accounts at a time
  const BATCH_SIZE = 5
  const accountNumbers = Array.from(
    { length: BATCH_SIZE },
    (_, i) => pageParam * BATCH_SIZE + i
  )

  // 🎯 FETCH 5 ACCOUNTS WITH 1 POPUP
  return getAccountIdsWithActivityAndMetadataBatch(
    accountNumbers,
    chainId,
    wallet,
    isSnapInstalled
  )
}
```

#### 2.2 Discovery Heuristic Handling

**Challenge**: Don't know how many accounts have activity until we check them.

**Solution**: Speculative batching
1. Optimistically fetch accounts 0-4 (1 popup)
2. Check which have activity
3. If account 4 has activity, fetch 5-9 (1 more popup)
4. Continue until finding batch with no activity

**Updated logic**:

```typescript
useEffect(() => {
  const lastBatch = accounts.pages[accounts.pages.length - 1]

  // Check if ANY account in the last batch has activity
  const hasSomeActivity = lastBatch.some(account => account.hasActivity)

  // Continue fetching if we found activity
  if (hasSomeActivity || isLastAccountInStore) {
    fetchNextPage()
  }
}, [accounts, fetchNextPage])
```

**Testing**:
- Accounts [0,1,2 active, 3,4 empty] → Should fetch batch 0-4, stop (1 popup)
- Accounts [0-7 active, 8 empty] → Should fetch 0-4, 5-9, stop (2 popups)

---

### Phase 3: Account-Level Caching (Optional Enhancement) 🔬

**Impact**: Reuse addresses across EVM chains (already partially implemented)

**Note**: This phase has **limited benefit** because of BIP32 hardened derivation constraints.

#### Why We Can't Cache Parent xpub for Multiple Accounts

**The Problem**: Account numbers use **hardened derivation** (`'` apostrophe):

```
m/44'/60'/0'/0/0  ← Account 0 (0' is hardened)
m/44'/60'/1'/0/0  ← Account 1 (1' is hardened)
m/44'/60'/2'/0/0  ← Account 2 (2' is hardened)
```

**Hardened children require private keys to derive** - you cannot derive them from xpub alone.

❌ **This doesn't work**:
```typescript
// Fetch parent at m/44'/60'
const parentXpub = await fetchXpub("m/44'/60'")

// Try to derive accounts
derive(parentXpub, "0'") // ❌ IMPOSSIBLE - needs private key
derive(parentXpub, "1'") // ❌ IMPOSSIBLE
```

✅ **This DOES work** (but ShapeShift doesn't need it):
```typescript
// Fetch account-level xpub
const account0Xpub = await fetchXpub("m/44'/60'/0'") // 1 popup

// Derive multiple addresses within account 0
derive(account0Xpub, "0/0") // ✅ m/44'/60'/0'/0/0
derive(account0Xpub, "0/1") // ✅ m/44'/60'/0'/0/1
derive(account0Xpub, "0/2") // ✅ m/44'/60'/0'/0/2
```

But ShapeShift only uses **address index 0** per account, so this doesn't help.

#### What Frame Wallet Actually Does

Frame's "parent xpub" pattern derives **multiple addresses within ONE account**, not multiple accounts:

```typescript
// Fetch account 0's xpub
const publicKey = await TrezorBridge.getPublicKey(device, "m/44'/60'/0'")

// Derive addresses within account 0
this.deriveHDAccounts(publicKey.publicKey, publicKey.chainCode, ...)
// Generates: m/44'/60'/0'/0/0, m/44'/60'/0'/0/1, m/44'/60'/0'/0/2...
// (Multiple addresses for user to choose from, still ONE account)
```

#### What ShapeShift Already Does

**File**: `src/lib/account/evm.ts:62`

```typescript
// Reuse address across EVM chains (already implemented!)
address = address || (await adapter.getAddress({ accountNumber, wallet }))
```

When importing Ethereum account 0:
1. First chain (ETH): 1 popup to derive `m/44'/60'/0'/0/0`
2. Cache the address
3. Other EVM chains (Polygon, Arbitrum, etc.): 0 popups (reuse cached address)

**This optimization already exists!**

#### Potential Enhancement: Explicit Caching Layer

Instead of relying on the `address ||` pattern, we could add an explicit cache:

```typescript
// File: src/lib/account/addressCache.ts (NEW)

const addressCache = new Map<string, string>() // key: "wallet:account:coin", value: address

export function getCachedAddress(
  walletId: string,
  accountNumber: number,
  coinType: number
): string | undefined {
  return addressCache.get(`${walletId}:${accountNumber}:${coinType}`)
}

export function setCachedAddress(
  walletId: string,
  accountNumber: number,
  coinType: number,
  address: string
): void {
  addressCache.set(`${walletId}:${accountNumber}:${coinType}`, address)
}

export function clearAddressCache(walletId?: string): void {
  if (walletId) {
    for (const key of addressCache.keys()) {
      if (key.startsWith(`${walletId}:`)) {
        addressCache.delete(key)
      }
    }
  } else {
    addressCache.clear()
  }
}
```

But this is **already effectively implemented** via the `address ||` pattern in `evm.ts`.

#### Conclusion: Skip Phase 3

Due to hardened derivation constraints, we **cannot** eliminate popups for multiple accounts via parent xpub caching. The **only solution** is batch fetching (Phases 1 & 2).

**Recommendation**: Focus on Phases 1 & 2, which achieve **90% reduction** in popups

---

## Part 5: Files & Interfaces Summary

### Core Changes by Layer

| Layer | Files | Changes | Breaking |
|-------|-------|---------|----------|
| **hdwallet-trezor** | `ethereum.ts` | Add `ethGetAddressBatch()` | No (new method) |
| | `solana.ts` | Add `solanaGetAddressBatch()` | No (new method) |
| | `trezor.ts` | Add in-session cache + batch methods | No |
| | `trezor.ts` | Add `clearCache()` method | No |
| **chain-adapters** | `UtxoBaseAdapter.ts` | Add `batchGetPublicKeys()` | No |
| | `EvmBaseAdapter.ts` | Add `batchGetAddresses()` + caching | No |
| | `evm/types.ts` | Add batch types | No |
| | `utxo/types.ts` | Add batch types | No |
| **lib/account** | `account.ts` | Add `deriveAccountIdsAndMetadataBatch()` | No* |
| | `evm.ts` | Add `deriveEvmAccountIdsAndMetadataBatch()` | No |
| | `utxo.ts` | Update to use `batchGetPublicKeys()` | No |
| | `solana.ts` | Add batch support | No |
| **components** | `helpers.ts` | Add `getAccountIdsWithActivityAndMetadataBatch()` | No |
| | `ImportAccounts.tsx` | Update query to batch fetch | No |

*Backwards compatible via wrapper function

### Dependencies

**No new packages required** - all functionality uses existing Trezor Connect API

---

## Part 6: Testing Strategy

### Phase 1 Tests (UTXO Batching)

1. **Batch popup count**:
   - Import BTC account 0 → Verify 1 popup (not 3)
   - Import BTC accounts 0-2 → Verify 3 popups (not 9)

2. **xpub correctness**:
   - Verify Native Segwit xpub starts with `zpub`
   - Verify Segwit P2SH xpub starts with `ypub`
   - Verify Legacy xpub starts with `xpub`

3. **Address derivation**:
   - Derive addresses from each xpub
   - Verify they match addresses from direct device calls

4. **Cache effectiveness**:
   - Import BTC Native Segwit account 0 → 1 popup, cache hit for path `m/84'/0'/0'`
   - Re-import same account → 0 popups (cached)
   - Import Dogecoin Native Segwit account 0 → 1 popup (different path: `m/84'/3'/0'`)
   - Disconnect → Reconnect → Import BTC → 1 popup (cache cleared)

5. **Ledger compatibility**:
   - Test with Ledger wallet
   - Verify batching still works (Ledger supports `getPublicKeys` array)

### Phase 2 Tests (Multi-Account Batching)

1. **EVM batch popup count**:
   - Import 5 ETH accounts → Verify 1 popup (not 5)
   - Import 10 ETH accounts → Verify 2 popups (batch of 5 + batch of 5)

2. **Discovery heuristic**:
   - Accounts [0,1,2 active, 3,4 empty] → Should find 3, stop after 1 batch
   - Accounts [0-7 active, 8 empty] → Should find 8, stop after 2 batches
   - Accounts [0-14 active] → Should continue past 3 batches

3. **Cross-chain consistency**:
   - Fetch ETH account 0 → 1 popup
   - Add Polygon (same account) → 0 popups (address reused)
   - Add Arbitrum, Optimism, etc. → 0 popups

4. **Cache effectiveness (critical for EVM)**:
   - Import ETH account 0 → 1 popup, cache `m/44'/60'/0'/0/0` → `0x...`
   - Add Polygon account 0 → 0 popups (cache hit, same path!)
   - Add all 10 EVM chains → 0 popups (all same path!)
   - Add ETH account 1 → 1 popup (different path: `m/44'/60'/1'/0/0`)
   - Switch to Polygon account 1 → 0 popups (cached from batch)
   - Disconnect → Reconnect → Import ETH → 1 popup (cache cleared)

5. **Fallback behavior**:
   - Test with Ledger (sequential calls) → Should still work
   - Test with Native wallet → Should work normally

---

## Part 7: Rollout Plan

### Week 1-2: Phase 1 (UTXO Batching)

**Goals**:
- Implement `batchGetPublicKeys` in `UtxoBaseAdapter`
- Update `deriveUtxoAccountIdsAndMetadata`
- Test with BTC, LTC, DOGE, BCH

**Success Metrics**:
- BTC account import: 3 popups → 1 popup ✅
- 5 BTC accounts: 15 popups → 5 popups ✅

**Deploy**: Beta test with internal users

### Week 3-4: Phase 2a (EVM Batching)

**Goals**:
- Add `ethGetAddressBatch` to hdwallet-trezor
- Implement batch derivation in EVM adapter
- Update ImportAccounts component

**Success Metrics**:
- 5 ETH accounts: 5 popups → 1 popup ✅
- All EVM chains work correctly

**Deploy**: Beta test

### Week 5-6: Phase 2b (Full Multi-Account)

**Goals**:
- Combine UTXO + EVM batching
- Implement speculative discovery (5-account batches)
- Handle edge cases (large account gaps)

**Success Metrics**:
- 5 accounts across all chains: 20 popups → 3-5 popups ✅
- Discovery stops at correct account

**Deploy**: Production release candidate

### Week 7+: Polish & Edge Cases

**Goals**:
- Handle batch size limits (test with 10+ accounts)
- Add telemetry for popup count metrics
- Optimize discovery heuristic (account gap handling)
- Add batch support for Solana if needed

**Deploy**: Production with monitoring

---

## Part 8: Risk Analysis

### Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Trezor bundle bugs** | Low | High | Extensive testing, fallback to sequential |
| **Cache invalidation miss** | Medium | Medium | Clear cache on all disconnect paths |
| **HD derivation mismatch** | Low | High | Compare with device-derived addresses in tests |
| **Discovery heuristic breaks** | Medium | Medium | Account gap limit (BIP44 standard: 20) |
| **Ledger incompatibility** | Low | Low | Already uses same interfaces |

### UX Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **User expects popup per account** | Low | Low | Transparent to user (fewer popups = better UX) |
| **Batch timeout on many accounts** | Low | Medium | Limit batch size to 5-10 |
| **Incorrect account discovery** | Low | High | Extensive testing of edge cases |

---

## Part 9: Performance Metrics

### Current State (Baseline)

- Import 5 ETH accounts: **5 popups**, ~30 seconds
- Import 5 BTC accounts (3 script types): **15 popups**, ~90 seconds
- Import all chains (ETH, BTC, SOL, DOGE, LTC): **~30 popups**, ~3 minutes

### After Phase 1 (UTXO Batching)

- Import 5 ETH accounts: **5 popups**
- Import 5 BTC accounts: **5 popups** ✅ (67% reduction)
- Import all chains: **~20 popups** (33% reduction)

### After Phase 2 (Multi-Account Batching)

- Import 5 ETH accounts: **1 popup** ✅ (80% reduction)
- Import 5 BTC accounts: **1 popup** ✅ (93% reduction)
- Import all chains: **~5 popups** (83% reduction)

**Total Improvement**: 30 popups → 5 popups = **83% reduction** 🎉

### With Cross-Chain Optimization (Already Implemented)

ShapeShift already reuses addresses across EVM chains (`evm.ts:62`):
- Import ETH account 0: **1 popup**
- Add Polygon account 0: **0 popups** (address reused)
- Add all EVM chains: **0 additional popups**

This effectively makes the batch even more efficient for multi-chain users!

---

## Part 10: Open Questions

### For Discussion

1. **Batch size**: 5 accounts optimal, or should it be configurable?
2. **Account gap limit**: BIP44 standard is 20. Should we enforce this?
3. **Solana batching**: Similar to EVM? (Trezor Connect supports Solana)
4. **Feature flag**: Should we add a feature flag for batch mode (fallback to sequential)?
5. **UTXO multi-account batching**: Should we batch accounts 0-4 for BTC, or just script types?

### For Research

1. **Trezor Connect bundle limits**: Max array size for bundle parameter?
2. **Device timeout**: Do large batches trigger timeouts?
3. **Cosmos SDK**: Does Trezor Connect support batch for `cosmosGetAddress`?

---

## Conclusion

The Trezor popup spam issue is **highly tractable** with clear implementation paths:

1. ✅ **Trezor Connect already supports batching** for both xpubs and addresses
2. ✅ **hdwallet-trezor already uses batching** for xpubs (just not called properly)
3. ✅ **Low-hanging fruit** in UTXO script type batching (67% reduction)
4. ✅ **Medium complexity** multi-account batching (83% reduction total)
5. ❌ **Parent key caching not viable** due to hardened derivation constraints

**Recommended Approach**:
- Start with Phase 1 (quick win, low risk) - UTXO script type batching
- Roll out Phase 2 incrementally (2a EVM, then 2b full) - Multi-account batching
- Skip Phase 3 (cryptographically impossible)

**Expected Outcome**: Transform account import from **UX catastrophe** (30 popups) to **UX delight** (3-5 popups).

**Key Insights**:
1. **Batch fetching via Trezor Connect's bundle parameter** is the primary mechanism for reducing popups
2. **In-session caching at hdwallet level** ensures same derivation paths are never queried twice
3. **EVM chains benefit massively** from caching since they all share `m/44'/60'/n'/0/0` paths
4. Hardened account derivation requires device interaction, but we can batch multiple accounts into a single popup

**Critical Success Factor**: The combination of **batching + caching** achieves the 83% reduction. Batching alone would still re-derive same paths across chains.
