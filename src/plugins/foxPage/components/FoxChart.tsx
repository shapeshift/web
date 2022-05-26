import { Box, StatArrow, StatNumber, Text } from '@chakra-ui/react'
import { HistoryTimeframe } from '@shapeshiftoss/types'
import { useState } from 'react'
import NumberFormat from 'react-number-format'
import { useTranslate } from 'react-polyglot'
import { Card } from 'components/Card/Card'
import { TimeControls } from 'components/Graph/TimeControls'
import { PriceChart } from 'components/PriceChart/PriceChart'
import { RawText } from 'components/Text/Text'
import { useLocaleFormatter } from 'hooks/useLocaleFormatter/useLocaleFormatter'
import { selectMarketDataById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type FoxChartProps = {
  assetId: string
}

export const FoxChart: React.FC<FoxChartProps> = ({ assetId }) => {
  const [timeframe, setTimeframe] = useState(HistoryTimeframe.MONTH)
  const [percentChange, setPercentChange] = useState(0)
  const {
    number: { toFiat },
  } = useLocaleFormatter({ fiatType: 'USD' })
  const translate = useTranslate()
  const marketData = useAppSelector(state => selectMarketDataById(state, assetId))
  const { price } = marketData || {}
  const assetPrice = toFiat(price) ?? 0

  return (
    <Card>
      <Card.Body pb={2}>
        <Box textAlign='center'>
          <Text color='gray.500' fontWeight='semibold'>
            {translate('plugins.foxPage.currentPrice')}
          </Text>
          <Box fontSize='4xl' lineHeight={1} mb={2}>
            <NumberFormat
              value={assetPrice}
              displayType={'text'}
              thousandSeparator={true}
              isNumericString={true}
            />
          </Box>
          <StatNumber
            display='flex'
            alignItems='center'
            justifyContent='center'
            color={percentChange > 0 ? 'green.500' : 'red.500'}
          >
            <StatArrow type={percentChange > 0 ? 'increase' : 'decrease'} />
            {isFinite(percentChange) && <RawText>{percentChange}%</RawText>}
          </StatNumber>
        </Box>
        <PriceChart
          assetId={assetId}
          setPercentChange={setPercentChange}
          percentChange={percentChange}
          timeframe={timeframe}
          chartHeight='200px'
          mx={-6}
        />
        <TimeControls
          onChange={setTimeframe}
          defaultTime={timeframe}
          buttonGroupProps={{
            display: 'flex',
            width: 'full',
            justifyContent: 'space-between',
          }}
        />
      </Card.Body>
    </Card>
  )
}
