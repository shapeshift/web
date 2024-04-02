import { Button, ButtonGroup, Center, Flex, Stack } from '@chakra-ui/react'
import { thorchainAssetId } from '@shapeshiftoss/caip'
import { useQuery } from '@tanstack/react-query'
import { ColorType, createChart } from 'lightweight-charts'
import { useEffect, useRef, useState } from 'react'
import { reactQueries } from 'react-queries'
import type { Interval } from 'react-queries/queries/midgard'
import { fromThorBaseUnit } from 'lib/utils/thorchain'
import type { MidgardSwapHistoryResponse } from 'lib/utils/thorchain/lp/types'
import { selectMarketDataByAssetIdUserCurrency } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

const intervalsToChartData = (
  swapHistory: MidgardSwapHistoryResponse | undefined,
  runePrice: string,
) => {
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

const INTERVAL_PARAMS_BY_INTERVAL: Record<Interval, [Interval, number]> = {
  day: ['hour', 24],
  week: ['hour', 24 * 7],
  month: ['day', 7 * 4],
  // TODO(gomes): add this as a union
  // all: 24 * 7 * 4, // TODO: we may or may not want to do something nicer for all?
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

  const [selectedInterval, setSelectedInterval] = useState<Interval>('day')

  const runeMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, thorchainAssetId),
  )

  // TODO(gomes): handle loading state
  const { isLoading: isSwapsDataLoading, data: swapsData } = useQuery({
    // TODO(gomes): programmatic, make this work for month week etc
    ...reactQueries.midgard.swapsData(pool.asset, ...INTERVAL_PARAMS_BY_INTERVAL[selectedInterval]),
    select: data => intervalsToChartData(data, runeMarketData.price),
  })

  return (
    <Stack spacing={4}>
      <Flex justifyContent='space-between' alignItems='center' p={4}>
        <ButtonGroup size='sm' isDisabled>
          <Button>Volume</Button>
          <Button>Liquidity</Button>
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
        <ChartComponent data={swapsData} />
      </Center>
    </Stack>
  )
}
