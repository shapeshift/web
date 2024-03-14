import type { GridProps } from '@chakra-ui/react'
import { Flex, Skeleton, Stack, Tag, TagLeftIcon } from '@chakra-ui/react'
import { thorchainAssetId } from '@shapeshiftoss/caip'
import { SwapperName } from '@shapeshiftoss/swapper'
import { useQuery } from '@tanstack/react-query'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { reactQueries } from 'react-queries'
import { useIsTradingActive } from 'react-queries/hooks/useIsTradingActive'
import { generatePath, useHistory } from 'react-router'
import type { Column, Row } from 'react-table'
import { Amount } from 'components/Amount/Amount'
import { CircleIcon } from 'components/Icons/Circle'
import { Main } from 'components/Layout/Main'
import { ReactTable } from 'components/ReactTable/ReactTable'
import { RawText, Text } from 'components/Text'
import { selectMarketDataByAssetIdUserCurrency } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { PoolIcon } from './components/PoolIcon'
import { PoolsHeader } from './components/PoolsHeader'
import { getVolumeStats, selectSwapsData } from './queries/hooks/usePool'
import type { Pool } from './queries/hooks/usePools'
import { usePools } from './queries/hooks/usePools'

export const lendingRowGrid: GridProps['gridTemplateColumns'] = {
  base: 'minmax(150px, 1fr) repeat(1, minmax(40px, max-content))',
  lg: '1fr repeat(2, 1fr)',
  xl: '1fr repeat(3, minmax(200px, max-content))',
}
const mobileDisplay = {
  base: 'none',
  lg: 'flex',
}

const stackPadding = { base: 2, md: 0 }

const reactTableInitialState = { sortBy: [{ id: 'tvlFiat', desc: true }], pageSize: 5000 }

type RowProps = Row<Pool>

export const AvailablePools = () => {
  const history = useHistory()
  const { data: pools, isLoading } = usePools()
  const translate = useTranslate()

  const headerComponent = useMemo(() => <PoolsHeader />, [])

  const runeMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, thorchainAssetId),
  )

  const columns: Column<Pool>[] = useMemo(
    () => [
      {
        Header: translate('pools.pool'),
        accessor: 'name',
        display: { base: 'none', lg: 'table-cell' },
        Cell: ({ row, value }: { value: string; row: RowProps }) => {
          const pool = row.original

          const { isTradingActive, isLoading: isTradingActiveLoading } = useIsTradingActive({
            assetId: pool?.assetId,
            enabled: !!pool,
            swapperName: SwapperName.Thorchain,
          })

          const statusContent = useMemo(() => {
            switch (true) {
              case isTradingActive === true && pool.status === 'available':
                return {
                  color: 'green.500',
                  element: <Amount.Percent value={pool.annualPercentageRate} suffix='APY' />,
                }
              case isTradingActive === true && pool.status === 'staged':
                return {
                  color: 'yellow.500',
                  element: <Text translation='common.staged' />,
                }
              case isTradingActive === false:
                return {
                  color: 'red.500',
                  element: <Text translation='common.halted' />,
                }
              default:
                return {
                  color: 'text.subtle',
                  element: <Amount.Percent value={pool.annualPercentageRate} />,
                }
            }
          }, [isTradingActive, pool.annualPercentageRate, pool.status])

          const poolAssetIds = useMemo(() => [pool.assetId, thorchainAssetId], [pool.assetId])
          return (
            <Skeleton isLoaded={!!value}>
              <Flex gap={4} alignItems='center'>
                <PoolIcon assetIds={poolAssetIds} size='sm' />
                <Flex gap={2} flexWrap='wrap' flex='0 1 auto'>
                  <RawText fontWeight='semibold'>{pool.name}</RawText>
                  <Skeleton isLoaded={!isTradingActiveLoading}>
                    <Tag size='sm'>
                      <TagLeftIcon as={CircleIcon} boxSize='8px' color={statusContent.color} />
                      {statusContent.element}
                    </Tag>
                  </Skeleton>
                </Flex>
              </Flex>
            </Skeleton>
          )
        },
      },
      {
        Header: translate('pools.tvl'),
        accessor: 'tvlFiat',
        Cell: ({ value }: { value: string; row: RowProps }) => {
          return (
            <Skeleton isLoaded={!!value}>
              <Amount.Fiat value={value} />
            </Skeleton>
          )
        },
      },
      {
        Header: translate('pools.volume24h'),
        // TODO(gomes): expose me in the Pool interface so this can be used for sorting
        // accessor: 'volume24h',
        display: { base: 'none', lg: 'table-cell' },
        Cell: ({ row }: { value: string | undefined; row: RowProps }) => {
          const pool = row.original

          const { data: swapsData } = useQuery({
            ...reactQueries.midgard.swapsData(pool.asset, 'hour', 7 * 24),
            select: selectSwapsData,
          })

          const volumeStats = useMemo(() => {
            if (!swapsData) return
            return getVolumeStats(swapsData, runeMarketData.price)
          }, [swapsData])

          return (
            <Skeleton isLoaded={!!volumeStats}>
              <Skeleton isLoaded={!!volumeStats} display={mobileDisplay}>
                <Amount.Fiat value={volumeStats?.volume24hFiat ?? '0'} />
              </Skeleton>
            </Skeleton>
          )
        },
      },
      {
        Header: translate('pools.volume7d'),
        // TODO(gomes): expose me in the Pool interface so this can be used for sorting
        // accessor: 'volume7d',
        display: { base: 'none', lg: 'table-cell' },
        Cell: ({ row }: { value: string | undefined; row: RowProps }) => {
          const pool = row.original

          const { data: swapsData } = useQuery({
            ...reactQueries.midgard.swapsData(pool.asset, 'hour', 7 * 24),
            select: selectSwapsData,
          })

          const volumeStats = useMemo(() => {
            if (!swapsData) return
            return getVolumeStats(swapsData, runeMarketData.price)
          }, [swapsData])

          return (
            <Skeleton isLoaded={!!volumeStats}>
              <Skeleton isLoaded={!!volumeStats} display={mobileDisplay}>
                <Amount.Fiat value={volumeStats?.volume7dFiat ?? '0'} />
              </Skeleton>
            </Skeleton>
          )
        },
      },
    ],
    [runeMarketData.price, translate],
  )

  const handlePoolClick = useCallback(
    ({ original: pool }: Row<Pool>) => {
      history.push(generatePath('/pools/:poolAssetId', { poolAssetId: pool.asset }))
    },
    [history],
  )

  return (
    <Main headerComponent={headerComponent}>
      <Stack px={stackPadding}>
        {isLoading || !pools ? (
          new Array(2).fill(null).map((_, i) => <Skeleton key={i} height={16} />)
        ) : (
          <ReactTable
            data={pools}
            columns={columns}
            initialState={reactTableInitialState}
            onRowClick={handlePoolClick}
            variant='clickable'
          />
        )}
      </Stack>
    </Main>
  )
}
