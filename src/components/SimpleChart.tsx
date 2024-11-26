import type { OhlcData, SeriesType, SingleValueData, Time } from 'lightweight-charts'
import { ColorType, createChart } from 'lightweight-charts'
import { useEffect, useRef } from 'react'
import { selectSelectedCurrency } from 'state/slices/selectors'
import { store } from 'state/store'

type SimpleChartProps<T extends Time> = {
  data: (SingleValueData<T> | OhlcData<T>)[]
  seriesType?: SeriesType
}

const backgroundColor = 'rgba(188, 214, 240, 0.04)'
const lineColor = '#2962FF'
const textColor = 'white'
const topColor = 'rgba(41, 98, 255, 0.5)'
const bottomColor = 'rgba(41, 98, 255, 0.28)'
const downColor = 'rgba(255, 69, 0, 0.28)'

const currentLocale = window.navigator.languages[0]
const selectedCurrency = selectSelectedCurrency(store.getState())
const priceFormatter = Intl.NumberFormat(currentLocale, {
  style: 'currency',
  currency: selectedCurrency,
  notation: 'compact',
  compactDisplay: 'short',
}).format

const chartContainerStyles = { width: '100%', height: '500px' }

export const SimpleChart = <T extends Time>({ data, seriesType = 'Line' }: SimpleChartProps<T>) => {
  const chartContainerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (chartContainerRef.current && data) {
      const chart = createChart(chartContainerRef.current, {
        grid: {
          vertLines: {
            color: 'rgba(42, 46, 57, 0.5)',
          },
          horzLines: {
            color: 'rgba(42, 46, 57, 0.5)',
          },
        },
        layout: {
          background: { type: ColorType.Solid, color: backgroundColor },
          textColor,
        },
        width: chartContainerRef.current.offsetWidth,
        height: chartContainerRef.current.offsetHeight,
        localization: { priceFormatter },
        timeScale: {
          timeVisible: true,
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
              color: topColor,
            })
          case 'Bar':
            return chart.addBarSeries({
              upColor: topColor,
              downColor,
            })
          case 'Area':
            return chart.addAreaSeries({
              lineColor,
              topColor,
              bottomColor,
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

      window.addEventListener('resize', handleResize)

      return () => {
        window.removeEventListener('resize', handleResize)
        chart.remove()
      }
    }
  }, [data, seriesType])

  return <div ref={chartContainerRef} style={chartContainerStyles} />
}
