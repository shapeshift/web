import { Button, ButtonGroup, Center, Flex, Stack } from '@chakra-ui/react'
import { useQuery } from '@tanstack/react-query'
import type { SingleValueData, UTCTimestamp } from 'lightweight-charts'
import { useMemo, useState } from 'react'

import { ChartSkeleton } from '@/components/SimpleChart/LoadingChart'
import { RateChart } from '@/components/SimpleChart/RateChart'
import type { ChartInterval } from '@/components/SimpleChart/utils'
import type { LendingPoolStatPoint } from '@/lib/chainflip/lpServiceApi'
import type { ChainflipAssetSymbol } from '@/lib/chainflip/types'
import { reactQueries } from '@/react-queries'

// lp-service uses permill (1/1_000_000) despite the "Bps" naming
const PERMILL_DIVISOR = 1_000_000

type ChartWindowKey = '1w' | '1m' | '6m' | 'ytd'

const WINDOW_PARAMS_BY_KEY: Record<ChartWindowKey, { sinceMs: number | null; chartInterval: ChartInterval }> = {
  '1w': { sinceMs: 7 * 24 * 60 * 60 * 1000, chartInterval: 'day' },
  '1m': { sinceMs: 30 * 24 * 60 * 60 * 1000, chartInterval: 'week' },
  '6m': { sinceMs: 180 * 24 * 60 * 60 * 1000, chartInterval: 'month' },
  ytd: { sinceMs: null, chartInterval: 'year' },
}

const getSinceIso = (windowKey: ChartWindowKey): string => {
  const { sinceMs } = WINDOW_PARAMS_BY_KEY[windowKey]
  if (sinceMs === null) {
    const now = new Date()
    return new Date(now.getFullYear(), 0, 1).toISOString()
  }
  return new Date(Date.now() - sinceMs).toISOString()
}

const toChartData = (nodes: LendingPoolStatPoint[]): SingleValueData[] =>
  nodes.map(node => ({
    time: (new Date(node.timestamp).getTime() / 1000) as UTCTimestamp,
    value: (node.avgInterestRateBps / PERMILL_DIVISOR) * 100,
  }))

type BorrowRateChartProps = {
  asset: ChainflipAssetSymbol
}

export const BorrowRateChart = ({ asset }: BorrowRateChartProps) => {
  const [selectedWindow, setSelectedWindow] = useState<ChartWindowKey>('1m')

  const sinceIso = useMemo(() => getSinceIso(selectedWindow), [selectedWindow])
  const { chartInterval } = WINDOW_PARAMS_BY_KEY[selectedWindow]

  const { data: nodes, isLoading } = useQuery({
    ...reactQueries.chainflipLending.lendingPoolStats(asset, sinceIso),
    select: toChartData,
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
