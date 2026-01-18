import {
  Box,
  Button,
  Center,
  Flex,
  HStack,
  Skeleton,
  Spinner,
  Text,
  useColorModeValue,
} from '@chakra-ui/react'
import type { OhlcData, UTCTimestamp } from 'lightweight-charts'
import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'

import { SimpleChart } from '@/components/SimpleChart/SimpleChart'
import type { ChartInterval } from '@/components/SimpleChart/utils'
import { fetchCandleSnapshot, subscribeToCandle, type UnsubscribeFn } from '@/lib/hyperliquid/client'
import { HYPERLIQUID_CANDLE_INTERVALS } from '@/lib/hyperliquid/constants'
import type { Candle, CandleInterval } from '@/lib/hyperliquid/types'
import { candlesToLightweightChart, getTimestampForInterval, parseCandles } from '@/lib/hyperliquid/utils'
import { useAppDispatch, useAppSelector } from '@/state/store'
import { perpsSlice } from '@/state/slices/perpsSlice/perpsSlice'

type PerpsChartProps = {
  coin: string | null
  height?: number
}

const CHART_INTERVALS: { label: string; value: CandleInterval }[] = [
  { label: '1m', value: '1m' },
  { label: '5m', value: '5m' },
  { label: '15m', value: '15m' },
  { label: '1h', value: '1h' },
  { label: '4h', value: '4h' },
  { label: '1d', value: '1d' },
]

const CANDLES_TO_FETCH = 200

const candleIntervalToChartInterval = (interval: CandleInterval): ChartInterval => {
  switch (interval) {
    case '1m':
    case '3m':
    case '5m':
      return '5min'
    case '15m':
    case '30m':
      return 'hour'
    case '1h':
    case '2h':
    case '4h':
      return 'day'
    case '8h':
    case '12h':
    case '1d':
      return 'week'
    case '3d':
    case '1w':
      return 'month'
    case '1M':
      return 'year'
    default:
      return 'day'
  }
}

type IntervalButtonProps = {
  label: string
  isActive: boolean
  onClick: () => void
}

const IntervalButton = memo(({ label, isActive, onClick }: IntervalButtonProps) => {
  const activeBg = useColorModeValue('blue.100', 'blue.800')
  const activeColor = useColorModeValue('blue.700', 'blue.200')

  return (
    <Button
      size='xs'
      variant={isActive ? 'solid' : 'ghost'}
      bg={isActive ? activeBg : undefined}
      color={isActive ? activeColor : 'text.subtle'}
      onClick={onClick}
      fontWeight={isActive ? 'semibold' : 'normal'}
      minW='40px'
    >
      {label}
    </Button>
  )
})

export const PerpsChart = memo(({ coin, height = 400 }: PerpsChartProps) => {
  const translate = useTranslate()
  const dispatch = useAppDispatch()

  const chartInterval = useAppSelector(perpsSlice.selectors.selectChartInterval)
  const borderColor = useColorModeValue('gray.200', 'gray.700')

  const [candles, setCandles] = useState<OhlcData<UTCTimestamp>[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | undefined>()

  const handleIntervalChange = useCallback(
    (interval: CandleInterval) => {
      dispatch(perpsSlice.actions.setChartInterval(interval))
    },
    [dispatch],
  )

  const fetchCandles = useCallback(async () => {
    if (!coin) return

    setIsLoading(true)
    setError(undefined)

    try {
      const endTime = Date.now()
      const startTime = getTimestampForInterval(chartInterval, CANDLES_TO_FETCH)

      const rawCandles = await fetchCandleSnapshot({
        coin,
        interval: chartInterval,
        startTime,
        endTime,
      })

      const parsedCandles = parseCandles(rawCandles as Candle[])
      const chartData = candlesToLightweightChart(parsedCandles)

      const ohlcData: OhlcData<UTCTimestamp>[] = chartData.map(candle => ({
        time: candle.time as UTCTimestamp,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
      }))

      setCandles(ohlcData)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch chart data'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [coin, chartInterval])

  useEffect(() => {
    fetchCandles()
  }, [fetchCandles])

  useEffect(() => {
    if (!coin) return

    let unsubscribe: UnsubscribeFn | undefined

    const subscribe = () => {
      unsubscribe = subscribeToCandle(
        { coin, interval: chartInterval },
        (data) => {
          const newCandle: OhlcData<UTCTimestamp> = {
            time: Math.floor(data.t / 1000) as UTCTimestamp,
            open: parseFloat(data.o),
            high: parseFloat(data.h),
            low: parseFloat(data.l),
            close: parseFloat(data.c),
          }

          setCandles(prev => {
            if (prev.length === 0) return [newCandle]

            const lastCandle = prev[prev.length - 1]
            if (lastCandle.time === newCandle.time) {
              return [...prev.slice(0, -1), newCandle]
            }
            return [...prev, newCandle]
          })
        },
      )
    }

    subscribe()

    return () => {
      unsubscribe?.()
    }
  }, [coin, chartInterval])

  const chartIntervalValue = useMemo(
    () => candleIntervalToChartInterval(chartInterval),
    [chartInterval],
  )

  const intervalButtons = useMemo(
    () =>
      CHART_INTERVALS.map(({ label, value }) => (
        <IntervalButton
          key={value}
          label={label}
          isActive={chartInterval === value}
          onClick={() => handleIntervalChange(value)}
        />
      )),
    [chartInterval, handleIntervalChange],
  )

  if (!coin) {
    return (
      <Box
        height={height}
        borderRadius='lg'
        border='1px solid'
        borderColor={borderColor}
        p={4}
      >
        <Center h='full'>
          <Text color='text.subtle' fontSize='sm'>
            {translate('perps.chart.selectMarket')}
          </Text>
        </Center>
      </Box>
    )
  }

  if (isLoading && candles.length === 0) {
    return (
      <Box
        height={height}
        borderRadius='lg'
        border='1px solid'
        borderColor={borderColor}
        p={4}
      >
        <Flex direction='column' h='full'>
          <HStack spacing={1} mb={4} flexWrap='wrap'>
            {CHART_INTERVALS.map(({ value }) => (
              <Skeleton key={value} height='24px' width='40px' borderRadius='md' />
            ))}
          </HStack>
          <Center flex={1}>
            <Spinner size='lg' color='blue.500' />
          </Center>
        </Flex>
      </Box>
    )
  }

  if (error) {
    return (
      <Box
        height={height}
        borderRadius='lg'
        border='1px solid'
        borderColor={borderColor}
        p={4}
      >
        <Flex direction='column' h='full'>
          <HStack spacing={1} mb={4} flexWrap='wrap'>
            {intervalButtons}
          </HStack>
          <Center flex={1} flexDirection='column' gap={2}>
            <Text color='red.500' fontSize='sm'>
              {error}
            </Text>
            <Button size='sm' variant='outline' onClick={fetchCandles}>
              {translate('common.retry')}
            </Button>
          </Center>
        </Flex>
      </Box>
    )
  }

  if (candles.length === 0) {
    return (
      <Box
        height={height}
        borderRadius='lg'
        border='1px solid'
        borderColor={borderColor}
        p={4}
      >
        <Flex direction='column' h='full'>
          <HStack spacing={1} mb={4} flexWrap='wrap'>
            {intervalButtons}
          </HStack>
          <Center flex={1}>
            <Text color='text.subtle' fontSize='sm'>
              {translate('perps.chart.noData')}
            </Text>
          </Center>
        </Flex>
      </Box>
    )
  }

  return (
    <Box
      height={height}
      borderRadius='lg'
      border='1px solid'
      borderColor={borderColor}
      p={4}
      position='relative'
    >
      <Box position='absolute' top={4} left={4} zIndex={5}>
        <HStack spacing={1} flexWrap='wrap'>
          {intervalButtons}
        </HStack>
      </Box>
      <Box h='full' pt={10}>
        <SimpleChart
          data={candles}
          seriesType='Candlestick'
          height={height - 72}
          interval={chartIntervalValue}
        />
      </Box>
    </Box>
  )
})
