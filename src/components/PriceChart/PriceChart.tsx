import type { ChakraStyledOptions } from '@chakra-ui/react'
import { Alert, Box } from '@chakra-ui/react'
import type { AssetId } from '@keepkey/caip'
import type { HistoryTimeframe } from '@keepkey/types'
import { useEffect, useMemo } from 'react'
import { FaInfoCircle } from 'react-icons/fa'
import { Graph } from 'components/Graph/Graph'
import { IconCircle } from 'components/IconCircle'
import { Text } from 'components/Text'
import { makeBalanceChartData } from 'hooks/useBalanceChartData/utils'
import { useFetchPriceHistories } from 'hooks/useFetchPriceHistories/useFetchPriceHistories'
import { calculatePercentChange } from 'lib/charts'
import {
  selectPriceHistoriesLoadingByAssetTimeframe,
  selectPriceHistoryByAssetTimeframe,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type PriceChartArgs = {
  assetId: AssetId
  timeframe: HistoryTimeframe
  percentChange: number
  setPercentChange: (percentChange: number) => void
  chartHeight?: string
} & ChakraStyledOptions

export const PriceChart: React.FC<PriceChartArgs> = ({
  assetId,
  timeframe,
  percentChange,
  chartHeight = '350px',
  setPercentChange,
  ...props
}) => {
  const assetIds = useMemo(() => [assetId], [assetId])
  // fetch price history for this asset
  useFetchPriceHistories({ assetIds, timeframe })

  const priceData = useAppSelector(state =>
    selectPriceHistoryByAssetTimeframe(state, assetId, timeframe),
  )

  useEffect(
    () => setPercentChange(calculatePercentChange(priceData)),
    [priceData, setPercentChange],
  )

  const loading = useAppSelector(state =>
    selectPriceHistoriesLoadingByAssetTimeframe(state, assetIds, timeframe),
  )

  const data = useMemo(() => makeBalanceChartData(priceData), [priceData])

  const color = percentChange > 0 ? 'green.500' : 'red.500'

  if (!loading && !priceData.length)
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
    <Box height={chartHeight} {...props}>
      <Graph color={color} data={data} loading={loading} isLoaded={!loading} />
    </Box>
  )
}
