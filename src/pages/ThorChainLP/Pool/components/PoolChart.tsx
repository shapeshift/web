import { Button, ButtonGroup, Center, Flex, Stack } from '@chakra-ui/react'
import { useQuery } from '@tanstack/react-query'
import type { SingleValueData, UTCTimestamp } from 'lightweight-charts'
import { useCallback, useMemo, useState } from 'react'

import { ChartSkeleton } from '@/components/SimpleChart/LoadingChart'
import { SimpleChart } from '@/components/SimpleChart/SimpleChart'
import { fromThorBaseUnit } from '@/lib/utils/thorchain'
import type {
  MidgardSwapHistoryResponse,
  MidgardTvlHistoryResponse,
} from '@/lib/utils/thorchain/lp/types'
import { reactQueries } from '@/react-queries'
import { selectUserCurrencyToUsdRate } from '@/state/slices/selectors'
import { store } from '@/state/store'

type ChartIntervalKey = 'day' | 'week' | 'month' | 'all'
type ChartIntervalValue = 'hour' | 'day' | 'month'

const swapHistoryToChartData = (swapHistory: MidgardSwapHistoryResponse): SingleValueData[] => {
  const userCurrencyToUsdRate = selectUserCurrencyToUsdRate(store.getState())

  return swapHistory.intervals.map(interval => {
    const intervalVolumeFiatUserCurrency = fromThorBaseUnit(interval.totalVolume)
      .times(interval.runePriceUSD)
      .times(userCurrencyToUsdRate)

    return {
      time: Number(interval.startTime) as UTCTimestamp,
      value: intervalVolumeFiatUserCurrency.toNumber(),
    }
  })
}

const tvlToChartData = (
  tvl: MidgardTvlHistoryResponse,
  thorchainNotationAssetId: string,
): SingleValueData[] =>
  tvl.intervals.map(interval => {
    const userCurrencyToUsdRate = selectUserCurrencyToUsdRate(store.getState())
    const poolDepth = interval.poolsDepth.find(pool => pool.pool === thorchainNotationAssetId)
    const poolTotalDepth = poolDepth?.totalDepth ?? '0'

    const tvlFiat = fromThorBaseUnit(poolTotalDepth)
      .times(interval.runePriceUSD)
      .times(userCurrencyToUsdRate)

    return {
      time: Number(interval.startTime) as UTCTimestamp,
      value: tvlFiat.toNumber(),
    }
  })

const INTERVAL_PARAMS_BY_INTERVAL: Record<ChartIntervalKey, [ChartIntervalValue, number]> = {
  day: ['hour', 24],
  week: ['day', 7],
  month: ['day', 30],
  all: ['month', 24],
}

type PoolChartProps = {
  thorchainNotationAssetId: string
}
export const PoolChart = ({ thorchainNotationAssetId }: PoolChartProps) => {
  const [selectedInterval, setSelectedInterval] = useState<ChartIntervalKey>('day')
  const [selectedDataType, setSelectedDataType] = useState<'volume' | 'liquidity'>('volume')
  const seriesType = useMemo(
    () => (selectedDataType === 'volume' ? 'Histogram' : 'Area'),
    [selectedDataType],
  )

  const setSelectedVolumeDataType = useCallback(() => setSelectedDataType('volume'), [])
  const setSelectedLiquidityDataType = useCallback(() => setSelectedDataType('liquidity'), [])

  const { data: swapsData, isLoading: isSwapsDataLoading } = useQuery({
    ...reactQueries.midgard.swapsData(
      thorchainNotationAssetId,
      ...INTERVAL_PARAMS_BY_INTERVAL[selectedInterval],
    ),
    select: data => swapHistoryToChartData(data),
  })

  const { data: tvl, isLoading: isTvlLoading } = useQuery({
    ...reactQueries.midgard.tvl(...INTERVAL_PARAMS_BY_INTERVAL[selectedInterval]),
    select: data => tvlToChartData(data, thorchainNotationAssetId),
  })

  const data = useMemo(() => {
    const maybeData = selectedDataType === 'volume' ? swapsData : tvl
    return maybeData ?? []
  }, [selectedDataType, swapsData, tvl])

  const isLoading = useMemo(
    () => (selectedDataType === 'volume' ? isSwapsDataLoading : isTvlLoading),
    [isSwapsDataLoading, isTvlLoading, selectedDataType],
  )

  const chartBody = useMemo(() => {
    if (isLoading) {
      return <ChartSkeleton type={seriesType} height={450} />
    }
    return (
      <SimpleChart data={data} seriesType={seriesType} height={450} interval={selectedInterval} />
    )
  }, [data, isLoading, selectedInterval, seriesType])

  return (
    <Stack spacing={4}>
      <Flex justifyContent='space-between' alignItems='center' py={2}>
        <ButtonGroup size='sm'>
          <Button isActive={selectedDataType === 'volume'} onClick={setSelectedVolumeDataType}>
            Volume
          </Button>
          <Button
            isActive={selectedDataType === 'liquidity'}
            onClick={setSelectedLiquidityDataType}
          >
            Liquidity
          </Button>
        </ButtonGroup>
        <ButtonGroup size='sm'>
          {Object.keys(INTERVAL_PARAMS_BY_INTERVAL).map(interval => {
            const label =
              interval === 'all'
                ? 'All'
                : // For all others, we should only keep the first char, as uppercase
                  interval.charAt(0).toUpperCase()

            return (
              <Button
                key={interval}
                onClick={() => setSelectedInterval(interval as ChartIntervalKey)}
                variant={selectedInterval === interval ? 'solid' : 'outline'}
              >
                {label}
              </Button>
            )
          })}
        </ButtonGroup>
      </Flex>
      <Center flex='1' flexDirection='column'>
        {chartBody}
      </Center>
    </Stack>
  )
}
