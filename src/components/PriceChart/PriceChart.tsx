import type { ChakraStyledOptions } from '@chakra-ui/react'
import { Alert, Box } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import type { HistoryTimeframe } from '@shapeshiftoss/types'
import { useEffect, useMemo } from 'react'
import { FaInfoCircle } from 'react-icons/fa'

import { Graph } from '@/components/Graph/Graph'
import { IconCircle } from '@/components/IconCircle'
import { Text } from '@/components/Text'
import { makeBalanceChartData } from '@/hooks/useBalanceChartData/utils'
import { useFetchPriceHistories } from '@/hooks/useFetchPriceHistories/useFetchPriceHistories'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { calculateFiatChange, calculatePercentChange } from '@/lib/charts'
import {
  selectPriceHistoriesLoadingByAssetTimeframe,
  selectPriceHistoryByAssetTimeframe,
} from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type PriceChartArgs = {
  assetId: AssetId
  timeframe: HistoryTimeframe
  percentChange: number | undefined
  setPercentChange: (percentChange: number) => void
  setFiatChange?: (fiatChange: number) => void
  chartHeight?: string
  hideAxis?: boolean
} & ChakraStyledOptions

export const PriceChart: React.FC<PriceChartArgs> = props => {
  const {
    assetId,
    timeframe,
    percentChange,
    chartHeight = '350px',
    setPercentChange,
    setFiatChange,
    hideAxis,
    boxProps,
  } = useMemo(() => {
    const {
      assetId,
      timeframe,
      percentChange,
      chartHeight,
      setPercentChange,
      setFiatChange,
      hideAxis,
      ...boxProps
    } = props

    return {
      assetId,
      timeframe,
      percentChange,
      chartHeight,
      setPercentChange,
      setFiatChange,
      hideAxis,
      boxProps,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, Object.values(props))

  const assetIds = useMemo(() => [assetId], [assetId])

  // fetch price history for this asset
  useFetchPriceHistories(assetIds, timeframe)

  const priceData = useAppSelector(state =>
    selectPriceHistoryByAssetTimeframe(state, assetId, timeframe),
  )

  useEffect(() => {
    setPercentChange(calculatePercentChange(priceData))
    setFiatChange && setFiatChange(calculateFiatChange(priceData))
  }, [priceData, setFiatChange, setPercentChange])

  const isLoading = useAppSelector(state =>
    selectPriceHistoriesLoadingByAssetTimeframe(state, assetIds, timeframe),
  )

  const data = useMemo(() => makeBalanceChartData(priceData), [priceData])

  const color = bnOrZero(percentChange).gt(0) ? 'green.500' : 'red.500'

  if (!isLoading && !priceData.length)
    return (
      <Box p={8}>
        <Alert status='info' variant='subtle' borderRadius='lg' pl={2}>
          <IconCircle boxSize={8} color='blue.300' background='transparent'>
            <FaInfoCircle />
          </IconCircle>
          <Text
            color='blue.300'
            translation={'assets.assetDetails.assetHeader.assetUnavailable'}
            fontWeight='semibold'
          />
        </Alert>
      </Box>
    )

  return (
    <Box height={chartHeight} {...boxProps}>
      <Graph color={color} data={data} isLoading={isLoading} hideAxis={hideAxis} />
    </Box>
  )
}
