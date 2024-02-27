import type { GridProps } from '@chakra-ui/react'
import { Box, Button, Flex, SimpleGrid, Skeleton, Stack, Tag, TagLeftIcon } from '@chakra-ui/react'
import { thorchainAssetId } from '@shapeshiftoss/caip'
import { SwapperName } from '@shapeshiftoss/swapper'
import { useQuery } from '@tanstack/react-query'
import { useCallback, useMemo } from 'react'
import { reactQueries } from 'react-queries'
import { useIsTradingActive } from 'react-queries/hooks/useIsTradingActive'
import { generatePath, useHistory } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { CircleIcon } from 'components/Icons/Circle'
import { Main } from 'components/Layout/Main'
import { RawText, Text } from 'components/Text'
import { getVolume } from 'lib/utils/thorchain/lp'
import { selectMarketDataById } from 'state/slices/marketDataSlice/selectors'
import { useAppSelector } from 'state/store'

import { PoolIcon } from './components/PoolIcon'
import { PoolsHeader } from './components/PoolsHeader'
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
  pool: Pool
}

const PoolButton = ({ pool }: PoolButtonProps) => {
  const history = useHistory()

  const { isTradingActive, isLoading: isTradingActiveLoading } = useIsTradingActive({
    assetId: pool?.assetId,
    enabled: !!pool,
    swapperName: SwapperName.Thorchain,
  })

  const handlePoolClick = useCallback(() => {
    history.push(generatePath('/pools/:poolAssetId', { poolAssetId: pool.asset }))
  }, [history, pool.asset])

  const poolAssetIds = useMemo(() => [pool.assetId, thorchainAssetId], [pool.assetId])

  const runeMarketData = useAppSelector(state => selectMarketDataById(state, thorchainAssetId))

  const { data: volume24H, isLoading: isVolume24HLoading } = useQuery({
    ...reactQueries.midgard.swapsData(pool.assetId, '24h'),
    select: data => getVolume(runeMarketData.price, data),
  })

  const { data: volume7D, isLoading: isVolume7DLoading } = useQuery({
    ...reactQueries.midgard.swapsData(pool.assetId, '7d'),
    // @lukemorales/query-key-factory only returns queryFn and queryKey - all others will be ignored in the returned object
    staleTime: Infinity,
    select: data => getVolume(runeMarketData.price, data),
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
        <Skeleton isLoaded={!isTradingActiveLoading}>
          <Tag size='sm'>
            <TagLeftIcon as={CircleIcon} boxSize='8px' color={statusContent.color} />
            {statusContent.element}
          </Tag>
        </Skeleton>
      </Flex>
      <Amount.Fiat value={pool.tvlFiat} />
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
  const { data: pools, isLoading } = usePools()

  const headerComponent = useMemo(() => <PoolsHeader />, [])

  const renderRows = useMemo(() => {
    if (isLoading) return new Array(2).fill(null).map((_, i) => <Skeleton key={i} height={16} />)
    return pools?.map(pool => <PoolButton key={pool.asset} pool={pool} />)
  }, [isLoading, pools])

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
