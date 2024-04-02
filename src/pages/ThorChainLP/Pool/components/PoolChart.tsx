import { Button, ButtonGroup, Center, Flex, Stack } from '@chakra-ui/react'
import { thorchainAssetId } from '@shapeshiftoss/caip'
import { useQuery } from '@tanstack/react-query'
import type { SingleValueData } from 'lightweight-charts'
import { ColorType, createChart } from 'lightweight-charts'
import { useEffect, useRef, useState } from 'react'
import { reactQueries } from 'react-queries'
import type { Interval } from 'react-queries/queries/midgard'
import { fromThorBaseUnit } from 'lib/utils/thorchain'
import type {
  MidgardSwapHistoryResponse,
  MidgardTvlHistoryResponse,
} from 'lib/utils/thorchain/lp/types'
import { selectMarketDataByAssetIdUserCurrency } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

const swapHistoryToChartData = (
  swapHistory: MidgardSwapHistoryResponse | undefined,
  runePrice: string,
): SingleValueData<number>[] => {
  if (!swapHistory) return []

  return swapHistory.intervals.map(interval => {
    const intervalVolume2FiatUserCurrency = fromThorBaseUnit(interval.totalVolume)
      .times(runePrice)
      .toFixed()

    return {
      time: Number(interval.startTime),
      value: Number(intervalVolume2FiatUserCurrency),
    }
  })
}

const tvlToChartData = (
  tvl: MidgardTvlHistoryResponse,
  runePrice: string,
): SingleValueData<number>[] =>
  tvl.intervals.map(interval => {
    // TODO(gomes): programmatic
    const poolDepth = interval.poolsDepth.find(pool => pool.pool === 'BTC.BTC')
    const poolTotalDepth = poolDepth?.totalDepth ?? '0'

    const tvlFiat = fromThorBaseUnit(poolTotalDepth).times(runePrice).toFixed()
    return {
      time: Number(interval.startTime),
      value: Number(tvlFiat),
    }
  })

const INTERVAL_PARAMS_BY_INTERVAL: Record<Interval | 'all', [Interval, number]> = {
  // 7 days in 1 hour intervals
  day: ['day', 24 * 7],
  week: ['hour', 24 * 7],
  month: ['day', 7 * 4],
  all: ['month', 24],
}

const backgroundColor = 'rgba(188, 214, 240, 0.04)'
const lineColor = '#2962FF'
const textColor = 'white'
const areaTopColor = 'rgba(41, 98, 255, 0.5)'
const areaBottomColor = 'rgba(41, 98, 255, 0.28)'

export const ChartComponent = ({ data }: { data: any }) => {
  const chartContainerRef = useRef(null)

  useEffect(() => {
    // TODO(gomes): we should pass data as props to keep things programmatic
    if (chartContainerRef.current && data) {
      const chart = createChart(chartContainerRef.current, {
        grid: {
          vertLines: {
            color: 'rgba(42, 46, 57, 0.5)',
          },
          horzLines: {
            color: 'rgba(42, 46, 57, 0.5)',
          },
        },
        layout: {
          background: { type: ColorType.Solid, color: backgroundColor },
          textColor,
        },
        width: chartContainerRef.current.offsetWidth,
        height: chartContainerRef.current.offsetHeight,
      })
      const newSeries = chart.addAreaSeries({
        lineColor,
        topColor: areaTopColor,
        bottomColor: areaBottomColor,
      })
      newSeries.setData(data)
      chart.timeScale().fitContent()

      const handleResize = () => {
        chart.applyOptions({
          width: chartContainerRef.current.offsetWidth,
          height: chartContainerRef.current.offsetHeight,
        })
      }

      window.addEventListener('resize', handleResize)

      return () => {
        window.removeEventListener('resize', handleResize)
        chart.remove()
      }
    }
  }, [data])

  return <div ref={chartContainerRef} style={{ width: '100%', height: '500px' }} /> // Set a minimum height for the chart
}

export const PoolChart = () => {
  // TODO(gomes): programmatic
  const pool = {
    asset: 'BTC.BTC',
  }

  const [selectedInterval, setSelectedInterval] = useState<Interval | 'all'>('day')
  const [selectedDataType, setSelectedDataType] = useState<'volume' | 'liquidity'>('volume')

  const runeMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, thorchainAssetId),
  )

  const { data: swapsData } = useQuery({
    ...reactQueries.midgard.swapsData(pool.asset, ...INTERVAL_PARAMS_BY_INTERVAL[selectedInterval]),
    select: data => swapHistoryToChartData(data, runeMarketData.price),
  })

  const { data: tvl } = useQuery({
    ...reactQueries.midgard.tvl(...INTERVAL_PARAMS_BY_INTERVAL[selectedInterval]),
    select: data => tvlToChartData(data, runeMarketData.price),
  })

  return (
    <Stack spacing={4}>
      <Flex justifyContent='space-between' alignItems='center' p={4}>
        <ButtonGroup size='sm'>
          <Button
            isActive={selectedDataType === 'volume'}
            onClick={() => setSelectedDataType('volume')}
          >
            Volume
          </Button>
          <Button
            isActive={selectedDataType === 'liquidity'}
            onClick={() => setSelectedDataType('liquidity')}
          >
            Liquidity
          </Button>
        </ButtonGroup>
        <ButtonGroup size='sm'>
          {Object.keys(INTERVAL_PARAMS_BY_INTERVAL).map(interval => (
            <Button
              key={interval}
              onClick={() => setSelectedInterval(interval as Interval)}
              variant={selectedInterval === interval ? 'solid' : 'outline'}
            >
              {interval.toUpperCase()}
            </Button>
          ))}
        </ButtonGroup>
      </Flex>
      <Center flex='1' flexDirection='column'>
        <ChartComponent data={selectedDataType === 'volume' ? swapsData : tvl} />
      </Center>
    </Stack>
  )
}
