import { useColorMode } from '@chakra-ui/react'
import { memo, useEffect, useRef } from 'react'

import type {
  ChartingLibraryWidgetOptions,
  IChartingLibraryWidget,
  ResolutionString,
} from '../../../public/charting_library/charting_library'

import { HyperliquidDatafeed } from '@/lib/hyperliquid/tradingViewDatafeed'

type TradingViewChartProps = {
  symbol: string
  interval?: ResolutionString
  container_id?: string
  height?: number
  theme?: 'light' | 'dark'
}

export const TradingViewChart = memo(
  ({
    symbol,
    interval = '60' as ResolutionString,
    container_id = 'tv_chart_container',
    height = 600,
    theme,
  }: TradingViewChartProps) => {
    const { colorMode } = useColorMode()
    const widgetRef = useRef<IChartingLibraryWidget | null>(null)
    const containerRef = useRef<HTMLDivElement>(null)

    const chartTheme = theme ?? colorMode

    useEffect(() => {
      if (!containerRef.current) return

      const widgetOptions: ChartingLibraryWidgetOptions = {
        symbol,
        datafeed: new HyperliquidDatafeed(),
        interval,
        container: container_id,
        library_path: '/charting_library/',
        locale: 'en',
        disabled_features: [
          'use_localstorage_for_settings',
          'volume_force_overlay',
          'header_symbol_search',
          'symbol_search_hot_key',
        ],
        enabled_features: ['study_templates', 'side_toolbar_in_fullscreen_mode'],
        charts_storage_url: 'https://saveload.tradingview.com',
        charts_storage_api_version: '1.1',
        client_id: 'shapeshift',
        user_id: 'public_user',
        fullscreen: false,
        autosize: true,
        theme: chartTheme === 'dark' ? 'dark' : 'light',
        timezone: 'Etc/UTC' as ChartingLibraryWidgetOptions['timezone'],
        custom_css_url: '/charting_library/custom.css',
      }

      const loadTVWidget = async () => {
        try {
          const { widget } = await import('../../../public/charting_library/charting_library')

          const tvWidget = new widget(widgetOptions)

          widgetRef.current = tvWidget

          tvWidget.onChartReady(() => {
            console.log('TradingView chart ready')
          })
        } catch (error) {
          console.error('Error loading TradingView widget:', error)
        }
      }

      void loadTVWidget()

      return () => {
        if (widgetRef.current !== null) {
          widgetRef.current.remove()
          widgetRef.current = null
        }
      }
    }, [symbol, interval, container_id, chartTheme])

    return (
      <div ref={containerRef} id={container_id} style={{ height: `${height}px`, width: '100%' }} />
    )
  },
)
