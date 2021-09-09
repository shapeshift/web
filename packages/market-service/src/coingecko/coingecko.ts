import axios from 'axios'
import dayjs from 'dayjs'
import { MarketService, AssetMarketData, HistoryData, HistoryTimeframe } from '../api'

// tons more parms here: https://www.coingecko.com/en/api/documentation
type CoinGeckoAssetData = {
  id: string
  symbol: string
  name: string
  localization: { [key: string]: string }
  description: { [key: string]: string }
  image: {
    thumb: string
    small: string
    large: string
  }
  market_data: {
    current_price: { [key: string]: string }
    market_cap: { [key: string]: string }
    total_volume: { [key: string]: string }
    high_24h: { [key: string]: string }
    low_24h: { [key: string]: string }
    total_supply: string
    max_supply: string
    price_change_percentage_24h: number
  }
}

export class CoinGeckoMarketService implements MarketService {
  baseUrl = 'https://api.coingecko.com/api/v3'

  getAssetData = async (
    network: string,
    contractAddress?: string
  ): Promise<AssetMarketData | null> => {
    try {
      const isToken = !!contractAddress
      const contractUrl = isToken ? `/contract/${contractAddress}` : ''

      const { data }: { data: CoinGeckoAssetData } = await axios.get(
        `${this.baseUrl}/coins/${network}${contractUrl}`
      )

      // TODO: get correct localizations
      const currency = 'usd'
      const marketData = data?.market_data
      return {
        price: marketData?.current_price?.[currency],
        symbol: data?.symbol,
        name: data?.name,
        description: data?.description?.en,
        marketCap: marketData?.market_cap?.[currency],
        changePercent24Hr: marketData?.price_change_percentage_24h,
        icon: data?.image?.large,
        volume: marketData?.total_volume?.[currency],
        network,
        contractAddress
      }
    } catch (e) {
      console.warn(e)
      Promise.reject(e)
      return null
    }
  }

  getPriceHistory = async (
    network: string,
    timeframe: HistoryTimeframe,
    contractAddress?: string
  ): Promise<HistoryData[]> => {
    const end = dayjs().startOf('minute')
    let start
    switch (timeframe) {
      case HistoryTimeframe.HOUR:
        start = end.subtract(1, 'hour')
        break
      case HistoryTimeframe.DAY:
        start = end.subtract(1, 'day')
        break
      case HistoryTimeframe.WEEK:
        start = end.subtract(1, 'week')
        break
      case HistoryTimeframe.MONTH:
        start = end.subtract(1, 'month')
        break
      case HistoryTimeframe.YEAR:
        start = end.subtract(1, 'year')
        break
      default:
        start = end.subtract(20, 'years')
    }

    try {
      const from = start.valueOf() / 1000
      const to = end.valueOf() / 1000
      const contract = contractAddress ? `contract/${contractAddress}` : ''
      const url = `${this.baseUrl}/coins/${network}/${contract}`
      // TODO: change vs_currency to localized currency
      const currency = 'usd'
      const { data: historyData } = await axios.get(
        `${url}/market_chart/range?id=${network}&vs_currency=${currency}&from=${from}&to=${to}`
      )
      return historyData?.prices?.map((data: any) => {
        return {
          date: new Date(data[0]),
          price: data[1]
        }
      })
    } catch (e) {
      console.warn(e)
      Promise.reject(e)
      return []
    }
  }
}
