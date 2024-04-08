import { useColorModeValue, useToken } from '@chakra-ui/system'
import styled from '@emotion/styled'
import {
  createChart,
  CrosshairMode,
  type ISeriesApi,
  LineStyle,
  LineType,
  type SingleValueData,
  type Time,
} from 'lightweight-charts'
import { useEffect, useRef } from 'react'
import { selectSelectedCurrency } from 'state/slices/selectors'
import { store } from 'state/store'
import { semanticTokens } from 'theme/semanticTokens'
import { opacify } from 'theme/utils'

import { formatTickMarks } from './utils'

export enum ChartType {
  VOLUME = 'Volume',
  LIQUIDITY = 'Liquidity',
  PRICE = 'Price',
}

type SimpleChartProps<T extends number | Time> = {
  data: SingleValueData<T>[]
  seriesType: 'histogram' | 'line'
  height: number
}
const surfaceColors = semanticTokens.colors.background.surface
const textColors = semanticTokens.colors.text
const borderColors = semanticTokens.colors.border
const backgroundColor = 'transparent'
const areaTopColor = 'rgba(41, 98, 255, 0.5)'
const areaBottomColor = 'rgba(41, 98, 255, 0.28)'

const currentLocale = window.navigator.languages[0]
const selectedCurrency = selectSelectedCurrency(store.getState())
const priceFormatter = Intl.NumberFormat(currentLocale, {
  style: 'currency',
  currency: selectedCurrency,
  notation: 'compact',
  compactDisplay: 'short',
}).format

const ChartDiv = styled.div<{ height?: number }>`
  ${({ height }) => height && `height: ${height}px`};
  width: 100%;
  position: relative;
`

export const SimpleChart = <T extends number | Time>({
  data,
  seriesType,
  height,
}: SimpleChartProps<T>) => {
  const chartContainerRef = useRef<HTMLDivElement | null>(null)
  const [
    surfaceLight,
    surfaceDark,
    lightText,
    darkText,
    lightBorder,
    darkBorder,
    boldBorderLight,
    boldBorderDark,
    brandColor,
  ] = useToken('colors', [
    surfaceColors.raised.hover.default,
    surfaceColors.raised.hover._dark,
    textColors.subtle.default,
    textColors.subtle._dark,
    borderColors.subtle.default,
    borderColors.subtle._dark,
    borderColors.bold.default,
    borderColors.bold._dark,
    'blue.500',
  ])
  const textColor = useColorModeValue(lightText, darkText)
  const lineColor = useColorModeValue(lightBorder, darkBorder)
  const boldBorder = useColorModeValue(boldBorderLight, boldBorderDark)
  const surfaceColor = useColorModeValue(surfaceLight, surfaceDark)

  useEffect(() => {
    if (chartContainerRef.current && data) {
      const chart = createChart(chartContainerRef.current, {
        grid: {
          vertLines: {
            color: lineColor,
          },
          horzLines: {
            color: lineColor,
          },
        },
        layout: {
          background: { color: backgroundColor },
          textColor,
        },
        width: chartContainerRef.current.offsetWidth,
        height: chartContainerRef.current.offsetHeight,
        localization: { priceFormatter },
        autoSize: true,
        timeScale: {
          tickMarkFormatter: formatTickMarks,
          timeVisible: true,
          borderVisible: false,
          ticksVisible: false,
          fixLeftEdge: true,
          fixRightEdge: true,
        },
        rightPriceScale: {
          borderVisible: false,
          scaleMargins: {
            top: 0.3,
            bottom: seriesType === 'histogram' ? 0 : 0.15,
          },
        },
        handleScale: {
          axisPressedMouseMove: false,
        },
        handleScroll: {
          vertTouchDrag: false,
        },
        crosshair: {
          horzLine: {
            visible: true,
            style: LineStyle.Solid,
            width: 1,
            color: boldBorder,
            labelVisible: true,
            labelBackgroundColor: surfaceColor,
          },
          mode: CrosshairMode.Magnet,
          vertLine: {
            visible: true,
            style: LineStyle.Solid,
            width: 1,
            color: boldBorder,
            labelVisible: true,
            labelBackgroundColor: surfaceColor,
          },
        },
      })
      const newSeries =
        seriesType === 'line'
          ? (chart.addAreaSeries({
              lineColor,
              topColor: areaTopColor,
              bottomColor: areaBottomColor,
            }) as unknown as ISeriesApi<'Area', T>)
          : (chart.addHistogramSeries({
              color: areaTopColor,
            }) as unknown as ISeriesApi<'Histogram', T>)
      newSeries.setData(data)
      chart.timeScale().fitContent()

      const handleResize = () => {
        chart.applyOptions({
          width: chartContainerRef.current?.offsetWidth,
          height: chartContainerRef.current?.offsetHeight,
        })
      }

      if (seriesType === 'line') {
        newSeries.applyOptions({
          lineColor: brandColor,
          lineType: data.length < 20 ? LineType.WithSteps : LineType.Curved,
          lineWidth: 2,
          crosshairMarkerRadius: 5,
          crosshairMarkerBorderColor: opacify(30, brandColor),
          crosshairMarkerBorderWidth: 3,
          topColor: opacify(12, brandColor),
          bottomColor: opacify(12, brandColor),
        })
      }

      window.addEventListener('resize', handleResize)

      return () => {
        window.removeEventListener('resize', handleResize)
        chart.remove()
      }
    }
  }, [boldBorder, brandColor, data, lineColor, seriesType, surfaceColor, textColor])

  return <ChartDiv ref={chartContainerRef} height={height} />
}
