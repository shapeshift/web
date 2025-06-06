import { Stack as CStack, useColorModeValue, useToken } from '@chakra-ui/react'
import type { HistoryData } from '@shapeshiftoss/types'
import { scaleLinear } from '@visx/scale'
import type { AxisScale } from '@visx/xychart'
import type { BaseAreaSeriesProps } from '@visx/xychart/lib/components/series/private/BaseAreaSeries'
import type { RenderTooltipParams, TooltipProps } from '@visx/xychart/lib/components/Tooltip'
import type { Numeric } from 'd3-array'
import { extent, max, min } from 'd3-array'
import dayjs from 'dayjs'
import { lazy, useCallback, useMemo } from 'react'

import { MaxPrice } from '../MaxPrice'
import { MinPrice } from '../MinPrice'

import { Amount } from '@/components/Amount/Amount'
import { RawText } from '@/components/Text'
import { useLocaleFormatter } from '@/hooks/useLocaleFormatter/useLocaleFormatter'
import { preferences } from '@/state/slices/preferencesSlice/preferencesSlice'
import { useAppSelector } from '@/state/store'
import { colors } from '@/theme/colors'

const LinearGradient = lazy(() =>
  import('@visx/gradient').then(({ LinearGradient }) => ({ default: LinearGradient })),
)
const ScaleSVG = lazy(() =>
  import('@visx/responsive').then(({ ScaleSVG }) => ({ default: ScaleSVG })),
)

type AnimatedAreaSeriesType = React.ComponentType<
  BaseAreaSeriesProps<AxisScale, AxisScale, HistoryData>
>
const AnimatedAreaSeries = lazy<AnimatedAreaSeriesType>(() =>
  import('@visx/xychart').then(({ AnimatedAreaSeries }) => ({ default: AnimatedAreaSeries })),
)
const AnimatedAxis = lazy(() =>
  import('@visx/xychart').then(({ AnimatedAxis }) => ({ default: AnimatedAxis })),
)
type TooltipType = React.ComponentType<TooltipProps<HistoryData>>
const Tooltip = lazy<TooltipType>(() =>
  import('@visx/xychart').then(({ Tooltip }) => ({ default: Tooltip })),
)
const XYChart = lazy(() => import('@visx/xychart').then(({ XYChart }) => ({ default: XYChart })))

export interface PrimaryChartProps {
  data: HistoryData[]
  width: number
  height: number
  margin: { top: number; right: number; bottom: number; left: number }
  color?: string
  hideAxis?: boolean
}

// accessors
const getStockValue = (d: HistoryData) => d?.price || 0

const verticalCrosshairStyle = {
  stroke: colors.blue[500],
  strokeWidth: 2,
  opacity: 0.5,
  strokeDasharray: '5,2',
  pointerEvents: 'none',
}

const tooltipStyle = { zIndex: 10 } // render over swapper TokenButton component

const accessors = {
  xAccessor: (d: HistoryData | undefined) => d?.date,
  yAccessor: (d: HistoryData | undefined) => d?.price,
}

export const PrimaryChart = ({
  data,
  width = 10,
  height,
  color = 'green.500',
  margin,
  hideAxis = false,
}: PrimaryChartProps) => {
  const selectedLocale = useAppSelector(preferences.selectors.selectSelectedLocale)

  const {
    number: { toFiat },
  } = useLocaleFormatter()

  const [chartColor] = useToken('colors', [color])
  const tooltipBg = useColorModeValue('white', colors.gray[800])
  const tooltipBorder = useColorModeValue(colors.gray[200], colors.gray[700])
  const tooltipColor = useColorModeValue(colors.gray[800], 'white')

  // bounds
  const xMax = useMemo(
    () => Math.max(width - margin.left - margin.right, 0),
    [margin.left, margin.right, width],
  )
  const yMax = useMemo(
    () => Math.max(height - margin.top - margin.bottom, 0),
    [height, margin.bottom, margin.top],
  )

  const minPrice = useMemo(() => Math.min(...data.map(getStockValue)), [data])
  const maxPrice = useMemo(() => Math.max(...data.map(getStockValue)), [data])

  const priceScale = useMemo(() => {
    return scaleLinear({
      range: [yMax + margin.top - 32, margin.top + 32],
      domain: [min(data, getStockValue) || 0, max(data, getStockValue) || 0],
    })
  }, [yMax, margin.top, data])

  const xyChartMargin = useMemo(
    () => ({ top: 0, bottom: margin.bottom, left: 0, right: 0 }),
    [margin],
  )

  const labelColor = useColorModeValue(colors.gray[300], colors.gray[600])
  const tickLabelProps = useMemo(
    () => ({
      textAnchor: 'middle' as const,
      verticalAnchor: 'middle' as const,
      fontSize: 12,
      fontWeight: 'bold',
      fill: labelColor,
      letterSpacing: 0,
    }),
    [labelColor],
  )
  const xScale = useMemo(
    () => ({
      type: 'time' as const,
      range: [0, xMax] as [Numeric, Numeric],
      domain: extent(data, d => new Date(d.date)) as [Date, Date],
    }),
    [data, xMax],
  )
  const yScale = useMemo(
    () => ({
      type: 'linear' as const,
      range: [yMax + margin.top - margin.bottom, margin.top + margin.bottom], // values are reversed, y increases down - this is really [bottom, top] in cartersian coordinates
      domain: [minPrice, maxPrice],
      zero: false,
    }),
    [yMax, margin.top, margin.bottom, minPrice, maxPrice],
  )

  const renderTooltip = useCallback(
    ({ tooltipData }: RenderTooltipParams<HistoryData>) => {
      const { datum } = tooltipData?.nearestDatum ?? {}

      if (!datum) return null

      const { date, price } = datum as HistoryData
      return (
        <CStack
          borderRadius={'lg'}
          borderColor={tooltipBorder}
          borderWidth={1}
          color={tooltipColor}
          bgColor={tooltipBg}
          direction='column'
          spacing={0}
          p={2}
        >
          <Amount.Fiat value={price} fontWeight='bold' />
          <RawText fontSize={'xs'} color={colors.gray[500]}>
            {dayjs(date).locale(selectedLocale).format('LLL')}
          </RawText>
        </CStack>
      )
    },
    [selectedLocale, tooltipBg, tooltipBorder, tooltipColor],
  )

  const lineProps = useMemo(() => ({ stroke: chartColor }), [chartColor])
  const tickLabelPropsFn = useCallback(() => tickLabelProps, [tickLabelProps])

  return (
    <ScaleSVG width={width} height={height}>
      <XYChart width={width} height={height} margin={xyChartMargin} xScale={xScale} yScale={yScale}>
        <LinearGradient id='area-gradient' from={chartColor} to={chartColor} toOpacity={0} />

        {!hideAxis && (
          <AnimatedAxis
            orientation='bottom'
            hideTicks
            hideAxisLine
            tickLabelProps={tickLabelPropsFn}
            numTicks={5}
            labelOffset={16}
          />
        )}
        <AnimatedAreaSeries
          dataKey='Line 1'
          data={data}
          fill='url(#area-gradient)'
          fillOpacity={0.1}
          lineProps={lineProps}
          offset={16}
          {...accessors}
        />
        <Tooltip
          applyPositionStyle
          style={tooltipStyle}
          showVerticalCrosshair
          snapTooltipToDatumX
          showSeriesGlyphs
          verticalCrosshairStyle={verticalCrosshairStyle}
          detectBounds
          renderTooltip={renderTooltip}
        />
        <MaxPrice
          yText={priceScale(maxPrice)}
          label={toFiat(maxPrice)}
          width={width}
          stroke={chartColor}
        />
        <MinPrice
          yText={priceScale(minPrice)}
          label={toFiat(minPrice)}
          width={width}
          stroke={chartColor}
        />
      </XYChart>
    </ScaleSVG>
  )
}
