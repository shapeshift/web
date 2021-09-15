import axios from 'axios'
import dayjs from 'dayjs'
import { ChainTypes, MarketService, MarketData, HistoryData, HistoryTimeframe } from '../api'

// tons more parms here: https://www.coingecko.com/en/api/documentation
type CoinGeckoAssetData = {
  chain: ChainTypes
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

const coingeckoIDMap = Object.freeze({
  [ChainTypes.Ethereum]: 'ethereum',
  [ChainTypes.Bitcoin]: 'bitcoin',
  [ChainTypes.Litecoin]: 'litecoin'
})

export class CoinGeckoMarketService implements MarketService {
  baseUrl = 'https://api.coingecko.com/api/v3'

  getMarketData = async (chain: ChainTypes, tokenId?: string): Promise<MarketData | null> => {
    const id = coingeckoIDMap[chain]
    if (!id) return null
    try {
      const isToken = !!tokenId
      const contractUrl = isToken ? `/contract/${tokenId}` : ''

      const { data }: { data: CoinGeckoAssetData } = await axios.get(
        `${this.baseUrl}/coins/${id}${contractUrl}`
      )

      // TODO: get correct localizations
      const currency = 'usd'
      const marketData = data?.market_data
      return {
        price: marketData?.current_price?.[currency],
        marketCap: marketData?.market_cap?.[currency],
        changePercent24Hr: marketData?.price_change_percentage_24h,
        volume: marketData?.total_volume?.[currency]
      }
    } catch (e) {
      console.warn(e)
      return null
    }
  }

  getPriceHistory = async (
    chain: ChainTypes,
    timeframe: HistoryTimeframe,
    contractAddress?: string
  ): Promise<HistoryData[]> => {
    const id = coingeckoIDMap[chain]
    if (!id) return []

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
      const contract = contractAddress ? `/contract/${contractAddress}` : ''
      const url = `${this.baseUrl}/coins/${id}${contract}`
      // TODO: change vs_currency to localized currency
      const currency = 'usd'
      const { data: historyData } = await axios.get(
        `${url}/market_chart/range?id=${id}&vs_currency=${currency}&from=${from}&to=${to}`
      )
      return historyData?.prices?.map((data: [string, number]) => {
        return {
          date: new Date(data[0]),
          price: data[1]
        }
      })
    } catch (e) {
      console.warn(e)
      return []
    }
  }
}
