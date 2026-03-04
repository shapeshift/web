/*
  Web worker for asset search.
  Receives an initial dataset of minimal assets, caches it,
  and responds to search requests with filtered assetIds.
*/

import type { AssetId } from '@shapeshiftoss/caip'

import type {
  AssetSearchWorkerInboundMessage,
  AssetSearchWorkerOutboundMessage,
  SearchableAsset,
} from '@/lib/assetSearch'
import {
  deduplicateAssets,
  filterAssetsByChainSupport,
  searchAssets,
  shouldSearchAllAssets as shouldSearchAllAssetsUtil,
} from '@/lib/assetSearch'
import { isContractAddress } from '@/lib/utils/isContractAddress'

// Internal state
let allAssets: SearchableAsset[] = []
let primaryAssets: SearchableAsset[] = []
// Derived from primaryAssets for efficient lookups in shouldSearchAllAssets
let primaryAssetIds: Set<AssetId> = new Set()
let primarySymbols: Set<string> = new Set()

const handleSearch = (msg: AssetSearchWorkerInboundMessage & { type: 'search' }): void => {
  const {
    searchString,
    activeChainId,
    allowWalletUnsupportedAssets,
    walletConnectedChainIds = [],
  } = msg.payload

  const isContractAddressSearch = isContractAddress(searchString)

  // Decide which asset set to search:
  // - Contract address searches always use all assets to find related variants
  // - Chain-specific searches use all assets (filtered by chain later)
  // - "All" chains uses primaries unless search matches a non-primary unique symbol (e.g., AXLUSDC)
  const useAll =
    isContractAddressSearch ||
    activeChainId !== 'All' ||
    shouldSearchAllAssetsUtil(searchString, allAssets, primaryAssetIds, primarySymbols)

  const searchableAssets = useAll ? allAssets : primaryAssets

  const preFiltered = filterAssetsByChainSupport(searchableAssets, {
    activeChainId,
    allowWalletUnsupportedAssets,
    walletConnectedChainIds,
  })
  const filtered = searchAssets(searchString, preFiltered)
  // Deduplicate by relatedAssetKey to group related assets (e.g., USDC on multiple chains)
  const deduplicated = deduplicateAssets(filtered, searchString)

  const result: AssetSearchWorkerOutboundMessage = {
    type: 'searchResult',
    requestId: msg.requestId,
    payload: { assetIds: deduplicated.map(a => a.assetId) },
  }
  postMessage(result)
}

// eslint-disable-next-line no-restricted-globals
self.onmessage = (event: MessageEvent<AssetSearchWorkerInboundMessage>) => {
  const data = event.data
  switch (data.type) {
    case 'updatePrimaryAssets': {
      primaryAssets = data.payload.assets
      primaryAssetIds = new Set(primaryAssets.map(a => a.assetId))
      primarySymbols = new Set(primaryAssets.map(a => a.symbol.toLowerCase()))
      break
    }
    case 'updateAssets': {
      allAssets = data.payload.assets
      break
    }
    case 'search': {
      try {
        handleSearch(data)
      } catch {
        postMessage({
          type: 'searchResult',
          requestId: data.requestId,
          payload: { assetIds: [] },
        })
      }
      break
    }
    default:
      break
  }
}

export {}
