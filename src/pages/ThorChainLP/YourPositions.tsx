import type { GridProps } from '@chakra-ui/react'
import { Box, Button, Flex, SimpleGrid, Skeleton, Stack, Tag } from '@chakra-ui/react'
import { thorchainAssetId } from '@shapeshiftoss/caip'
import { useQuery } from '@tanstack/react-query'
import { useCallback, useMemo } from 'react'
import { reactQueries } from 'react-queries'
import { generatePath, useHistory } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { PoolsIcon } from 'components/Icons/Pools'
import { Main } from 'components/Layout/Main'
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

const mobilePadding = {
  base: 4,
  lg: 4,
  xl: 0,
}
const listMargin = {
  base: 0,
  lg: 0,
  xl: -4,
}

const alignItems = {
  base: 'flex-end',
  lg: 'flex-start',
}

type PositionButtonProps = {
  poolAssetId: string
  position: UserLpDataPosition
}

const PositionButton = ({ poolAssetId, position }: PositionButtonProps) => {
  const history = useHistory()

  const { assetId, accountId, opportunityId } = useMemo(() => position, [position])

  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const runeAsset = useAppSelector(state => selectAssetById(state, thorchainAssetId))
  const runeMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, thorchainAssetId),
  )

  const poolAssetIds = useMemo(() => [assetId, thorchainAssetId], [assetId])

  const { data: earnings, isLoading: isEarningsLoading } = useQuery({
    ...reactQueries.thorchainLp.earnings(position.dateFirstAdded),
    // @lukemorales/query-key-factory only returns queryFn and queryKey - all others will be ignored in the returned object
    // No staleTime, meaning cache-then-fresh (or fresh if now > garbage collection time)
    // That ensures new active listeners always get fresh earnings data
    staleTime: 0,
    select: data => {
      const poolEarnings = data.meta.pools.find(pool => pool.pool === poolAssetId)
      if (!poolEarnings) return null

      return calculateEarnings(poolEarnings, position.poolShare, runeMarketData.price)
    },
  })

  const handlePoolClick = useCallback(() => {
    history.push(
      generatePath('/pools/positions/:poolAssetId/:accountId/:opportunityId', {
        poolAssetId,
        accountId,
        opportunityId,
      }),
    )
  }, [accountId, history, opportunityId, poolAssetId])

  if (!asset || !runeAsset) return null

  return (
    <Stack mx={listMargin}>
      <Button
        variant='ghost'
        display='grid'
        gridTemplateColumns={lendingRowGrid}
        columnGap={4}
        alignItems='center'
        textAlign='left'
        py={4}
        width='full'
        height='auto'
        color='text.base'
        onClick={handlePoolClick}
      >
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
        <Box display={largeDisplay}>
          <Amount.Percent
            options={{ maximumFractionDigits: 8 }}
            value={bn(position.poolOwnershipPercentage).div(100).toFixed()}
          />
        </Box>
      </Button>
    </Stack>
  )
}

export const YourPositions = () => {
  const { data: pools } = usePools()

  const allUserLpData = useAllUserLpData()

  const activePositions = useMemo(() => {
    return allUserLpData.filter(query => query.data?.positions.length)
  }, [allUserLpData])

  // If some are loading, we are loading, but that's not it yet, we also need to check if some are not loaded
  const someLoading = useMemo(
    () => allUserLpData.some(position => position.isLoading),
    [allUserLpData],
  )

  const allLoaded = useMemo(() => {
    return allUserLpData.length && allUserLpData.every(query => query.isSuccess)
  }, [allUserLpData])

  const isEmpty = useMemo(() => allLoaded && !activePositions.length, [allLoaded, activePositions])

  const emptyIcon = useMemo(() => <PoolsIcon />, [])
  const headerComponent = useMemo(() => <PoolsHeader />, [])

  const positionRows = useMemo(() => {
    if (isEmpty) {
      return (
        <ResultsEmpty
          title='pools.yourPositions.emptyTitle'
          body='pools.yourPositions.emptyBody'
          icon={emptyIcon}
        />
      )
    }

    const skeletons = new Array(2).fill(null).map((_, i) => <Skeleton height={16} key={i} />)

    const positions = activePositions
      .flatMap(position => position?.data?.positions ?? [])
      .filter(isSome)
      .sort((a, b) => bn(b.totalValueFiatUserCurrency).comparedTo(a.totalValueFiatUserCurrency))

    const rows = positions
      .map(position => {
        const pool = pools?.find(pool => pool.assetId === position.assetId)

        if (!pool) return null

        return (
          <PositionButton
            key={position.opportunityId}
            poolAssetId={pool.asset}
            position={position}
          />
        )
      })
      .filter(isSome)

    return rows.concat(someLoading ? skeletons : [])
  }, [activePositions, emptyIcon, isEmpty, pools, someLoading])

  const renderHeader = useMemo(() => {
    if (!isEmpty) {
      return (
        <SimpleGrid
          gridTemplateColumns={lendingRowGrid}
          columnGap={4}
          color='text.subtle'
          fontWeight='bold'
          fontSize='sm'
          px={mobilePadding}
        >
          <Text translation='pools.pool' />
          <Text translation='pools.balance' />
          <Flex display={mobileDisplay}>
            <Text translation='pools.earnings' />
          </Flex>
          <Flex display={largeDisplay}>
            <Text translation='pools.poolShare' />
          </Flex>
        </SimpleGrid>
      )
    }
  }, [isEmpty])

  return (
    <Main headerComponent={headerComponent}>
      <Stack>
        {renderHeader}
        {positionRows}
      </Stack>
    </Main>
  )
}
