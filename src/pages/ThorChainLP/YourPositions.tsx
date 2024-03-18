import type { GridProps } from '@chakra-ui/react'
import { Box, Flex, Skeleton, Stack, Tag } from '@chakra-ui/react'
import { thorchainAssetId } from '@shapeshiftoss/caip'
import { useQuery } from '@tanstack/react-query'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { reactQueries } from 'react-queries'
import { generatePath, useHistory } from 'react-router'
import type { Column, Row } from 'react-table'
import { Amount } from 'components/Amount/Amount'
import { PoolsIcon } from 'components/Icons/Pools'
import { Main } from 'components/Layout/Main'
import { ReactTable } from 'components/ReactTable/ReactTable'
import { ResultsEmpty } from 'components/ResultsEmpty'
import { RawText, Text } from 'components/Text'
import { bn } from 'lib/bignumber/bignumber'
import { isSome } from 'lib/utils'
import { calculateEarnings } from 'lib/utils/thorchain/lp'
import type { UserLpDataPosition } from 'lib/utils/thorchain/lp/types'
import { selectAssetById, selectMarketDataByAssetIdUserCurrency } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { PoolIcon } from './components/PoolIcon'
import { PoolsHeader } from './components/PoolsHeader'
import { useAllUserLpData } from './queries/hooks/useAllUserLpData'
import { usePools } from './queries/hooks/usePools'

export const lendingRowGrid: GridProps['gridTemplateColumns'] = {
  base: 'minmax(150px, 1fr) repeat(1, minmax(40px, max-content))',
  lg: '1fr repeat(2, minmax(200px, max-content))',
  xl: '1fr repeat(3, minmax(200px, max-content))',
}
const mobileDisplay = {
  base: 'none',
  lg: 'flex',
}

const largeDisplay = {
  base: 'none',
  xl: 'flex',
}

const alignItems = {
  base: 'flex-end',
  lg: 'flex-start',
}

type RowProps = Row<UserLpDataPosition>
const reactTableInitialState = {
  sortBy: [{ id: 'totalValueFiatUserCurrency', desc: true }],
  pageSize: 5000,
}

export const YourPositions = () => {
  const translate = useTranslate()
  const history = useHistory()
  const runeAsset = useAppSelector(state => selectAssetById(state, thorchainAssetId))
  const runeMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, thorchainAssetId),
  )
  const { data: pools } = usePools()

  const allUserLpData = useAllUserLpData()

  const activePositions = useMemo(() => {
    return allUserLpData.filter(query => query.data?.positions.length)
  }, [allUserLpData])

  const allLoaded = useMemo(() => {
    return allUserLpData.length && allUserLpData.every(query => query.isSuccess)
  }, [allUserLpData])

  const emptyIcon = useMemo(() => <PoolsIcon />, [])
  const headerComponent = useMemo(() => <PoolsHeader />, [])

  const positions = useMemo(
    () =>
      activePositions
        .flatMap(position => position?.data?.positions ?? [])
        .filter(isSome)
        .sort((a, b) => bn(b.totalValueFiatUserCurrency).comparedTo(a.totalValueFiatUserCurrency)),
    [activePositions],
  )

  const columns: Column<UserLpDataPosition>[] = useMemo(
    () => [
      {
        Header: translate('pools.pool'),
        accessor: 'name',
        Cell: ({ row }: { value: string; row: RowProps }) => {
          const position = row.original
          const { assetId } = useMemo(() => position, [position])
          const poolAssetIds = useMemo(() => [assetId, thorchainAssetId], [assetId])

          return (
            <Flex gap={4} alignItems='center'>
              <PoolIcon assetIds={poolAssetIds} size='sm' />
              <RawText>{position.name}</RawText>
              <Tag>
                {position.asym ? (
                  <Text
                    // eslint-disable-next-line react-memo/require-usememo
                    translation={['common.asymmetric', { assetSymbol: position.asym.asset.symbol }]}
                  />
                ) : (
                  <Text translation='common.symmetric' />
                )}
              </Tag>
            </Flex>
          )
        },
      },
      {
        Header: translate('pools.balance'),
        accessor: 'totalValueFiatUserCurrency',
        Cell: ({ value, row }: { value: string; row: RowProps }) => {
          const position = row.original
          const { assetId } = position
          const asset = useAppSelector(state => selectAssetById(state, assetId))

          if (!asset || !runeAsset) return null

          return (
            <Skeleton isLoaded={!!value}>
              <Stack spacing={0} alignItems={alignItems}>
                <Amount.Fiat value={position.totalValueFiatUserCurrency} />
                <Amount.Crypto
                  value={position.underlyingAssetAmountCryptoPrecision}
                  symbol={asset.symbol}
                  fontSize='sm'
                  color='text.subtle'
                />
                <Amount.Crypto
                  value={position.underlyingRuneAmountCryptoPrecision}
                  symbol={runeAsset.symbol}
                  fontSize='sm'
                  color='text.subtle'
                />
              </Stack>
            </Skeleton>
          )
        },
      },
      {
        Header: translate('pools.earnings'),
        // TODO(gomes): expose me in the UserLpDataPosition interface so this can be used for sorting
        // accessor: 'totalEarningsFiat',
        display: { base: 'none', lg: 'table-cell' },
        Cell: ({ row }: { value: string | undefined; row: RowProps }) => {
          const position = row.original
          const pool = useMemo(
            () => pools?.find(pool => pool.assetId === position.assetId),
            [position.assetId],
          )
          const poolAssetId = pool?.assetId
          const thorchainNotationPoolAssetId = pool?.asset
          const asset = useAppSelector(state => selectAssetById(state, poolAssetId ?? ''))

          const { data: earnings, isLoading: isEarningsLoading } = useQuery({
            ...reactQueries.thorchainLp.earnings(position.dateFirstAdded),
            // @lukemorales/query-key-factory only returns queryFn and queryKey - all others will be ignored in the returned object
            // No staleTime, meaning cache-then-fresh (or fresh if now > garbage collection time)
            // That ensures new active listeners always get fresh earnings data
            staleTime: 0,
            select: data => {
              const poolEarnings = data?.meta.pools.find(
                pool => pool.pool === thorchainNotationPoolAssetId,
              )
              if (!poolEarnings) return null

              return calculateEarnings(poolEarnings, position.poolShare, runeMarketData.price)
            },
          })

          if (!asset) return null

          return (
            <Stack display={mobileDisplay} spacing={0}>
              <Skeleton isLoaded={!isEarningsLoading}>
                <Amount.Fiat value={earnings?.totalEarningsFiat ?? '0'} />
              </Skeleton>
              <Skeleton isLoaded={!isEarningsLoading}>
                <Amount.Crypto
                  value={earnings?.assetEarningsCryptoPrecision ?? '0'}
                  symbol={asset.symbol}
                  fontSize='sm'
                  color='text.subtle'
                />
              </Skeleton>
              <Skeleton isLoaded={!isEarningsLoading}>
                <Amount.Crypto
                  value={earnings?.runeEarningsCryptoPrecision ?? '0'}
                  symbol={'RUNE'}
                  fontSize='sm'
                  color='text.subtle'
                />
              </Skeleton>
            </Stack>
          )
        },
      },
      {
        Header: translate('pools.poolShare'),
        accessor: 'poolOwnershipPercentage',
        display: { base: 'none', lg: 'table-cell' },
        Cell: ({ row }: { value: string | undefined; row: RowProps }) => {
          const position = row.original

          return (
            <Box display={largeDisplay}>
              <Amount.Percent
                options={{ maximumFractionDigits: 8 }}
                value={bn(position.poolOwnershipPercentage).div(100).toFixed()}
              />
            </Box>
          )
        },
      },
    ],
    [pools, runeAsset, runeMarketData.price, translate],
  )

  const handlePoolClick = useCallback(
    (row: Row<UserLpDataPosition>) => {
      const position = row.original
      const pool = pools?.find(pool => pool.assetId === position.assetId)
      const poolAssetId = pool?.asset
      if (!poolAssetId) return

      const { accountId, opportunityId } = position

      history.push(
        generatePath('/pools/positions/:poolAssetId/:accountId/:opportunityId', {
          poolAssetId,
          accountId,
          opportunityId,
        }),
      )
    },
    [history, pools],
  )

  const isEmpty = useMemo(() => allLoaded && !activePositions.length, [allLoaded, activePositions])

  if (isEmpty) {
    return (
      <ResultsEmpty
        title='pools.yourPositions.emptyTitle'
        body='pools.yourPositions.emptyBody'
        icon={emptyIcon}
      />
    )
  }

  return (
    <Main headerComponent={headerComponent}>
      <Stack>
        {!positions ? (
          new Array(2).fill(null).map((_, i) => <Skeleton key={i} height={16} />)
        ) : (
          <ReactTable
            data={positions}
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
