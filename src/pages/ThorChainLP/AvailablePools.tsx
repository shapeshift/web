import type { GridProps } from '@chakra-ui/react'
import { Box, Button, Flex, SimpleGrid, Skeleton, Stack, Tag, Tooltip } from '@chakra-ui/react'
import { thorchainAssetId } from '@shapeshiftoss/caip'
import { SwapperName } from '@shapeshiftoss/swapper'
import { useQuery } from '@tanstack/react-query'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { reactQueries } from 'react-queries'
import { useIsTradingActive } from 'react-queries/hooks/useIsTradingActive'
import { generatePath, useHistory } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { Main } from 'components/Layout/Main'
import { RawText, Text } from 'components/Text'
import { selectMarketDataById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { PoolIcon } from './components/PoolIcon'
import { PoolsHeader } from './components/PoolsHeader'
import { getVolumeStats, selectSwapsData } from './queries/hooks/usePool'
import type { Pool } from './queries/hooks/usePools'
import { usePools } from './queries/hooks/usePools'

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
  pool: Pool
}

const PoolButton = ({ pool }: PoolButtonProps) => {
  const history = useHistory()
  const translate = useTranslate()
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
          <Amount.Percent value={pool.annualPercentageRate} />
        </Tag>
        <Skeleton isLoaded={!isTradingActiveLoading}>
          {isTradingActive === true && pool.status === 'available' && (
            <Tag colorScheme='green'>
              <Text translation='common.available' />
            </Tag>
          )}
          {isTradingActive === true && pool.status === 'staged' && (
            <Tooltip label={translate('pools.stagedTooltip')} hasArrow>
              <Tag colorScheme='yellow'>
                <Text translation='common.staged' />
              </Tag>
            </Tooltip>
          )}
          {isTradingActive === false && (
            <Tag colorScheme='red'>
              <Text translation='common.halted' />
            </Tag>
          )}
        </Skeleton>
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
