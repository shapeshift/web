import { Box, Card, CardBody, Flex, Heading, Stack, useToken } from '@chakra-ui/react'
import { LinearGradient } from '@visx/gradient'
import { GridColumns, GridRows } from '@visx/grid'
import { ParentSize, ScaleSVG } from '@visx/responsive'
import type { ParentSizeProvidedProps } from '@visx/responsive/lib/components/ParentSize'
import type { GlyphProps } from '@visx/xychart'
import {
  AnimatedAreaSeries,
  AnimatedAxis,
  AnimatedGlyphSeries,
  DataContext,
  Tooltip,
  XYChart,
} from '@visx/xychart'
import type { RenderTooltipParams } from '@visx/xychart/lib/components/Tooltip'
import debounce from 'lodash/debounce'
import { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { Text } from 'components/Text'
import { bn } from 'lib/bignumber/bignumber'
import { calculateFees } from 'lib/fees/model'
import { FEE_CURVE_MAX_FEE_BPS, FEE_CURVE_NO_FEE_THRESHOLD_USD } from 'lib/fees/parameters'
import { isSome } from 'lib/utils'
import { useGetVotingPowerQuery } from 'state/apis/snapshot/snapshot'

import { CHART_TRADE_SIZE_MAX_USD } from './common'
import { FeeSliders } from './FeeSliders'

type FeeChartProps = {
  tradeSize: number
  foxHolding: number
  onHover(hoverTradeSize: number, hoverFoxHolding: number): void
}

// how many points to generate for the chart, higher is more accurate but slower
const CHART_GRANULARITY = 100
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

export type FeeSlidersProps = {
  tradeSize: number
  setTradeSize: (val: number) => void
  foxHolding: number
  setFoxHolding: (val: number) => void
  currentFoxHoldings: string
  isLoading?: boolean
}

type FeeOutputProps = {
  tradeSize: number
  foxHolding: number
}

export const FeeOutput: React.FC<FeeOutputProps> = ({ tradeSize, foxHolding }) => {
  const { feeUsd, foxDiscountPercent, feeUsdBeforeDiscount, feeBpsBeforeDiscount } = calculateFees({
    tradeAmountUsd: bn(tradeSize),
    foxHeld: bn(foxHolding),
  })

  return (
    <Flex fontWeight='medium' pb={0}>
      <Stack width='full'>
        <Flex gap={4}>
          <Box flex={1} textAlign='center'>
            <Text color='text.subtle' translation='foxDiscounts.totalFee' />
            {feeUsd.lte(0) ? (
              <Text fontSize='3xl' translation='common.free' color='green.500' />
            ) : (
              <Amount.Fiat fontSize='3xl' value={feeUsd.toFixed(2)} color={'green.500'} />
            )}
          </Box>
          <Box flex={1} textAlign='center'>
            <Text color='text.subtle' translation='foxDiscounts.foxPowerDiscount' />
            <Amount.Percent
              fontSize='3xl'
              value={foxDiscountPercent.div(100).toNumber()}
              color={'green.500'}
            />
          </Box>
        </Flex>
        <Text
          translation={[
            'foxDiscounts.basedOnFee',
            { fee: `$${feeUsdBeforeDiscount.toFixed(2)} (${feeBpsBeforeDiscount.toFixed(2)} bps)` },
          ]}
          color='text.subtle'
          fontSize='sm'
          textAlign='center'
          mb={4}
        />
      </Stack>
    </Flex>
  )
}

const feeExplainerCardBody = { base: 4, md: 8 }

export const FeeExplainer = () => {
  const { data: currentFoxHoldings, isLoading } = useGetVotingPowerQuery()
  const [tradeSize, setTradeSize] = useState(999) // default to max below free so we have a value
  const [foxHolding, setFoxHolding] = useState(Number(currentFoxHoldings) || 0)
  const translate = useTranslate()

  const onHover = (hoverTradeSize: number, hoverFoxHolding: number) => {
    setTradeSize(hoverTradeSize)
    setFoxHolding(hoverFoxHolding)
  }

  useEffect(() => {
    if (isLoading) return
    if (currentFoxHoldings) setFoxHolding(Number(currentFoxHoldings) || 0)
  }, [currentFoxHoldings, isLoading])

  return (
    <Stack maxWidth='600px' width='full' mx='auto' spacing={0}>
      <Card flexDir='column' borderBottomRadius={0}>
        <CardBody flex='1' p={feeExplainerCardBody}>
          <Heading as='h5' mb={2}>
            {translate('foxDiscounts.simulateTitle')}
          </Heading>
          <Text color='text.subtle' translation='foxDiscounts.simulateBody' />
          <FeeSliders
            tradeSize={tradeSize}
            setTradeSize={setTradeSize}
            foxHolding={foxHolding}
            setFoxHolding={setFoxHolding}
            currentFoxHoldings={currentFoxHoldings ?? '0'}
          />
        </CardBody>
      </Card>
      <Card borderTopRadius={0} borderTopWidth={1} borderColor='border.base'>
        <CardBody p={feeExplainerCardBody}>
          <FeeOutput tradeSize={tradeSize} foxHolding={foxHolding} />
          <FeeChart tradeSize={tradeSize} foxHolding={foxHolding} onHover={onHover} />
        </CardBody>
      </Card>
    </Stack>
  )
}
