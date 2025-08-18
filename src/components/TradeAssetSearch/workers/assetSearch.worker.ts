/*
  Web worker for asset search.
  Receives an initial dataset of minimal assets, caches it,
  and responds to search requests with filtered assetIds.
*/
import type {
  AssetSearchWorkerInboundMessage,
  AssetSearchWorkerOutboundMessage,
  SearchableAsset,
} from '@/lib/assetSearch'
import { filterAssetsByChainSupport, searchAssets } from '@/lib/assetSearch'

// Internal state
let ASSETS: SearchableAsset[] = []

const handleSearch = (msg: AssetSearchWorkerInboundMessage & { type: 'search' }): void => {
  const { searchString, activeChainId, allowWalletUnsupportedAssets, walletConnectedChainIds } =
    msg.payload

  const preFiltered = filterAssetsByChainSupport(ASSETS, {
    activeChainId,
    allowWalletUnsupportedAssets,
    walletConnectedChainIds,
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
    case 'init': {
      ASSETS = data.payload.assets
      break
    }
    case 'updateAssets': {
      ASSETS = data.payload.assets
      break
    }
    case 'search': {
      handleSearch(data)
      break
    }
    default:
      break
  }
}

export {}
