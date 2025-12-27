# NEAR Asset Generation Plan

## Overview

This document outlines the plan for adding NEAR Protocol asset generation to ShapeShift Web. NEAR is being integrated as a second-class citizen chain with native asset support and NEP-141 token support via CoinGecko.

## Current Understanding

### CAIP Identifiers (Already Added)
- **Chain ID**: `near:mainnet` (CAIP-2)
- **Native Asset ID**: `near:mainnet/slip44:397` (CAIP-19)
- **Token Format**: `near:mainnet/nep141:{contract_account_id}` (CAIP-19)
- **Namespace**: `Near: 'near'`
- **Chain Reference**: `NearMainnet: 'mainnet'`
- **Asset Reference**: `Near: '397'` (SLIP-44 coin type)
- **Token Namespace**: `nep141` (NEP-141 fungible token standard)

### CoinGecko Support
- **Platform ID**: `near-protocol`
- CoinGecko indexes NEAR tokens via this platform
- Token addresses are contract account IDs (e.g., `wrap.near`, `usdt.tether-token.near`)

### Swapper Support Status
| Swapper | NEAR Support |
|---------|-------------|
| NEAR Intents | YES (this is our primary swapper for NEAR) |
| THORChain | NO |
| ChainFlip | NO |
| 0x | NO |
| 1inch | NO |
| Portals | NO |
| Relay | NO |
| CowSwap | NO |

**Note**: NEAR Intents is the ONLY swapper that supports NEAR mainnet. This is fine since NEAR Intents is already integrated in ShapeShift.

---

## Asset Generation Implementation Plan

### Step 1: Add CoinGecko Adapter for NEAR

**File: `packages/caip/src/adapters/coingecko/index.ts`**

Add NEAR to the CoingeckoAssetPlatform enum:

```typescript
export enum CoingeckoAssetPlatform {
  // ... existing platforms
  Near = 'near-protocol',
}
```

**File: `packages/caip/src/adapters/coingecko/utils.ts`**

Add chain ID to platform mapping:

```typescript
import { nearChainId, CHAIN_NAMESPACE, CHAIN_REFERENCE } from '../../constants'

// In chainIdToCoingeckoAssetPlatform function
case CHAIN_NAMESPACE.Near:
  switch (chainReference) {
    case CHAIN_REFERENCE.NearMainnet:
      return CoingeckoAssetPlatform.Near
    default:
      throw new Error(`chainReference '${chainReference}' not supported for NEAR namespace`)
  }
```

### Step 2: Create NEAR Asset Generator

**File: `scripts/generateAssetData/near/index.ts`**

```typescript
import { nearChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { near, unfreeze } from '@shapeshiftoss/utils'

import * as coingecko from '../coingecko'

export const getAssets = async (): Promise<Asset[]> => {
  const assets = await coingecko.getAssets(nearChainId)

  return [...assets, unfreeze(near)]
}
```

### Step 3: Add NEAR to CoinGecko Generator

**File: `scripts/generateAssetData/coingecko.ts`**

Import NEAR chain ID and base asset:

```typescript
import {
  // ... existing imports
  nearChainId,
} from '@shapeshiftoss/caip'

import {
  // ... existing imports
  near,
} from '@shapeshiftoss/utils'
```

Add NEAR case in the switch statement:

```typescript
case nearChainId:
  return {
    assetNamespace: ASSET_NAMESPACE.nep141,
    category: adapters.chainIdToCoingeckoAssetPlatform(chainId),
    explorer: near.explorer,
    explorerAddressLink: near.explorerAddressLink,
    explorerTxLink: near.explorerTxLink,
  }
```

### Step 4: Wire into Main Generator

**File: `scripts/generateAssetData/generateAssetData.ts`**

```typescript
import * as near from './near'

// In generateAssetData function
const nearAssets = await near.getAssets()

// Add to unfilteredAssetData array
const unfilteredAssetData = [
  // ... existing assets
  ...nearAssets,
]
```

### Step 5: Add NEAR Base Asset to Utils

**File: `packages/utils/src/assetData/baseAssets.ts`**

```typescript
export const near: Asset = {
  assetId: nearAssetId,
  chainId: nearChainId,
  name: 'NEAR',
  precision: 24, // NEAR uses 24 decimals (yoctoNEAR)
  color: '#00C08B',
  icon: 'https://rawcdn.githack.com/trustwallet/assets/master/blockchains/near/info/logo.png',
  symbol: 'NEAR',
  explorer: 'https://nearblocks.io',
  explorerAddressLink: 'https://nearblocks.io/address/',
  explorerTxLink: 'https://nearblocks.io/txns/',
  relatedAssetKey: null,
}
```

**File: `packages/utils/src/assetData/index.ts`**

Export the near base asset.

---

## Testing Plan

### Phase 1: Test NEAR-Only Asset Generation Script

Create a minimal test script that ONLY generates NEAR assets to verify:
1. CoinGecko adapter works for NEAR
2. Token addresses are correctly formatted as `near:mainnet/nep141:{contract_id}`
3. Asset metadata is properly fetched

**Test Script Location**: `scripts/generateAssetData/test-near-only.ts`

```typescript
import { writeFile } from 'fs/promises'
import { nearChainId, ASSET_NAMESPACE } from '@shapeshiftoss/caip'
import * as adapters from '@shapeshiftoss/caip/src/adapters/coingecko'

// Minimal NEAR base asset for testing
const nearBaseAsset = {
  assetId: 'near:mainnet/slip44:397',
  chainId: 'near:mainnet',
  name: 'NEAR',
  precision: 24,
  color: '#00C08B',
  icon: 'https://rawcdn.githack.com/trustwallet/assets/master/blockchains/near/info/logo.png',
  symbol: 'NEAR',
  explorer: 'https://nearblocks.io',
  explorerAddressLink: 'https://nearblocks.io/address/',
  explorerTxLink: 'https://nearblocks.io/txns/',
}

async function testNearAssetGeneration() {
  console.log('Testing NEAR asset generation...')

  // Test 1: Verify CoinGecko platform mapping
  console.log('\n1. Testing CoinGecko platform mapping...')
  const platform = adapters.chainIdToCoingeckoAssetPlatform(nearChainId)
  console.log(`   Platform ID: ${platform}`)
  if (platform !== 'near-protocol') {
    throw new Error(`Expected 'near-protocol', got '${platform}'`)
  }
  console.log('   PASS')

  // Test 2: Fetch NEAR tokens from CoinGecko
  console.log('\n2. Fetching NEAR tokens from CoinGecko...')
  const response = await fetch(
    'https://api.coingecko.com/api/v3/coins/list?include_platform=true'
  )
  const coins = await response.json()

  const nearTokens = coins.filter(
    (coin: any) => coin.platforms && coin.platforms['near-protocol']
  )
  console.log(`   Found ${nearTokens.length} NEAR tokens on CoinGecko`)

  // Test 3: Format sample tokens
  console.log('\n3. Sample NEAR tokens:')
  const sampleTokens = nearTokens.slice(0, 5)
  for (const token of sampleTokens) {
    const contractAddress = token.platforms['near-protocol']
    const assetId = `near:mainnet/${ASSET_NAMESPACE.nep141}:${contractAddress}`
    console.log(`   - ${token.name} (${token.symbol}): ${assetId}`)
  }

  // Test 4: Generate test output
  console.log('\n4. Generating test output...')
  const testAssets = [
    nearBaseAsset,
    ...sampleTokens.map((token: any) => ({
      assetId: `near:mainnet/nep141:${token.platforms['near-protocol']}`,
      chainId: nearChainId,
      name: token.name,
      symbol: token.symbol.toUpperCase(),
      precision: 24, // NEP-141 tokens typically use 24 decimals like NEAR
      color: '#00C08B',
      icon: '',
      explorer: 'https://nearblocks.io',
      explorerAddressLink: 'https://nearblocks.io/address/',
      explorerTxLink: 'https://nearblocks.io/txns/',
    })),
  ]

  await writeFile(
    '/tmp/near-test-assets.json',
    JSON.stringify(testAssets, null, 2)
  )
  console.log('   Wrote test output to /tmp/near-test-assets.json')

  console.log('\n=== ALL TESTS PASSED ===')
  console.log(`Total NEAR assets: ${testAssets.length}`)
  return testAssets
}

testNearAssetGeneration().catch(console.error)
```

### Phase 2: Run Test Script

```bash
# Run the NEAR-only test script
npx tsx scripts/generateAssetData/test-near-only.ts

# Verify output
cat /tmp/near-test-assets.json | head -50
```

### Phase 3: Integration Testing

After test script passes:
1. Add the actual NEAR generation code to the codebase
2. Run `yarn generate:caip-adapters` to generate NEAR adapter JSON
3. Do NOT run `yarn generate:asset-data` until confirmed by user
4. Verify generated files look correct

---

## Files to Create/Modify

### New Files
- [ ] `scripts/generateAssetData/near/index.ts` - NEAR asset generator
- [ ] `scripts/generateAssetData/test-near-only.ts` - Test script (temporary)

### Modified Files
- [x] `packages/caip/src/constants.ts` - NEAR CAIP constants (DONE)
- [ ] `packages/caip/src/adapters/coingecko/index.ts` - Add Near platform enum
- [ ] `packages/caip/src/adapters/coingecko/utils.ts` - Add chainId mapping
- [ ] `packages/utils/src/assetData/baseAssets.ts` - Add NEAR base asset
- [ ] `packages/utils/src/assetData/index.ts` - Export near base asset
- [ ] `scripts/generateAssetData/coingecko.ts` - Add NEAR case
- [ ] `scripts/generateAssetData/generateAssetData.ts` - Wire in NEAR generator

---

## Notes

### NEAR Precision
- NEAR uses 24 decimal places (yoctoNEAR = 10^-24 NEAR)
- This is different from most chains (ETH uses 18)
- NEP-141 tokens can have varying decimals, but many use 24

### Token Contract Addresses
- NEAR token addresses are human-readable account IDs, not hex addresses
- Examples: `wrap.near`, `usdt.tether-token.near`, `aurora`
- These go directly into the CAIP-19 format: `near:mainnet/nep141:wrap.near`

### No Zerion Needed for NEAR
- Zerion API is used for related assets indexing on EVM chains
- NEAR is not an EVM chain, so Zerion won't have NEAR data
- CoinGecko is our primary source for NEAR token data

---

## Execution Order

1. **Create test script** and verify CoinGecko NEAR token fetching works
2. **Add CoinGecko adapter** entries for NEAR
3. **Add NEAR base asset** to utils
4. **Create NEAR generator** module
5. **Wire into main generator**
6. **Run `yarn generate:caip-adapters`** (safe, just generates JSON mappings)
7. **Verify output** before running full asset generation
