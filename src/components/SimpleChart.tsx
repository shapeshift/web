import {
  ColorType,
  createChart,
  type ISeriesApi,
  type SingleValueData,
  type Time,
} from 'lightweight-charts'
import { useEffect, useRef } from 'react'
import { selectSelectedCurrency } from 'state/slices/selectors'
import { store } from 'state/store'

type SimpleChartProps<T extends number | Time> = { data: SingleValueData<T>[] }

const backgroundColor = 'rgba(188, 214, 240, 0.04)'
const lineColor = '#2962FF'
const textColor = 'white'
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

const chartContainerStyles = { width: '100%', height: '500px' }

export const SimpleChart = <T extends number | Time>({ data }: SimpleChartProps<T>) => {
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
      const newSeries = chart.addAreaSeries({
        lineColor,
        topColor: areaTopColor,
        bottomColor: areaBottomColor,
      }) as unknown as ISeriesApi<'Area', T>
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
  }, [data])

  return <div ref={chartContainerRef} style={chartContainerStyles} />
}
