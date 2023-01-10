import { Stack, Text } from '@chakra-ui/react'
import { useColorModeValue } from '@chakra-ui/system'
import { curveLinear } from '@visx/curve'
import type { Margin } from '@visx/xychart'
import { AnimatedAxis, AreaSeries, AreaStack, Tooltip, XYChart } from '@visx/xychart'
import type { RenderTooltipParams } from '@visx/xychart/lib/components/Tooltip'
import type { Numeric } from 'd3-array'
import { extent } from 'd3-array'
import dayjs from 'dayjs'
import omit from 'lodash/omit'
import React, { useCallback, useMemo } from 'react'
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
  const totals = useMemo(() => data.map(d => d.total), [data])
  const minPrice = useMemo(() => Math.min(...totals), [totals])
  const maxPrice = useMemo(() => Math.max(...totals), [totals])

  const yScale = useMemo(
    () => ({
      type: 'linear' as const,
      range: [height - 32, margin.top * 2], // values are reversed, y increases down - this is really [bottom, top] in cartersian coordinates
      domain: [minPrice ?? 0, maxPrice ?? 0],
      nice: true,
    }),
    [margin.top, height, maxPrice, minPrice],
  )

  const tooltipBg = useColorModeValue('white', colors.gray[700])
  const tooltipBorder = useColorModeValue(colors.gray[200], colors.gray[600])
  const tooltipColor = useColorModeValue(colors.gray[800], 'white')

  const renderTooltip = useCallback(
    (params: RenderTooltipParams<RainbowData>) => {
      const { tooltipData } = params
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
    },
    [assets, selectedLocale, tooltipBg, tooltipBorder, tooltipColor],
  )

  const areaFillOpacity = useColorModeValue(0.15, 0.1)

  const areaLines = useMemo(
    () =>
      assetIds.map(assetId => (
        <AreaSeries
          key={assetId}
          data={data}
          dataKey={assetId}
          fill={assets[assetId]?.color}
          fillOpacity={areaFillOpacity}
          xAccessor={accessors.x[assetId]}
          yAccessor={accessors.y[assetId]}
        />
      )),
    [assetIds, data, assets, areaFillOpacity, accessors.x, accessors.y],
  )

  const verticalCrosshairStyle = useMemo(
    () => ({
      stroke: colors.blue[500],
      strokeWidth: 2,
      opacity: 0.5,
      strokeDasharray: '5,2',
      pointerEvents: 'none',
    }),
    [],
  )

  const tooltipStyle = useMemo(() => ({ zIndex: 10 }), [])

  const tickLabelPropsObj = useMemo(
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

  const tickLabelProps = useCallback(() => tickLabelPropsObj, [tickLabelPropsObj])

  return (
    <div>
      <XYChart margin={margin} height={height} width={width} xScale={xScale} yScale={yScale}>
        <AreaStack order='ascending' curve={curveLinear}>
          {areaLines}
        </AreaStack>
        <AnimatedAxis
          key={'date'}
          orientation={'bottom'}
          hideTicks
          hideAxisLine
          numTicks={5}
          labelOffset={16}
          tickLabelProps={tickLabelProps}
        />
        <Tooltip<RainbowData>
          applyPositionStyle
          style={tooltipStyle} // render over swapper TokenButton component
          showVerticalCrosshair
          verticalCrosshairStyle={verticalCrosshairStyle}
          offsetTop={0}
          renderTooltip={renderTooltip}
        />
      </XYChart>
    </div>
  )
}
