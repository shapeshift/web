import { adapters, fromAssetId } from '@shapeshiftoss/caip'
import type {
  HistoryData,
  MarketCapResult,
  MarketData,
  MarketDataArgs,
  PriceHistoryArgs,
} from '@shapeshiftoss/types'
import { HistoryTimeframe } from '@shapeshiftoss/types'
import axios from 'axios'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'

import type { MarketService } from '../api'
import type { ProviderUrls } from '../market-service-manager'
import { isValidDate } from '../utils/isValidDate'
import type { OsmosisHistoryData, OsmosisMarketCap } from './osmosis-types'
import { getPool, getPoolIdFromAssetReference, getPoolMarketData, isOsmosisLpAsset } from './utils'

const OSMOSIS_LP_TOKEN_PRECISION = 18

export class OsmosisMarketService implements MarketService {
  baseUrl = '' // Unused, but present to satisfy MarketService interface definition
  providerUrls: ProviderUrls

  constructor(providerUrls: ProviderUrls) {
    this.providerUrls = providerUrls
  }

  async findAll() {
    const osmosisApiUrl = `${this.providerUrls.osmosisMarketDataUrl}/tokens/v2/all`
    try {
      const { data: osmosisData }: { data: OsmosisMarketCap[] } = await axios.get(osmosisApiUrl)
      const results = osmosisData
        .map(data => data ?? []) // filter out rate limited results
        .sort((a, b) => (a.liquidity < b.liquidity ? 1 : -1))
        .reduce((acc, token) => {
          const assetId = adapters.osmosisToAssetId(token.symbol)
          if (!assetId) return acc

          acc[assetId] = {
            price: token.price.toString(),
            marketCap: token.liquidity.toString(),
            volume: token.volume_24h.toString(),
            changePercent24Hr: token.price_24h_change,
            supply: bnOrZero(token.liquidity).div(token.price).toString(),
          }

          return acc
        }, {} as MarketCapResult)

      return results
    } catch (e) {
      return {}
    }
  }

  async findByAssetId({ assetId }: MarketDataArgs): Promise<MarketData | null> {
    if (!adapters.assetIdToOsmosis(assetId)) return null

    try {
      const assetReference = fromAssetId(assetId).assetReference
      if (isOsmosisLpAsset(assetReference)) {
        /* No market exists for Osmosis pool assets, but we can calculate the 'price' of each pool token
      by dividing the pool TVL by the total number of pool tokens. */

        const id = getPoolIdFromAssetReference(assetReference)
        if (!id) return null

        const poolData = await getPool(id, this.providerUrls.osmosisPoolMetadataUrl)
        const marketData = await getPoolMarketData(id, this.providerUrls.osmosisMarketDataUrl)
        if (!(poolData && poolData.total_shares && marketData)) return null

        return {
          price: bnOrZero(marketData.liquidity)
            .dividedBy(bnOrZero(poolData.total_shares.amount))
            .multipliedBy(bn(10).pow(OSMOSIS_LP_TOKEN_PRECISION))
            .toFixed(),
          marketCap: bnOrZero(marketData.liquidity).toFixed(),
          volume: bn(marketData.volume_24h).toFixed(),
          changePercent24Hr: 0,
          supply: bnOrZero(poolData.total_shares.amount)
            .dividedBy(bn(10).pow(OSMOSIS_LP_TOKEN_PRECISION))
            .toFixed(),
          maxSupply: bnOrZero(poolData.total_shares.amount)
            .dividedBy(bn(10).pow(OSMOSIS_LP_TOKEN_PRECISION))
            .toFixed(),
        }
      }

      const symbol = adapters.assetIdToOsmosis(assetId)

      const { data } = await axios.get<OsmosisMarketCap[]>(
        (() => {
          const url = new URL(`/tokens/v2/${symbol}`, this.providerUrls.osmosisMarketDataUrl)
          return url.toString()
        })(),
      )

      const marketData = data[0]

      if (!marketData) return null

      return {
        price: marketData.price.toString(),
        marketCap: marketData.liquidity.toString(),
        volume: marketData.volume_24h.toString(),
        changePercent24Hr: bnOrZero(marketData.price_24h_change).toNumber(),
        supply: bnOrZero(marketData.liquidity).div(marketData.price).toString(),
      }
    } catch (e) {
      console.warn(e)
      throw new Error('MarketService(findByAssetId): error fetching market data')
    }
  }

  async findPriceHistoryByAssetId({
    assetId,
    timeframe,
  }: PriceHistoryArgs): Promise<HistoryData[]> {
    if (!adapters.assetIdToOsmosis(assetId)) return []
    const symbol = adapters.assetIdToOsmosis(assetId)

    let range
    let isV1
    let start
    switch (timeframe) {
      case HistoryTimeframe.HOUR:
        range = '5'
        isV1 = false
        start = 12
        break
      case HistoryTimeframe.DAY:
        range = '60'
        isV1 = false
        start = 24
        break
      case HistoryTimeframe.WEEK:
        range = '7d'
        isV1 = true
        start = bn(24).times(7).toNumber()
        break
      case HistoryTimeframe.MONTH:
        range = '1mo'
        isV1 = true
        start = bn(24).times(30).toNumber()
        break
      case HistoryTimeframe.YEAR:
        range = '1y'
        isV1 = true
        start = bn(24).times(365).toNumber()
        break
      case HistoryTimeframe.ALL:
        // TODO: currently the 'all' range for v2 is returning 500 errors. Using 1y for the time being.
        // We need to revisit this at a later date to see if it works in the future
        range = '1y'
        isV1 = true
        start = 0
        break
      default:
        range = '1y'
        isV1 = true
        start = 0
    }

    try {
      // Historical timeframe data from the v2 endpoint currently does not support ranges greater than 1 month
      // and v1 doesn't support ranges less than 7 week, so we use both to get all ranges.

      const { data } = await axios.get<OsmosisHistoryData[]>(
        (() => {
          const url = new URL(
            `/tokens/${isV1 ? 'v1' : 'v2'}/historical/${symbol}/chart?${
              isV1 ? 'range' : 'tf'
            }=${range}`,
            this.providerUrls.osmosisMarketDataUrl,
          )
          return url.toString()
        })(),
      )

      // return the correct range of data points for each timeframe
      const taperedData = data.slice(-start)

      return taperedData.reduce<HistoryData[]>((acc, current) => {
        // convert timestamp from seconds to milliseconds
        const date = bnOrZero(current.time).times(1000).toNumber()
        if (!isValidDate(date)) {
          console.error('Osmosis asset history data has invalid date')
          return acc
        }
        const price = bnOrZero(current.close)
        acc.push({
          date,
          price: price.toNumber(),
        })
        return acc
      }, [])
    } catch (e) {
      console.warn(e)
      throw new Error('MarketService(findPriceHistoryByAssetId): error fetching price history')
    }
  }
}
