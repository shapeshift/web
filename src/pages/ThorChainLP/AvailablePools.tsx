import type { GridProps } from '@chakra-ui/react'
import { Box, Button, Flex, SimpleGrid, Skeleton, Stack, Tag } from '@chakra-ui/react'
import { thorchainAssetId } from '@shapeshiftoss/caip'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { getConfig } from 'config'
import { useCallback, useMemo } from 'react'
import { generatePath, useHistory } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { Main } from 'components/Layout/Main'
import { RawText, Text } from 'components/Text'
import { assetIdToPoolAssetId } from 'lib/swapper/swappers/ThorchainSwapper/utils/poolAssetHelpers/poolAssetHelpers'
import { calculateTVL, getVolume } from 'lib/utils/thorchain/lp'
import type { MidgardSwapHistoryResponse } from 'lib/utils/thorchain/lp/types'
import { selectMarketDataById } from 'state/slices/marketDataSlice/selectors'
import { useAppSelector } from 'state/store'

import { PoolIcon } from './components/PoolIcon'
import { PoolsHeader } from './components/PoolsHeader'
import type { ParsedPool } from './hooks/usePools'
import { usePools } from './hooks/usePools'

export const lendingRowGrid: GridProps['gridTemplateColumns'] = {
  base: 'minmax(150px, 1fr) repeat(1, minmax(40px, max-content))',
  lg: '200px repeat(2, 1fr)',
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

type PoolButtonProps = {
  pool: ParsedPool
}

const PoolButton = ({ pool }: PoolButtonProps) => {
  const history = useHistory()

  const handlePoolClick = useCallback(() => {
    const { opportunityId } = pool
    history.push(generatePath('/pools/poolAccount/:opportunityId', { opportunityId }))
  }, [history, pool])

  const poolAssetIds = useMemo(() => {
    return [pool.assetId, thorchainAssetId]
  }, [pool.assetId])

  const runeMarketData = useAppSelector(state => selectMarketDataById(state, thorchainAssetId))

  const tvl = useMemo(
    () => calculateTVL(pool.assetDepth, pool.runeDepth, runeMarketData.price).tvl,
    [pool.assetDepth, pool.runeDepth, runeMarketData.price],
  )

  const { data: volume24H, isLoading: isVolume24HLoading } = useQuery({
    enabled: Boolean(pool.assetId),
    // The queryKey isn't a mistake here - the underlying endpoint that's used is the swaps endpoint for a specific period
    // getVolume, getFees, and get24hSwapChangePercentage all consume the same underlying endpoint
    // so we can cache the result of the query for all of them, and use the selector to derive the right data for each
    queryKey: ['midgardSwapsData', pool.assetId ?? '', '24h'],
    queryFn: async () => {
      const poolAssetId = assetIdToPoolAssetId({ assetId: pool.assetId })

      const now = Math.floor(Date.now() / 1000)
      const twentyFourHoursAgo = now - 24 * 60 * 60

      const from = twentyFourHoursAgo
      const to = now
      const { data } = await axios.get<MidgardSwapHistoryResponse>(
        `${
          getConfig().REACT_APP_MIDGARD_URL
        }/history/swaps?pool=${poolAssetId}&from=${from}&to=${to}`,
      )
      return data
    },

    select: data => getVolume(runeMarketData.price, data),
  })

  const { data: volume7D, isLoading: isVolume7DLoading } = useQuery({
    enabled: Boolean(pool.assetId),
    // The queryKey isn't a mistake here - the underlying endpoint that's used is the swaps endpoint for a specific period
    // getVolume, getFees, and get24hSwapChangePercentage all consume the same underlying endpoint
    // so we can cache the result of the query for all of them, and use the selector to derive the right data for each
    queryKey: ['midgardSwapsData', pool.assetId, '7d'],
    queryFn: async () => {
      const poolAssetId = assetIdToPoolAssetId({ assetId: pool.assetId })

      const now = Math.floor(Date.now() / 1000)
      const sevenDaysAgo = now - 7 * 24 * 60 * 60

      const from = sevenDaysAgo
      const to = now
      const { data } = await axios.get<MidgardSwapHistoryResponse>(
        `${
          getConfig().REACT_APP_MIDGARD_URL
        }/history/swaps?pool=${poolAssetId}&from=${from}&to=${to}`,
      )
      return data
    },

    select: data => getVolume(runeMarketData.price, data),
  })

  return (
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
        <Box minWidth='58px'>
          <PoolIcon assetIds={poolAssetIds} size='sm' />
        </Box>
        <RawText>{pool.name}</RawText>
        <Tag size='sm'>
          <Amount.Percent value={pool.poolAPY} />
        </Tag>
      </Flex>
      <Skeleton isLoaded={!!tvl}>
        <Amount.Fiat value={tvl} />
      </Skeleton>
      <Skeleton isLoaded={!isVolume24HLoading} display={mobileDisplay}>
        <Amount.Fiat value={volume24H ?? '0'} />
      </Skeleton>
      <Skeleton isLoaded={!isVolume7DLoading} display={largeDisplay}>
        <Amount.Fiat value={volume7D ?? '0'} />
      </Skeleton>
    </Button>
  )
}

export const AvailablePools = () => {
  const headerComponent = useMemo(() => <PoolsHeader />, [])
  const { data: parsedPools, isLoading } = usePools()
  const renderRows = useMemo(() => {
    if (isLoading) return new Array(2).fill(null).map(() => <Skeleton height={16} />)
    return parsedPools?.map(pool => <PoolButton key={pool.opportunityId} pool={pool} />)
  }, [isLoading, parsedPools])
  return (
    <Main headerComponent={headerComponent}>
      <Stack>
        <SimpleGrid
          gridTemplateColumns={lendingRowGrid}
          columnGap={4}
          color='text.subtle'
          fontWeight='bold'
          fontSize='sm'
          px={mobilePadding}
        >
          <Text translation='pools.pool' />

          <Text translation='pools.tvl' />
          <Flex display={mobileDisplay}>
            <Text translation='pools.volume24h' />
          </Flex>
          <Flex display={largeDisplay}>
            <Text translation='pools.volume7d' />
          </Flex>
        </SimpleGrid>
        <Stack mx={listMargin}>{renderRows}</Stack>
      </Stack>
    </Main>
  )
}
