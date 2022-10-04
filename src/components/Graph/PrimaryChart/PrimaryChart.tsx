import { useColorModeValue } from '@chakra-ui/color-mode'
import { Stack as CStack } from '@chakra-ui/react'
import { useToken } from '@chakra-ui/system'
import type { HistoryData } from '@shapeshiftoss/types'
import { localPoint } from '@visx/event'
import { LinearGradient } from '@visx/gradient'
import { scaleLinear, scaleTime } from '@visx/scale'
import { Stack } from '@visx/shape'
import { useTooltip } from '@visx/tooltip'
import { AnimatedAreaSeries, AnimatedAxis, buildChartTheme, Tooltip, XYChart } from '@visx/xychart'
import type { Numeric } from 'd3-array'
import { bisector, extent, max, min } from 'd3-array'
import dayjs from 'dayjs'
import React, { useCallback, useMemo } from 'react'
import { Amount } from 'components/Amount/Amount'
import { RawText } from 'components/Text'
import { useLocaleFormatter } from 'hooks/useLocaleFormatter/useLocaleFormatter'
import { selectSelectedLocale } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'
import { colors } from 'theme/colors'

export interface PrimaryChartProps {
  data: HistoryData[]
  width: number
  height: number
  margin?: { top: number; right: number; bottom: number; left: number }
  color?: string
}

// accessors
const getDate = (d: HistoryData) => new Date(d.date)
const getStockValue = (d: HistoryData) => d?.price || 0
const bisectDate = bisector<HistoryData, Date>(d => new Date(d.date)).left

export const PrimaryChart = ({
  data,
  width = 10,
  height,
  color = 'green.500',
  margin = { top: 0, right: 0, bottom: 0, left: 0 },
}: PrimaryChartProps) => {
  const selectedLocale = useAppSelector(selectSelectedLocale)
  const {
    showTooltip,
    hideTooltip,
    tooltipData,
    tooltipTop = 0,
    tooltipLeft = 0,
  } = useTooltip<HistoryData>()

  const {
    number: { toFiat },
  } = useLocaleFormatter()

  const [chartColor] = useToken('colors', [color])
  const tooltipBg = useColorModeValue('white', colors.gray[800])
  const tooltipBorder = useColorModeValue(colors.gray[200], colors.gray[700])
  const tooltipColor = useColorModeValue(colors.gray[800], 'white')

  // bounds
  const xMax = Math.max(width - margin.left - margin.right, 0)
  const yMax = Math.max(height - margin.top - margin.bottom, 0)

  const minPrice = Math.min(...data.map(getStockValue))
  const maxPrice = Math.max(...data.map(getStockValue))
  const maxPriceIndex = data.findIndex(x => x.price === maxPrice)
  const minPriceIndex = data.findIndex(x => x.price === minPrice)
  const maxPriceDate = getDate(data[maxPriceIndex])
  const minPriceDate = getDate(data[minPriceIndex])

  // scales
  const dateScale = useMemo(() => {
    return scaleTime({
      range: [0, xMax],
      domain: extent(data, getDate) as [Date, Date],
    })
  }, [xMax, data])
  const priceScale = useMemo(() => {
    return scaleLinear({
      range: [yMax + margin.top, margin.top],
      domain: [min(data, getStockValue) || 0, max(data, getStockValue) || 0],
      nice: true,
    })
    //
  }, [margin.top, yMax, data])

  const xScale = useMemo(
    () => ({
      type: 'time' as const,
      range: [0, xMax] as [Numeric, Numeric],
      domain: extent(data, getDate) as [Date, Date],
    }),
    [data, xMax],
  )

  const yScale = useMemo(
    () => ({
      type: 'linear' as const,
      range: [yMax + margin.top, margin.top], // values are reversed, y increases down - this is really [bottom, top] in cartersian coordinates
      domain: [min(data, getStockValue) || 0, max(data, getStockValue) || 0],
      nice: true,
    }),
    [data, margin.top, yMax],
  )

  // tooltip handler
  const handleTooltip = useCallback(
    (event: React.TouchEvent<SVGRectElement> | React.MouseEvent<SVGRectElement>) => {
      const { x } = localPoint(event) || { x: 0 }
      const currX = x - margin.left
      const x0 = dateScale.invert(currX)
      const index = bisectDate(data, x0, 1)
      const d0 = data[index - 1]
      const d1 = data[index]
      let d = d0

      // calculate the cursor position and convert where to position the tooltip box.
      if (d1 && getDate(d1)) {
        d = x0.valueOf() - getDate(d0).valueOf() > getDate(d1).valueOf() - x0.valueOf() ? d1 : d0
      }

      showTooltip({
        tooltipData: d,
        tooltipLeft: x,
        tooltipTop: priceScale(getStockValue(d)),
      })
    },
    [showTooltip, priceScale, dateScale, data, margin.left],
  )
  const accessors = {
    xAccessor: (d: HistoryData) => d.date,
    yAccessor: (d: HistoryData) => d.price,
  }
  const labelColor = useColorModeValue(colors.gray[300], colors.gray[700])
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

  return (
    <XYChart
      width={width}
      height={height}
      margin={{ left: 16, right: 16, top: 16, bottom: 32 }}
      xScale={{ type: 'utc' }}
      yScale={{ type: 'log' }}
    >
      <LinearGradient id='area-gradient' from={chartColor} to={chartColor} toOpacity={0} />
      <AnimatedAxis
        orientation='bottom'
        hideTicks
        hideAxisLine
        tickLabelProps={() => tickLabelProps}
        numTicks={5}
        labelOffset={16}
      />
      <AnimatedAreaSeries
        dataKey='Line 1'
        data={data}
        fill='url(#area-gradient'
        fillOpacity={0.1}
        lineProps={{ stroke: chartColor }}
        offset={16}
        {...accessors}
      />
      <Tooltip
        applyPositionStyle
        style={{ zIndex: 10 }} // render over swapper TokenButton component
        showVerticalCrosshair
        snapTooltipToDatumX
        showSeriesGlyphs
        verticalCrosshairStyle={{
          stroke: colors.blue[500],
          strokeWidth: 2,
          opacity: 0.5,
          strokeDasharray: '5,2',
          pointerEvents: 'none',
        }}
        detectBounds
        renderTooltip={({ tooltipData }) => {
          const { datum } = tooltipData?.nearestDatum!
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
        }}
      />
    </XYChart>
  )
}
