/*
  Web worker for asset search and sorting.
  Receives an initial dataset of minimal assets and balances, caches it,
  and responds to search requests with filtered and sorted assetIds.
*/
import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import { matchSorter } from 'match-sorter'

// NOTE: This import path assumes the worker is bundled with Vite and has access to aliases.
// If not, consider inlining a tiny isEthAddress util here.
import { isEthAddress } from '@/lib/address/utils'

// Message types
interface InitMessage {
  type: 'init'
  payload: {
    assets: SearchableAsset[]
    balancesByAssetId: Record<AssetId, number>
  }
}

interface UpdateBalancesMessage {
  type: 'updateBalances'
  payload: {
    balancesByAssetId: Record<AssetId, number>
  }
}

interface SearchMessage {
  type: 'search'
  requestId: number
  payload: {
    searchString: string
    activeChainId: ChainId | 'All'
    allowWalletUnsupportedAssets: boolean | undefined
    walletConnectedChainIds: ChainId[]
  }
}

type InboundMessage = InitMessage | UpdateBalancesMessage | SearchMessage

interface SearchResultMessage {
  type: 'searchResult'
  requestId: number
  payload: {
    assetIds: AssetId[]
  }
}

// Minimal asset shape the worker needs
interface SearchableAsset {
  assetId: AssetId
  name: string
  symbol: string
  chainId: ChainId
}

// Internal state
let ASSETS: SearchableAsset[] = []
let BALANCES_BY_ID: Record<AssetId, number> = {}

const isNftAsset = (assetId: AssetId): boolean => {
  // Quick NFT heuristic based on CAIP namespaces
  const { assetNamespace } = fromAssetId(assetId)
  const ns = String(assetNamespace)
  return ns === 'nft' || ns === 'erc721' || ns === 'erc1155'
}

const filterBySearch = (search: string, assets: SearchableAsset[]): SearchableAsset[] => {
  if (!search) return assets
  const searchLower = search.toLowerCase()
  if (isEthAddress(search)) {
    return assets.filter(a => fromAssetId(a.assetId).assetReference.toLowerCase() === searchLower)
  }
  console.time('worker:filterBySearch')
  const result = matchSorter(assets, search, {
    keys: ['name', 'symbol'],
    threshold: matchSorter.rankings.CONTAINS,
  })
  console.timeEnd('worker:filterBySearch')
  return result
}

const sortByBalanceDesc = (assets: SearchableAsset[]): SearchableAsset[] => {
  console.time('worker:sortByBalanceDesc')
  const out = assets
    .slice()
    .sort((a, b) => (BALANCES_BY_ID[b.assetId] || 0) - (BALANCES_BY_ID[a.assetId] || 0))
  console.timeEnd('worker:sortByBalanceDesc')
  return out
}

const handleSearch = (msg: SearchMessage): void => {
  const { searchString, activeChainId, allowWalletUnsupportedAssets, walletConnectedChainIds } =
    msg.payload

  console.time('worker:handleSearch')
  console.time('worker:preFilter')
  const preFiltered = ASSETS.filter(asset => {
    if (activeChainId === 'All') {
      if (allowWalletUnsupportedAssets) return !isNftAsset(asset.assetId)
      return walletConnectedChainIds.includes(asset.chainId) && !isNftAsset(asset.assetId)
    }
    if (!allowWalletUnsupportedAssets && !walletConnectedChainIds.includes(activeChainId)) return false
    return asset.chainId === activeChainId && !isNftAsset(asset.assetId)
  })
  console.timeEnd('worker:preFilter')

  if (!searchString && preFiltered.length > 1000) {
    const top = sortByBalanceDesc(preFiltered).slice(0, 100)
    const assetIds = top.map(a => a.assetId)
    const result: SearchResultMessage = { type: 'searchResult', requestId: msg.requestId, payload: { assetIds } }
    console.time('worker:postMessage')
    postMessage(result)
    console.timeEnd('worker:postMessage')
    console.timeEnd('worker:handleSearch')
    return
  }

  const filtered = filterBySearch(searchString, preFiltered)
  const capped = filtered.length > 500 ? sortByBalanceDesc(filtered).slice(0, 200) : filtered
  const assetIds = capped.map(a => a.assetId)
  const result: SearchResultMessage = { type: 'searchResult', requestId: msg.requestId, payload: { assetIds } }
  console.time('worker:postMessage')
  postMessage(result)
  console.timeEnd('worker:postMessage')
  console.timeEnd('worker:handleSearch')
}

self.onmessage = (event: MessageEvent<InboundMessage>) => {
  const data = event.data
  switch (data.type) {
    case 'init': {
      console.time('worker:init')
      ASSETS = data.payload.assets
      BALANCES_BY_ID = data.payload.balancesByAssetId
      console.timeEnd('worker:init')
      break
    }
    case 'updateBalances': {
      console.time('worker:updateBalances')
      BALANCES_BY_ID = data.payload.balancesByAssetId
      console.timeEnd('worker:updateBalances')
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
