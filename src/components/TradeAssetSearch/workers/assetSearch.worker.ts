/*
  Web worker for asset search.
  Receives an initial dataset of minimal assets, caches it,
  and responds to search requests with filtered assetIds.
*/
import type { AssetId } from '@shapeshiftoss/caip/dist/cjs'

import type {
  AssetSearchWorkerInboundMessage,
  AssetSearchWorkerOutboundMessage,
  SearchableAsset,
} from '@/lib/assetSearch'
import { filterAssetsByChainSupport, searchAssets } from '@/lib/assetSearch'

// Internal state
let ASSETS: SearchableAsset[] = []
let RELATED_ASSET_IDS_BY_ASSET_ID: Record<AssetId, AssetId[]> = {}

const handleSearch = (msg: AssetSearchWorkerInboundMessage & { type: 'search' }): void => {
  const {
    searchString,
    activeChainId,
    allowWalletUnsupportedAssets,
    walletConnectedChainIds = [],
  } = msg.payload

  const preFiltered = filterAssetsByChainSupport(ASSETS, {
    activeChainId,
    allowWalletUnsupportedAssets,
    walletConnectedChainIds,
    relatedAssetIdsById: RELATED_ASSET_IDS_BY_ASSET_ID,
  })
  const filtered = searchAssets(searchString, preFiltered)

  const assetIds = filtered.map(a => a.assetId)
  const result: AssetSearchWorkerOutboundMessage = {
    type: 'searchResult',
    requestId: msg.requestId,
    payload: { assetIds },
  }
  postMessage(result)
}

// eslint-disable-next-line no-restricted-globals
self.onmessage = (event: MessageEvent<AssetSearchWorkerInboundMessage>) => {
  const data = event.data
  switch (data.type) {
    case 'updateAssets': {
      ASSETS = data.payload.assets
      break
    }
    case 'updateRelatedAssetIds': {
      RELATED_ASSET_IDS_BY_ASSET_ID = data.payload.relatedAssetIdsById
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

export { }
