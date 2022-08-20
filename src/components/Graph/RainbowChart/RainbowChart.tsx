import { useColorModeValue } from '@chakra-ui/system'
import { curveLinear } from '@visx/curve'
import { ScaleSVG } from '@visx/responsive'
import { AreaSeries, AreaStack, Axis, XYChart } from '@visx/xychart'
import { extent, Numeric } from 'd3-array'
import omit from 'lodash/omit'
import React, { useMemo } from 'react'
import { useSelector } from 'react-redux'
import { RainbowData } from 'hooks/useBalanceChartData/useBalanceChartData'
import { selectAssets } from 'state/slices/selectors'
import { colors } from 'theme/colors'

export type RainbowChartProps = {
  data: RainbowData[]
  width: number
  height: number
  margin?: { top: number; right: number; bottom: number; left: number }
}

// https://codesandbox.io/s/github/airbnb/visx/tree/master/packages/visx-demo/src/sandboxes/visx-xychart?file=/customTheme.ts:50-280
export const RainbowChart: React.FC<RainbowChartProps> = ({ data, width, height }) => {
  const assetIds = useMemo(() => Object.keys(omit(data[0], ['date', 'total'])), [data])
  const assets = useSelector(selectAssets)
  const margin = { top: 20, right: 0, bottom: 37, left: 0 }

  type Accessor = (d: RainbowData) => number
  const accessors = useMemo(() => {
    const initial: Record<'x' | 'y', Record<string, Accessor>> = { x: {}, y: {} }
    return assetIds.reduce((acc, cur) => {
      acc.x[cur] = (d: RainbowData) => d.date
      acc.y[cur] = (d: RainbowData) => d[cur]
      return acc
    }, initial)
  }, [assetIds])

  const xScale = {
    type: 'time' as const,
    range: [0, width] as [Numeric, Numeric],
    domain: extent(data, d => new Date(d.date)) as [Date, Date],
  }

  const labelColor = useColorModeValue(colors.gray[300], colors.gray[700])
  const tickLabelProps = {
    textAnchor: 'middle' as const,
    verticalAnchor: 'middle' as const,
    fontSize: 12,
    fontWeight: 'bold',
    fill: labelColor,
    letterSpacing: 0,
  }
  const yScale = { type: 'linear' } as const

  const areaLines = useMemo(
    () =>
      assetIds.map(assetId => (
        <AreaSeries
          data={data}
          dataKey={assetId}
          fill={assets[assetId].color}
          fillOpacity={0.1}
          xAccessor={accessors.x[assetId]}
          yAccessor={accessors.y[assetId]}
        />
      )),
    [assets, accessors, assetIds, data],
  )

  return (
    <div style={{ position: 'relative' }}>
      <ScaleSVG width={width} height={height}>
        <XYChart margin={margin} height={height} width={width} xScale={xScale} yScale={yScale}>
          <AreaStack curve={curveLinear}>{areaLines}</AreaStack>
          <Axis
            key={'date'}
            orientation={'bottom'}
            hideTicks
            hideAxisLine
            numTicks={5}
            tickLabelProps={() => tickLabelProps}
          />
        </XYChart>
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
