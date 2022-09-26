import { Stack, Text } from '@chakra-ui/react'
import { useColorModeValue } from '@chakra-ui/system'
import { curveLinear } from '@visx/curve'
import { Group } from '@visx/group'
import { ScaleSVG } from '@visx/responsive'
import type { Margin } from '@visx/xychart'
import { AreaSeries, AreaStack, Axis, Tooltip, XYChart } from '@visx/xychart'
import type { Numeric } from 'd3-array'
import { extent } from 'd3-array'
import dayjs from 'dayjs'
import omit from 'lodash/omit'
import React, { useMemo } from 'react'
import { useSelector } from 'react-redux'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import type { RainbowData } from 'hooks/useBalanceChartData/useBalanceChartData'
import { selectAssets, selectSelectedLocale } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'
import { colors } from 'theme/colors'

export type RainbowChartProps = {
  data: RainbowData[]
  width: number
  height: number
  color: string
  margin?: Margin
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

  const xScale = useMemo(
    () => ({
      type: 'time' as const,
      range: [0, width] as [Numeric, Numeric],
      domain: extent(data, d => new Date(d.date)) as [Date, Date],
    }),
    [data, width],
  )

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

  const totals = useMemo(() => data.map(d => d.total), [data])
  const minPrice = Math.min(...totals)
  const maxPrice = Math.max(...totals)

  const yMax = Math.max(height - margin.top - margin.bottom, 0)
  const yScale = useMemo(
    () => ({
      type: 'linear' as const,
      range: [yMax + margin.top, margin.top], // values are reversed, y increases down - this is really [bottom, top] in cartersian coordinates
      domain: [minPrice ?? 0, maxPrice ?? 0],
      nice: true,
    }),
    [margin.top, maxPrice, minPrice, yMax],
  )

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
          <Group top={margin.top} left={margin.left}>
            <AreaStack order='ascending' curve={curveLinear}>
              {areaLines}
            </AreaStack>
          </Group>
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
            style={{ zIndex: 10 }} // render over swapper TokenButton component
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
          />
        </XYChart>
      </ScaleSVG>
    </div>
  )
}
