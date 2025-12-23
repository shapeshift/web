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
import { isContractAddress } from '@/lib/utils/isContractAddress'

// Internal state
let ASSETS: SearchableAsset[] = []
let PRIMARY_ASSETS: SearchableAsset[] = []

const handleSearch = (msg: AssetSearchWorkerInboundMessage & { type: 'search' }): void => {
  const {
    searchString,
    activeChainId,
    allowWalletUnsupportedAssets,
    walletConnectedChainIds = [],
  } = msg.payload

  const isContractAddressSearch = isContractAddress(searchString)
  const assets = (() => {
    if (isContractAddressSearch) return ASSETS // Always use all assets for contract address searches
    if (activeChainId === 'All') return PRIMARY_ASSETS // Use primaries for name/symbol searches on "All"
    return ASSETS // Use all assets for chain-specific searches
  })()

  const preFiltered = filterAssetsByChainSupport(assets, {
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
    case 'updatePrimaryAssets': {
      PRIMARY_ASSETS = data.payload.assets
      break
    }
    case 'updateAssets': {
      ASSETS = data.payload.assets
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
