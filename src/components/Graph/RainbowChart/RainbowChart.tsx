import { Stack, Text } from '@chakra-ui/react'
import { useColorModeValue } from '@chakra-ui/system'
import { curveLinear } from '@visx/curve'
import { ScaleSVG } from '@visx/responsive'
import { AreaSeries, AreaStack, Axis, Tooltip, XYChart } from '@visx/xychart'
import { extent, Numeric } from 'd3-array'
import dayjs from 'dayjs'
import omit from 'lodash/omit'
import React, { useMemo } from 'react'
import { useSelector } from 'react-redux'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { RainbowData } from 'hooks/useBalanceChartData/useBalanceChartData'
import { selectAssets, selectSelectedLocale } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'
import { colors } from 'theme/colors'

export type RainbowChartProps = {
  data: RainbowData[]
  width: number
  height: number
  margin?: { top: number; right: number; bottom: number; left: number }
}

// https://codesandbox.io/s/github/airbnb/visx/tree/master/packages/visx-demo/src/sandboxes/visx-xychart?file=/customTheme.ts:50-280
export const RainbowChart: React.FC<RainbowChartProps> = ({
  data,
  width,
  height,
  margin = { top: 0, right: 0, bottom: 0, left: 0 },
}) => {
  const selectedLocale = useAppSelector(selectSelectedLocale)
  const assetIds = useMemo(() => Object.keys(omit(data[0], ['date', 'total'])), [data])
  const assets = useSelector(selectAssets)
  const magicXAxisOffset = 37

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

  const totals = useMemo(() => data.map(d => d.total), [data])
  const yScale = {
    type: 'linear' as const,
    range: [height - 44, 0], // values are reversed, y increases down - this is really [bottom, top] in cartersian coordinates
    domain: [Math.min(...totals), Math.max(...totals)],
    nice: true,
  }

  const tooltipBg = useColorModeValue('white', colors.gray[700])
  const tooltipBorder = useColorModeValue(colors.gray[200], colors.gray[600])
  const tooltipColor = useColorModeValue(colors.gray[800], 'white')

  const areaLines = useMemo(
    () =>
      assetIds.map(assetId => (
        <AreaSeries
          key={assetId}
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
          <AreaStack order='reverse' curve={curveLinear}>
            {areaLines}
          </AreaStack>
          <Axis
            key={'date'}
            orientation={'bottom'}
            top={height - magicXAxisOffset}
            hideTicks
            hideAxisLine
            numTicks={5}
            tickLabelProps={() => tickLabelProps}
          />
          <Tooltip<RainbowData>
            applyPositionStyle
            unstyled
            showVerticalCrosshair
            verticalCrosshairStyle={{
              stroke: colors.blue[500],
              strokeWidth: 2,
              opacity: 0.5,
              strokeDasharray: '5,2',
              pointerEvents: 'none',
            }}
            renderTooltip={({ tooltipData }) => {
              const { datum, key: assetId } = tooltipData?.nearestDatum!
              const price = datum[assetId]
              const { date } = datum
              const asset = assets[assetId]!
              const { symbol } = asset
              return (
                <Stack
                  borderRadius={'lg'}
                  borderColor={tooltipBorder}
                  borderWidth={1}
                  color={tooltipColor}
                  bgColor={tooltipBg}
                  direction='column'
                  spacing={0}
                  p={2}
                >
                  <Stack direction='row' alignItems={'center'}>
                    <AssetIcon assetId={assetId} size='2xs' />
                    <Text fontWeight='bold'>{symbol}</Text>
                  </Stack>
                  <Amount.Fiat value={price} fontWeight='bold' />
                  <Text fontSize={'xs'} color={colors.gray[500]}>
                    {dayjs(date).locale(selectedLocale).format('LLL')}
                  </Text>
                </Stack>
              )
            }}
          ></Tooltip>
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
    </div>
  )
}
