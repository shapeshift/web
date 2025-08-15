import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { isNft, solanaChainId, toAssetId } from '@shapeshiftoss/caip'
import type { Asset, KnownChainIds } from '@shapeshiftoss/types'
import type { MinimalAsset } from '@shapeshiftoss/utils'
import { bnOrZero, getAssetNamespaceFromChainId, makeAsset } from '@shapeshiftoss/utils'
import { orderBy } from 'lodash'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { filterAssetsBySearchTerm } from '../helpers/filterAssetsBySearchTerm/filterAssetsBySearchTerm'
import { useGetCustomTokensQuery } from '../hooks/useGetCustomTokensQuery'
// Vite worker import. If this fails in your setup, adjust the import accordingly.
// eslint-disable-next-line import/no-unresolved
import AssetSearchWorker from '../workers/assetSearch.worker?worker'
import { GroupedAssetList } from './GroupedAssetList/GroupedAssetList'

import { ALCHEMY_SDK_SUPPORTED_CHAIN_IDS } from '@/lib/alchemySdkInstance'
import { isSome } from '@/lib/utils'
import {
  selectAssetsSortedByMarketCapUserCurrencyBalanceCryptoPrecisionAndName,
  selectPortfolioUserCurrencyBalances,
  selectWalletConnectedChainIds,
} from '@/state/slices/common-selectors'
import { selectAssets } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

export type SearchTermAssetListProps = {
  isLoading: boolean
  activeChainId: ChainId | 'All'
  searchString: string
  allowWalletUnsupportedAssets: boolean | undefined
  assetFilterPredicate?: (assetId: AssetId) => boolean
  onAssetClick: (asset: Asset) => void
  onImportClick: (asset: Asset) => void
}

export const SearchTermAssetList = ({
  isLoading: isAssetListLoading,
  activeChainId,
  searchString,
  allowWalletUnsupportedAssets,
  assetFilterPredicate,
  onAssetClick: handleAssetClick,
  onImportClick,
}: SearchTermAssetListProps) => {
  const [workerResults, setWorkerResults] = useState<AssetId[] | null>(null)
  const [isWorkerActive, setIsWorkerActive] = useState(false)
  const requestIdRef = useRef(0)
  const workerRef = useRef<Worker | null>(null)

  const assets = useAppSelector(
    selectAssetsSortedByMarketCapUserCurrencyBalanceCryptoPrecisionAndName,
  )
  const portfolioUserCurrencyBalances = useAppSelector(selectPortfolioUserCurrencyBalances)
  const assetsById = useAppSelector(selectAssets)
  const walletConnectedChainIds = useAppSelector(selectWalletConnectedChainIds)

  // Cache the asset balance lookup function
  const getAssetBalance = useCallback(
    (asset: Asset) => bnOrZero(portfolioUserCurrencyBalances[asset.assetId]).toNumber(),
    [portfolioUserCurrencyBalances],
  )

  const customTokenSupportedChainIds = useMemo(() => {
    // Solana _is_ supported by Alchemy, but not by the SDK
    return [...ALCHEMY_SDK_SUPPORTED_CHAIN_IDS, solanaChainId]
  }, [])

  const chainIds = useMemo(() => {
    if (activeChainId === 'All') {
      return customTokenSupportedChainIds
    } else if (customTokenSupportedChainIds.includes(activeChainId)) {
      return [activeChainId]
    } else {
      return []
    }
  }, [activeChainId, customTokenSupportedChainIds])

  // Use debounced search string for custom token queries
  const { data: customTokens, isLoading: isLoadingCustomTokens } = useGetCustomTokensQuery({
    contractAddress: searchString,
    chainIds,
  })

  // Pre-filter assets for the current chain (this changes less frequently than search)
  const assetsForChain = useMemo(() => {
    console.time('search:assetsForChain')
    try {
      const _assets = assets.filter(asset => assetFilterPredicate?.(asset.assetId) ?? true)
      let result: Asset[]
      if (activeChainId === 'All') {
        result = allowWalletUnsupportedAssets
          ? _assets
          : _assets.filter(
              asset => walletConnectedChainIds.includes(asset.chainId) && !isNft(asset.assetId),
            )
      } else if (
        !allowWalletUnsupportedAssets &&
        !walletConnectedChainIds.includes(activeChainId)
      ) {
        // Should never happen, but paranoia.
        result = []
      } else {
        result = _assets.filter(asset => asset.chainId === activeChainId && !isNft(asset.assetId))
      }
      return result
    } finally {
      console.timeEnd('search:assetsForChain')
    }
  }, [
    activeChainId,
    allowWalletUnsupportedAssets,
    assets,
    walletConnectedChainIds,
    assetFilterPredicate,
  ])

  // Build a Set of existing asset IDs once when assetsForChain changes
  const existingAssetIds = useMemo(() => {
    console.time('search:existingAssetIds')
    try {
      return new Set(assetsForChain.map(asset => asset.assetId))
    } finally {
      console.timeEnd('search:existingAssetIds')
    }
  }, [assetsForChain])

  const customAssets: Asset[] = useMemo(() => {
    console.time('search:customAssets')
    try {
      return (customTokens ?? [])
        .map(metaData => {
          if (!metaData) return null
          const { name, symbol, decimals, logo } = metaData
          // If we can't get all the information we need to create an Asset, don't allow the custom token
          if (!name || !symbol || !decimals) return null
          const assetId = toAssetId({
            chainId: metaData.chainId,
            assetNamespace: getAssetNamespaceFromChainId(metaData.chainId as KnownChainIds),
            assetReference: metaData.contractAddress,
          })

          // Skip if we already have this asset
          if (existingAssetIds.has(assetId)) return null

          const minimalAsset: MinimalAsset = {
            assetId,
            name,
            symbol,
            precision: decimals,
            icon: logo ?? undefined,
          }
          return makeAsset(assetsById, minimalAsset)
        })
        .filter(isSome)
    } finally {
      console.timeEnd('search:customAssets')
    }
  }, [assetsById, customTokens, existingAssetIds])

  const searchTermAssets = useMemo(() => {
    console.time('search:searchTermAssets')
    try {
      // If worker is active, avoid running expensive filtering on the main thread.
      if (isWorkerActive) {
        if (!searchString && assetsForChain.length > 1000) {
          // For large lists with no search, return top assets by balance (cheap-ish once)
          return [...assetsForChain]
            .sort((a, b) => getAssetBalance(b) - getAssetBalance(a))
            .slice(0, 100)
        }
        // Otherwise, defer to worker results; return unsorted, unfiltered list as placeholder
        return assetsForChain
      }

      let result: Asset[]
      if (!searchString && assetsForChain.length > 1000) {
        // For large lists with no search, return top assets by balance
        result = [...assetsForChain]
          .sort((a, b) => getAssetBalance(b) - getAssetBalance(a))
          .slice(0, 100) // Limit initial display
        return result
      }

      console.time('search:filterAssetsBySearchTerm')
      const filteredAssets = filterAssetsBySearchTerm(searchString, assetsForChain)
      console.timeEnd('search:filterAssetsBySearchTerm')

      // Combine with custom assets (already filtered for uniqueness)
      const assetsWithCustomAssets = filteredAssets.concat(customAssets)

      // Only sort if we have a reasonable number of results
      if (assetsWithCustomAssets.length > 500) {
        console.time('search:sortTopK200')
        result = assetsWithCustomAssets
          .sort((a, b) => getAssetBalance(b) - getAssetBalance(a))
          .slice(0, 200)
        console.timeEnd('search:sortTopK200')
      } else {
        console.time('search:orderBy')
        result = orderBy(assetsWithCustomAssets, [getAssetBalance], ['desc'])
        console.timeEnd('search:orderBy')
      }
      return result
    } finally {
      console.timeEnd('search:searchTermAssets')
    }
  }, [isWorkerActive, searchString, assetsForChain, customAssets, getAssetBalance])

  // Initialize and cache worker with compact dataset
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (workerRef.current) return
    try {
      const worker = new AssetSearchWorker()
      workerRef.current = worker
      setIsWorkerActive(true)
      const minimalAssets = assets.map(a => ({
        assetId: a.assetId,
        name: a.name,
        symbol: a.symbol,
        chainId: a.chainId,
      }))
      const balancesByAssetId = Object.fromEntries(
        Object.entries(portfolioUserCurrencyBalances).map(([id, v]) => [
          id,
          bnOrZero(v).toNumber(),
        ]),
      ) as Record<AssetId, number>

      worker.postMessage({
        type: 'init',
        payload: {
          assets: minimalAssets,
          balancesByAssetId,
        },
      })

      worker.onmessage = (
        event: MessageEvent<{ type: string; requestId?: number; payload: { assetIds: AssetId[] } }>,
      ) => {
        const { type, requestId, payload } = event.data
        if (type !== 'searchResult') return
        if (requestId !== requestIdRef.current) return
        setWorkerResults(payload.assetIds)
      }
    } catch {
      // If worker fails to initialize, silently fallback to main-thread search
      workerRef.current = null
      setIsWorkerActive(false)
    }
  }, [assets, portfolioUserCurrencyBalances])

  // Keep balances up to date in the worker
  useEffect(() => {
    const worker = workerRef.current
    if (!worker) return
    const balancesByAssetId = Object.fromEntries(
      Object.entries(portfolioUserCurrencyBalances).map(([id, v]) => [id, bnOrZero(v).toNumber()]),
    ) as Record<AssetId, number>
    worker.postMessage({ type: 'updateBalances', payload: { balancesByAssetId } })
  }, [portfolioUserCurrencyBalances])

  // Send search requests to worker (debounced by render/memoization naturally)
  useEffect(() => {
    const worker = workerRef.current
    if (!worker) {
      setWorkerResults(null)
      return
    }
    const nextRequestId = requestIdRef.current + 1
    requestIdRef.current = nextRequestId
    worker.postMessage({
      type: 'search',
      requestId: nextRequestId,
      payload: {
        searchString,
        activeChainId,
        allowWalletUnsupportedAssets,
        walletConnectedChainIds,
      },
    })
  }, [searchString, activeChainId, allowWalletUnsupportedAssets, walletConnectedChainIds])

  const { groups, groupCounts, groupIsLoading } = useMemo(() => {
    return {
      groups: ['modals.assetSearch.searchResults'],
      groupCounts: [searchTermAssets.length],
      groupIsLoading: [isLoadingCustomTokens || isAssetListLoading],
    }
  }, [isAssetListLoading, isLoadingCustomTokens, searchTermAssets.length])

  const assetsToRender = useMemo(() => {
    console.time('search:assetsToRender')
    try {
      if (!workerResults) return searchTermAssets
      const resultSet = new Set(workerResults)
      // Map worker ids to full Asset objects and append customAssets
      const mapped = assetsForChain.filter(a => resultSet.has(a.assetId)).concat(customAssets)
      // Keep a reasonable ordering similar to main-thread path
      const ordered =
        mapped.length > 500
          ? [...mapped].sort((a, b) => getAssetBalance(b) - getAssetBalance(a)).slice(0, 200)
          : orderBy(mapped, [getAssetBalance], ['desc'])
      return ordered
    } finally {
      console.timeEnd('search:assetsToRender')
    }
  }, [workerResults, searchTermAssets, assetsForChain, customAssets, getAssetBalance])

  return (
    <GroupedAssetList
      assets={assetsToRender}
      groups={groups}
      groupCounts={groupCounts}
      hideZeroBalanceAmounts={true}
      groupIsLoading={groupIsLoading}
      onAssetClick={handleAssetClick}
      onImportClick={onImportClick}
    />
  )
}
