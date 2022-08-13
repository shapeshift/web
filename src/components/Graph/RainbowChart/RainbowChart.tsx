import { ScaleSVG } from '@visx/responsive'
import { AreaSeries, AreaStack, Axis, buildChartTheme, XYChart } from '@visx/xychart'
import { omit } from 'lodash'
import React, { useMemo } from 'react'
import { useSelector } from 'react-redux'
import { RainbowData } from 'hooks/useBalanceChartData/useBalanceChartData'
import { selectAssets } from 'state/slices/selectors'

export type RainbowChartProps = {
  data: RainbowData[]
  width: number
  height: number
  margin?: { top: number; right: number; bottom: number; left: number }
}

// https://codesandbox.io/s/github/airbnb/visx/tree/master/packages/visx-demo/src/sandboxes/visx-xychart?file=/customTheme.ts:50-280
export const RainbowChart: React.FC<RainbowChartProps> = ({ data, width = 10, height }) => {
  const assetIds = useMemo(() => Object.keys(omit(data[0], 'date')), [data])
  const assets = useSelector(selectAssets)
  const assetColors = useMemo(
    () => assetIds.map(assetId => assets[assetId]?.color || 'white'),
    [assets, assetIds],
  )

  type Accessor = (d: RainbowData) => number
  const accessors = useMemo(() => {
    const xInitial: Record<string, Accessor> = {}
    const yInitial: Record<string, Accessor> = {}
    const x = assetIds.reduce((acc, cur) => {
      acc[cur] = (d: RainbowData) => d.date
      return acc
    }, xInitial)
    const y = assetIds.reduce((acc, cur) => {
      acc[cur] = (d: RainbowData) => d[cur]
      return acc
    }, yInitial)
    return { x, y }
  }, [assetIds])

  const theme = buildChartTheme({
    backgroundColor: '#f09ae9',
    colors: assetColors,
    gridColor: '#336d88',
    gridColorDark: '#1d1b38',
    svgLabelBig: { fill: '#1d1b38' },
    tickLength: 8,
  })

  const xScale = { type: 'band', paddingInner: 0.0 } as const
  const yScale = { type: 'linear' } as const

  const areaLines = useMemo(() => {
    return assetIds.map(assetId => {
      return (
        <AreaSeries
          data={data}
          dataKey={assetId}
          xAccessor={accessors.x[assetId]}
          yAccessor={accessors.y[assetId]}
          stroke={assets[assetId].color}
          fillOpacity={0.5}
        />
      )
    })
  }, [accessors, assets, assetIds, data])

  return (
    <div style={{ position: 'relative' }}>
      <ScaleSVG width={width} height={height}>
        <XYChart height={height} width={width} theme={theme} xScale={xScale} yScale={yScale}>
          <AreaStack>{areaLines}</AreaStack>
          <Axis key={'date'} orientation={'bottom'} numTicks={10} />
          <Axis key={'price'} orientation={'right'} numTicks={5} />
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
