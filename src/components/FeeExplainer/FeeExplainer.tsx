import {
  Box,
  Card,
  CardBody,
  CardHeader,
  Flex,
  Heading,
  Slider,
  SliderFilledTrack,
  SliderMark,
  SliderThumb,
  SliderTrack,
  Stack,
  Text,
  useToken,
  VStack,
} from '@chakra-ui/react'
import { LinearGradient } from '@visx/gradient'
import { GridColumns, GridRows } from '@visx/grid'
import { ParentSize, ScaleSVG } from '@visx/responsive'
import type { ParentSizeProvidedProps } from '@visx/responsive/lib/components/ParentSize'
import type { GlyphProps } from '@visx/xychart'
import {
  AnimatedAreaSeries,
  AnimatedAxis,
  AnimatedGlyphSeries,
  AnimatedGrid,
  DataContext,
  Grid,
  Tooltip,
  XYChart,
} from '@visx/xychart'
import type { RenderTooltipParams } from '@visx/xychart/lib/components/Tooltip'
import debounce from 'lodash/debounce'
import { useCallback, useContext, useEffect, useMemo, useState } from 'react'
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

const CustomGrid = ({ xNumTicks, yNumTicks }: { xNumTicks: number; yNumTicks: number }) => {
  const { xScale, yScale, innerHeight, innerWidth, margin } = useContext(DataContext)
  const borderColor = useToken('colors', 'border.base')
  if (!xScale || !yScale) {
    return null
  }
  return (
    <>
      <GridRows
        left={margin?.left ?? 0}
        width={innerWidth ?? 0}
        scale={yScale}
        numTicks={xNumTicks}
        stroke={borderColor}
      />
      <GridColumns
        top={margin?.top ?? 0}
        height={innerHeight ?? 0}
        scale={xScale}
        numTicks={yNumTicks}
        stroke={borderColor}
        strokeDasharray='4'
      />
    </>
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

const xScale = { type: 'linear' as const }
const yScale = { type: 'linear' as const, domain: [0, FEE_CURVE_MAX_FEE_BPS] }

const FeeChart: React.FC<FeeChartProps> = ({ foxHolding, tradeSize }) => {
  const width = 450
  const height = 250
  const textColor = useToken('colors', 'text.subtle')
  const borderColor = useToken('colors', 'border.base')
  const circleBg = useToken('colors', 'blue.500')
  const circleStroke = useToken('colors', 'text.base')

  const [debouncedFoxHolding, setDebouncedFoxHolding] = useState(foxHolding)

  const DEBOUNCE_MS = 150 // tune me to make the curve changing shape "feel" right

  // Debounce foxHolding updates
  useEffect(() => {
    const handleDebounce = debounce(() => setDebouncedFoxHolding(foxHolding), DEBOUNCE_MS)
    handleDebounce()

    return handleDebounce.cancel
  }, [foxHolding])

  const data = useMemo(() => {
    return tradeSizeData
      .map(trade => {
        if (trade < FEE_CURVE_NO_FEE_THRESHOLD_USD) return null
        const feeBps = calculateFees({
          tradeAmountUsd: bn(trade),
          foxHeld: bn(debouncedFoxHolding),
        }).feeBps.toNumber()
        return { x: trade, y: feeBps }
      })
      .filter(isSome)
  }, [debouncedFoxHolding])

  const currentPoint = useMemo(() => {
    if (tradeSize < FEE_CURVE_NO_FEE_THRESHOLD_USD) return []

    const feeBps = calculateFees({
      tradeAmountUsd: bn(tradeSize),
      foxHeld: bn(debouncedFoxHolding),
    }).feeBps.toNumber()

    return [{ x: tradeSize, y: feeBps }]
  }, [tradeSize, debouncedFoxHolding])

  const tickLabelProps = useCallback(
    () => ({ fill: textColor, fontSize: 12, fontWeight: 'medium' }),
    [textColor],
  )

  const tickFormat = useCallback((x: number) => `$${formatMetricSuffix(x)}`, [])

  const labelProps = useCallback((fill: string) => ({ fill, fontSize: 12, fontWeight: 'bold' }), [])

  const renderGlyph = useCallback(
    ({ x, y }: GlyphProps<{ x: number; y: number }>) => (
      <circle
        cx={x}
        cy={y}
        r={6} // radius
        strokeWidth={4} // stroke width
        stroke={circleStroke}
        fill={circleBg}
      />
    ),
    [circleBg, circleStroke],
  )

  return (
    <Box height={height} width='full'>
      <ParentSize>
        {({ height, width }: ParentSizeProvidedProps) => (
          <ScaleSVG width={width} height={height}>
            <XYChart
              xScale={xScale}
              yScale={yScale}
              width={width}
              height={height}
              margin={{ left: 30, right: 30, top: 0, bottom: 30 }}
            >
              <LinearGradient id='area-gradient' from={foxBlue} to={foxBlue} toOpacity={0} />

              <AnimatedAxis
                orientation='bottom'
                numTicks={3}
                tickLabelProps={tickLabelProps}
                tickFormat={tickFormat}
                labelProps={labelProps(textColor)}
                stroke={borderColor}
                strokeWidth={0}
                hideTicks={true}
                tickStroke={borderColor}
              />
              <AnimatedAxis
                orientation='left'
                labelProps={labelProps(textColor)}
                numTicks={FEE_CURVE_MAX_FEE_BPS / 7}
                tickLabelProps={tickLabelProps}
                stroke={borderColor}
                hideTicks={true}
                tickStroke={borderColor}
                hideZero={true}
              />

              <CustomGrid xNumTicks={FEE_CURVE_MAX_FEE_BPS / 7} yNumTicks={3} />

              <AnimatedAreaSeries
                {...accessors}
                dataKey='Line 1'
                data={data}
                lineProps={lineProps}
                fill='url(#area-gradient)'
                fillOpacity={0.1}
                strokeWidth={2}
              />
              <AnimatedGlyphSeries
                {...accessors}
                dataKey='Current Point'
                data={currentPoint}
                renderGlyph={renderGlyph}
                /* additional styling here */
              />

              <Tooltip renderTooltip={renderTooltip} />
            </XYChart>
          </ScaleSVG>
        )}
      </ParentSize>
    </Box>
  )
}

type FeeSlidersProps = {
  tradeSize: number
  setTradeSize: (val: number) => void
  foxHolding: number
  setFoxHolding: (val: number) => void
  currentFoxHoldings: string
}

const labelStyles = {
  fontSize: 'sm',
  mt: '2',
  ml: '-2.5',
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
      <Stack width='full'>
        <Flex width='full' justifyContent='space-between'>
          <RawText>Trade Size</RawText>
          <Amount.Fiat value={tradeSize} />
        </Flex>
        <Box width='100%'>
          <Slider min={0} max={CHART_TRADE_SIZE_MAX_USD} value={tradeSize} onChange={setTradeSize}>
            <SliderMark value={CHART_TRADE_SIZE_MAX_USD * 0.2} {...labelStyles}>
              <Amount.Fiat value={CHART_TRADE_SIZE_MAX_USD * 0.2} abbreviated />
            </SliderMark>
            <SliderMark value={CHART_TRADE_SIZE_MAX_USD * 0.5} {...labelStyles}>
              <Amount.Fiat value={CHART_TRADE_SIZE_MAX_USD * 0.5} abbreviated />
            </SliderMark>
            <SliderMark value={CHART_TRADE_SIZE_MAX_USD * 0.8} {...labelStyles}>
              <Amount.Fiat value={CHART_TRADE_SIZE_MAX_USD * 0.8} abbreviated={true} />
            </SliderMark>
            <SliderTrack>
              <SliderFilledTrack />
            </SliderTrack>
            <SliderThumb />
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
  const { feeUsd, feeBps, feeUsdDiscount, foxDiscountPercent } = calculateFees({
    tradeAmountUsd: bn(tradeSize),
    foxHeld: bn(foxHolding),
  })
  const feeWithDiscount = useMemo(() => {
    const discountAmount = bn(feeUsdDiscount).gt(feeUsd) ? feeUsd : feeUsdDiscount
    return bn(feeUsd).minus(discountAmount)
  }, [feeUsd, feeUsdDiscount])
  return (
    <CardHeader fontWeight='medium' pb={0}>
      <Stack width='full'>
        <Flex gap={4}>
          <Box flex={1} textAlign='center'>
            <RawText color='text.subtle'>Total Fees</RawText>
            {feeUsdDiscount.lte(0) ? (
              <RawText fontSize='3xl' color={'green.500'}>
                Free
              </RawText>
            ) : (
              <Amount.Fiat fontSize='3xl' value={feeWithDiscount.toFixed(2)} color={'green.500'} />
            )}
          </Box>
          <Box flex={1} textAlign='center'>
            <RawText color='text.subtle'>FOX Holder Discount</RawText>
            <Amount.Percent
              fontSize='3xl'
              value={foxDiscountPercent.div(100).toNumber()}
              color={'green.500'}
            />
          </Box>
        </Flex>
        <RawText color='text.subtle' fontSize='sm' textAlign='center'>
          Based on a fee of: ${feeUsd.toFixed(2)} ({feeBps.toFixed(2)} bps)
        </RawText>
        <RawText>
          <Amount.Fiat value={feeUsdDiscount.toFixed(2)} />
        </RawText>
      </Stack>
    </CardHeader>
  )
}

const feeExplainerCardBody = { base: 4, md: 8 }

export const FeeExplainer = () => {
  const [tradeSize, setTradeSize] = useState(0)
  const [foxHolding, setFoxHolding] = useState(0)

  const walletAccountIds = useAppSelector(selectWalletAccountIds)
  const { data: currentFoxHoldings } = useGetVotingPowerQuery(walletAccountIds)
  const onHover = (hoverTradeSize: number, hoverFoxHolding: number) => {
    setTradeSize(hoverTradeSize)
    setFoxHolding(hoverFoxHolding)
  }

  return (
    <Card flexDir='column' maxWidth='600px' width='full' mx='auto'>
      <CardBody flex='1' p={feeExplainerCardBody}>
        <Heading as='h5'>Simulate your FOX Savings</Heading>
        <RawText color='text.subtle'>
          Use this handy calculator to determine your total fees and the discount you'll receive on
          your trade. Simply adjust the sliders below to indicate your FOX holder amount and the
          trade size in fiat, and watch your potential savings unfold!
        </RawText>
        <RawText color='text.subtle'>FOX voting power {currentFoxHoldings} FOX</RawText>
        <Stack spacing={4} mt={6}>
          <FeeSliders
            tradeSize={tradeSize}
            setTradeSize={setTradeSize}
            foxHolding={foxHolding}
            setFoxHolding={setFoxHolding}
            currentFoxHoldings={currentFoxHoldings ?? '0'}
          />
        </Stack>
      </CardBody>
      <CardBody flex='1' flexDir='column' justifyContent='center' alignItems='center' pt={0}>
        <Card>
          <FeeOutput tradeSize={tradeSize} foxHolding={foxHolding} />
          <FeeChart tradeSize={tradeSize} foxHolding={foxHolding} onHover={onHover} />
        </Card>
      </CardBody>
    </Card>
  )
}
