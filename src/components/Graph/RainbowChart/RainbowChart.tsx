// import { useColorModeValue } from '@chakra-ui/color-mode'
import { btcAssetId, ethAssetId } from '@shapeshiftoss/caip'
// import { useToken } from '@chakra-ui/system'
import { HistoryData } from '@shapeshiftoss/types'
// import { localPoint } from '@visx/event'
// import { Group } from '@visx/group'
import { ScaleSVG } from '@visx/responsive'
// import { scaleTime } from '@visx/scale'
// import { Line } from '@visx/shape'
// import { defaultStyles as defaultTooltipStyles, TooltipWithBounds, useTooltip } from '@visx/tooltip'
import { AreaSeries, AreaStack, buildChartTheme, XYChart } from '@visx/xychart'
// import { bisector, extent, max, min } from 'd3-array'
// import dayjs from 'dayjs'
import { omit } from 'lodash'
// import numeral from 'numeral'
import React, { useMemo } from 'react'
import { useSelector } from 'react-redux'
// import { Amount } from 'components/Amount/Amount'
// import { useLocaleFormatter } from 'hooks/useLocaleFormatter/useLocaleFormatter'
import { selectAssets } from 'state/slices/selectors'
// import { useAppSelector } from 'state/store'
// import { colors } from 'theme/colors'

// import { AreaChart } from '../AreaChart/AreaChart'
// import { LineChart } from '../LineChart/LineChart'
// import { MaxPrice } from '../MaxPrice'
// import { MinPrice } from '../MinPrice'

export type RainbowChartProps = {
  data: HistoryData[]
  width: number
  height: number
  margin?: { top: number; right: number; bottom: number; left: number }
}

// accessors
// const getDate = (d: ChartData) => new Date(d.date)
// const getStockValue = (d: HistoryData) => d?.price || 0
// const bisectDate = bisector<HistoryData, Date>(d => new Date(d.date)).left

export type ChartData = {
  date: string
  [k: string]: string
}

// https://codesandbox.io/s/github/airbnb/visx/tree/master/packages/visx-demo/src/sandboxes/visx-xychart?file=/customTheme.ts:50-280
export const RainbowChart: React.FC<RainbowChartProps> = ({
  width = 10,
  height,
  // margin = { top: 0, right: 0, bottom: 0, left: 0 },
}) => {
  // const selectedLocale = useAppSelector(selectSelectedLocale)
  // const {
  //   // showTooltip,
  //   // hideTooltip,
  //   tooltipData,
  //   tooltipTop = 0,
  //   tooltipLeft = 0,
  // } = useTooltip<HistoryData>()

  const data: ChartData[] = useMemo(
    () => [
      {
        date: '100',
        [ethAssetId]: '1',
        [btcAssetId]: '2',
      },
      {
        date: '200',
        [ethAssetId]: '3',
        [btcAssetId]: '5',
      },
    ],
    [],
  )

  // const {
  //   number: { toFiat },
  // } = useLocaleFormatter()

  // const [chartColor] = useToken('colors', [color])
  // const chartColor = 'white'
  // const tooltipBg = useColorModeValue('white', colors.gray[800])
  // const tooltipBorder = useColorModeValue(colors.gray[200], colors.gray[700])
  // const tooltipColor = useColorModeValue(colors.gray[800], 'white')

  type Accessor = (d: ChartData) => string
  const accessors = useMemo(() => {
    const dataWithoutDate = omit(data, 'date')
    const initial: Record<string, Accessor> = {}
    const x = Object.keys(dataWithoutDate).reduce((acc, cur) => {
      acc[cur] = (d: ChartData) => d[cur]
      return acc
    }, initial)
    const getDate = (d: ChartData) => d.date
    const y = Object.keys(data).reduce((acc, cur) => {
      acc[cur] = getDate
      return acc
    }, initial)
    return { x, y }
  }, [data])

  // bounds
  // const xMax = Math.max(width - margin.left - margin.right, 0)
  // const yMax = Math.max(height - margin.top - margin.bottom, 0)

  // const minPrice = Math.min(...data.map(getStockValue))
  // const maxPrice = Math.max(...data.map(getStockValue))
  // const maxPriceIndex = data.findIndex(x => x.price === maxPrice)
  // const minPriceIndex = data.findIndex(x => x.price === minPrice)
  // const maxPriceDate = getDate(data[maxPriceIndex])
  // const minPriceDate = getDate(data[minPriceIndex])

  // scales
  // const dateScale = useMemo(() => {
  //   return scaleTime({
  //     range: [0, xMax],
  //     domain: extent(data, getDate) as [Date, Date],
  //   })
  // }, [xMax, data])
  // const priceScale = useMemo(() => {
  //   return scaleLinear({
  //     range: [yMax + margin.top, margin.top],
  //     domain: [min(data, getStockValue) || 0, max(data, getStockValue) || 0],
  //     nice: true,
  //   })
  //   //
  // }, [margin.top, yMax, data])

  // tooltip handler
  // const handleTooltip = useCallback(
  //   (event: React.TouchEvent<SVGRectElement> | React.MouseEvent<SVGRectElement>) => {
  //     const { x } = localPoint(event) || { x: 0 }
  //     const currX = x - margin.left
  //     const x0 = dateScale.invert(currX)
  //     const index = bisectDate(data, x0, 1)
  //     const d0 = data[index - 1]
  //     const d1 = data[index]
  //     let d = d0

  //     // calculate the cursor position and convert where to position the tooltip box.
  //     if (d1 && getDate(d1)) {
  //       d = x0.valueOf() - getDate(d0).valueOf() > getDate(d1).valueOf() - x0.valueOf() ? d1 : d0
  //     }

  //     showTooltip({
  //       tooltipData: d,
  //       tooltipLeft: x,
  //       tooltipTop: priceScale(getStockValue(d)),
  //     })
  //   },
  //   [showTooltip, priceScale, dateScale, data, margin.left],
  // )

  const assetIds = useMemo(() => {
    return Object.keys(omit(data[0], 'date'))
  }, [data])
  const assets = useSelector(selectAssets)
  const assetColors = useMemo(() => {
    return assetIds.map(assetId => assets[assetId].color)
  }, [assets, assetIds])

  const theme = buildChartTheme({
    backgroundColor: '#f09ae9',
    colors: assetColors,
    gridColor: '#336d88',
    gridColorDark: '#1d1b38',
    svgLabelBig: { fill: '#1d1b38' },
    tickLength: 8,
  })

  const areaLines = useMemo(() => {
    return assetIds.map(assetId => {
      return (
        <AreaSeries
          dataKey={assetId}
          xAccessor={accessors.x[assetId]}
          yAccessor={accessors.y[assetId]}
          stroke={assets[assetId].color}
          data={data}
          fillOpacity={0.5}
          width={width}
        />
      )
    })
  }, [accessors, assets, assetIds, data, width])

  return (
    <div style={{ position: 'relative' }}>
      <ScaleSVG width={width} height={height}>
        {/* top line */}
        {/* <LineChart
          data={data}
          width={width}
          hideLeftAxis
          margin={{ ...margin }}
          yMax={yMax}
          xScale={dateScale}
          yScale={priceScale}
          stroke={chartColor}
          xTickFormat={d => {
            return numeral(d).format(d <= 100 ? '$0.00' : '$0,0')
          }}
        /> */}

        <XYChart height={height} width={width} theme={theme}>
          <AreaStack>{areaLines}</AreaStack>
        </XYChart>
        {/* fill */}
        {/* <AreaChart
          hideLeftAxis
          hideBottomAxis
          data={data}
          width={width}
          margin={{ ...margin }}
          yMax={yMax}
          xScale={dateScale}
          yScale={priceScale}
          gradientColor={chartColor}
        /> */}
        {/* a transparent ele that track the pointer event, allow us to display tooltup */}
        {/* <Bar
          x={margin.left}
          y={margin.top * 2}
          width={xMax}
          height={yMax}
          fill='transparent'
          rx={14}
          onTouchStart={handleTooltip}
          onTouchMove={handleTooltip}
          onMouseMove={handleTooltip}
          onMouseLeave={() => hideTooltip()}
        /> */}
        {/* <Group top={margin.top} left={margin.left}>
          <MaxPrice
            yText={priceScale(maxPrice)}
            label={toFiat(maxPrice)}
            xDate={maxPriceDate}
            xScale={dateScale}
            width={width}
            yMax={yMax}
            stroke={chartColor}
          />
          <MinPrice
            yText={priceScale(minPrice)}
            label={toFiat(minPrice)}
            xScale={dateScale}
            xDate={minPriceDate}
            width={width}
            yMax={yMax}
            stroke={chartColor}
            margin={{ ...margin }}
          />
        </Group> */}
        {/* drawing the line and circle indicator to be display in cursor over a
          selected area */}
        {/* {tooltipData && (
          <Group>
            <Line
              from={{ x: tooltipLeft, y: margin.top * 2 }}
              to={{ x: tooltipLeft, y: yMax + margin.top * 2 }}
              stroke={colors.blue[500]}
              strokeWidth={2}
              opacity={0.5}
              pointerEvents='none'
              strokeDasharray='5,2'
            />
            <circle
              cx={tooltipLeft}
              cy={tooltipTop + 1 + margin.top}
              r={4}
              fill='black'
              fillOpacity={0.1}
              stroke='black'
              strokeOpacity={0.1}
              strokeWidth={2}
              pointerEvents='none'
            />
            <circle
              cx={tooltipLeft}
              cy={tooltipTop + margin.top}
              r={4}
              fill={colors.gray[500]}
              stroke='white'
              strokeWidth={2}
              pointerEvents='none'
            />
          </Group>
        )} */}
      </ScaleSVG>
      {/* {tooltipData && (
        <div>
          <TooltipWithBounds
            key={Math.random()}
            top={tooltipTop - 12}
            left={tooltipLeft}
            style={{
              ...defaultTooltipStyles,
              background: tooltipBg,
              padding: '0.5rem',
              border: `1px solid ${tooltipBorder}`,
              color: tooltipColor,
            }}
          >
            <ul style={{ padding: '0', margin: '0', listStyle: 'none' }}>
              <li>
                <Amount.Fiat fontWeight='bold' fontSize='lg' my={2} value={tooltipData.price} />
              </li>
              <li style={{ paddingBottom: '0.25rem', fontSize: '12px', color: colors.gray[500] }}>
                {dayjs(getDate(tooltipData)).locale(selectedLocale).format('LLL')}
              </li>
            </ul>
          </TooltipWithBounds>
        </div>
      )} */}
    </div>
  )
}
