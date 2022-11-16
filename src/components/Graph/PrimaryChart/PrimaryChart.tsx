import { useColorModeValue } from '@chakra-ui/color-mode'
import { Stack as CStack } from '@chakra-ui/react'
import { useToken } from '@chakra-ui/system'
import type { HistoryData } from '@shapeshiftoss/types'
import { LinearGradient } from '@visx/gradient'
import { scaleLinear } from '@visx/scale'
import { AnimatedAreaSeries, AnimatedAxis, Tooltip, XYChart } from '@visx/xychart'
import type { Numeric } from 'd3-array'
import { extent, max, min } from 'd3-array'
import dayjs from 'dayjs'
import { useMemo } from 'react'
import { Amount } from 'components/Amount/Amount'
import { RawText } from 'components/Text'
import { useLocaleFormatter } from 'hooks/useLocaleFormatter/useLocaleFormatter'
import { selectSelectedLocale } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'
import { colors } from 'theme/colors'

import { MaxPrice } from '../MaxPrice'
import { MinPrice } from '../MinPrice'

export interface PrimaryChartProps {
  data: HistoryData[]
  width: number
  height: number
  margin?: { top: number; right: number; bottom: number; left: number }
  color?: string
}

// accessors
const getStockValue = (d: HistoryData) => d?.price || 0

export const PrimaryChart = ({
  data,
  width = 10,
  height,
  color = 'green.500',
  margin = { top: 0, right: 0, bottom: 0, left: 0 },
}: PrimaryChartProps) => {
  const selectedLocale = useAppSelector(selectSelectedLocale)

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

  const priceScale = useMemo(() => {
    return scaleLinear({
      range: [yMax + margin.top - 32, margin.top + 32],
      domain: [min(data, getStockValue) || 0, max(data, getStockValue) || 0],
    })
    //
  }, [margin.top, yMax, data])

  const accessors = {
    xAccessor: (d: HistoryData) => d.date,
    yAccessor: (d: HistoryData) => d.price,
  }
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
      range: [yMax + margin.top - 32, margin.top + 32], // values are reversed, y increases down - this is really [bottom, top] in cartersian coordinates
      domain: [minPrice, maxPrice],
      zero: false,
    }),
    [yMax, margin.top, minPrice, maxPrice],
  )

  return (
    <XYChart width={width} height={height} margin={margin} xScale={xScale} yScale={yScale}>
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
        fill='url(#area-gradient)'
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
  )
}
