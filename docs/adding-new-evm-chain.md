# Adding a New EVM Chain to ShapeShift Web

This guide covers adding a new EVM chain using the Generic EVM Chain system. This is the fastest way to add a new chain with basic support (send/receive, token display).

> **Note:** Currently only **Celo** and **Linea** use the Generic EVM system. Other chains like Monad, Plasma, HyperEVM, and Katana have their own specific integrations.

## Prerequisites

Before starting, gather the following information:
- **Chain ID** (numeric, e.g., `42220` for Celo)
- **Chain Name** (lowercase, e.g., `celo`)
- **Display Name** (e.g., `Celo`)
- **Native Token Symbol** (e.g., `CELO` or `ETH`)
- **RPC URL** (public or private)
- **Block Explorer URL** (e.g., `https://celoscan.io`)
- **CoinGecko Asset Platform ID** (find at https://api.coingecko.com/api/v3/asset_platforms)
- **Viem Chain Key** (if available in `viem/chains`, e.g., `celo`, `linea`)
- **Native Token Icon URL** (from CoinGecko or TrustWallet assets)
- **Chain Color** (hex, e.g., `#FCFF52`)

---

## Step-by-Step Guide

### 1. Add Chain ID to KnownChainIds

**File:** `packages/types/src/base.ts`

```typescript
export enum KnownChainIds {
  // ... existing chains
  NewChainMainnet = 'eip155:12345', // Add your chain
}

// Add to EvmChainId type union
export type EvmChainId =
  | KnownChainIds.EthereumMainnet
  // ... existing chains
  | KnownChainIds.NewChainMainnet // Add here
```

---

### 2. Add CAIP Constants

**File:** `packages/caip/src/constants.ts`

```typescript
// Add chain reference (numeric chain ID as string)
export const CHAIN_REFERENCE = {
  // ... existing chains
  NewChainMainnet: '12345',
} as const

// Add to VALID_CHAIN_IDS array
export const VALID_CHAIN_IDS = [
  // ... existing chain IDs
  CHAIN_REFERENCE.NewChainMainnet,
]

// Add chain ID constant
export const newChainChainId: ChainId = 'eip155:12345'

// Add native asset ID
export const newChainAssetId: AssetId = 'eip155:12345/slip44:60'

// Add to ASSET_REFERENCE
export const ASSET_REFERENCE = {
  // ... existing references
  NewChain: '60', // slip44:60 for ETH-based, or unique value for other native tokens
} as const

// Add to FEE_ASSET_IDS
export const FEE_ASSET_IDS = [
  // ... existing fee assets
  newChainAssetId,
]
```

---

### 3. Add Generic Chain Configuration

**File:** `packages/caip/src/genericChains.ts`

```typescript
export const GENERIC_EVM_CHAINS: EvmGenericChainConfig[] = [
  // ... existing chains
  {
    chainId: 'eip155:12345',
    name: 'newchain',
    displayName: 'New Chain',
    nativeAssetId: 'eip155:12345/slip44:60',
    iconName: 'newchain',
    viemChainKey: 'newchain', // Must match key in viem/chains, or omit if not available
    explorerUrl: 'https://newchainexplorer.com',
  },
]
```

---

### 4. Add Base Asset Definition

**File:** `packages/utils/src/assetData/baseAssets.ts`

```typescript
export const newchain: Readonly<Asset> = Object.freeze({
  assetId: caip.newChainAssetId,
  chainId: caip.newChainChainId,
  name: 'New Chain Token', // or 'Ethereum' if native token is ETH
  networkName: 'New Chain',
  symbol: 'NEWT', // Native token symbol
  precision: 18,
  color: '#123456', // Brand color
  networkColor: '#123456',
  icon: 'https://assets.coingecko.com/coins/images/.../large/logo.png',
  networkIcon: 'https://newchainexplorer.com/logo.svg', // Optional, for L2s
  explorer: 'https://newchainexplorer.com',
  explorerAddressLink: 'https://newchainexplorer.com/address/',
  explorerTxLink: 'https://newchainexplorer.com/tx/',
  relatedAssetKey: null, // or 'eip155:1/slip44:60' if native token is ETH
})
```

---

### 5. Add Viem Client

**File:** `packages/contracts/src/viemClient.ts`

```typescript
import { newchain } from 'viem/chains' // If available in viem

// Create public client
export const viemNewChainClient = createPublicClient({
  chain: newchain,
  transport: fallback(
    [process.env.VITE_NEWCHAIN_NODE_URL, 'https://rpc.newchain.com']
      .filter(Boolean)
      .map(url => http(url)),
  ),
}) as PublicClient

// Add to viemClientByChainId
export const viemClientByChainId: Record<ChainId, PublicClient> = {
  // ... existing clients
  [KnownChainIds.NewChainMainnet]: viemNewChainClient,
}

// Add to viemNetworkIdByChainId
export const viemNetworkIdByChainId: Record<ChainId, number> = {
  // ... existing mappings
  [KnownChainIds.NewChainMainnet]: newchain.id,
}

// Add to viemClientByNetworkId
export const viemClientByNetworkId: Record<number, PublicClient> = {
  // ... existing mappings
  [newchain.id]: viemNewChainClient,
}
```

---

### 6. Add Ethers Provider Mapping

**File:** `packages/contracts/src/ethersProviderSingleton.ts`

```typescript
export const rpcUrlByChainId = (chainId: EvmChainId): string => {
  switch (chainId) {
    // ... existing cases
    case KnownChainIds.NewChainMainnet:
      return process.env.VITE_NEWCHAIN_NODE_URL || 'https://rpc.newchain.com'
  }
}
```

---

### 7. Update Chain Adapter Types

**File:** `packages/chain-adapters/src/types.ts`

Add the new chain to ALL of these type mappings:

```typescript
// ChainSpecificAccountMapping
type ChainSpecificAccountMapping = {
  // ... existing chains
  [KnownChainIds.NewChainMainnet]: evm.Account
}

// ChainSpecificFeeDataMapping
type ChainSpecificFeeDataMapping = {
  // ... existing chains
  [KnownChainIds.NewChainMainnet]: evm.FeeData
}

// ChainSignTx
export type ChainSignTx = {
  // ... existing chains
  [KnownChainIds.NewChainMainnet]: ETHSignTx
}

// ChainSpecificBuildTxDataMapping
type ChainSpecificBuildTxDataMapping = {
  // ... existing chains
  [KnownChainIds.NewChainMainnet]: evm.BuildTxInput
}

// ChainSpecificGetFeeDataInputMapping
type ChainSpecificGetFeeDataInputMapping = {
  // ... existing chains
  [KnownChainIds.NewChainMainnet]: evm.GetFeeDataInput
}

// ChainAdapterDisplayName enum
export enum ChainAdapterDisplayName {
  // ... existing chains
  NewChain = 'New Chain',
}
```

---

### 8. Update EVM Base Adapter

**File:** `packages/chain-adapters/src/evm/EvmBaseAdapter.ts`

```typescript
// Add to evmChainIds array (around line 90)
export const evmChainIds = [
  // ... existing chain IDs
  KnownChainIds.NewChainMainnet,
] as const

// Add to targetNetworkByChainId (around line 296)
const targetNetworkByChainId = {
  // ... existing chains
  [KnownChainIds.NewChainMainnet]: {
    name: 'New Chain Token', // or 'Ethereum' for ETH-based
    symbol: 'NEWT',
    explorer: 'https://newchainexplorer.com',
  },
}
```

---

### 9. Update Utility Functions

**File:** `packages/utils/src/chainIdToFeeAssetId.ts`
```typescript
case KnownChainIds.NewChainMainnet:
  return newChainAssetId
```

**File:** `packages/utils/src/getChainShortName.ts`
```typescript
case KnownChainIds.NewChainMainnet:
  return 'NEWCH' // Short code (max 5-6 chars)
```

**File:** `packages/utils/src/getAssetNamespaceFromChainId.ts`
```typescript
case KnownChainIds.NewChainMainnet:
  return ASSET_NAMESPACE.erc20
```

**File:** `packages/utils/src/getNativeFeeAssetReference.ts`
```typescript
case CHAIN_REFERENCE.NewChainMainnet:
  return ASSET_REFERENCE.NewChain
```

**File:** `packages/utils/src/assetData/getBaseAsset.ts`
```typescript
case KnownChainIds.NewChainMainnet:
  return newchain
```

---

### 10. Add CoinGecko Adapter

**File:** `packages/caip/src/adapters/coingecko/index.ts`

```typescript
// Add to CoingeckoAssetPlatform enum
export enum CoingeckoAssetPlatform {
  // ... existing platforms
  Newchain = 'newchain', // Must match CoinGecko's asset_platforms ID
}

// Add case in makeCoingeckoAssetUrl function
case CHAIN_REFERENCE.NewChainMainnet:
  return `${baseUrl}${CoingeckoAssetPlatform.Newchain}`
```

**File:** `packages/caip/src/adapters/coingecko/utils.ts`

Add parsing block in `parseData` function (follow Celo/Linea pattern):

```typescript
{
  const matchData = data.platforms?.newchain
  if (matchData) {
    assetIdByCoingeckoId[data.id] ??= {}
    const id = toAssetId({
      chainNamespace: CHAIN_NAMESPACE.Evm,
      chainReference: CHAIN_REFERENCE.NewChainMainnet,
      assetNamespace: 'erc20',
      assetReference: matchData,
    })
    assetIdByCoingeckoId[data.id][id] = true
    coingeckoIdByAssetId[id] = data.id
  }
}
```

Run generation:
```bash
cd packages/caip && yarn generate
```

---

### 11. Create Asset Generation Script

**File:** `scripts/generateAssetData/newchain/index.ts`

```typescript
import { newChainChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { newchain, unfreeze } from '@shapeshiftoss/utils'
import partition from 'lodash/partition'
import uniqBy from 'lodash/uniqBy'

import * as coingecko from '../coingecko'
import { getPortalTokens } from '@/lib/portals/utils'

export const getAssets = async (): Promise<Asset[]> => {
  const results = await Promise.allSettled([
    coingecko.getAssets(newChainChainId),
    getPortalTokens(newchain, 'all'),
  ])

  const [assets, _portalsAssets] = results.map(result => {
    if (result.status === 'fulfilled') return result.value
    console.error(result.reason)
    return []
  })

  const [portalsPools, portalsAssets] = partition(_portalsAssets, 'isPool')

  const allAssets = uniqBy(
    portalsPools
      .concat(assets)
      .concat(portalsAssets)
      .concat([unfreeze(newchain)]),
    'assetId',
  )

  return allAssets
}
```

**File:** `scripts/generateAssetData/generateAssetData.ts`

```typescript
// Add import
import * as newchainModule from './newchain'

// Add to asset generation
const newchainAssets = await newchainModule.getAssets()

// Add to unfilteredAssetData array
const unfilteredAssetData: Asset[] = [
  // ... existing assets
  ...newchainAssets,
]
```

---

### 12. Add Chain to Second-Class Chains

**File:** `src/constants/chains.ts`

```typescript
export const SECOND_CLASS_CHAINS: readonly KnownChainIds[] = [
  // ... existing chains
  KnownChainIds.NewChainMainnet,
]
```

---

### 13. Add Opportunities Mapping

**File:** `src/state/slices/opportunitiesSlice/mappings.ts`

```typescript
export const stakingOpportunityByChainId: Record<ChainId, StakingOpportunity[]> = {
  // ... existing chains
  [KnownChainIds.NewChainMainnet]: [], // Empty if no staking opportunities
}
```

---

### 14. Add Environment Variables

**File:** `.env` and `.env.development`

```bash
# New Chain RPC URL (optional if using viem/chains default)
VITE_NEWCHAIN_NODE_URL=https://rpc.newchain.com

# Or use generic pattern
VITE_GENERIC_CHAIN_12345_NODE_URL=https://rpc.newchain.com
```

---

### 15. Generate Assets

```bash
yarn generate:asset-data
```

---

## Verification Checklist

After adding a new chain, verify:

- [ ] `yarn type-check` passes
- [ ] `yarn lint --fix` passes
- [ ] `yarn generate:asset-data` runs successfully
- [ ] Chain appears in wallet connection
- [ ] Can send native token
- [ ] Can receive native token
- [ ] Token list shows correctly
- [ ] Block explorer links work
- [ ] Transaction history loads (if supported)

---

## File Summary

| Category | Files to Update |
|----------|----------------|
| **Chain IDs** | `packages/types/src/base.ts` |
| **CAIP Constants** | `packages/caip/src/constants.ts` |
| **Generic Config** | `packages/caip/src/genericChains.ts` |
| **Base Asset** | `packages/utils/src/assetData/baseAssets.ts` |
| **Viem Client** | `packages/contracts/src/viemClient.ts` |
| **Ethers Provider** | `packages/contracts/src/ethersProviderSingleton.ts` |
| **Adapter Types** | `packages/chain-adapters/src/types.ts` |
| **EVM Adapter** | `packages/chain-adapters/src/evm/EvmBaseAdapter.ts` |
| **Utilities** | 5 files in `packages/utils/src/` |
| **CoinGecko** | `packages/caip/src/adapters/coingecko/index.ts`, `utils.ts` |
| **Asset Script** | `scripts/generateAssetData/newchain/index.ts`, `generateAssetData.ts` |
| **Web App** | `src/constants/chains.ts`, `src/state/slices/opportunitiesSlice/mappings.ts` |
| **Environment** | `.env`, `.env.development` |

**Total: ~15-17 files**

---

## Notes

- Generic EVM chains use the `GenericEvmChains` feature flag
- Transaction status is handled automatically via `getEvmTransactionStatus()` in `src/lib/utils/evm/index.ts`
- Chain icons are referenced via URLs in `baseAssets.ts`, not local files
- If your chain isn't in `viem/chains`, you'll need to define a custom chain or use only the generic pattern
