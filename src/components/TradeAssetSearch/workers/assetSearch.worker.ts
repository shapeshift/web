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
import { deduplicateAssets, filterAssetsByChainSupport, searchAssets } from '@/lib/assetSearch'

// Internal state
let allAssets: SearchableAsset[] = []
let allAssetsById: Map<AssetId, SearchableAsset> = new Map()

const handleSearch = (msg: AssetSearchWorkerInboundMessage & { type: 'search' }): void => {
  const {
    searchString,
    activeChainId,
    allowWalletUnsupportedAssets,
    walletConnectedChainIds = [],
  } = msg.payload

  // Every version is searched, so "gram" finds TON's GRAM versions even though another asset's symbol is GRAM
  const preFiltered = filterAssetsByChainSupport(allAssets, {
    activeChainId,
    allowWalletUnsupportedAssets,
    walletConnectedChainIds,
  })
  const filtered = searchAssets(searchString, preFiltered, assetId => allAssetsById.get(assetId))
  // All groups related assets under one row (e.g. USDC on multiple chains), a network tab lists each version
  const deduplicated =
    activeChainId === 'All' ? deduplicateAssets(filtered, searchString) : filtered

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
    case 'updateAssets': {
      allAssets = data.payload.assets
      allAssetsById = new Map(allAssets.map(asset => [asset.assetId, asset]))
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
