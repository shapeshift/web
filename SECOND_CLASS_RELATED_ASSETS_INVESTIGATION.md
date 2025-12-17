# Second-Class Chains Related Assets Investigation

**Branch**: `feat_second_class_related`
**Issue**: https://github.com/shapeshift/web/issues/11441
**Date**: December 17, 2025
**Status**: Investigation Complete, Ready for Implementation

---

## Executive Summary

Second-class EVM chains (TRX, SUI, Monad, HyperEVM, Plasma) need their assets grouped into related asset indexes. **Good news: upstream data EXISTS and infrastructure is in place.** The related asset generation script should work for these chains, but likely hasn't been run recently or has bugs preventing proper processing.

---

## Issue Description

From GitHub Issue #11441:
> Second class chains (TRX, SUI, Monad, HyperEVM, Plasma) should have their assets grouped into related assets, assuming there is data upstream available for us to use.

**Acceptance Criteria:**
- Assets are grouped if data is available upstream
- OR keep issue open and marked as blocked if data isn't accessible

---

## Investigation Findings

### 1. Upstream Data Availability ✅

**CoinGecko has FULL platform support for all second-class chains:**

| Chain | Platform ID | Asset Count | Example Token |
|-------|-------------|-------------|---------------|
| Sui | `sui` | 202 assets | USDC: `0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC` |
| Plasma | `plasma` | 37 assets | USDC: Not found in example |
| Monad | `monad` | 35 assets | USDC: `0x754704bc059f8c67012fed69bc8a327a5aafb603` |
| HyperEVM | `hyperevm` | 114 assets | USDC: `0xb88339cb7199b77e23db6e890353e22632ba630f` |
| Tron | `tron` | Full support | USDC: `TEkxiTehnzSmSe2XqrBj4w32RUN966rdz8` |

**Verified by querying:**
```bash
curl -s "https://api.coingecko.com/api/v3/coins/usd-coin?localization=false"
```

### 2. Code Infrastructure Status ✅

**All necessary mappings exist in the codebase:**

**File**: `packages/caip/src/adapters/coingecko/index.ts` (lines 34-53)
```typescript
export enum CoingeckoAssetPlatform {
  Ethereum = 'ethereum',
  // ... other chains ...
  Monad = 'monad',          // ✅ Line 47
  HyperEvm = 'hyperevm',    // ✅ Line 48
  Plasma = 'plasma',        // ✅ Line 49
  Solana = 'solana',        // ✅ Line 50
  Tron = 'tron',            // ✅ Line 51
  Sui = 'sui',              // ✅ Line 52
}
```

**Bidirectional converters exist:**
- `chainIdToCoingeckoAssetPlatform()` - converts ChainId → Platform string
- `coingeckoAssetPlatformToChainId()` - converts Platform string → ChainId

Both functions have complete cases for Monad, HyperEVM, Plasma, Sui, and Tron.

### 3. How Related Assets Work

**File**: `scripts/generateAssetData/generateRelatedAssetIndex/generateRelatedAssetIndex.ts`

**Process:**
1. **Load existing data** - reads `encodedAssetData.json` and `encodedRelatedAssetIndex.json`
2. **Fetch CoinGecko catalog** - gets all coins with platform information
3. **Optimize with platform counts** - builds `coingeckoPlatformsByAssetId` to skip tokens only on one chain
4. **Process each asset** (lines 184-310):
   - Check if already processed
   - If `platformCount > 1`, query CoinGecko API: `/coins/{platform}/contract/{address}`
   - Extract `platforms` object (all chains where token exists)
   - Also query Zerion API for cross-validation (EVM chains only)
   - Merge results and create groupings
5. **Update asset metadata** - sets `relatedAssetKey` on all assets in a group
6. **Write back** - saves updated indexes

**Key functions:**
- `coingeckoPlatformDetailsToMaybeAssetId()` - converts CoinGecko platform data to AssetId
- `zerionImplementationToMaybeAssetId()` - converts Zerion data to AssetId (EVM only)

### 4. The feat_regenerate_asset_data Branch Analysis ⚠️

**Branch**: `feat_regenerate_asset_data` (created by another AI tool)

**Changes Overview:**
```
51 files changed, 665 insertions(+), 1209 deletions(-)
```

**Concerning findings:**

1. **Color map changes** - Removes ONE slip44 entry:
   ```diff
   -  "eip155:43114/slip44:60": "#EC4343",
   ```
   This is removing a color for Ethereum (slip44:60) on Avalanche C-Chain. **Context missing** - why was this removed? Is this a wrapped ETH that no longer exists?

2. **Major swapper refactors:**
   - CetusSwapper: 151 lines changed in helpers
   - PortalsSwapper: Removed `fetchAxelarscanStatus.ts` (97 lines) and `fetchSquidStatus.ts` (109 lines)
   - NearIntentsSwapper: Type changes
   - **These changes are UNRELATED to related assets**

3. **Asset data regenerated:**
   - `encodedAssetData.json` - changed (2 files)
   - `encodedRelatedAssetIndex.json` - changed (2 files)
   - Coingecko/Coincap adapter JSONs - all regenerated
   - **BUT** - no visibility into what actually changed in the related asset groupings

4. **Dependency updates:**
   - `yarn.lock` has 481 lines changed
   - Several package.json updates
   - **Unclear if these are related to asset generation**

**Assessment**: ⚠️ **PROBABLY WRONG**
- Changes mix unrelated refactoring with asset regeneration
- No documentation of what changed or why
- Slip44 removal lacks context
- Should be suspicious of using this branch as-is

### 5. Root Cause Analysis

**Why aren't related assets working for second-class chains?**

**Theory A**: Script hasn't been run recently
- Asset data gets stale
- New chains added but script not re-run
- **Likelihood**: HIGH

**Theory B**: Script has bugs for new chains
- Platform mapping works for queries but not generation
- Zerion doesn't support non-EVM chains (expected, handled)
- Edge case in asset namespace handling (Sui uses `coin:`, Tron uses `trc20:`)
- **Likelihood**: MEDIUM

**Theory C**: Rate limiting / API issues
- CoinGecko/Zerion APIs timing out for second-class chains
- Throttling too aggressive or not aggressive enough
- **Likelihood**: LOW (script has retry logic)

**Theory D**: Data quality issues
- Some chains have corrupt/incomplete data upstream
- Script explicitly handles Plasma USDT0 corruption (line 191-197)
- **Likelihood**: MEDIUM for Plasma, LOW for others

---

## Data Sources

### CoinGecko API

**Endpoints used:**
1. `GET /coins/list?include_platform=true` - Get all coins with platform info
2. `GET /coins/{platform}/contract/{address}` - Get specific token with all platforms

**Rate Limits:**
- Free tier: 10-30 calls/minute
- Script uses throttling: 50 capacity, 25 drain/2s

**Example Response (USDC):**
```json
{
  "id": "usd-coin",
  "platforms": {
    "ethereum": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
    "monad": "0x754704bc059f8c67012fed69bc8a327a5aafb603",
    "sui": "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC",
    "hyperevm": "0xb88339cb7199b77e23db6e890353e22632ba630f",
    "tron": "TEkxiTehnzSmSe2XqrBj4w32RUN966rdz8",
    "polygon-pos": "0x3c499c542cef5e3811e1192ce70d8cc03d5c3359",
    "arbitrum-one": "0xaf88d065e77c8cc2239327c5edb3a432268e5831",
    // ... 20+ more platforms
  }
}
```

### Zerion API

**Endpoints used:**
1. `GET /fungibles?filter[implementation_address]={address}` - Get token implementations

**Limitations:**
- Only supports EVM chains
- Requires API key: `process.env.ZERION_API_KEY`
- Used as secondary validation for EVM chains

**Not applicable to:**
- Sui (non-EVM)
- Tron (non-EVM)
- Solana (non-EVM)

---

## File Structure

### Asset Generation Scripts

```
scripts/generateAssetData/
├── generateAssetData.ts           # Main entry point
├── generateRelatedAssetIndex.ts   # Imports from subdirectory
├── generateRelatedAssetIndex/
│   ├── generateRelatedAssetIndex.ts   # Main logic (407 lines)
│   ├── mapping.ts                     # AssetId converters (30 lines)
│   └── validators/
│       └── fungible.ts                # Zod schemas for Zerion API
├── coingecko.ts                   # CoinGecko adapter generator
├── constants.ts                   # Paths to output files
├── color-map.json                 # Asset color mappings
└── [chain-specific]/              # e.g., hyperevm/, plasma/
    └── index.ts                   # Chain-specific asset lists
```

### Output Files

```
src/lib/asset-service/service/
├── encodedAssetData.json          # All assets with metadata
└── encodedRelatedAssetIndex.json  # Related asset groupings
```

**Format:**
- `encodedAssetData.json`: Compressed, indexed by integer IDs
- `encodedRelatedAssetIndex.json`: Maps primary assetId → [related assetIds]

### Key Source Files

1. **packages/caip/src/adapters/coingecko/index.ts** (220 lines)
   - Platform enums and converters
   - Already has Monad, HyperEVM, Plasma, Sui, Tron

2. **packages/caip/src/adapters/coingecko/utils.ts** (328 lines)
   - `parseData()` function processes coins into asset maps
   - Has switches for all chains (lines 200-282)

3. **scripts/generateAssetData/generateRelatedAssetIndex/generateRelatedAssetIndex.ts** (407 lines)
   - Main generation logic
   - Has special case for Plasma USDT0 (lines 191-197)

---

## Testing Plan

### Phase 1: Verify Current State

```bash
# 1. Check if related assets exist for second-class chains
cd src/lib/asset-service/service
cat encodedRelatedAssetIndex.json | jq 'keys | length'  # Total groups

# 2. Sample a known token (e.g., USDC) and check platforms
# USDC AssetIds:
# - ETH: eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48
# - SUI: sui:35834a8a/coin:0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC
# - MONAD: eip155:999/erc20:0x754704bc059f8c67012fed69bc8a327a5aafb603
# - Check if these are grouped together

# 3. Count assets per chain in encodedAssetData.json
```

### Phase 2: Run Generation Script

```bash
cd scripts/generateAssetData

# Ensure env vars are set
export ZERION_API_KEY="your_key_here"

# Run related asset generation
yarn generate:related-assets  # or similar command
# Check output for errors, especially for second-class chains
```

### Phase 3: Validate Output

```bash
# 1. Check for increased related asset groups
# Before/after count comparison

# 2. Spot check known multi-chain tokens:
# - USDC (should have 20+ platforms)
# - USDT (should have 15+ platforms)
# - Wrapped BTC variants
# - ETH wrapped variants

# 3. Verify second-class chains specifically:
# - Find a SUI asset, check if relatedAssetKey is set
# - Find a Monad asset, check if relatedAssetKey is set
# - etc.
```

### Phase 4: Integration Testing

```bash
# 1. Start dev server
yarn dev

# 2. Navigate to an asset page for a multi-chain token
# 3. Check if "Available on X networks" shows second-class chains
# 4. Verify asset switching works correctly
```

---

## Known Issues & Edge Cases

### 1. Plasma USDT0 Corruption

**Location**: `generateRelatedAssetIndex.ts` lines 191-197

```typescript
// Skip related asset generation for Plasma usdt0 - Coingecko has corrupt data claiming
// it shares the same Arbitrum/Polygon contracts as real USDT, which corrupts groupings
if (assetId === 'eip155:9745/erc20:0xb8ce59fc3717ada4c02eadf9682a9e934f625ebb') {
  assetData[assetId].relatedAssetKey = null
  await throttle()
  return
}
```

**Why**: CoinGecko incorrectly lists Plasma USDT0 as sharing contracts with real USDT on other chains.

**Solution**: Hardcoded exclusion. Other Plasma assets should work fine.

### 2. Sui Asset Namespace

Sui uses different namespace: `coin:` instead of `erc20:`

Example:
```
sui:35834a8a/coin:0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC
```

**Status**: Code appears to handle this via `getAssetNamespaceFromChainId()` utility.

### 3. Native Asset Wrapping

Native assets (ETH, AVAX, etc.) don't have platform contracts in CoinGecko.

Example: Avalanche (AVAX)
- CoinGecko ID: `avalanche-2`
- Platforms: Does NOT include `"avalanche": "0x0000..."` for native
- Wrapped versions DO appear with contract addresses

**Impact**: Native assets won't auto-group with their wrapped versions. Manual mapping exists for some (ETH → Op ETH, Arb ETH, etc.) in lines 52-54.

### 4. Zerion EVM-Only Limitation

Zerion API only works for EVM chains, returns undefined for:
- Sui
- Tron
- Solana

**Status**: Expected behavior, handled gracefully. CoinGecko is primary source.

---

## Recommended Next Steps

### Option A: Run Script and Verify (RECOMMENDED)

1. ✅ Branch created: `feat_second_class_related`
2. Run `yarn generate:related-assets` (or equivalent)
3. Check for errors specific to second-class chains
4. If successful:
   - Commit updated `encodedAssetData.json` and `encodedRelatedAssetIndex.json`
   - Add tests to verify groupings
   - Create PR

### Option B: Debug Script Issues

If script fails or produces bad results:

1. Add debug logging to `processRelatedAssetIds()` for second-class chains
2. Check if `coingeckoPlatformDetailsToMaybeAssetId()` works for:
   - Sui's `coin:` namespace
   - Monad/HyperEVM/Plasma standard EVM addresses
   - Tron's `trc20:` namespace
3. Verify `chainIdToCoingeckoAssetPlatform()` returns correct strings
4. Test CoinGecko API directly for sample assets

### Option B: Investigate feat_regenerate_asset_data

**NOT RECOMMENDED without understanding changes**

1. Cherry-pick ONLY the asset data files:
   ```bash
   git checkout feat_regenerate_asset_data -- \
     src/lib/asset-service/service/encodedAssetData.json \
     src/lib/asset-service/service/encodedRelatedAssetIndex.json
   ```

2. Analyze what changed:
   ```bash
   # Compare related asset counts
   # Check for second-class chain assets
   # Verify no regressions
   ```

3. If good, keep. If bad, discard and run fresh generation.

---

## Commands for Next Session

```bash
# Set up environment
cd /Users/alexandre.gomes/Sites/shapeshiftWebCloneClone
git checkout feat_second_class_related

# Check script command (look in package.json)
cat scripts/generateAssetData/package.json | grep -A5 "scripts"
# OR
cat package.json | grep -i "generate.*asset"

# Run the generation (example - adjust as needed)
cd scripts/generateAssetData
export ZERION_API_KEY="<get from 1password or ask user>"
yarn generate:related-assets

# If that doesn't exist, try:
yarn generate:asset-data  # might run all generators
# OR
ts-node generateRelatedAssetIndex.ts

# After generation, check output
git status  # should show changes to encodedAssetData.json and encodedRelatedAssetIndex.json
git diff src/lib/asset-service/service/encodedRelatedAssetIndex.json | head -100

# Validate changes
# TODO: Create validation script to check second-class chains specifically
```

---

## Questions for User / Next Session

1. **What command runs the related asset generation?**
   - Not immediately obvious from file structure
   - May be in package.json scripts or a separate script runner

2. **Where is ZERION_API_KEY stored?**
   - Required for script to run
   - Check 1Password / env setup

3. **Should we trust feat_regenerate_asset_data?**
   - Need to understand WHY it was created
   - What problem was it trying to solve?
   - Why the unrelated swapper changes?

4. **Are there tests for related assets?**
   - Would be useful to verify changes don't break existing groupings
   - May need to create tests

5. **What's the deployment process for asset data changes?**
   - Just commit the JSON files?
   - Need to run any build steps?
   - How are changes tested in production?

---

## Additional Context

### Slip44 Coin Types

- Bitcoin (BTC): 0
- Ethereum (ETH): 60
- Avalanche (AVAX): 9000
- Cosmos (ATOM): 118
- Solana (SOL): 501

The removed `eip155:43114/slip44:60` was Ethereum (60) on Avalanche C-Chain (43114). This likely represents a wrapped/bridged ETH token that may no longer exist or was incorrectly configured.

### Asset ID Format

```
{chainNamespace}:{chainReference}/{assetNamespace}:{assetReference}

Examples:
- eip155:1/erc20:0xa0b...       # USDC on Ethereum
- eip155:999/erc20:0x754...     # USDC on Monad
- sui:35834a8a/coin:0xdba3...   # USDC on Sui
- tron:0x2b6653dc/trc20:TEkxi... # USDC on Tron
```

### Chain References

- Ethereum: `eip155:1`
- Monad: `eip155:999`
- HyperEVM: `eip155:143`
- Plasma: `eip155:9745`
- Sui: `sui:35834a8a`
- Tron: `tron:0x2b6653dc`

---

## Files Changed (for reference when making PR)

Expected changes after running generation:
```
src/lib/asset-service/service/encodedAssetData.json
src/lib/asset-service/service/encodedRelatedAssetIndex.json
scripts/generateAssetData/color-map.json  (maybe, if colors added)
```

Unexpected changes would indicate issues.

---

## Conclusion

**TL;DR**: Everything is already set up. Just need to run the script and verify it works. Second-class chains should automatically get related asset groupings because:
1. ✅ Upstream data exists (CoinGecko)
2. ✅ Platform mappings exist in code
3. ✅ Generation script uses mappings automatically

The only unknowns:
- Does the script run without errors?
- Does it handle non-EVM namespaces correctly?
- Are there data quality issues beyond Plasma USDT0?

Next session should run the generation and find out! 🚀

---

**End of Investigation Document**

*This document should be sufficient for another Claude session to pick up where we left off and complete the implementation.*
