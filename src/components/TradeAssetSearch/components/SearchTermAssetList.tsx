import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { isNft, solanaChainId, toAssetId } from '@shapeshiftoss/caip'
import type { Asset, KnownChainIds } from '@shapeshiftoss/types'
import type { MinimalAsset } from '@shapeshiftoss/utils'
import { bnOrZero, getAssetNamespaceFromChainId, makeAsset } from '@shapeshiftoss/utils'
import { orderBy } from 'lodash'
import { useMemo } from 'react'

import { filterAssetsBySearchTerm } from '../helpers/filterAssetsBySearchTerm/filterAssetsBySearchTerm'
import { useGetCustomTokensQuery } from '../hooks/useGetCustomTokensQuery'
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

  const customAssets: Asset[] = useMemo(
    () =>
      (customTokens ?? [])
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
          const minimalAsset: MinimalAsset = {
            assetId,
            name,
            symbol,
            precision: decimals,
            icon: logo ?? undefined,
          }
          return makeAsset(assetsById, minimalAsset)
        })
        .filter(isSome),
    [assetsById, customTokens],
  )

  // We only want to show custom assets that aren't already in the asset list
  const searchTermAssets = useMemo(() => {
    const filteredAssets = filterAssetsBySearchTerm(searchString, assetsForChain)
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
  }, [assetsForChain, customAssets, searchString, portfolioUserCurrencyBalances])

  const { groups, groupCounts, groupIsLoading } = useMemo(() => {
    return {
      groups: ['modals.assetSearch.searchResults'],
      groupCounts: [searchTermAssets.length],
      groupIsLoading: [isLoadingCustomTokens || isAssetListLoading],
    }
  }, [isAssetListLoading, isLoadingCustomTokens, searchTermAssets.length])

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
