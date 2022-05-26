import { Alert, Box } from '@chakra-ui/react'
import { ChakraStyledOptions } from '@chakra-ui/react'
import { AssetId } from '@shapeshiftoss/caip'
import { HistoryTimeframe } from '@shapeshiftoss/types'
import { useEffect, useMemo } from 'react'
import { FaInfoCircle } from 'react-icons/fa'
import { Card } from 'components/Card/Card'
import { Graph } from 'components/Graph/Graph'
import { IconCircle } from 'components/IconCircle'
import { Text } from 'components/Text'
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

  const data = useAppSelector(state =>
    selectPriceHistoryByAssetTimeframe(state, assetId, timeframe),
  )

  useEffect(() => setPercentChange(calculatePercentChange(data)), [data, setPercentChange])

  const loading = useAppSelector(state =>
    selectPriceHistoriesLoadingByAssetTimeframe(state, assetIds, timeframe),
  )

  const color = percentChange > 0 ? 'green.500' : 'red.500'

  if (!loading && !data.length)
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
    <Card.Body p={0} height={chartHeight} {...props}>
      <Graph color={color} data={data} loading={loading} isLoaded={!loading} />
    </Card.Body>
  )
}
