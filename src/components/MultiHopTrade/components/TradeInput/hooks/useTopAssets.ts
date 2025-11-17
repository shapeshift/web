import type { ChainId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { useMemo } from 'react'

import type { OrderDirection } from '@/components/OrderDropdown/types'
import type { SortOptionsKeys } from '@/components/SortDropdown/types'
import { isSome } from '@/lib/utils'
import { MarketsCategories } from '@/pages/Markets/constants'
import { CATEGORY_TO_QUERY_HOOK } from '@/pages/Markets/hooks/useCoingeckoData'
import { usePortalsAssetsQuery } from '@/pages/Markets/hooks/usePortalsAssetsQuery'
import { useRows } from '@/pages/Markets/hooks/useRows'
import { selectAssets } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

const TOP_ASSETS_LIMIT = 20

type UseTopAssetsParams = {
  selectedCategory: MarketsCategories
  selectedOrder: OrderDirection
  selectedSort: SortOptionsKeys
  selectedChainId: ChainId | 'all'
}

type UseTopAssetsReturn = {
  assets: Asset[]
  isLoading: boolean
}

export const useTopAssets = ({
  selectedCategory,
  selectedOrder,
  selectedSort,
  selectedChainId,
}: UseTopAssetsParams): UseTopAssetsReturn => {
  const assetsById = useAppSelector(selectAssets)
  const rows = useRows({ limit: TOP_ASSETS_LIMIT })

  const categoryHook = useMemo(
    () =>
      selectedCategory === MarketsCategories.OneClickDefi
        ? CATEGORY_TO_QUERY_HOOK[MarketsCategories.Trending]
        : CATEGORY_TO_QUERY_HOOK[selectedCategory],
    [selectedCategory],
  )

  const { data: categoryQueryData, isLoading: isCategoryQueryDataLoading } = categoryHook({
    enabled: selectedCategory !== MarketsCategories.OneClickDefi,
    orderBy: selectedOrder,
    sortBy: selectedSort,
  })

  const { data: portalsAssets, isLoading: isPortalsAssetsLoading } = usePortalsAssetsQuery({
    chainIds:
      selectedChainId === 'all'
        ? rows[selectedCategory].supportedChainIds ?? []
        : [selectedChainId],
    enabled: selectedCategory === MarketsCategories.OneClickDefi,
    sortBy: selectedSort,
    orderBy: selectedOrder,
    minApy: '1',
  })

  const isLoading = useMemo(() => {
    return selectedCategory === MarketsCategories.OneClickDefi
      ? isPortalsAssetsLoading
      : isCategoryQueryDataLoading
  }, [selectedCategory, isPortalsAssetsLoading, isCategoryQueryDataLoading])

  const oneClickDefiAssets = useMemo(() => {
    if (selectedCategory !== MarketsCategories.OneClickDefi || !portalsAssets) return []

    return portalsAssets.ids
      .slice(0, TOP_ASSETS_LIMIT)
      .map(id => assetsById[id])
      .filter(isSome)
  }, [selectedCategory, portalsAssets, assetsById])

  const categoryAssets = useMemo(() => {
    if (selectedCategory === MarketsCategories.OneClickDefi || !categoryQueryData) return []

    if (selectedChainId === 'all') {
      return categoryQueryData.ids
        .slice(0, TOP_ASSETS_LIMIT)
        .map(id => assetsById[id])
        .filter(isSome)
    }

    return categoryQueryData.ids
      .filter(assetId => fromAssetId(assetId).chainId === selectedChainId)
      .slice(0, TOP_ASSETS_LIMIT)
      .map(id => assetsById[id])
      .filter(isSome)
  }, [selectedCategory, categoryQueryData, selectedChainId, assetsById])

  const assets = useMemo(() => {
    if (isLoading) return []

    return selectedCategory === MarketsCategories.OneClickDefi ? oneClickDefiAssets : categoryAssets
  }, [isLoading, oneClickDefiAssets, categoryAssets, selectedCategory])

  return {
    assets,
    isLoading,
  }
}
