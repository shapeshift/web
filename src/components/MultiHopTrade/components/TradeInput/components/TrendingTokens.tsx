import { CheckIcon } from '@chakra-ui/icons'
import { Box, Flex, Icon, Menu, MenuItemOption, MenuOptionGroup, Skeleton } from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/types'
import noop from 'lodash/noop'
import range from 'lodash/range'
import truncate from 'lodash/truncate'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { RiExchangeFundsLine } from 'react-icons/ri'
import { useTranslate } from 'react-polyglot'
import type { Column, Row } from 'react-table'

import { TrendingTokenPriceCell } from './TrendingTokenPriceCell'

import { Dialog } from '@/components/Modal/components/Dialog'
import { OrderDirection } from '@/components/OrderDropdown/types'
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
import { selectAssets } from '@/state/slices/selectors'
import { tradeInput } from '@/state/slices/tradeInputSlice/tradeInputSlice'
import { useAppDispatch, useAppSelector } from '@/state/store'

const emptyIcon = <RiExchangeFundsLine color='pink.200' />

const checkedIcon = <Icon as={CheckIcon} color='blue.200' fontSize='20px' />

export const TrendingTokens = () => {
  const dispatch = useAppDispatch()
  const assetsById = useAppSelector(selectAssets)
  const [bodyHeaderHeight, setBodyHeaderHeight] = useState('0px')
  const titleRef = useRef<HTMLDivElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<
    Exclude<MarketsCategories, MarketsCategories.OneClickDefi>
  >(MarketsCategories.Trending)
  const categoryHook = CATEGORY_TO_QUERY_HOOK[selectedCategory]
  const translate = useTranslate()

  const {
    data: categoryQueryData,
    isLoading: isCategoryQueryDataLoading,
    isError: isCategoryQueryDataError,
  } = categoryHook({
    enabled: true,
    orderBy: OrderDirection.Descending,
    sortBy:
      selectedCategory === MarketsCategories.MarketCap
        ? SortOptionsKeys.MarketCap
        : SortOptionsKeys.Volume,
  })

  const assets = useMemo(() => {
    return categoryQueryData?.ids
      .slice(0, 10)
      .map(id => assetsById[id])
      .filter(isSome)
  }, [assetsById, categoryQueryData])

  const handleCategoryChange = useCallback((category: string) => {
    setSelectedCategory(category as Exclude<MarketsCategories, MarketsCategories.OneClickDefi>)
    setIsOpen(false)
  }, [])

  const categories = useMemo(() => {
    const categoriesOptions = Object.values(MarketsCategories)
      .filter(category => category !== MarketsCategories.OneClickDefi)
      .map(category => ({
        label: translate(`markets.categories.${category}.title`),
        value: category,
      }))

    return (
      <Menu>
        <MenuOptionGroup type='radio' value={selectedCategory}>
          {categoriesOptions.map(category => (
            <MenuItemOption
              key={category.value}
              value={category.value}
              // eslint-disable-next-line react-memo/require-usememo
              onClick={() => handleCategoryChange(category.value)}
              fontSize='md'
              iconPlacement='end'
              icon={checkedIcon}
              color={selectedCategory === category.value ? 'text.primary' : 'text.subtle'}
              fontWeight='bold'
            >
              {category.label}
            </MenuItemOption>
          ))}
        </MenuOptionGroup>
      </Menu>
    )
  }, [handleCategoryChange, selectedCategory, translate])

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
          <TrendingTokenPriceCell assetId={row.original.assetId} />
        ),
      },
    ],
    [],
  )

  const handleRowClick = useCallback(
    (row: Row<Asset>) => {
      const mixpanel = getMixPanel()

      mixpanel?.track(MixPanelEvent.TrendingTokenClicked, {
        assetId: row.original.assetId,
        asset: row.original.symbol,
        name: row.original.name,
      })

      dispatch(tradeInput.actions.setBuyAsset(row.original))
    },
    [dispatch],
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
    setIsOpen(true)
  }, [])

  const handleCloseCategoriesDialog = useCallback(() => {
    setIsOpen(false)
  }, [])

  const content = useMemo(() => {
    if (isCategoryQueryDataLoading) {
      return (
        <Flex flexDir='column' width='100%' pb='var(--mobile-nav-offset)'>
          {range(5).map(index => (
            <Flex
              key={index}
              align='center'
              width='100%'
              justifyContent='space-between'
              px={4}
              mb={4}
              py={4}
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

    if (isCategoryQueryDataError || !assets?.length) {
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
          data={assets ?? []}
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
    assets,
    bodyHeaderHeight,
    columns,
    handleRowClick,
    isCategoryQueryDataError,
    isCategoryQueryDataLoading,
  ])

  return (
    <Box>
      <Text
        ref={titleRef}
        color='text.primary'
        fontWeight='bold'
        translation='common.trendingTokens'
        textDecoration='underline'
        textUnderlineOffset='4px'
        mb={2}
        mt={2}
        px={5}
        onClick={handleOpenCategoriesDialog}
      />
      {content}

      <Dialog
        isOpen={isOpen}
        onClose={handleCloseCategoriesDialog}
        height='auto'
        isDisablingPropagation={false}
      >
        <Box
          py={4}
          pb='calc(env(safe-area-inset-bottom) + var(--safe-area-inset-bottom) + var(--chakra-space-4))'
        >
          <Box height='5px' width='36px' borderRadius='full' bg='gray.500' mb={4} mx='auto' />
          {categories}
        </Box>
      </Dialog>
    </Box>
  )
}
