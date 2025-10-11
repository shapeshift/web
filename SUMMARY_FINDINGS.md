# GridPlus SafeCard Cache Isolation - Summary Findings

## Problem Statement
GridPlus Lattice devices support multiple SafeCards (each with unique seed/UUID). When switching between SafeCards on the same physical device, the web application was showing cached addresses from the previously connected SafeCard instead of deriving fresh addresses for the newly selected SafeCard.

## Root Causes Identified

### 1. Shared Cache Across SafeCards
- **Issue**: Single-level `Map<string, address>` cache was shared across all SafeCards because they use the same physical `deviceId`
- **Impact**: Address cross-contamination between different SafeCards

### 2. Missing GridPlus Client Configuration
- **Issue**: Manual `new Client()` instantiation was missing critical configuration parameters: `retryCount`, `timeout`, `skipRetryOnWrongWallet`
- **Impact**: Device overwhelmed by 16+ concurrent address derivation requests, causing "Request failed - needs resync" errors

### 3. Inadequate Cache Clearing
- **Issue**: `initialize()` called `addressCache.clear()` but adapter was retrieving same wallet instance from keyring for all SafeCards
- **Impact**: Cache not properly isolated per SafeCard even when cleared

## Solution Implemented (hdwallet v1.62.4-alpha.126)

### 1. Nested Cache Structure
**File**: `packages/hdwallet-gridplus/src/gridplus.ts`

```typescript
// Lines 198-199
private addressCache = new Map<string, Map<string, core.Address | string>>();
private activeWalletId?: string;

// Lines 236-246 - Helper methods
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

**Result**: Each SafeCard (walletId) maintains its own isolated address cache

### 2. Client Configuration
**File**: `packages/hdwallet-gridplus/src/transport.ts`

```typescript
// Lines 76-83
this.client = new Client({
  name: this.name || "ShapeShift",
  baseUrl: "https://signing.gridpl.us",
  privKey: Buffer.from(this.sessionId, 'hex'),
  retryCount: 3,           // Handle retry logic
  timeout: 60000,          // 60 second timeout
  skipRetryOnWrongWallet: true  // Avoid retry loops on wrong wallet
});
```

**Result**: Proper retry/timeout handling prevents device overflow

### 3. Adapter Updates
**File**: `packages/hdwallet-gridplus/src/adapter.ts`

Added `setActiveWalletId(deviceId)` calls at 3 locations:
- Line 56: When pairing new device
- Line 77: When retrieving existing wallet from keyring
- Line 97: When already paired

**Result**: Ensures proper cache isolation at all wallet creation/retrieval points

### 4. Updated All Address Derivation Methods
Updated 6 methods to use wallet-specific cache:
- `ethGetAddress` (lines 536-640)
- `solanaGetAddress` (lines 650-725)
- `btcGetAddress` (lines 1195-1235)
- `cosmosGetAddress` (lines 1348-1391)
- `thorchainGetAddress` (lines 1507-1551)
- `mayachainGetAddress` (lines 1667-1710)

Each method now:
1. Checks wallet-specific cache via `getWalletCache()`
2. Uses `walletCache.get(pathKey)` for reads
3. Uses `walletCache.set(pathKey, address)` for writes

## Files Modified

1. **transport.ts**: Added Client configuration (lines 76-83)
2. **gridplus.ts**:
   - Nested cache structure (lines 198-199)
   - Helper methods (lines 236-246)
   - Updated 6 getAddress methods
3. **adapter.ts**: Added `setActiveWalletId()` calls (lines 56, 77, 97)
4. **lerna.json**: Bumped version to 1.62.4-alpha.126

## Testing Status

### Published Version
- **hdwallet**: v1.62.4-alpha.126
- **Command used**: `npx lerna publish --no-git-tag-version --no-push --yes 1.62.4-alpha.126`
- **Web updated**: `yarn up @shapeshiftoss/hdwallet-*@1.62.4-alpha.126`

### Test Environment
- SafeCard UUID ending in ...986 inserted
- User cleared cache for fresh test
- Expected: Addresses specific to ...986 SafeCard, no cross-contamination

### Observations
- After ~1 minute, only EVM chain discovery logs appeared
- Performance concern: GridPlus requests are "soooo slow"
- User requested timing logs be prepared (NOT implemented yet)

## Known Issues / Performance Concerns

1. **Slow Discovery**: GridPlus address derivation is very slow
2. **Concurrent Requests**: 16+ parallel chain discovery queries may still be overwhelming device
3. **Timing Logs**: User requested preparation of timing logs for performance monitoring (not yet implemented)

## Next Steps

1. **Immediate**: User returning with fresh logs after cache clear to verify cache isolation works
2. **Future**: Consider implementing timing logs for performance analysis
3. **Optimization**: May need to throttle concurrent discovery requests to reduce device load

## Key Technical Details

- **Device ID vs Wallet ID**: All SafeCards share same `deviceId` but each has unique `walletId` (format: `gridplus:${safeCardUuid}`)
- **Cache Structure**: `Map<walletId, Map<pathKey, address>>` for per-SafeCard isolation
- **Frame Pattern**: Manual Client instantiation without localStorage to avoid stale state
- **Account Discovery**: Runs per wallet on connection via `useDiscoverAccounts` hook
- **Supported Chains**: ETH, Solana, BTC, Cosmos, THORChain, MAYAChain

## Related Files

### HDWallet Repository (`../shapeshiftHdWallet`)
- `packages/hdwallet-gridplus/src/transport.ts`
- `packages/hdwallet-gridplus/src/gridplus.ts`
- `packages/hdwallet-gridplus/src/adapter.ts`
- `lerna.json`

### Web Repository (this repo)
- `src/context/AppProvider/hooks/useDiscoverAccounts.tsx`
- `package.json` (hdwallet dependencies)

## Commands Reference

### Build & Publish HDWallet
```bash
cd ../shapeshiftHdWallet
yarn build
npx lerna publish --no-git-tag-version --no-push --yes <version>
```

### Update Web Dependencies
```bash
cd ../shapeshiftWeb
yarn up @shapeshiftoss/hdwallet-*@<version>
yarn dev  # Test locally on http://localhost:3000
```

### Quality Checks
```bash
yarn lint --fix
yarn type-check
```
