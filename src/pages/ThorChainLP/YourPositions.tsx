import type { GridProps } from '@chakra-ui/react'
import { Button, Flex, SimpleGrid, Skeleton, Stack, Tag } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { thorchainAssetId } from '@shapeshiftoss/caip'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { getConfig } from 'config'
import uniq from 'lodash/uniq'
import { useCallback, useMemo } from 'react'
import { generatePath, useHistory } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { PoolsIcon } from 'components/Icons/Pools'
import { Main } from 'components/Layout/Main'
import { ResultsEmpty } from 'components/ResultsEmpty'
import { RawText, Text } from 'components/Text'
import { bn } from 'lib/bignumber/bignumber'
import type { ThornodePoolResponse } from 'lib/swapper/swappers/ThorchainSwapper/types'
import { assetIdToPoolAssetId } from 'lib/swapper/swappers/ThorchainSwapper/utils/poolAssetHelpers/poolAssetHelpers'
import { isSome } from 'lib/utils'
import { calculateEarnings, getEarnings } from 'lib/utils/thorchain/lp'
import { selectAssetById, selectMarketDataById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { PoolIcon } from './components/PoolIcon'
import { PoolsHeader } from './components/PoolsHeader'
import { useAllUserLpData } from './hooks/useAllUserLpData'
import { usePools } from './hooks/usePools'
import { useUserLpData } from './hooks/useUserLpData'

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
  apy: string
}

const PositionButton = ({ apy, assetId, name, opportunityId }: PositionButtonProps) => {
  const history = useHistory()
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const runeAsset = useAppSelector(state => selectAssetById(state, thorchainAssetId))

  const { data: userData, isLoading } = useUserLpData({ assetId })

  const foundUserPool = (userData ?? []).find(pool => pool.opportunityId === opportunityId)

  const handlePoolClick = useCallback(() => {
    if (!foundUserPool) return

    const { opportunityId, accountId } = foundUserPool
    history.push(
      generatePath('/pools/poolAccount/:accountId/:opportunityId', { accountId, opportunityId }),
    )
  }, [foundUserPool, history])

  const poolAssetIds = useMemo(() => {
    if (!foundUserPool) return []

    return [assetId, thorchainAssetId]
  }, [assetId, foundUserPool])

  const assetMarketData = useAppSelector(state => selectMarketDataById(state, assetId))
  const runeMarketData = useAppSelector(state => selectMarketDataById(state, thorchainAssetId))

  const { data: thornodePoolData } = useQuery({
    enabled: Boolean(foundUserPool),
    queryKey: ['thornodePoolData', foundUserPool?.assetId ?? ''],
    queryFn: async () => {
      const poolAssetId = assetIdToPoolAssetId({ assetId: foundUserPool?.assetId ?? '' })
      const { data: poolData } = await axios.get<ThornodePoolResponse>(
        `${getConfig().REACT_APP_THORCHAIN_NODE_URL}/lcd/thorchain/pool/${poolAssetId}`,
      )

      return poolData
    },
  })

  const { data: earnings } = useQuery({
    enabled: Boolean(foundUserPool && thornodePoolData),
    queryKey: ['thorchainearnings', foundUserPool?.dateFirstAdded ?? ''],
    queryFn: () =>
      foundUserPool ? getEarnings({ from: foundUserPool.dateFirstAdded }) : undefined,
    select: data => {
      if (!data || !foundUserPool || !thornodePoolData) return null
      const poolAssetId = assetIdToPoolAssetId({ assetId: foundUserPool.assetId })
      const foundHistoryPool = data.meta.pools.find(pool => pool.pool === poolAssetId)
      if (!foundHistoryPool) return null

      return calculateEarnings(
        foundHistoryPool.assetLiquidityFees,
        foundHistoryPool.runeLiquidityFees,
        foundUserPool.poolShare,
        runeMarketData.price,
        assetMarketData.price,
      )
    },
  })

  if (!foundUserPool || !asset || !runeAsset) return null

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
          <Skeleton isLoaded={!isLoading}>
            <Amount.Fiat value={foundUserPool.totalValueFiatUserCurrency} />
          </Skeleton>
          <Skeleton isLoaded={!isLoading}>
            <Amount.Crypto
              value={foundUserPool.underlyingAssetAmountCryptoPrecision}
              symbol={asset.symbol}
              fontSize='sm'
              color='text.subtle'
            />
            <Amount.Crypto
              value={foundUserPool.underlyingRuneAmountCryptoPrecision}
              symbol={runeAsset.symbol}
              fontSize='sm'
              color='text.subtle'
            />
          </Skeleton>
        </Stack>
        <Stack display={mobileDisplay} spacing={0}>
          <Skeleton isLoaded={!isLoading}>
            <Amount.Fiat value={earnings?.totalEarningsFiatUserCurrency ?? '0'} />
          </Skeleton>
          <Skeleton isLoaded={!isLoading}>
            <Amount.Crypto
              value={earnings?.assetEarnings ?? '0'}
              symbol={asset.symbol}
              fontSize='sm'
              color='text.subtle'
            />
          </Skeleton>
          <Skeleton isLoaded={!isLoading}>
            <Amount.Crypto
              value={earnings?.runeEarnings ?? '0'}
              symbol={'RUNE'}
              fontSize='sm'
              color='text.subtle'
            />
          </Skeleton>
        </Stack>
        <Skeleton isLoaded={!isLoading} display={largeDisplay}>
          <Amount.Percent
            options={{ maximumFractionDigits: 8 }}
            value={bn(foundUserPool.poolOwnershipPercentage).div(100).toFixed()}
          />
        </Skeleton>
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
  const allPositions = useAllUserLpData({ assetIds: poolAssetIds })
  const isLoading = allPositions.some(position => position.isLoading)

  const activePositions = useMemo(() => {
    return allPositions.filter(position => position.data?.positions.length)
  }, [allPositions])

  const isEmpty = false

  const positionRows = useMemo(() => {
    if (isLoading) return new Array(2).fill(null).map((_, i) => <Skeleton height={16} key={i} />)

    const rows = activePositions.map(position => {
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
              assetId={userPosition.assetId}
              name={parsedPool.name}
              opportunityId={userPosition.opportunityId}
              apy={parsedPool.poolAPY}
              key={userPosition.opportunityId}
            />
          )
        })
        .filter(isSome)
        .flat()
    })

    if (isEmpty) {
      return (
        <ResultsEmpty
          title='pools.yourPositions.emptyTitle'
          body='pools.yourPositions.emptyBody'
          icon={emptyIcon}
        />
      )
    }

    return rows
  }, [activePositions, emptyIcon, isEmpty, isLoading, parsedPools])

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
