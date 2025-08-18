import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { isNft, solanaChainId, toAssetId } from '@shapeshiftoss/caip'
import type { Asset, KnownChainIds } from '@shapeshiftoss/types'
import type { MinimalAsset } from '@shapeshiftoss/utils'
import { bnOrZero, getAssetNamespaceFromChainId, makeAsset } from '@shapeshiftoss/utils'
import { orderBy } from 'lodash'
import { useMemo } from 'react'

import type { WorkerSearchState } from '../hooks/useAssetSearchWorker'
import { useGetCustomTokensQuery } from '../hooks/useGetCustomTokensQuery'
import { GroupedAssetList } from './GroupedAssetList/GroupedAssetList'

import { ALCHEMY_SDK_SUPPORTED_CHAIN_IDS } from '@/lib/alchemySdkInstance'
import { searchAssets } from '@/lib/assetSearch'
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
  workerSearchState: WorkerSearchState
}

export const SearchTermAssetList = ({
  isLoading: isAssetListLoading,
  activeChainId,
  searchString,
  allowWalletUnsupportedAssets,
  assetFilterPredicate,
  onAssetClick: handleAssetClick,
  onImportClick,
  workerSearchState,
}: SearchTermAssetListProps) => {
  const assets = useAppSelector(
    selectAssetsSortedByMarketCapUserCurrencyBalanceCryptoPrecisionAndName,
  )
  const portfolioUserCurrencyBalances = useAppSelector(selectPortfolioUserCurrencyBalances)
  const assetsById = useAppSelector(selectAssets)
  const walletConnectedChainIds = useAppSelector(selectWalletConnectedChainIds)

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

  const { data: customTokens, isLoading: isLoadingCustomTokens } = useGetCustomTokensQuery({
    contractAddress: searchString,
    chainIds,
  })

  const assetsForChain = useMemo(() => {
    const _assets = assets.filter(asset => assetFilterPredicate?.(asset.assetId) ?? true)
    if (activeChainId === 'All') {
      if (allowWalletUnsupportedAssets) return _assets
      return _assets.filter(
        asset => walletConnectedChainIds.includes(asset.chainId) && !isNft(asset.assetId),
      )
    }

    // Should never happen, but paranoia.
    if (!allowWalletUnsupportedAssets && !walletConnectedChainIds.includes(activeChainId)) return []

    return _assets.filter(asset => asset.chainId === activeChainId && !isNft(asset.assetId))
  }, [
    activeChainId,
    allowWalletUnsupportedAssets,
    assets,
    walletConnectedChainIds,
    assetFilterPredicate,
  ])

  // Build a Set of existing asset IDs once when assetsForChain changes
  const existingAssetIds = useMemo(() => {
    return new Set(assetsForChain.map(asset => asset.assetId))
  }, [assetsForChain])

  const customAssets: Asset[] = useMemo(() => {
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
  }, [assetsById, customTokens, existingAssetIds])

  const searchTermAssets = useMemo(() => {
    const filteredAssets: Asset[] = (() => {
      // Main thread search due to dead worker
      if (workerSearchState.workerState === 'failed') {
        return searchAssets(searchString, assetsForChain)
      }

      // Use the results from the worker
      if (workerSearchState.workerState === 'ready' && workerSearchState.searchResults) {
        const resultSet = new Set(workerSearchState.searchResults)
        return assetsForChain.filter(a => resultSet.has(a.assetId))
      }

      return []
    })()

    const existingAssetIds = new Set(filteredAssets.map(asset => asset.assetId))
    const uniqueCustomAssets = customAssets.filter(asset => !existingAssetIds.has(asset.assetId))
    const assetsWithCustomAssets = filteredAssets.concat(uniqueCustomAssets)
    const getAssetBalance = (asset: Asset) =>
      bnOrZero(portfolioUserCurrencyBalances[asset.assetId]).toNumber()

    return orderBy(
      Object.values(assetsWithCustomAssets).filter(isSome),
      [getAssetBalance],
      ['desc'],
    )
  }, [
    customAssets,
    workerSearchState.workerState,
    workerSearchState.searchResults,
    searchString,
    assetsForChain,
    portfolioUserCurrencyBalances,
  ])

  const groups = useMemo(() => ['modals.assetSearch.searchResults'], [])
  const groupCounts = useMemo(() => [searchTermAssets.length], [searchTermAssets.length])
  const groupIsLoading = useMemo(
    () => [isLoadingCustomTokens || isAssetListLoading || workerSearchState.isSearching],
    [isLoadingCustomTokens, isAssetListLoading, workerSearchState.isSearching],
  )

  return (
    <GroupedAssetList
      assets={searchTermAssets}
      groups={groups}
      groupCounts={groupCounts}
      hideZeroBalanceAmounts={true}
      groupIsLoading={groupIsLoading}
      onAssetClick={handleAssetClick}
      onImportClick={onImportClick}
    />
  )
}
