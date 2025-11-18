import type { ChainId } from '@shapeshiftoss/caip'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { OrderDirection } from '@/components/OrderDropdown/types'
import { SortOptionsKeys } from '@/components/SortDropdown/types'
import { MarketsCategories, sortOptionsByCategory } from '@/pages/Markets/constants'
import { preferences } from '@/state/slices/preferencesSlice/preferencesSlice'
import { useAppDispatch, useAppSelector } from '@/state/store'

type UseTopAssetsFiltersReturn = {
  selectedCategory: MarketsCategories
  selectedOrder: OrderDirection
  selectedSort: SortOptionsKeys
  selectedChainId: ChainId | 'all'
  categoryLabel: string
  orderLabel: string
  sortOptions: SortOptionsKeys[] | undefined
  handleCategoryChange: (category: MarketsCategories) => () => void
  handleSortChange: (sort: SortOptionsKeys) => void
  handleOrderChange: (order: OrderDirection) => void
  handleSortOptionClick: (sortOption: SortOptionsKeys) => () => void
}

export const useTopAssetsFilters = (): UseTopAssetsFiltersReturn => {
  const translate = useTranslate()
  const dispatch = useAppDispatch()
  const { selectedCategory, selectedOrder, selectedSort, selectedChainId } = useAppSelector(
    preferences.selectors.selectHighlightedTokensFilters,
  )

  const handleCategoryChange = useCallback(
    (category: MarketsCategories) => () => {
      dispatch(preferences.actions.setHighlightedTokensSelectedCategory(category))

      switch (category) {
        case MarketsCategories.TopMovers:
          dispatch(
            preferences.actions.setHighlightedTokensSelectedSort(SortOptionsKeys.PriceChange),
          )
          break
        case MarketsCategories.OneClickDefi:
          dispatch(preferences.actions.setHighlightedTokensSelectedSort(SortOptionsKeys.Apy))
          break
        case MarketsCategories.MarketCap:
          dispatch(preferences.actions.setHighlightedTokensSelectedSort(SortOptionsKeys.MarketCap))
          break
        case MarketsCategories.TradingVolume:
          dispatch(preferences.actions.setHighlightedTokensSelectedSort(SortOptionsKeys.Volume))
          break
        case MarketsCategories.RecentlyAdded:
          dispatch(preferences.actions.setHighlightedTokensSelectedSort(SortOptionsKeys.MarketCap))
          break
        default:
          dispatch(
            preferences.actions.setHighlightedTokensSelectedSort(SortOptionsKeys.PriceChange),
          )
          break
      }
    },
    [dispatch],
  )

  const handleSortChange = useCallback(
    (sort: SortOptionsKeys) => {
      dispatch(preferences.actions.setHighlightedTokensSelectedSort(sort))
    },
    [dispatch],
  )

  const handleOrderChange = useCallback(
    (order: OrderDirection) => {
      dispatch(preferences.actions.setHighlightedTokensSelectedOrder(order))
    },
    [dispatch],
  )

  const handleSortOptionClick = useCallback(
    (sortOption: SortOptionsKeys) => () => {
      handleSortChange(sortOption)
    },
    [handleSortChange],
  )

  const categoryLabel = useMemo(() => {
    return selectedCategory === MarketsCategories.OneClickDefi
      ? translate(`markets.categories.${selectedCategory}.filterTitle`)
      : translate(`markets.categories.${selectedCategory}.title`)
  }, [selectedCategory, translate])

  const orderLabel = useMemo(() => {
    return translate(
      selectedOrder === OrderDirection.Ascending ? 'common.ascending' : 'common.descending',
    )
  }, [selectedOrder, translate])

  const sortOptions = useMemo(() => {
    return sortOptionsByCategory[selectedCategory]
  }, [selectedCategory])

  return {
    selectedCategory,
    selectedOrder,
    selectedSort,
    selectedChainId,
    categoryLabel,
    orderLabel,
    sortOptions,
    handleCategoryChange,
    handleSortChange,
    handleOrderChange,
    handleSortOptionClick,
  }
}
