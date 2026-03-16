import { Box, useMediaQuery } from '@chakra-ui/react'
import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { fromAssetId, isNft } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { bnOrZero, makeAsset } from '@shapeshiftoss/utils'
import { orderBy } from 'lodash'
import { useMemo } from 'react'

import type { WorkerSearchState } from '../hooks/useAssetSearchWorker'
import { useGetCustomTokensQuery } from '../hooks/useGetCustomTokensQuery'

import { AssetList } from '@/components/AssetSearch/components/AssetList'
import { Text } from '@/components/Text'
import { searchAssets } from '@/lib/assetSearch'
import { CUSTOM_TOKEN_IMPORT_SUPPORTED_CHAIN_IDS } from '@/lib/customTokenImportSupportedChainIds'
import { isSome } from '@/lib/utils'
import { isContractAddress } from '@/lib/utils/isContractAddress'
import {
  selectAssetsSortedByMarketCapUserCurrencyBalanceCryptoPrecisionAndName,
  selectPortfolioUserCurrencyBalances,
  selectRelatedAssetIdsByAssetIdInclusive,
  selectWalletConnectedChainIds,
} from '@/state/slices/common-selectors'
import { selectAssets } from '@/state/slices/selectors'
import { store, useAppSelector } from '@/state/store'
import { breakpoints } from '@/theme/theme'

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
  const [isLargerThanMd] = useMediaQuery(`(min-width: ${breakpoints['md']})`)
  const assets = useAppSelector(
    selectAssetsSortedByMarketCapUserCurrencyBalanceCryptoPrecisionAndName,
  )
  const relatedAssetIdsById = useAppSelector(selectRelatedAssetIdsByAssetIdInclusive)
  const portfolioUserCurrencyBalances = useAppSelector(selectPortfolioUserCurrencyBalances)
  const walletConnectedChainIds = useAppSelector(selectWalletConnectedChainIds)

  const chainIds = useMemo(() => {
    if (activeChainId === 'All') {
      return CUSTOM_TOKEN_IMPORT_SUPPORTED_CHAIN_IDS
    } else if (CUSTOM_TOKEN_IMPORT_SUPPORTED_CHAIN_IDS.includes(activeChainId)) {
      return [activeChainId]
    } else {
      return []
    }
  }, [activeChainId])

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

    return _assets.filter(
      asset =>
        (asset.chainId === activeChainId && !isNft(asset.assetId)) ||
        relatedAssetIdsById[asset.assetId]?.some(
          relatedAssetId => fromAssetId(relatedAssetId).chainId === activeChainId,
        ),
    )
  }, [
    activeChainId,
    allowWalletUnsupportedAssets,
    assets,
    walletConnectedChainIds,
    assetFilterPredicate,
    relatedAssetIdsById,
  ])

  // Build a Set of existing asset IDs once when assetsForChain changes
  const assetIdMap = useMemo(() => {
    const assetLookup: Record<AssetId, Asset> = {}
    for (const asset of assetsForChain) {
      assetLookup[asset.assetId] = asset
    }
    return assetLookup
  }, [assetsForChain])

  const customAssets: Asset[] = useMemo(() => {
    if (!customTokens?.length) return []

    // Do not move me to a regular useSelector(), as this is reactive on the *whole* assets set and would make this component extremely reactive for no reason
    const assetsById = selectAssets(store.getState())

    return customTokens
      .filter(token => !assetsById[token.assetId])
      .map(token => makeAsset(assetsById, token))
  }, [customTokens])

  const searchTermAssets = useMemo(() => {
    const filteredAssets: Asset[] = (() => {
      // Main thread search due to dead worker
      if (workerSearchState.workerState === 'failed') {
        return searchAssets(searchString, assetsForChain)
      }

      // Use the results from the worker
      if (workerSearchState.workerState === 'ready' && workerSearchState.searchResults) {
        return workerSearchState.searchResults.map(assetId => assetIdMap[assetId]).filter(isSome)
      }

      return []
    })()

    const existingAssetIds = new Set(filteredAssets.map(asset => asset.assetId))
    const uniqueCustomAssets = customAssets.filter(asset => !existingAssetIds.has(asset.assetId))
    const assetsWithCustomAssets = filteredAssets.concat(uniqueCustomAssets)
    const getAssetBalance = (asset: Asset) => {
      if (asset.isChainSpecific || !asset.isPrimary)
        return bnOrZero(portfolioUserCurrencyBalances[asset.assetId]).toNumber()

      const primaryAssetTotalBalance = relatedAssetIdsById[asset.assetId]?.reduce(
        (acc, relatedAssetId) => {
          return acc.plus(bnOrZero(portfolioUserCurrencyBalances[relatedAssetId]))
        },
        bnOrZero(0),
      )

      return primaryAssetTotalBalance.toNumber()
    }

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
    assetIdMap,
    portfolioUserCurrencyBalances,
    relatedAssetIdsById,
  ])

  return (
    <>
      <Text
        color='text.subtle'
        fontWeight='medium'
        pt={4}
        px={6}
        translation={'modals.assetSearch.searchResults'}
      />
      <Box px={2}>
        <AssetList
          assets={searchTermAssets}
          handleClick={handleAssetClick}
          hideZeroBalanceAmounts={true}
          onImportClick={onImportClick}
          showRelatedAssets={activeChainId === 'All' && !isContractAddress(searchString)}
          isLoading={isLoadingCustomTokens || isAssetListLoading || workerSearchState.isSearching}
          height={isLargerThanMd ? '50vh' : '70vh'}
        />
      </Box>
    </>
  )
}
