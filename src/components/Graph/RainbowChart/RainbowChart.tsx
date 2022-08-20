import { curveLinear } from '@visx/curve'
import { ScaleSVG } from '@visx/responsive'
import { AreaSeries, AreaStack, Axis, XYChart } from '@visx/xychart'
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
export const RainbowChart: React.FC<RainbowChartProps> = ({ data, width = 10, height, margin }) => {
  const assetIds = useMemo(() => Object.keys(omit(data[0], ['date', 'total'])), [data])
  const assets = useSelector(selectAssets)

  type Accessor = (d: RainbowData) => number
  const accessors = useMemo(() => {
    const initial: Record<'x' | 'y', Record<string, Accessor>> = { x: {}, y: {} }
    return assetIds.reduce((acc, cur) => {
      acc.x[cur] = (d: RainbowData) => d.date
      acc.y[cur] = (d: RainbowData) => d[cur]
      return acc
    }, initial)
  }, [assetIds])

  const xScale = { type: 'band', paddingInner: 0.0 } as const
  const yScale = { type: 'linear' } as const

  const areaLines = useMemo(
    () =>
      assetIds.map(assetId => (
        <AreaSeries
          data={data}
          dataKey={assetId}
          stroke={assets[assetId].color}
          strokeWidth={2}
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
          <Axis key={'date'} orientation={'bottom'} />
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
