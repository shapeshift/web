import type {
  Bar,
  DatafeedConfiguration,
  HistoryCallback,
  IBasicDataFeed,
  LibrarySymbolInfo,
  OnReadyCallback,
  PeriodParams,
  ResolutionString,
  ResolveCallback,
  SearchSymbolsCallback,
  SubscribeBarsCallback,
} from '../../../public/charting_library/charting_library'
import { fetchCandleSnapshot, fetchMetaAndAssetCtxs, subscribeToCandle } from './client'
import type { Candle, MetaAndAssetCtxs } from './types'
import { CandleInterval } from './types'

const resolutionToCandleInterval = (resolution: ResolutionString): CandleInterval => {
  switch (resolution) {
    case '1':
      return CandleInterval.OneMinute
    case '3':
      return CandleInterval.ThreeMinutes
    case '5':
      return CandleInterval.FiveMinutes
    case '15':
      return CandleInterval.FifteenMinutes
    case '30':
      return CandleInterval.ThirtyMinutes
    case '60':
      return CandleInterval.OneHour
    case '120':
      return CandleInterval.TwoHours
    case '240':
      return CandleInterval.FourHours
    case '480':
      return CandleInterval.EightHours
    case '720':
      return CandleInterval.TwelveHours
    case '1D':
      return CandleInterval.OneDay
    case '3D':
      return CandleInterval.ThreeDays
    case '1W':
      return CandleInterval.OneWeek
    case '1M':
      return CandleInterval.OneMonth
    default:
      return CandleInterval.OneHour
  }
}

const candleToBar = (candle: Candle): Bar => ({
  time: candle.t,
  open: parseFloat(candle.o),
  high: parseFloat(candle.h),
  low: parseFloat(candle.l),
  close: parseFloat(candle.c),
  volume: parseFloat(candle.v),
})

export class HyperliquidDatafeed implements IBasicDataFeed {
  private metaCache: MetaAndAssetCtxs | null = null
  private lastBarsCache: Map<string, Bar> = new Map()
  private subscriptions: Map<
    string,
    {
      unsubscribe: () => Promise<void>
      lastBar: Bar
    }
  > = new Map()

  onReady(callback: OnReadyCallback): void {
    const config: DatafeedConfiguration = {
      supported_resolutions: [
        '1' as ResolutionString,
        '3' as ResolutionString,
        '5' as ResolutionString,
        '15' as ResolutionString,
        '30' as ResolutionString,
        '60' as ResolutionString,
        '120' as ResolutionString,
        '240' as ResolutionString,
        '480' as ResolutionString,
        '720' as ResolutionString,
        '1D' as ResolutionString,
        '3D' as ResolutionString,
        '1W' as ResolutionString,
        '1M' as ResolutionString,
      ],
      exchanges: [{ value: 'Hyperliquid', name: 'Hyperliquid', desc: 'Hyperliquid DEX' }],
      symbols_types: [{ name: 'Perpetual', value: 'perpetual' }],
    }

    setTimeout(() => callback(config), 0)
  }

  async searchSymbols(
    userInput: string,
    _exchange: string,
    _symbolType: string,
    onResult: SearchSymbolsCallback,
  ): Promise<void> {
    try {
      if (!this.metaCache) {
        this.metaCache = await fetchMetaAndAssetCtxs()
      }

      const [meta] = this.metaCache
      const symbols = meta.universe
        .filter(asset => asset.name.toLowerCase().includes(userInput.toLowerCase()))
        .map(asset => ({
          symbol: asset.name,
          full_name: `Hyperliquid:${asset.name}`,
          description: `${asset.name} Perpetual`,
          exchange: 'Hyperliquid',
          type: 'perpetual',
        }))

      onResult(symbols)
    } catch (error) {
      onResult([])
    }
  }

  async resolveSymbol(
    symbolName: string,
    onResolve: ResolveCallback,
    onError: (reason: string) => void,
  ): Promise<void> {
    try {
      if (!this.metaCache) {
        this.metaCache = await fetchMetaAndAssetCtxs()
      }

      const [meta] = this.metaCache
      const assetIndex = meta.universe.findIndex(asset => asset.name === symbolName)

      if (assetIndex === -1) {
        onError('Symbol not found')
        return
      }

      const asset = meta.universe[assetIndex]

      const symbolInfo: LibrarySymbolInfo = {
        ticker: symbolName,
        name: symbolName,
        full_name: `Hyperliquid:${symbolName}`,
        listed_exchange: 'Hyperliquid',
        exchange: 'Hyperliquid',
        description: `${symbolName} Perpetual`,
        type: 'crypto',
        session: '24x7',
        timezone: 'Etc/UTC',
        format: 'price',
        pricescale: Math.pow(10, asset.szDecimals),
        minmov: 1,
        has_intraday: true,
        has_daily: true,
        has_weekly_and_monthly: true,
        supported_resolutions: [
          '1' as ResolutionString,
          '3' as ResolutionString,
          '5' as ResolutionString,
          '15' as ResolutionString,
          '30' as ResolutionString,
          '60' as ResolutionString,
          '120' as ResolutionString,
          '240' as ResolutionString,
          '480' as ResolutionString,
          '720' as ResolutionString,
          '1D' as ResolutionString,
          '3D' as ResolutionString,
          '1W' as ResolutionString,
          '1M' as ResolutionString,
        ],
        data_status: 'streaming',
        volume_precision: 4,
      }

      onResolve(symbolInfo)
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Failed to resolve symbol')
    }
  }

  async getBars(
    symbolInfo: LibrarySymbolInfo,
    resolution: ResolutionString,
    periodParams: PeriodParams,
    onResult: HistoryCallback,
    onError: (reason: string) => void,
  ): Promise<void> {
    try {
      const interval = resolutionToCandleInterval(resolution)
      const candles = await fetchCandleSnapshot({
        coin: symbolInfo.name,
        interval,
        startTime: periodParams.from * 1000,
        endTime: periodParams.to * 1000,
      })

      if (candles.length === 0) {
        onResult([], { noData: true })
        return
      }

      const bars = (candles as Candle[]).map(candleToBar).sort((a, b) => a.time - b.time)

      const lastBar = bars[bars.length - 1]
      this.lastBarsCache.set(`${symbolInfo.name}_${resolution}`, lastBar)

      onResult(bars, { noData: false })
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Failed to fetch bars')
    }
  }

  async subscribeBars(
    symbolInfo: LibrarySymbolInfo,
    resolution: ResolutionString,
    onTick: SubscribeBarsCallback,
    listenerGuid: string,
    _onResetCacheNeededCallback: () => void,
  ): Promise<void> {
    const subscriptionKey = `${symbolInfo.name}_${resolution}_${listenerGuid}`
    const interval = resolutionToCandleInterval(resolution)

    try {
      const lastBar = this.lastBarsCache.get(`${symbolInfo.name}_${resolution}`)

      const unsubscribe = await subscribeToCandle(
        { coin: symbolInfo.name, interval },
        candleData => {
          const newBar = candleToBar(candleData as unknown as Candle)
          const subscription = this.subscriptions.get(subscriptionKey)

          if (!subscription) return

          if (lastBar && newBar.time < lastBar.time) {
            return
          }

          if (subscription.lastBar && newBar.time === subscription.lastBar.time) {
            subscription.lastBar = newBar
            onTick(newBar)
          } else {
            subscription.lastBar = newBar
            onTick(newBar)
          }
        },
      )

      this.subscriptions.set(subscriptionKey, {
        unsubscribe,
        lastBar: lastBar ?? {
          time: Date.now(),
          open: 0,
          high: 0,
          low: 0,
          close: 0,
          volume: 0,
        },
      })
    } catch (error) {
      console.error('Failed to subscribe to bars:', error)
    }
  }

  async unsubscribeBars(listenerGuid: string): Promise<void> {
    const subscriptionsToRemove: string[] = []

    for (const [key, subscription] of this.subscriptions.entries()) {
      if (key.includes(listenerGuid)) {
        await subscription.unsubscribe()
        subscriptionsToRemove.push(key)
      }
    }

    subscriptionsToRemove.forEach(key => this.subscriptions.delete(key))
  }
}
