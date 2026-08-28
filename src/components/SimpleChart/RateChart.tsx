import { Heading, useColorModeValue, useToken } from '@chakra-ui/react'
import styled from '@emotion/styled'
import type { HistogramData, MouseEventParams, UTCTimestamp } from 'lightweight-charts'
import { createChart, CrosshairMode, LineStyle } from 'lightweight-charts'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { ChartHeader } from './ChartHeader'
import type { ChartInterval } from './utils'
import { formatHistoryDuration, formatTickMarks } from './utils'

import { semanticTokens } from '@/theme/semanticTokens'
import { opacify } from '@/theme/utils'

const surfaceColors = semanticTokens.colors.background.surface
const textColors = semanticTokens.colors.text
const borderColors = semanticTokens.colors.border

const currentLocale = window.navigator.languages[0]

const percentFormatter = (value: number) =>
  Intl.NumberFormat(currentLocale, {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value / 100)

const ChartDiv = styled.div<{ height?: number }>`
  ${({ height }) => height && `height: ${height}px`};
  width: 100%;
  position: relative;

  /* Hide TradingView attribution */
  a[href*='tradingview'] {
    display: none !important;
  }
`

type RateChartProps = {
  /** Values should be percentages, e.g. 3.47 for 3.47% */
  data: HistogramData[]
  height: number
  interval: ChartInterval
}

export const RateChart = ({ data, height, interval }: RateChartProps) => {
  const [crosshairData, setCrosshairData] = useState<HistogramData | undefined>()
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
  const lastPrice = data[data.length - 1]

  useEffect(() => {
    if (!chartContainerRef.current || !data) return

    const chart = createChart(chartContainerRef.current, {
      grid: {
        vertLines: { color: lineColor },
        horzLines: { color: lineColor },
      },
      layout: {
        background: { color: 'transparent' },
        textColor,
      },
      watermark: { visible: false },
      width: chartContainerRef.current.offsetWidth,
      height: chartContainerRef.current.offsetHeight,
      localization: { priceFormatter: percentFormatter },
      autoSize: true,
      timeScale: {
        tickMarkFormatter: formatTickMarks,
        timeVisible: true,
        borderVisible: false,
        ticksVisible: false,
        fixLeftEdge: true,
        fixRightEdge: true,
        minBarSpacing: 4,
      },
      rightPriceScale: {
        borderVisible: false,
        scaleMargins: { top: 0.3, bottom: 0 },
      },
      handleScale: { axisPressedMouseMove: false },
      handleScroll: { vertTouchDrag: false },
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

    const series = chart.addHistogramSeries({
      color: opacify(80, brandColor),
      priceFormat: { type: 'custom', formatter: percentFormatter },
    })

    series.setData(data)
    chart.timeScale().fitContent()

    const handleResize = () => {
      chart.applyOptions({
        width: chartContainerRef.current?.offsetWidth,
        height: chartContainerRef.current?.offsetHeight,
      })
    }

    const handleCrosshairMove = (event: MouseEventParams) => {
      if (event.time) {
        setCrosshairData(event.seriesData.get(series) as HistogramData)
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
  }, [boldBorder, brandColor, data, lineColor, surfaceColor, textColor])

  const handleTouchMove = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => e.preventDefault(),
    [],
  )

  const headerValue = useMemo(
    () => (
      <Heading as='h3' lineHeight={1}>
        {percentFormatter(crosshairData?.value ?? lastPrice?.value ?? 0)}
      </Heading>
    ),
    [crosshairData?.value, lastPrice?.value],
  )

  return (
    <ChartDiv ref={chartContainerRef} height={height} onTouchMove={handleTouchMove}>
      <ChartHeader
        value={headerValue}
        time={crosshairData?.time as UTCTimestamp}
        timePlaceholder={formatHistoryDuration(interval)}
      />
    </ChartDiv>
  )
}
