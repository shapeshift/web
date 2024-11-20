import type { CardProps, StackProps } from '@chakra-ui/react'
import { Box, Card, CardBody, Flex, Heading, Stack, useToken } from '@chakra-ui/react'
import { bnOrZero } from '@shapeshiftoss/chain-adapters'
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
import type { TextPropTypes } from 'components/Text/Text'
import { bn } from 'lib/bignumber/bignumber'
import { calculateFees } from 'lib/fees/model'
import { FEE_CURVE_PARAMETERS, FEE_MODEL_TO_FEATURE_NAME } from 'lib/fees/parameters'
import type { ParameterModel } from 'lib/fees/parameters/types'
import { isSome } from 'lib/utils'
import {
  selectIsSnapshotApiQueriesPending,
  selectIsSnapshotApiQueriesRejected,
  selectVotingPower,
} from 'state/apis/snapshot/selectors'
import { useAppSelector } from 'state/store'

import { CHART_TRADE_SIZE_MAX_USD } from './common'
import { FeeSliders } from './FeeSliders'

type FeeChartProps = {
  tradeSize: number
  foxHolding: number
  feeModel: ParameterModel
}

const xyChartMargin = { left: 30, right: 30, top: 0, bottom: 30 }

// how many points to generate for the chart, higher is more accurate but slower
const CHART_GRANULARITY = 200
const tradeSizeData = [...Array(CHART_GRANULARITY).keys()].map(
  i => i * (CHART_TRADE_SIZE_MAX_USD / (CHART_GRANULARITY - 1)),
)

const accessors = {
  xAccessor: (data?: { x: number }) => data?.x,
  yAccessor: (data?: { y: number }) => data?.y,
}

const xTickValues = [0, 100_000, 200_000, 300_000, 400_000]

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

const xScale = {
  type: 'linear' as const,
  domain: [0, CHART_TRADE_SIZE_MAX_USD],
}

const FeeChart: React.FC<FeeChartProps> = ({ foxHolding, tradeSize, feeModel }) => {
  const { FEE_CURVE_MAX_FEE_BPS } = FEE_CURVE_PARAMETERS[feeModel]
  const yScale = useMemo(
    () => ({ type: 'linear' as const, domain: [0, FEE_CURVE_MAX_FEE_BPS] }),
    [FEE_CURVE_MAX_FEE_BPS],
  )
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

  const isSnapshotApiQueriesRejected = useAppSelector(selectIsSnapshotApiQueriesRejected)

  const data = useMemo(() => {
    return tradeSizeData
      .map(trade => {
        const feeBps = calculateFees({
          tradeAmountUsd: bn(trade),
          foxHeld: bn(debouncedFoxHolding),
          feeModel,
          isSnapshotApiQueriesRejected,
        }).feeBpsFloat.toNumber()
        return { x: trade, y: feeBps }
      })
      .filter(isSome)
  }, [debouncedFoxHolding, feeModel, isSnapshotApiQueriesRejected])

  const currentPoint = useMemo(() => {
    const feeBps = calculateFees({
      tradeAmountUsd: bn(tradeSize),
      foxHeld: bn(debouncedFoxHolding),
      feeModel,
      isSnapshotApiQueriesRejected,
    }).feeBpsFloat.toNumber()

    return [{ x: tradeSize, y: feeBps }]
  }, [tradeSize, debouncedFoxHolding, feeModel, isSnapshotApiQueriesRejected])

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
              margin={xyChartMargin}
            >
              <LinearGradient id='area-gradient' from={foxBlue} to={foxBlue} toOpacity={0} />

              <AnimatedAxis
                orientation='bottom'
                numTicks={3}
                tickLabelProps={tickLabelProps}
                tickFormat={tickFormat}
                tickValues={xTickValues}
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

type FeeOutputProps = {
  tradeSizeUSD: number
  foxHolding: number
  feeModel: ParameterModel
}

export const FeeOutput: React.FC<FeeOutputProps> = ({ tradeSizeUSD, foxHolding, feeModel }) => {
  const isSnapshotApiQueriesRejected = useAppSelector(selectIsSnapshotApiQueriesRejected)
  const { feeUsd, feeBps, foxDiscountPercent, feeUsdBeforeDiscount, feeBpsBeforeDiscount } =
    calculateFees({
      tradeAmountUsd: bn(tradeSizeUSD),
      foxHeld: bn(foxHolding),
      feeModel,
      isSnapshotApiQueriesRejected,
    })

  const basedOnFeeTranslation: TextPropTypes['translation'] = useMemo(
    () => [
      'foxDiscounts.basedOnFee',
      {
        fee: `$${feeUsdBeforeDiscount.toFixed(2)} (${feeBpsBeforeDiscount.toFixed(0)} bps)`,
      },
    ],
    [feeUsdBeforeDiscount, feeBpsBeforeDiscount],
  )

  const isFree = useMemo(() => bnOrZero(feeUsd).lte(0), [feeUsd])

  return (
    <Flex fontWeight='medium' pb={0}>
      <Stack width='full'>
        <Flex gap={4}>
          <Box flex={1} textAlign='center'>
            <Text color='text.subtle' translation='foxDiscounts.totalFee' />
            {isFree ? (
              <Text fontSize='3xl' translation='common.free' color='green.500' />
            ) : (
              <Flex gap={2} align='center' justifyContent='center'>
                <Amount.Fiat
                  fiatType='USD'
                  fontSize='3xl'
                  value={feeUsd.toString()}
                  color={'green.500'}
                />
                <Amount
                  fontSize='m'
                  value={feeBps.toFixed(0)}
                  color={'green.500'}
                  prefix='('
                  suffix=' bps)'
                />
              </Flex>
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
          translation={basedOnFeeTranslation}
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

type FeeExplainerProps = CardProps & {
  feeModel: ParameterModel
  inputAmountUsd: string | undefined
  stackProps?: StackProps
}

export const FeeExplainer: React.FC<FeeExplainerProps> = ({ stackProps, ...props }) => {
  const translate = useTranslate()
  const feature = translate(FEE_MODEL_TO_FEATURE_NAME[props.feeModel])
  const simulateBodyTranslation: TextPropTypes['translation'] = useMemo(
    () => [
      'foxDiscounts.simulateBody',
      {
        feature,
        // Only lowercase the feature if it's a one-word one e.g trade
        // Assume multiple words should keep their capitalization to keep things simple and avoid more translation strings
        featureLowerCase: feature.split(' ').length > 1 ? feature : feature.toLowerCase(),
      },
    ],
    [feature],
  )

  const { FEE_CURVE_NO_FEE_THRESHOLD_USD } = FEE_CURVE_PARAMETERS[props.feeModel]
  const votingPowerParams = useMemo(() => ({ feeModel: props.feeModel }), [props.feeModel])
  const votingPower = useAppSelector(state => selectVotingPower(state, votingPowerParams))
  const isVotingPowerQueriesPending = useAppSelector(selectIsSnapshotApiQueriesPending)

  const [tradeSizeUSD, setTradeSizeUSD] = useState(
    props.inputAmountUsd ? Number.parseFloat(props.inputAmountUsd) : FEE_CURVE_NO_FEE_THRESHOLD_USD,
  )

  const [foxHolding, setFoxHolding] = useState(bnOrZero(votingPower).toNumber())

  return (
    <Stack
      maxWidth={stackProps?.maxWidth ?? '600px'}
      width='full'
      mx='auto'
      spacing={0}
      {...stackProps}
    >
      <Card flexDir='column' borderBottomRadius={0} {...props}>
        <CardBody flex='1' p={feeExplainerCardBody}>
          <Heading as='h5' mb={2}>
            {translate('foxDiscounts.simulateTitle')}
          </Heading>
          <Text color='text.subtle' translation={simulateBodyTranslation} />
          <FeeSliders
            tradeSizeUSD={tradeSizeUSD}
            setTradeSizeUSD={setTradeSizeUSD}
            simulatedFoxHolding={foxHolding}
            setSimulatedFoxHolding={setFoxHolding}
            actualFoxHoldings={votingPower ?? '0'}
            feeModel={props.feeModel}
            isLoading={isVotingPowerQueriesPending}
          />
        </CardBody>
      </Card>
      <Card borderTopRadius={0} borderTopWidth={1} borderColor='border.base' {...props}>
        <CardBody p={feeExplainerCardBody}>
          <FeeOutput
            tradeSizeUSD={tradeSizeUSD}
            foxHolding={foxHolding}
            feeModel={props.feeModel}
          />
          <FeeChart tradeSize={tradeSizeUSD} foxHolding={foxHolding} feeModel={props.feeModel} />
        </CardBody>
      </Card>
    </Stack>
  )
}
