import type { GridProps, ResponsiveValue } from '@chakra-ui/react'
import { Box, Button, Flex, SimpleGrid, Skeleton, Stack, Tag, TagLeftIcon } from '@chakra-ui/react'
import type { ChainId } from '@shapeshiftoss/caip'
import { assetIdToChainId, thorchainAssetId } from '@shapeshiftoss/caip'
import { SwapperName } from '@shapeshiftoss/swapper'
import { useQuery } from '@tanstack/react-query'
import type { Property } from 'csstype'
import { useCallback, useEffect, useMemo } from 'react'
import { reactQueries } from 'react-queries'
import { useIsTradingActive } from 'react-queries/hooks/useIsTradingActive'
import { generatePath, useHistory } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { CircleIcon } from 'components/Icons/Circle'
import { RawText, Text } from 'components/Text'
import { selectMarketDataById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { PoolIcon } from './components/PoolIcon'
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

const assetCellDirection: ResponsiveValue<Property.FlexDirection> = {
  base: 'column',
  lg: 'row',
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
  const runeMarketData = useAppSelector(state => selectMarketDataById(state, thorchainAssetId))

  const { data: swapsData } = useQuery({
    ...reactQueries.midgard.swapsData(pool.asset, 'hour', 7 * 24),
    select: selectSwapsData,
  })

  const volumeStats = useMemo(() => {
    if (!swapsData) return
    return getVolumeStats(swapsData, runeMarketData.price)
  }, [swapsData, runeMarketData.price])

  const { isTradingActive, isLoading: isTradingActiveLoading } = useIsTradingActive({
    assetId: pool?.assetId,
    enabled: !!pool,
    swapperName: SwapperName.Thorchain,
  })

  const handlePoolClick = useCallback(() => {
    history.push(generatePath('/pools/:poolAssetId', { poolAssetId: pool.asset }))
  }, [history, pool.asset])

  const poolAssetIds = useMemo(() => [pool.assetId, thorchainAssetId], [pool.assetId])

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
        <Flex flexWrap='wrap' rowGap={2} columnGap={4} flexDir={assetCellDirection}>
          <RawText>{pool.name}</RawText>
          <Skeleton isLoaded={!isTradingActiveLoading}>
            <Tag size='sm'>
              <TagLeftIcon as={CircleIcon} boxSize='8px' color={statusContent.color} />
              {statusContent.element}
            </Tag>
          </Skeleton>
        </Flex>
      </Flex>
      <Amount.Fiat value={pool.tvlFiat} />
      <Skeleton isLoaded={!!volumeStats} display={mobileDisplay}>
        <Amount.Fiat value={volumeStats?.volume24hFiat ?? '0'} />
      </Skeleton>
      <Skeleton isLoaded={!!volumeStats} display={largeDisplay}>
        <Amount.Fiat value={volumeStats?.volume7dFiat ?? '0'} />
      </Skeleton>
    </Button>
  )
}

type AvailablePoolsProps = {
  searchQuery?: string
  setChainIds?: (chainIds: ChainId[] | []) => void
  filterByChainId?: ChainId
}

export const AvailablePools: React.FC<AvailablePoolsProps> = ({
  searchQuery,
  setChainIds,
  filterByChainId,
}) => {
  const { data: pools, isLoading } = usePools()

  const filteredByChainId = useMemo(() => {
    if (!filterByChainId) return pools
    return pools?.filter(pool => assetIdToChainId(pool.assetId) === filterByChainId)
  }, [filterByChainId, pools])

  const filteredPools = useMemo(() => {
    if (!searchQuery) return filteredByChainId
    return filteredByChainId?.filter(pool => {
      const lowerCaseQuery = searchQuery.toUpperCase()
      return pool.name.includes(lowerCaseQuery)
    })
  }, [filteredByChainId, searchQuery])

  const renderRows = useMemo(() => {
    if (isLoading) return new Array(2).fill(null).map((_, i) => <Skeleton key={i} height={16} />)
    return filteredPools?.map(pool => <PoolButton key={pool.asset} pool={pool} />)
  }, [filteredPools, isLoading])

  useEffect(() => {
    if (!setChainIds) return

    const uniqueChainIds = new Set(pools?.map(pool => assetIdToChainId(pool.assetId)) ?? [])
    // If you need it back as an array:
    const chainIdsArray = Array.from(uniqueChainIds)

    setChainIds(chainIdsArray)
  }, [pools, setChainIds])

  return (
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
  )
}
