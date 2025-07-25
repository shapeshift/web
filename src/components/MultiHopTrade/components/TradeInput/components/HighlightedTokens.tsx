import { ChevronDownIcon } from '@chakra-ui/icons'
import { Box, Flex, Icon, Skeleton } from '@chakra-ui/react'
import type { ChainId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import noop from 'lodash/noop'
import range from 'lodash/range'
import truncate from 'lodash/truncate'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MdOutlineFilterAlt } from 'react-icons/md'
import { RiExchangeFundsLine } from 'react-icons/ri'
import type { Column, Row } from 'react-table'

import { HighlightedTokensCategoryDialog } from './HighlightedTokensCategoryDialog'
import { HighlightedTokensFiltersDialog } from './HighlightedTokensFiltersDialog'
import { HighlightedTokensPriceCell } from './HighlightedTokensPriceCell'

import type { OrderDirection } from '@/components/OrderDropdown/types'
import { InfiniteTable } from '@/components/ReactTable/InfiniteTable'
import { ResultsEmpty } from '@/components/ResultsEmpty'
import { SortOptionsKeys } from '@/components/SortDropdown/types'
import { AssetCell } from '@/components/StakingVaults/Cells'
import { Text } from '@/components/Text'
import { getMixPanel } from '@/lib/mixpanel/mixPanelSingleton'
import { MixPanelEvent } from '@/lib/mixpanel/types'
import { isSome } from '@/lib/utils'
import { MarketsCategories, sortOptionsByCategory } from '@/pages/Markets/constants'
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
  const [bodyHeaderHeight, setBodyHeaderHeight] = useState('0px')
  const titleRef = useRef<HTMLDivElement>(null)
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false)
  const [isFiltersDialogOpen, setIsFiltersDialogOpen] = useState(false)
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

  useEffect(() => {
    const sortOptions = sortOptionsByCategory[selectedCategory]

    if (!sortOptions) {
      dispatch(preferences.actions.setHighlightedTokensSelectedSort(SortOptionsKeys.Volume))
      return
    }

    if (selectedSort && !sortOptions.includes(selectedSort)) {
      dispatch(preferences.actions.setHighlightedTokensSelectedSort(sortOptions[0]))
    }
  }, [selectedCategory, selectedSort, dispatch])

  const filteredAssets = useMemo(() => {
    if (selectedCategory === MarketsCategories.OneClickDefi) {
      if (!portalsAssets) return []

      return portalsAssets.ids
        .slice(0, HIGHLIGHTED_TOKENS_LIMIT)
        .map(id => assetsById[id])
        .filter(isSome)
    }

    if (!categoryQueryData) return []
    if (selectedChainId === 'all')
      return categoryQueryData?.ids
        .slice(0, HIGHLIGHTED_TOKENS_LIMIT)
        .map(id => assetsById[id])
        .filter(isSome)

    return categoryQueryData.ids
      .filter(assetId => fromAssetId(assetId).chainId === selectedChainId)
      .slice(0, HIGHLIGHTED_TOKENS_LIMIT)
      .map(id => assetsById[id])
      .filter(isSome)
  }, [assetsById, categoryQueryData, selectedChainId, portalsAssets, selectedCategory])

  const handleCategoryChange = useCallback(
    (category: string) => {
      dispatch(
        preferences.actions.setHighlightedTokensSelectedCategory(category as MarketsCategories),
      )
      setIsCategoryDialogOpen(false)
      dispatch(
        preferences.actions.setHighlightedTokensSelectedCategory(category as MarketsCategories),
      )
    },
    [dispatch],
  )

  const handleSortChange = useCallback(
    (sort: string) => {
      dispatch(preferences.actions.setHighlightedTokensSelectedSort(sort as SortOptionsKeys))
    },
    [dispatch],
  )

  const handleOrderChange = useCallback(
    (order: string) => {
      dispatch(preferences.actions.setHighlightedTokensSelectedOrder(order as OrderDirection))
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
        Header: () => <Text translation='dashboard.portfolio.asset' />,
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
        Header: () => <Text translation='dashboard.portfolio.balance' />,
        accessor: 'symbol',
        id: 'balance',
        justifyContent: { base: 'flex-end', lg: 'flex-start' },
        Cell: ({ row }: { row: Row<Asset> }) => (
          <HighlightedTokensPriceCell
            assetId={row.original.assetId}
            selectedCategory={selectedCategory}
            portalsAssets={portalsAssets}
          />
        ),
      },
    ],
    [selectedCategory, portalsAssets],
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

  useEffect(() => {
    const updateMaxHeight = () => {
      if (document.querySelector('.trade-amount-input')) {
        const tradeAmountInputRect = document
          .querySelector('.trade-amount-input')
          ?.getBoundingClientRect()
        const headerRect = document.querySelector('.swapper-header')?.getBoundingClientRect()
        const swapperDividerRect = document
          .querySelector('.swapper-divider')
          ?.getBoundingClientRect()
        const titleRect = titleRef.current?.getBoundingClientRect()
        if (!tradeAmountInputRect || !headerRect || !swapperDividerRect || !titleRect) return

        const bodyHeaderHeight =
          tradeAmountInputRect.height * 2 +
          headerRect.height +
          swapperDividerRect.height +
          titleRect.height
        setBodyHeaderHeight(`${bodyHeaderHeight}px`)
      }
    }

    // call once to set initial value
    updateMaxHeight()

    // update when window resizes
    window.addEventListener('resize', updateMaxHeight)

    // cleanup event listener
    return () => window.removeEventListener('resize', updateMaxHeight)
  }, [])

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
        <Flex
          flexDir='column'
          width='100%'
          maxHeight={`calc(100vh - var(--mobile-nav-offset) - ${bodyHeaderHeight})`}
          overflowY='scroll'
        >
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
        <ResultsEmpty
          title={'markets.emptyTitle'}
          body={'markets.emptyBodySwapper'}
          icon={emptyIcon}
        />
      )
    }

    return (
      <Flex
        flexDir='column'
        width='100%'
        maxHeight={`calc(100vh - var(--mobile-nav-offset) - ${bodyHeaderHeight})`}
        overflowY='scroll'
        px={4}
      >
        <InfiniteTable
          columns={columns}
          data={filteredAssets ?? []}
          onRowClick={handleRowClick}
          displayHeaders={false}
          variant='clickable'
          loadMore={noop}
          hasMore={false}
          scrollableTarget='scroll-view-0'
        />
      </Flex>
    )
  }, [
    filteredAssets,
    bodyHeaderHeight,
    columns,
    handleRowClick,
    isCategoryQueryDataLoading,
    isCategoryQueryDataError,
    isPortalsAssetsLoading,
    isPortalsAssetsError,
    selectedCategory,
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
    <Box>
      <Flex justifyContent='space-between' alignItems='center' mb={2} mt={2} px={5}>
        <Flex align='center' onClick={handleOpenCategoriesDialog}>
          <Text ref={titleRef} color='text.primary' fontWeight='bold' translation={title} />
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
    </Box>
  )
}
