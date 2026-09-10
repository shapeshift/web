import { Button, ButtonGroup, Center, Flex, Stack } from '@chakra-ui/react'
import { useQuery } from '@tanstack/react-query'
import type { HistogramData, UTCTimestamp } from 'lightweight-charts'
import { useMemo, useState } from 'react'

import { ChartSkeleton } from '@/components/SimpleChart/LoadingChart'
import { RateChart } from '@/components/SimpleChart/RateChart'
import type { ChartInterval } from '@/components/SimpleChart/utils'
import type { LendingPoolStatPoint } from '@/lib/chainflip/lpServiceApi'
import type { ChainflipAssetSymbol } from '@/lib/chainflip/types'
import { reactQueries } from '@/react-queries'

const SECONDS_PER_DAY = 86400
const SECONDS_PER_WEEK = SECONDS_PER_DAY * 7

type ChartWindowKey = '1w' | '1m' | '6m' | 'ytd'

const WINDOW_PARAMS_BY_KEY: Record<
  ChartWindowKey,
  { sinceMs: number | null; chartInterval: ChartInterval; bucketSecs: number }
> = {
  '1w': { sinceMs: 7 * 24 * 60 * 60 * 1000, chartInterval: 'day', bucketSecs: SECONDS_PER_DAY },
  '1m': { sinceMs: 30 * 24 * 60 * 60 * 1000, chartInterval: 'week', bucketSecs: SECONDS_PER_DAY },
  '6m': {
    sinceMs: 180 * 24 * 60 * 60 * 1000,
    chartInterval: 'month',
    bucketSecs: SECONDS_PER_WEEK,
  },
  ytd: { sinceMs: null, chartInterval: 'year', bucketSecs: SECONDS_PER_WEEK },
}

const getSinceIso = (windowKey: ChartWindowKey): string => {
  const { sinceMs } = WINDOW_PARAMS_BY_KEY[windowKey]
  if (sinceMs === null) {
    const now = new Date()
    return new Date(now.getFullYear(), 0, 1).toISOString()
  }
  return new Date(Date.now() - sinceMs).toISOString()
}

// projectedApy is already a percent string (e.g. "2.817300..."), bucket by averaging
const bucketData = (nodes: LendingPoolStatPoint[], bucketSecs: number): HistogramData[] => {
  const buckets = new Map<number, number[]>()
  for (const node of nodes) {
    const t = Math.floor(new Date(node.timestamp).getTime() / 1000)
    const bucketStart = Math.floor(t / bucketSecs) * bucketSecs
    const values = buckets.get(bucketStart) ?? []
    values.push(parseFloat(node.projectedApy))
    buckets.set(bucketStart, values)
  }
  return Array.from(buckets.entries())
    .sort(([a], [b]) => a - b)
    .map(([time, values]) => ({
      time: time as UTCTimestamp,
      value: values.reduce((sum, v) => sum + v, 0) / values.length,
    }))
}

type SupplyRateChartProps = {
  asset: ChainflipAssetSymbol
}

export const SupplyRateChart = ({ asset }: SupplyRateChartProps) => {
  const [selectedWindow, setSelectedWindow] = useState<ChartWindowKey>('1w')

  const sinceIso = useMemo(() => getSinceIso(selectedWindow), [selectedWindow])
  const { chartInterval, bucketSecs } = WINDOW_PARAMS_BY_KEY[selectedWindow]

  const { data: nodes, isLoading } = useQuery({
    ...reactQueries.chainflipLending.lendingPoolStats(asset, sinceIso),
    select: (data: LendingPoolStatPoint[]) => bucketData(data, bucketSecs),
  })

  const chartBody = useMemo(() => {
    if (isLoading) return <ChartSkeleton type='Histogram' height={300} />
    return <RateChart data={nodes ?? []} height={300} interval={chartInterval} />
  }, [nodes, isLoading, chartInterval])

  return (
    <Stack spacing={4}>
      <Flex justifyContent='space-between' alignItems='center' py={2}>
        <ButtonGroup size='sm'>
          {(Object.keys(WINDOW_PARAMS_BY_KEY) as ChartWindowKey[]).map(key => (
            <Button
              key={key}
              onClick={() => setSelectedWindow(key)}
              variant={selectedWindow === key ? 'solid' : 'outline'}
            >
              {key.toUpperCase()}
            </Button>
          ))}
        </ButtonGroup>
      </Flex>
      <Center flex='1' flexDirection='column'>
        {chartBody}
      </Center>
    </Stack>
  )
}
