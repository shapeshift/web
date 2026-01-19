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
  deduplicateAssetsBySymbol,
  filterAssetsByChainSupport,
  searchAssets,
  shouldSearchAllAssets as shouldSearchAllAssetsUtil,
} from '@/lib/assetSearch'
import { isContractAddress } from '@/lib/utils/isContractAddress'

let assets: SearchableAsset[] = []
let primaryAssets: SearchableAsset[] = []
let primaryAssetIds: Set<AssetId> = new Set()
let primarySymbols: Set<string> = new Set()

function handleSearch(msg: AssetSearchWorkerInboundMessage & { type: 'search' }): void {
  const {
    searchString,
    activeChainId,
    allowWalletUnsupportedAssets,
    walletConnectedChainIds = [],
  } = msg.payload

  const isContractAddressSearch = isContractAddress(searchString)

  const useAllAssets =
    isContractAddressSearch ||
    activeChainId !== 'All' ||
    shouldSearchAllAssetsUtil(searchString, assets, primaryAssetIds, primarySymbols)

  const searchableAssets = useAllAssets ? assets : primaryAssets

  const preFiltered = filterAssetsByChainSupport(searchableAssets, {
    activeChainId,
    allowWalletUnsupportedAssets,
    walletConnectedChainIds,
  })
  const filtered = searchAssets(searchString, preFiltered)
  const deduplicated = deduplicateAssetsBySymbol(filtered)

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
      assets = data.payload.assets
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
