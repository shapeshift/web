import {
  Box,
  Card,
  CardBody,
  Flex,
  Heading,
  Slider,
  SliderFilledTrack,
  SliderMark,
  SliderThumb,
  SliderTrack,
  Stack,
  Text,
  useColorModeValue,
  VStack,
} from '@chakra-ui/react'
import { LinearGradient } from '@visx/gradient'
import { ScaleSVG } from '@visx/responsive'
import { AnimatedAreaSeries, AnimatedAxis, Tooltip, XYChart } from '@visx/xychart'
import type { RenderTooltipParams } from '@visx/xychart/lib/components/Tooltip'
import { useMemo, useState } from 'react'
import { Amount } from 'components/Amount/Amount'
import { RawText } from 'components/Text'
import { bn } from 'lib/bignumber/bignumber'
import { calculateFees } from 'lib/fees/model'
import { FEE_CURVE_MAX_FEE_BPS, FEE_CURVE_NO_FEE_THRESHOLD_USD } from 'lib/fees/parameters'
import { isSome } from 'lib/utils'
import { useGetVotingPowerQuery } from 'state/apis/snapshot/snapshot'
import { selectWalletAccountIds } from 'state/slices/common-selectors'
import { useAppSelector } from 'state/store'

type FeeChartProps = {
  tradeSize: number
  foxHolding: number
  onHover(hoverTradeSize: number, hoverFoxHolding: number): void
}

// how many points to generate for the chart, higher is more accurate but slower
const CHART_GRANULARITY = 100
const CHART_TRADE_SIZE_MAX_USD = 400_000
const CHART_TRADE_SIZE_MAX_FOX = 1_100_000 // let them go a bit past a million

// Generate data for tradeSize and foxHolding
const tradeSizeData = [...Array(CHART_GRANULARITY).keys()].map(
  i => i * (CHART_TRADE_SIZE_MAX_USD / (CHART_GRANULARITY - 1)),
)

const accessors = {
  xAccessor: ({ x }: { x: number }) => x,
  yAccessor: ({ y }: { y: number }) => y,
}

type ChartData = {
  x: number
  y: number
}

const renderTooltip = ({ tooltipData }: RenderTooltipParams<ChartData>) => {
  return (
    <div>
      <strong>Trade Size: </strong> {tooltipData?.nearestDatum?.datum?.x} <br />
      <strong>Fee (bps): </strong> {tooltipData?.nearestDatum?.datum?.y}
    </div>
  )
}

const formatMetricSuffix = (num: number) => {
  if (Math.abs(num) >= 1e6) return `${(Math.abs(num) / 1e6).toFixed(0)}M`
  if (Math.abs(num) >= 1e3) return `${(Math.abs(num) / 1e3).toFixed(0)}K`
  return `${Math.abs(num)}`
}

const foxBlue = '#3761F9'

const lineProps = {
  stroke: foxBlue,
}

const labelProps = (fill: string) => ({ fill, fontSize: 16, fontWeight: 'bold' })

const FeeChart: React.FC<FeeChartProps> = ({ foxHolding }) => {
  const xScale = { type: 'linear' as const }
  const yScale = { type: 'linear' as const, domain: [0, FEE_CURVE_MAX_FEE_BPS] }
  const width = 450
  const height = 400
  const fill = useColorModeValue('gray.800', 'white')

  const data = useMemo(() => {
    return tradeSizeData
      .map(trade => {
        if (trade < FEE_CURVE_NO_FEE_THRESHOLD_USD) return null
        const feeBps = calculateFees({
          tradeAmountUsd: bn(trade),
          foxHeld: bn(foxHolding),
        }).feeBps.toNumber()
        return { x: trade, y: feeBps }
      })
      .filter(isSome)
  }, [foxHolding])

  return (
    <ScaleSVG width={width} height={height}>
      <XYChart xScale={xScale} yScale={yScale} width={width} height={height}>
        <LinearGradient id='area-gradient' from={foxBlue} to={foxBlue} toOpacity={0} />

        <AnimatedAxis
          orientation='bottom'
          numTicks={4}
          tickLabelProps={() => ({ fill, fontSize: 16, fontWeight: 'bold' })}
          tickFormat={x => `$${formatMetricSuffix(x)}`}
          label='Trade Size ($)'
          labelProps={labelProps(fill)}
        />
        <AnimatedAxis
          orientation='left'
          label='Fee (bps)'
          labelProps={labelProps(fill)}
          labelOffset={30}
          numTicks={FEE_CURVE_MAX_FEE_BPS / 7}
          tickLabelProps={() => ({ fill, fontSize: 16, fontWeight: 'bold' })}
        />

        <AnimatedAreaSeries
          {...accessors}
          dataKey='Line 1'
          data={data}
          lineProps={lineProps}
          fill='url(#area-gradient)'
          fillOpacity={0.1}
          strokeWidth={2}
        />

        <Tooltip renderTooltip={renderTooltip} />
      </XYChart>
    </ScaleSVG>
  )
}

type FeeSlidersProps = {
  tradeSize: number
  setTradeSize: (val: number) => void
  foxHolding: number
  setFoxHolding: (val: number) => void
}

const labelStyles = {
  fontSize: 'sm',
  mt: '2',
  color: 'text.subtle',
}

const FeeSliders: React.FC<FeeSlidersProps> = ({
  tradeSize,
  setTradeSize,
  foxHolding,
  setFoxHolding,
}) => {
  return (
    <VStack height='100%' spacing={12} mb={8}>
      <Stack width='full'>
        <Flex width='full' justifyContent='space-between'>
          <RawText>Trade Size</RawText>
          <Amount.Fiat value={tradeSize} />
        </Flex>
        <Box width='100%'>
          <Slider min={0} max={CHART_TRADE_SIZE_MAX_USD} value={tradeSize} onChange={setTradeSize}>
            <SliderMark value={0} {...labelStyles}>
              $0.00
            </SliderMark>
            <SliderMark value={100_000} {...labelStyles}>
              $100k
            </SliderMark>
            <SliderMark value={150_000} {...labelStyles}>
              $150k
            </SliderMark>
            <SliderMark value={250_000} {...labelStyles}>
              $250k
            </SliderMark>
            <SliderTrack>
              <SliderFilledTrack />
            </SliderTrack>
            <SliderThumb />
          </Slider>
        </Box>
      </Stack>
      <Stack width='full'>
        <Flex width='full' justifyContent='space-between'>
          <Text>FOX Holding</Text>
          <Amount.Crypto value={foxHolding.toString()} symbol='FOX' />
        </Flex>
        <Box width='100%'>
          <Slider
            min={0}
            max={CHART_TRADE_SIZE_MAX_FOX}
            value={foxHolding}
            onChange={setFoxHolding}
          >
            <SliderTrack>
              <SliderFilledTrack />
            </SliderTrack>
            <SliderThumb />
            <SliderMark value={250000} {...labelStyles}>
              250k
            </SliderMark>
            <SliderMark value={500000} {...labelStyles}>
              500k
            </SliderMark>
            <SliderMark value={750000} {...labelStyles}>
              750k
            </SliderMark>
            <SliderMark value={1000000} {...labelStyles}>
              1MM
            </SliderMark>
          </Slider>
        </Box>
      </Stack>
    </VStack>
  )
}

type FeeOutputProps = {
  tradeSize: number
  foxHolding: number
}

export const FeeOutput: React.FC<FeeOutputProps> = ({ tradeSize, foxHolding }) => {
  const { feeBps, feeUsd, feeUsdDiscount, foxDiscountPercent } = calculateFees({
    tradeAmountUsd: bn(tradeSize),
    foxHeld: bn(foxHolding),
  })
  return (
    <Stack>
      <RawText color='text.subtle'>
        Fee ${feeUsd.toFixed(2)} ({feeBps.toFixed(2)} bps)
      </RawText>
      <Flex gap={4}>
        <Card flex={1}>
          <CardBody>
            <Amount.Fiat fontSize='3xl' value={feeUsdDiscount.toFixed(2)} color={'green.500'} />
            <RawText color='text.subtle'>FOX Holder Savings</RawText>
          </CardBody>
        </Card>
        <Card flex={1}>
          <CardBody>
            <Amount.Percent
              fontSize='3xl'
              value={foxDiscountPercent.div(100).toNumber()}
              color={'green.500'}
            />
            <RawText color='text.subtle'>FOX Holder Discount</RawText>
          </CardBody>
        </Card>
      </Flex>
    </Stack>
  )
}

export const FeeExplainer = () => {
  const [tradeSize, setTradeSize] = useState(0)
  const [foxHolding, setFoxHolding] = useState(0)

  const walletAccountIds = useAppSelector(selectWalletAccountIds)
  const { data } = useGetVotingPowerQuery(walletAccountIds)
  const onHover = (hoverTradeSize: number, hoverFoxHolding: number) => {
    setTradeSize(hoverTradeSize)
    setFoxHolding(hoverFoxHolding)
  }

  return (
    <Card flexDir='row' maxWidth='1200px' width='full' mx='auto'>
      <CardBody flex='1' p={{ base: 4, md: 8 }}>
        <Heading as='h5'>Calculate your FOX Savings</Heading>
        <RawText color='text.subtle'>
          Something about savings, put good copy in here that doesn't suck.
        </RawText>
        <RawText color='text.subtle'>FOX voting power {data} FOX</RawText>
        <Stack spacing={4} mt={6}>
          <FeeOutput tradeSize={tradeSize} foxHolding={foxHolding} />
          <FeeSliders
            tradeSize={tradeSize}
            setTradeSize={setTradeSize}
            foxHolding={foxHolding}
            setFoxHolding={setFoxHolding}
          />
        </Stack>
      </CardBody>
      <Flex flex='1' justifyContent='center' alignItems='center'>
        <FeeChart tradeSize={tradeSize} foxHolding={foxHolding} onHover={onHover} />
      </Flex>
    </Card>
  )
}
