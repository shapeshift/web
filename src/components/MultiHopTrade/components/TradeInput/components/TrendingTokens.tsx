import { Box, Flex, Skeleton } from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/types'
import noop from 'lodash/noop'
import range from 'lodash/range'
import truncate from 'lodash/truncate'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Column, Row } from 'react-table'

import { TrendingTokenPriceCell } from './TrendingTokenPriceCell'

import { InfiniteTable } from '@/components/ReactTable/InfiniteTable'
import { AssetCell } from '@/components/StakingVaults/Cells'
import { Text } from '@/components/Text'
import { getMixPanel } from '@/lib/mixpanel/mixPanelSingleton'
import { MixPanelEvent } from '@/lib/mixpanel/types'
import { isSome } from '@/lib/utils'
import { useTrendingQuery } from '@/pages/Markets/hooks/useCoingeckoData'
import { selectAssets } from '@/state/slices/selectors'
import { tradeInput } from '@/state/slices/tradeInputSlice/tradeInputSlice'
import { useAppDispatch, useAppSelector } from '@/state/store'

export const TrendingTokens = () => {
  const { data: trendingAssetsData, isLoading: isTrendingAssetsLoading } = useTrendingQuery({
    enabled: true,
  })
  const dispatch = useAppDispatch()
  const assetsById = useAppSelector(selectAssets)
  const [bodyHeaderHeight, setBodyHeaderHeight] = useState('0px')
  const titleRef = useRef<HTMLDivElement>(null)

  const trendingAssets = useMemo(() => {
    return trendingAssetsData?.ids
      .slice(0, 10)
      .map(id => assetsById[id])
      .filter(isSome)
  }, [assetsById, trendingAssetsData])

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

  return (
    <Box>
      <Text
        ref={titleRef}
        color='text.primary'
        fontWeight='bold'
        translation='common.trendingTokens'
        textDecoration='underline'
        textUnderlineOffset='4px'
        mb={4}
        px={5}
      />
      {isTrendingAssetsLoading ? (
        <Flex flexDir='column' width='100%' pb='var(--mobile-nav-offset)'>
          {range(5).map(index => (
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
      ) : (
        <Flex
          flexDir='column'
          width='100%'
          maxHeight={`calc(100vh - var(--mobile-nav-offset) - ${bodyHeaderHeight})`}
          overflowY='scroll'
          px={4}
        >
          <InfiniteTable
            columns={columns}
            data={trendingAssets ?? []}
            onRowClick={handleRowClick}
            displayHeaders={false}
            variant='clickable'
            loadMore={noop}
            hasMore={false}
            scrollableTarget='scroll-view-0'
          />
        </Flex>
      )}
    </Box>
  )
}
