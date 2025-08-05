import { ChevronDownIcon } from '@chakra-ui/icons'
import { Flex, Icon, Skeleton } from '@chakra-ui/react'
import type { ChainId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import noop from 'lodash/noop'
import range from 'lodash/range'
import truncate from 'lodash/truncate'
import { useCallback, useMemo, useState } from 'react'
import { MdOutlineFilterAlt } from 'react-icons/md'
import { RiExchangeFundsLine } from 'react-icons/ri'
import type { Column, Row } from 'react-table'

import { HighlightedTokensCategoryDialog } from './HighlightedTokensCategoryDialog'
import { HighlightedTokensFiltersDialog } from './HighlightedTokensFiltersDialog'
import { HighlightedTokensPriceCell } from './HighlightedTokensPriceCell'

import { MoreActionsDrawer } from '@/components/AssetHeader/MoreActionsDrawer'
import type { OrderDirection } from '@/components/OrderDropdown/types'
import { InfiniteTable } from '@/components/ReactTable/InfiniteTable'
import { ResultsEmpty } from '@/components/ResultsEmpty'
import { SortOptionsKeys } from '@/components/SortDropdown/types'
import { AssetCell } from '@/components/StakingVaults/Cells'
import { Text } from '@/components/Text'
import { getMixPanel } from '@/lib/mixpanel/mixPanelSingleton'
import { MixPanelEvent } from '@/lib/mixpanel/types'
import { isSome } from '@/lib/utils'
import { MarketsCategories } from '@/pages/Markets/constants'
import { CATEGORY_TO_QUERY_HOOK } from '@/pages/Markets/hooks/useCoingeckoData'
import { usePortalsAssetsQuery } from '@/pages/Markets/hooks/usePortalsAssetsQuery'
import { useRows } from '@/pages/Markets/hooks/useRows'
import { preferences } from '@/state/slices/preferencesSlice/preferencesSlice'
import { selectAssets } from '@/state/slices/selectors'
import { tradeInput } from '@/state/slices/tradeInputSlice/tradeInputSlice'
import { useAppDispatch, useAppSelector } from '@/state/store'

const emptyIcon = <RiExchangeFundsLine color='pink.200' />

const HIGHLIGHTED_TOKENS_LIMIT = 10

export const HighlightedTokens = () => {
  const dispatch = useAppDispatch()
  const assetsById = useAppSelector(selectAssets)
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false)
  const [isFiltersDialogOpen, setIsFiltersDialogOpen] = useState(false)
  const [selectedAssetIdForMenu, setSelectedAssetIdForMenu] = useState<string | undefined>()

  const { selectedCategory, selectedOrder, selectedSort, selectedChainId } = useAppSelector(
    preferences.selectors.selectHighlightedTokensFilters,
  )
  const rows = useRows({ limit: HIGHLIGHTED_TOKENS_LIMIT })

  const categoryHook =
    selectedCategory === MarketsCategories.OneClickDefi
      ? CATEGORY_TO_QUERY_HOOK[MarketsCategories.Trending]
      : CATEGORY_TO_QUERY_HOOK[selectedCategory]

  const {
    data: categoryQueryData,
    isLoading: isCategoryQueryDataLoading,
    isError: isCategoryQueryDataError,
  } = categoryHook({
    enabled: selectedCategory !== MarketsCategories.OneClickDefi,
    orderBy: selectedOrder,
    sortBy: selectedSort,
  })

  const {
    data: portalsAssets,
    isLoading: isPortalsAssetsLoading,
    isError: isPortalsAssetsError,
  } = usePortalsAssetsQuery({
    chainIds:
      selectedChainId === 'all'
        ? rows[selectedCategory].supportedChainIds ?? []
        : [selectedChainId],
    enabled: selectedCategory === MarketsCategories.OneClickDefi,
    sortBy: selectedSort,
    orderBy: selectedOrder,
    minApy: '1',
  })

  const oneClickDefiAssets = useMemo(() => {
    if (selectedCategory !== MarketsCategories.OneClickDefi || !portalsAssets) return []

    return portalsAssets.ids
      .slice(0, HIGHLIGHTED_TOKENS_LIMIT)
      .map(id => assetsById[id])
      .filter(isSome)
  }, [selectedCategory, portalsAssets, assetsById])

  const categoryAssets = useMemo(() => {
    if (selectedCategory === MarketsCategories.OneClickDefi || !categoryQueryData) return []

    if (selectedChainId === 'all') {
      return categoryQueryData.ids
        .slice(0, HIGHLIGHTED_TOKENS_LIMIT)
        .map(id => assetsById[id])
        .filter(isSome)
    }

    return categoryQueryData.ids
      .filter(assetId => fromAssetId(assetId).chainId === selectedChainId)
      .slice(0, HIGHLIGHTED_TOKENS_LIMIT)
      .map(id => assetsById[id])
      .filter(isSome)
  }, [selectedCategory, categoryQueryData, selectedChainId, assetsById])

  const filteredAssets = useMemo(() => {
    return selectedCategory === MarketsCategories.OneClickDefi ? oneClickDefiAssets : categoryAssets
  }, [oneClickDefiAssets, categoryAssets, selectedCategory])

  const handleCategoryChange = useCallback(
    (category: MarketsCategories) => {
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
        case MarketsCategories.RecentlyAdded:
          dispatch(preferences.actions.setHighlightedTokensSelectedSort(SortOptionsKeys.MarketCap))
          break
        default:
          dispatch(
            preferences.actions.setHighlightedTokensSelectedSort(SortOptionsKeys.PriceChange),
          )
          break
      }

      setIsCategoryDialogOpen(false)
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

  const handleChainIdChange = useCallback(
    (chain: ChainId | 'all') => {
      dispatch(preferences.actions.setHighlightedTokensSelectedChainId(chain))
    },
    [dispatch],
  )

  const columns: Column<Asset>[] = useMemo(
    () => [
      {
        accessor: 'assetId',
        disableSortBy: true,
        Cell: ({ row }: { row: Row<Asset> }) => (
          <AssetCell
            assetId={row.original.assetId}
            subText={truncate(row.original.symbol, { length: 6 }) ?? ''}
          />
        ),
      },
      {
        accessor: 'symbol',
        id: 'symbol',
        justifyContent: { base: 'flex-end', lg: 'flex-start' },
        Cell: ({ row }: { row: Row<Asset> }) => (
          <HighlightedTokensPriceCell
            assetId={row.original.assetId}
            selectedSort={selectedSort}
            portalsAssets={portalsAssets}
          />
        ),
      },
    ],
    [portalsAssets, selectedSort],
  )

  const handleRowClick = useCallback(
    (row: Row<Asset>) => {
      const mixpanel = getMixPanel()

      mixpanel?.track(MixPanelEvent.HighlightedTokenClicked, {
        assetId: row.original.assetId,
        asset: row.original.symbol,
        name: row.original.name,
        category: selectedCategory,
        chainId: selectedChainId,
        order: selectedOrder,
        sort: selectedSort,
      })

      dispatch(tradeInput.actions.setBuyAsset(row.original))
    },
    [dispatch, selectedCategory, selectedChainId, selectedOrder, selectedSort],
  )

  const handleRowLongPress = useCallback((row: Row<Asset>) => {
    const { assetId } = row.original
    setSelectedAssetIdForMenu(assetId)
  }, [])

  const handleCloseAssetMenu = useCallback(() => setSelectedAssetIdForMenu(undefined), [])

  const handleOpenCategoriesDialog = useCallback(() => {
    setIsCategoryDialogOpen(true)
  }, [])

  const handleCloseCategoriesDialog = useCallback(() => {
    setIsCategoryDialogOpen(false)
  }, [])

  const handleOpenFiltersDialog = useCallback(() => {
    setIsFiltersDialogOpen(true)
  }, [])

  const handleCloseFiltersDialog = useCallback(() => {
    setIsFiltersDialogOpen(false)
  }, [])

  const content = useMemo(() => {
    if (isCategoryQueryDataLoading || isPortalsAssetsLoading) {
      return (
        <Flex flexDir='column' width='100%' overflowY='auto' flex='1' minHeight={0}>
          {range(3).map(index => (
            <Flex
              key={index}
              align='center'
              width='100%'
              justifyContent='space-between'
              px={4}
              mb={4}
            >
              <Flex align='center'>
                <Skeleton width='40px' height='40px' borderRadius='100%' me={2} />
                <Flex flexDir='column' gap={2}>
                  <Skeleton width='140px' height='18px' />
                  <Skeleton width='80px' height='18px' />
                </Flex>
              </Flex>
              <Flex align='flex-end' flexDir='column' gap={2}>
                <Skeleton width='120px' height='18px' />
                <Skeleton width='80px' height='18px' />
              </Flex>
            </Flex>
          ))}
        </Flex>
      )
    }

    if (
      (selectedCategory !== MarketsCategories.OneClickDefi && isCategoryQueryDataError) ||
      (selectedCategory === MarketsCategories.OneClickDefi && isPortalsAssetsError) ||
      !filteredAssets?.length
    ) {
      return (
        <Flex flex='1' alignItems='center' justifyContent='center' minHeight={0}>
          <ResultsEmpty
            title={'markets.emptyTitle'}
            body={'markets.emptyBodySwapper'}
            icon={emptyIcon}
          />
        </Flex>
      )
    }

    return (
      <Flex flexDir='column' width='100%' overflowY='auto' flex='1' minHeight={0} px={4}>
        <InfiniteTable
          columns={columns}
          data={filteredAssets ?? []}
          onRowClick={handleRowClick}
          onRowLongPress={handleRowLongPress}
          displayHeaders={false}
          variant='clickable'
          loadMore={noop}
          hasMore={false}
          scrollableTarget='scroll-view-0'
        />
      </Flex>
    )
  }, [
    isCategoryQueryDataLoading,
    isPortalsAssetsLoading,
    selectedCategory,
    isCategoryQueryDataError,
    isPortalsAssetsError,
    filteredAssets,
    columns,
    handleRowClick,
    handleRowLongPress,
  ])

  const title = useMemo(() => {
    if (selectedCategory === MarketsCategories.OneClickDefi) {
      return `markets.categories.${selectedCategory}.filterTitle`
    }

    if (selectedCategory === MarketsCategories.Trending) {
      return 'common.trendingTokens'
    }

    return `markets.categories.${selectedCategory}.title`
  }, [selectedCategory])

  return (
    <Flex flexDir='column' height='100%' flex='1' minHeight={0}>
      <Flex justifyContent='space-between' alignItems='center' mb={2} mt={2} px={5} flex='0 0 auto'>
        <Flex align='center' onClick={handleOpenCategoriesDialog}>
          <Text color='text.primary' fontWeight='bold' translation={title} />
          <ChevronDownIcon ml={1} boxSize='20px' color='text.subtle' />
        </Flex>
        <Icon
          as={MdOutlineFilterAlt}
          boxSize='20px'
          color='text.subtle'
          onClick={handleOpenFiltersDialog}
        />
      </Flex>
      {content}

      <HighlightedTokensCategoryDialog
        isOpen={isCategoryDialogOpen}
        onClose={handleCloseCategoriesDialog}
        selectedCategory={selectedCategory}
        handleCategoryChange={handleCategoryChange}
      />

      <HighlightedTokensFiltersDialog
        isOpen={isFiltersDialogOpen}
        onClose={handleCloseFiltersDialog}
        selectedCategory={selectedCategory}
        selectedSort={selectedSort}
        selectedOrder={selectedOrder}
        selectedChainId={selectedChainId}
        handleSortChange={handleSortChange}
        handleOrderChange={handleOrderChange}
        handleChainIdChange={handleChainIdChange}
      />

      <MoreActionsDrawer
        assetId={selectedAssetIdForMenu}
        isOpen={selectedAssetIdForMenu !== undefined}
        onClose={handleCloseAssetMenu}
      />
    </Flex>
  )
}
