import { useColorModeValue, useToken } from '@chakra-ui/react'
import styled from '@emotion/styled'
import type { OhlcData, SeriesType, UTCTimestamp } from 'lightweight-charts'
import {
  createChart,
  CrosshairMode,
  type HistogramData,
  LineStyle,
  LineType,
  type MouseEventParams,
  type SingleValueData,
  type Time,
} from 'lightweight-charts'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { selectSelectedCurrency } from 'state/slices/selectors'
import { store } from 'state/store'
import { semanticTokens } from 'theme/semanticTokens'
import { opacify } from 'theme/utils'

import { ChartHeader } from './ChartHeader'
import type { ChartInterval } from './utils'
import { formatHistoryDuration, formatTickMarks } from './utils'

type SimpleChartProps<T extends Time> = {
  data: (SingleValueData<T> | OhlcData<T>)[]
  seriesType?: SeriesType
  height: number
  accentColor?: string
  interval: ChartInterval
}

const topColor = 'rgba(41, 98, 255, 0.5)'
const bottomColor = 'rgba(41, 98, 255, 0.28)'
const downColor = 'rgba(255, 69, 0, 0.28)'
const surfaceColors = semanticTokens.colors.background.surface
const textColors = semanticTokens.colors.text
const borderColors = semanticTokens.colors.border

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

export type crossHairDataProps = HistogramData | undefined

export const SimpleChart = <T extends Time>({
  data,
  seriesType = 'Line',
  height,
  accentColor,
  interval,
}: SimpleChartProps<T>) => {
  const [crosshairData, setCrosshairData] = useState<crossHairDataProps>()
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
  const accentColorValue = accentColor ?? brandColor
  const lastPrice = data[data.length - 1] as HistogramData

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
          background: { color: 'transparent' },
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
            bottom: seriesType === 'Histogram' ? 0 : 0.15,
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
            labelVisible: false,
            labelBackgroundColor: surfaceColor,
          },
          mode: CrosshairMode.Magnet,
          vertLine: {
            visible: true,
            style: LineStyle.Solid,
            width: 1,
            color: boldBorder,
            labelVisible: false,
            labelBackgroundColor: surfaceColor,
          },
        },
      })
      const newSeries = (() => {
        switch (seriesType) {
          case 'Line':
            return chart.addLineSeries({
              color: lineColor,
            })
          case 'Histogram':
            return chart.addHistogramSeries({
              color: accentColorValue,
              priceFormat: {
                type: 'volume',
              },
            })
          case 'Bar':
            return chart.addBarSeries({
              upColor: topColor,
              downColor,
            })
          case 'Area':
            return chart.addAreaSeries({
              lineColor: accentColorValue,
              lineType: data.length < 20 ? LineType.WithSteps : LineType.Curved,
              lineWidth: 2,
              crosshairMarkerRadius: 5,
              crosshairMarkerBorderColor: opacify(30, brandColor),
              crosshairMarkerBorderWidth: 3,
              topColor: opacify(12, accentColorValue),
              bottomColor: opacify(12, accentColorValue),
            })
          case 'Candlestick':
            return chart.addCandlestickSeries({
              upColor: topColor,
              borderUpColor: topColor,
              wickUpColor: topColor,
              downColor,
              borderDownColor: bottomColor,
              wickDownColor: bottomColor,
            })
          case 'Baseline':
            return chart.addBaselineSeries({
              topLineColor: topColor,
              bottomLineColor: bottomColor,
            })
          default:
            return chart.addLineSeries({
              color: lineColor,
            })
        }
      })()

      newSeries.setData(data)
      chart.timeScale().fitContent()

      const handleResize = () => {
        chart.applyOptions({
          width: chartContainerRef.current?.offsetWidth,
          height: chartContainerRef.current?.offsetHeight,
        })
      }

      const handleCrosshairMove = (event: MouseEventParams) => {
        if (event.time) {
          const data = event.seriesData.get(newSeries) as HistogramData
          setCrosshairData(data)
        } else {
          setCrosshairData(undefined)
        }
      }

      chart.subscribeCrosshairMove(handleCrosshairMove)

      window.addEventListener('resize', handleResize)

      return () => {
        window.removeEventListener('resize', handleResize)
        chart.remove()
      }
    }
  }, [
    accentColorValue,
    boldBorder,
    brandColor,
    data,
    lineColor,
    seriesType,
    surfaceColor,
    textColor,
  ])

  // Prevent scrolling while scrubbing the chart
  const handleTouchMove = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => e.preventDefault(),
    [],
  )

  const chartHeader = useMemo(() => {
    return (
      <ChartHeader
        value={crosshairData?.value ?? lastPrice.value}
        time={crosshairData?.time as UTCTimestamp}
        timePlaceholder={formatHistoryDuration(interval)}
      />
    )
  }, [crosshairData?.time, crosshairData?.value, interval, lastPrice.value])

  return (
    <ChartDiv ref={chartContainerRef} height={height} onTouchMove={handleTouchMove}>
      {chartHeader}
    </ChartDiv>
  )
}
