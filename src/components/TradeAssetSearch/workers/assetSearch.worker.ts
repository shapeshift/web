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
import { filterAssetsByChainSupport, searchAssets } from '@/lib/assetSearch'
import { isContractAddress } from '@/lib/utils/isContractAddress'

let assets: SearchableAsset[] = []
let primaryAssets: SearchableAsset[] = []
let primaryAssetIds: Set<AssetId> = new Set()
let primarySymbols: Set<string> = new Set()

function shouldSearchAllAssets(searchString: string): boolean {
  const searchLower = searchString.toLowerCase()

  // Check if search term is a prefix of any primary symbol
  // e.g., "USD" → "USDC" (search is prefix of symbol) → use primaryAssets
  // NOTE: We intentionally don't check the reverse (symbol is prefix of search)
  // because short primary symbols like "V", "AX" would incorrectly match "VBUSDC", "AXLUSDC"
  const couldMatchPrimarySymbol = Array.from(primarySymbols).some(symbol =>
    symbol.startsWith(searchLower),
  )

  // If search could match a primary symbol, use primaryAssets (grouping will show related)
  if (couldMatchPrimarySymbol) return false

  // Check if search could match a non-primary asset with a unique symbol
  // e.g., "VBUSD" → "VBUSDC" (which is not in primarySymbols)
  return assets.some(asset => {
    if (primaryAssetIds.has(asset.assetId)) return false
    const symbolLower = asset.symbol.toLowerCase()
    if (primarySymbols.has(symbolLower)) return false
    return symbolLower.startsWith(searchLower)
  })
}

function handleSearch(msg: AssetSearchWorkerInboundMessage & { type: 'search' }): void {
  const {
    searchString,
    activeChainId,
    allowWalletUnsupportedAssets,
    walletConnectedChainIds = [],
  } = msg.payload

  const isContractAddressSearch = isContractAddress(searchString)

  const searchableAssets = (() => {
    if (isContractAddressSearch) return assets
    if (activeChainId !== 'All') return assets
    if (shouldSearchAllAssets(searchString)) return assets
    return primaryAssets
  })()

  const preFiltered = filterAssetsByChainSupport(searchableAssets, {
    activeChainId,
    allowWalletUnsupportedAssets,
    walletConnectedChainIds,
  })
  const filtered = searchAssets(searchString, preFiltered)

  const result: AssetSearchWorkerOutboundMessage = {
    type: 'searchResult',
    requestId: msg.requestId,
    payload: { assetIds: filtered.map(a => a.assetId) },
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
