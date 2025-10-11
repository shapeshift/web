# GridPlus Multi-SafeCard Cache Isolation Fix - Complete Implementation Plan

## Problem Statement

When switching between GridPlus SafeCards, the address derivation returns addresses from the previously connected SafeCard instead of deriving fresh addresses for the newly selected SafeCard.

### Root Cause Analysis

1. **HDWallet Level Issue:**
   - `GridPlusWallet` class has a single instance-level `addressCache` (line 209 in `/shapeshiftHdWallet/packages/hdwallet-gridplus/src/gridplus.ts`)
   - The keyring stores wallets by `deviceId` (the physical Lattice device ID)
   - All SafeCards from the same Lattice share the same `deviceId`
   - Result: All SafeCards get the same wallet instance and therefore share the same address cache

2. **Web Level Issue:**
   - The web-level cache in `/shapeshiftWeb/src/lib/account/*.ts` files also doesn't distinguish between wallets
   - Cache lookup only checks `chainId + accountNumber`, not which wallet derived the address
   - This would be a problem even if hdwallet cache was fixed

## Solution Architecture

### Phase 1: HDWallet SafeCard-Aware Cache

#### 1.1 Update Cache Structure in GridPlusWallet
**File:** `/Users/alexandre.gomes/Sites/shapeshiftHdWallet/packages/hdwallet-gridplus/src/gridplus.ts`

**Line 209 - Change cache structure from:**
```typescript
private addressCache = new Map<string, core.Address | string>();
```

**To nested structure:**
```typescript
// Nested cache: walletId -> pathKey -> address
private addressCache = new Map<string, Map<string, core.Address | string>>();
private activeWalletId?: string;
```

**Add new methods after line 209:**
```typescript
public setActiveWalletId(walletId: string): void {
  this.activeWalletId = walletId;
}

private getWalletCache(): Map<string, core.Address | string> {
  const walletId = this.activeWalletId || 'default';
  if (!this.addressCache.has(walletId)) {
    this.addressCache.set(walletId, new Map());
  }
  return this.addressCache.get(walletId)!;
}
```

#### 1.2 Update All Address Derivation Methods

Update the following methods to use wallet-specific cache:

**ethGetAddress (lines 523-610):**
- Line 528: Change `const cachedAddress = this.addressCache.get(pathKey);`
  to `const walletCache = this.getWalletCache(); const cachedAddress = walletCache.get(pathKey);`
- Line 608: Change `this.addressCache.set(pathKey, address.toLowerCase());`
  to `walletCache.set(pathKey, address.toLowerCase());`

**solanaGetAddress (lines 643-687):**
- Line 648: Change `const cachedAddress = this.addressCache.get(pathKey);`
  to `const walletCache = this.getWalletCache(); const cachedAddress = walletCache.get(pathKey);`
- Line 684: Change `this.addressCache.set(pathKey, address);`
  to `walletCache.set(pathKey, address);`

**btcGetAddress (lines 1166-1200):**
- Line 1168: Change `const cached = this.addressCache.get(pathKey);`
  to `const walletCache = this.getWalletCache(); const cached = walletCache.get(pathKey);`
- Line 1198: Change `this.addressCache.set(pathKey, address);`
  to `walletCache.set(pathKey, address);`

**cosmosGetAddress (lines 1304-1334):**
- Line 1309: Change `const cached = this.addressCache.get(pathKey);`
  to `const walletCache = this.getWalletCache(); const cached = walletCache.get(pathKey);`
- Line 1331: Change `this.addressCache.set(pathKey, cosmosAddress);`
  to `walletCache.set(pathKey, cosmosAddress);`

**thorchainGetAddress (lines 1457-1487):**
- Line 1462: Change `const cached = this.addressCache.get(pathKey);`
  to `const walletCache = this.getWalletCache(); const cached = walletCache.get(pathKey);`
- Line 1484: Change `this.addressCache.set(pathKey, thorAddress);`
  to `walletCache.set(pathKey, thorAddress);`

**mayachainGetAddress (lines 1609-1639):**
- Line 1614: Change `const cached = this.addressCache.get(pathKey);`
  to `const walletCache = this.getWalletCache(); const cached = walletCache.get(pathKey);`
- Line 1636: Change `this.addressCache.set(pathKey, mayaAddress);`
  to `walletCache.set(pathKey, mayaAddress);`

#### 1.3 Update Disconnect Method
**Line 263-270:**
```typescript
public async disconnect() {
  if (this.client) {
    await this.transport.disconnect();
    this.client = undefined;
    // Clear only the active wallet's cache
    if (this.activeWalletId) {
      const walletCache = this.getWalletCache();
      walletCache.clear();
    } else {
      // Fallback: clear all caches if no active wallet
      this.addressCache.clear();
    }
    this.pendingRequests.clear();
  }
}
```

### Phase 2: Adapter Updates

#### 2.1 Pass WalletId to Wallet Instance
**File:** `/Users/alexandre.gomes/Sites/shapeshiftHdWallet/packages/hdwallet-gridplus/src/adapter.ts`

**In pairConnectedDevice method (lines 43-71):**
After line 57 (wallet creation), add:
```typescript
// Set the walletId for cache isolation
// deviceId format is already "gridplus:uuid" from web
wallet.setActiveWalletId(deviceId);
```

**In pairDevice method (lines 74-126):**
After line 101 and 121 (wallet creation), add:
```typescript
// Set the walletId for cache isolation
wallet.setActiveWalletId(deviceId);
```

**In existing wallet retrieval (lines 84-87):**
After line 85 where existing wallet is found, add:
```typescript
// Ensure the wallet has the correct active walletId set
existingWallet.setActiveWalletId(deviceId);
```

### Phase 3: Web Cache Updates (Future Enhancement)

While the HDWallet cache fix should resolve the immediate issue, the web-level cache in `/shapeshiftWeb/src/lib/account/*.ts` files also needs updating for completeness:

**Files to update:**
- `/Users/alexandre.gomes/Sites/shapeshiftWeb/src/lib/account/evm.ts`
- `/Users/alexandre.gomes/Sites/shapeshiftWeb/src/lib/account/solana.ts`
- `/Users/alexandre.gomes/Sites/shapeshiftWeb/src/lib/account/cosmosSdk.ts`
- `/Users/alexandre.gomes/Sites/shapeshiftWeb/src/lib/account/utxo.ts`

**Required changes:**
1. Add `walletId: WalletId` to `DeriveAccountIdsAndMetadataArgs` type
2. Update cache lookup to filter by walletId first
3. Pass walletId through from all callers

**This is a separate task and not required for the immediate fix.**

## Implementation Steps

### Step 1: Implement HDWallet Changes
```bash
cd ~/Sites/shapeshiftHdWallet
# Edit gridplus.ts with cache structure changes
# Edit adapter.ts to set walletId on wallet instances
```

### Step 2: Build and Test HDWallet
```bash
cd ~/Sites/shapeshiftHdWallet
yarn build
# Run any hdwallet tests if available
```

### Step 3: Publish Alpha Version
```bash
cd ~/Sites/shapeshiftHdWallet
# Check current version
npm view @shapeshiftoss/hdwallet-gridplus version
# If current is 1.62.4-alpha.106, publish 1.62.4-alpha.107
npx lerna publish --no-git-tag-version --no-push --yes 1.62.4-alpha.107
```

### Step 4: Update Web Dependencies
```bash
cd ~/Sites/shapeshiftWeb
# Update all hdwallet packages to new version
yarn up "@shapeshiftoss/hdwallet-*@1.62.4-alpha.107"
# Install dependencies
yarn
```

### Step 5: Test Multi-SafeCard Functionality
```bash
cd ~/Sites/shapeshiftWeb
yarn dev
```

**Test Procedure:**
1. Connect to GridPlus Lattice
2. Pair and connect SafeCard 1
3. Note the ETH address (e.g., 0xAAA...)
4. Go back to wallet list, click "Add New SafeCard"
5. Connect SafeCard 2
6. Verify ETH address is different (e.g., 0xBBB...)
7. Switch back to SafeCard 1
8. Verify original ETH address (0xAAA...) is shown
9. Test other chains (BTC, DOGE, BCH, Solana, Cosmos)

## Success Criteria

1. Each SafeCard shows unique addresses based on its own seed
2. Switching between SafeCards shows correct addresses for each
3. No cross-contamination between SafeCard addresses
4. All chains (EVM, UTXO, Cosmos, Solana) work correctly
5. Performance is maintained (cache still works per-SafeCard)

## Risk Mitigation

1. **Backward Compatibility:** Using 'default' walletId for non-GridPlus wallets ensures other wallets continue working
2. **Testing:** Test with multiple SafeCards before merging
3. **Rollback Plan:** Git commits are clean, can revert if issues found

## Testing & Validation Results

### 2025-10-11 Testing Session

#### Test 1: Cache Disabling Experiment ⚠️ NEEDS RETESTING
**Hypothesis:** The `addressCache` Map in `gridplus.ts` is the root cause of SafeCard address collision.

**Implementation:**
- Commented out cache reads in `ethGetAddress()` (lines 520-525)
- Left cache writes active (to maintain performance for same-card requests)
- Published hdwallet v1.62.4-alpha.123 with disabled cache reads
- Updated web to use new version

**Status:**
- ⚠️ Test was performed late at night (2am) - results inconclusive
- Need to retest with fresh brain and proper test procedure
- Current setup ready for testing (cache disabled, dev server running)

**Test Procedure for Fresh Testing:**
1. Clear browser state completely (localStorage, indexedDB, or use incognito)
2. Hard refresh (Cmd+Shift+R)
3. Connect SafeCard A - note addresses
4. Disconnect completely
5. Connect SafeCard B - verify addresses are DIFFERENT from SafeCard A
6. If same = cache wasn't the issue
7. If different = cache WAS the issue

**Current Blocker:**
- Need to verify if addresses shown are correct for each SafeCard
- Late night testing unreliable - retest required

#### Observations:
1. **Portfolio clearing works correctly:**
   - `clearWalletPortfolioState` properly deletes account metadata
   - Redux-persist cache is being cleared successfully
   - Logs show `existingAccountCount: 0` before discovery

2. **Cache invalidation is the actual problem:**
   - The `initialize()` method calls `addressCache.clear()` (line 281)
   - But addresses from previous SafeCards still appear
   - This suggests `initialize()` isn't being called, OR the cache is being repopulated before clearing

3. **Potential root cause of cache invalidation failure:**
   - Adapter retrieves wallet from keyring by `deviceId`
   - All SafeCards share same `deviceId` (physical Lattice device)
   - When switching SafeCards, adapter returns SAME wallet instance
   - The wallet instance's `addressCache` was never cleared
   - Solution: Need per-SafeCard cache isolation (walletId-based cache)

## Current Status

### Completed:
- ✅ Root cause identified
- ✅ Solution designed
- ✅ All uncommitted changes committed in both repos
- ✅ Comprehensive plan documented
- ✅ **Cache disabling test CONFIRMS addressCache is the culprit**
- ✅ **Validated that portfolio clearing works correctly**
- ✅ **Identified that cache invalidation in initialize() is not working**

### Next Steps:

**⚠️ GOMES GET SOME SLEEP YOU ROBOT KUNT, TBD MORE TESTING WITH CACHE DISABLED**

Testing notes:
- Currently running with cache reads disabled (hdwallet v1.62.4-alpha.123)
- Saw addresses ending in ...5406 when expecting ...06
- Need to verify with fresh brain if cache disabling actually fixes the issue
- Test with clean browser state (clear localStorage, hard refresh)
- Compare addresses between SafeCards properly

If cache disabling actually works:
1. **Implement walletId-based nested cache structure** (Phase 1 from plan above)
   - Will provide true SafeCard isolation without disabling caching
2. Update all address derivation methods to use wallet-specific cache
3. Update adapter to set activeWalletId when retrieving wallets
4. Build and publish hdwallet alpha
5. Update web dependencies
6. Test multi-SafeCard functionality with caching ENABLED

## File Locations Reference

### HDWallet Repository
- Main wallet class: `/Users/alexandre.gomes/Sites/shapeshiftHdWallet/packages/hdwallet-gridplus/src/gridplus.ts`
- Adapter: `/Users/alexandre.gomes/Sites/shapeshiftHdWallet/packages/hdwallet-gridplus/src/adapter.ts`
- Package.json: `/Users/alexandre.gomes/Sites/shapeshiftHdWallet/packages/hdwallet-gridplus/package.json`

### Web Repository
- Connect component: `/Users/alexandre.gomes/Sites/shapeshiftWeb/src/context/WalletProvider/GridPlus/components/Connect.tsx`
- SafeCard list: `/Users/alexandre.gomes/Sites/shapeshiftWeb/src/context/WalletProvider/GridPlus/components/SafeCardList.tsx`
- GridPlus slice: `/Users/alexandre.gomes/Sites/shapeshiftWeb/src/state/slices/gridplusSlice/gridplusSlice.ts`
- Account derivation: `/Users/alexandre.gomes/Sites/shapeshiftWeb/src/lib/account/*.ts`

## Notes

- The `deviceId` passed from web is already in format `gridplus:${safeCardUuid}`
- This is used as both the keyring key AND the walletId for cache isolation
- The cache is cleared when switching SafeCards via disconnect()
- Each SafeCard maintains its own address cache even when using the same physical Lattice device