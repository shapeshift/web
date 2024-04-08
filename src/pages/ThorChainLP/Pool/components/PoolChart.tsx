import { Button, ButtonGroup, Center, Flex, Stack } from '@chakra-ui/react'
import { useQuery } from '@tanstack/react-query'
import type { SingleValueData, UTCTimestamp } from 'lightweight-charts'
import { useCallback, useMemo, useState } from 'react'
import { reactQueries } from 'react-queries'
import type { Interval } from 'react-queries/queries/midgard'
import { SimpleChart } from 'components/SimpleChart'
import { fromThorBaseUnit } from 'lib/utils/thorchain'
import type {
  MidgardSwapHistoryResponse,
  MidgardTvlHistoryResponse,
} from 'lib/utils/thorchain/lp/types'
import { selectUserCurrencyToUsdRate } from 'state/slices/selectors'
import { store } from 'state/store'

const swapHistoryToChartData = (
  swapHistory: MidgardSwapHistoryResponse | undefined,
): SingleValueData[] => {
  if (!swapHistory) return []

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

// @ts-ignore we can't make this a partial record as we need to use this as a tuple to spread as useQuery params
const INTERVAL_PARAMS_BY_INTERVAL: Record<Interval | 'all', [Interval, number]> = {
  day: ['hour', 24],
  week: ['hour', 24 * 7],
  month: ['day', 7 * 4],
  all: ['month', 24],
}

type PoolChartProps = {
  thorchainNotationAssetId: string
}
export const PoolChart = ({ thorchainNotationAssetId }: PoolChartProps) => {
  const [selectedInterval, setSelectedInterval] = useState<Interval | 'all'>('day')
  const [selectedDataType, setSelectedDataType] = useState<'volume' | 'liquidity'>('volume')

  const setSelectedVolumeDataType = useCallback(() => setSelectedDataType('volume'), [])
  const setSelectedLiquidityDataType = useCallback(() => setSelectedDataType('liquidity'), [])

  const { data: swapsData } = useQuery({
    ...reactQueries.midgard.swapsData(
      thorchainNotationAssetId,
      ...INTERVAL_PARAMS_BY_INTERVAL[selectedInterval],
    ),
    select: data => swapHistoryToChartData(data),
  })

  const { data: tvl } = useQuery({
    ...reactQueries.midgard.tvl(...INTERVAL_PARAMS_BY_INTERVAL[selectedInterval]),
    select: data => tvlToChartData(data, thorchainNotationAssetId),
  })

  const data = useMemo(() => {
    const maybeData = selectedDataType === 'volume' ? swapsData : tvl
    return maybeData ?? []
  }, [selectedDataType, swapsData, tvl])

  return (
    <Stack spacing={4}>
      <Flex justifyContent='space-between' alignItems='center' p={4}>
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
                // eslint-disable-next-line react-memo/require-usememo
                onClick={() => setSelectedInterval(interval as Interval)}
                variant={selectedInterval === interval ? 'solid' : 'outline'}
              >
                {label}
              </Button>
            )
          })}
        </ButtonGroup>
      </Flex>
      <Center flex='1' flexDirection='column'>
        <SimpleChart data={data} />
      </Center>
    </Stack>
  )
}
