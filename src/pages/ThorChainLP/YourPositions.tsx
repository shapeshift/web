import type { GridProps } from '@chakra-ui/react'
import { Box, Button, Flex, SimpleGrid, Skeleton, Stack, Tag } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { thorchainAssetId } from '@shapeshiftoss/caip'
import { useQuery } from '@tanstack/react-query'
import uniq from 'lodash/uniq'
import { useCallback, useMemo } from 'react'
import { reactQueries } from 'react-queries'
import { generatePath, useHistory } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { PoolsIcon } from 'components/Icons/Pools'
import { Main } from 'components/Layout/Main'
import { ResultsEmpty } from 'components/ResultsEmpty'
import { RawText, Text } from 'components/Text'
import { bn } from 'lib/bignumber/bignumber'
import { assetIdToPoolAssetId } from 'lib/swapper/swappers/ThorchainSwapper/utils/poolAssetHelpers/poolAssetHelpers'
import { isSome } from 'lib/utils'
import { calculateEarnings } from 'lib/utils/thorchain/lp'
import type { UserLpDataPosition } from 'lib/utils/thorchain/lp/types'
import { selectAssetById, selectMarketDataById } from 'state/slices/selectors'
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
  assetId: AssetId
  name: string
  opportunityId: string
  accountId: string
  apy: string
  userPoolData: UserLpDataPosition
}

const PositionButton = ({
  apy,
  assetId,
  name,
  accountId,
  opportunityId,
  userPoolData,
}: PositionButtonProps) => {
  const history = useHistory()
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const runeAsset = useAppSelector(state => selectAssetById(state, thorchainAssetId))

  const handlePoolClick = useCallback(() => {
    history.push(
      generatePath('/pools/poolAccount/:accountId/:opportunityId', { accountId, opportunityId }),
    )
  }, [accountId, history, opportunityId])

  const poolAssetIds = useMemo(() => {
    return [assetId, thorchainAssetId]
  }, [assetId])

  const assetMarketData = useAppSelector(state => selectMarketDataById(state, assetId))
  const runeMarketData = useAppSelector(state => selectMarketDataById(state, thorchainAssetId))

  const { data: earnings, isLoading: isEarningsLoading } = useQuery({
    ...reactQueries.thorchainLp.earnings(userPoolData.dateFirstAdded),
    // @lukemorales/query-key-factory only returns queryFn and queryKey - all others will be ignored in the returned object
    // No staleTime, meaning cache-then-fresh (or fresh if now > garbage collection time)
    // That ensures new active listeners always get fresh earnings data
    staleTime: 0,
    select: data => {
      if (!data) return null
      const poolAssetId = assetIdToPoolAssetId({ assetId })
      const foundHistoryPool = data.meta.pools.find(pool => pool.pool === poolAssetId)
      if (!foundHistoryPool) return null

      return calculateEarnings(
        foundHistoryPool.assetLiquidityFees,
        foundHistoryPool.runeLiquidityFees,
        userPoolData.poolShare,
        runeMarketData.price,
        assetMarketData.price,
      )
    },
  })

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
          <RawText>{name}</RawText>
          <Tag size='sm'>
            <Amount.Percent value={apy} />
          </Tag>
        </Flex>
        <Stack spacing={0} alignItems={alignItems}>
          <Amount.Fiat value={userPoolData.totalValueFiatUserCurrency} />
          <Amount.Crypto
            value={userPoolData.underlyingAssetAmountCryptoPrecision}
            symbol={asset.symbol}
            fontSize='sm'
            color='text.subtle'
          />
          <Amount.Crypto
            value={userPoolData.underlyingRuneAmountCryptoPrecision}
            symbol={runeAsset.symbol}
            fontSize='sm'
            color='text.subtle'
          />
        </Stack>
        <Stack display={mobileDisplay} spacing={0}>
          <Skeleton isLoaded={!isEarningsLoading}>
            <Amount.Fiat value={earnings?.totalEarningsFiatUserCurrency ?? '0'} />
          </Skeleton>
          <Skeleton isLoaded={!isEarningsLoading}>
            <Amount.Crypto
              value={earnings?.assetEarnings ?? '0'}
              symbol={asset.symbol}
              fontSize='sm'
              color='text.subtle'
            />
          </Skeleton>
          <Skeleton isLoaded={!isEarningsLoading}>
            <Amount.Crypto
              value={earnings?.runeEarnings ?? '0'}
              symbol={'RUNE'}
              fontSize='sm'
              color='text.subtle'
            />
          </Skeleton>
        </Stack>
        <Box display={largeDisplay}>
          <Amount.Percent
            options={{ maximumFractionDigits: 8 }}
            value={bn(userPoolData.poolOwnershipPercentage).div(100).toFixed()}
          />
        </Box>
      </Button>
    </Stack>
  )
}

export const YourPositions = () => {
  const headerComponent = useMemo(() => <PoolsHeader />, [])
  const emptyIcon = useMemo(() => <PoolsIcon />, [])

  const { data: parsedPools } = usePools()
  const poolAssetIds = useMemo(
    () => uniq((parsedPools ?? []).map(pool => pool.assetId)),
    [parsedPools],
  )
  const allUserLpData = useAllUserLpData({ assetIds: poolAssetIds })
  // If some are loading, we are loading, but that's not it yet, we also need to check if some are not loaded
  const someLoading = useMemo(
    () => allUserLpData.some(position => position.isLoading),
    [allUserLpData],
  )
  // If we have some position data, then *some* is loaded, which means we can instantly display the data but
  // should still display skeleton for the others that are still loading
  const someLoaded = useMemo(
    () => allUserLpData.length && allUserLpData.some(query => Boolean(query.isSuccess)),
    [allUserLpData],
  )

  const activePositions = useMemo(() => {
    return allUserLpData.filter(query => query.data?.positions.length)
  }, [allUserLpData])

  const allLoaded = useMemo(() => {
    return allUserLpData.length && allUserLpData.every(query => query.isSuccess)
  }, [allUserLpData])

  const isEmpty = useMemo(() => allLoaded && !activePositions.length, [allLoaded, activePositions])

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

    const rows = someLoaded
      ? activePositions.map(position => {
          // This should never happen because of isLoading above but just for type safety
          if (!position.data) return null
          if (!position.data.positions.length) return null

          return position.data.positions
            .map(userPosition => {
              if (!userPosition) return null

              const parsedPool = parsedPools?.find(
                pool =>
                  pool.assetId === userPosition.assetId && pool.asymSide === userPosition.asymSide,
              )

              if (!parsedPool) return null

              return (
                <PositionButton
                  accountId={userPosition.accountId}
                  assetId={userPosition.assetId}
                  name={parsedPool.name}
                  opportunityId={userPosition.opportunityId}
                  apy={parsedPool.poolAPY}
                  key={userPosition.opportunityId}
                  userPoolData={userPosition}
                />
              )
            })
            .filter(isSome)
            .flat()
        })
      : []

    return rows.concat(someLoading ? skeletons : [])
  }, [activePositions, emptyIcon, isEmpty, parsedPools, someLoaded, someLoading])

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
            <Text translation='pools.unclaimedFees' />
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
