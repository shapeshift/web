import { JsonRpcProvider } from '@ethersproject/providers'
import {
  FindAllMarketArgs,
  HistoryData,
  MarketCapResult,
  MarketData,
  MarketDataArgs,
  PriceHistoryArgs,
} from '@shapeshiftoss/types'
import { Yearn } from '@yfi/sdk'

import { MarketService } from './api'
import { CoinCapMarketService } from './coincap/coincap'
import { CoinGeckoMarketService } from './coingecko/coingecko'
import { FoxyMarketService } from './foxy/foxy'
import { IdleMarketService } from './idle/idle'
import { OsmosisMarketService } from './osmosis/osmosis'
import { YearnTokenMarketCapService } from './yearn/yearn-tokens'
import { YearnVaultMarketCapService } from './yearn/yearn-vaults'

export type ProviderUrls = {
  jsonRpcProviderUrl: string
  unchainedEthereumHttpUrl: string
  unchainedEthereumWsUrl: string
}

export type MarketServiceManagerArgs = {
  coinGeckoAPIKey: string
  yearnChainReference: 1 | 250 | 1337 | 42161 // from @yfi/sdk
  providerUrls: ProviderUrls
}

export class MarketServiceManager {
  marketProviders: MarketService[]

  constructor(args: MarketServiceManagerArgs) {
    const { coinGeckoAPIKey = '', providerUrls, yearnChainReference } = args

    const { jsonRpcProviderUrl } = providerUrls

    // TODO(0xdef1cafe): after chain agnosticism, we need to dependency inject a chainReference here
    // YearnVaultMarketCapService deps
    const network = yearnChainReference ?? 1 // 1 for mainnet
    const provider = new JsonRpcProvider(jsonRpcProviderUrl)
    const yearnSdk = new Yearn(network, { provider })

    this.marketProviders = [
      // Order of this MarketProviders array constitutes the order of providers we will be checking first.
      // More reliable providers should be listed first.
      new CoinGeckoMarketService({ coinGeckoAPIKey }),
      new CoinCapMarketService(),
      new YearnVaultMarketCapService({ yearnSdk }),
      new YearnTokenMarketCapService({ yearnSdk }),
      new IdleMarketService({ coinGeckoAPIKey, providerUrls }),
      new OsmosisMarketService(),
      new FoxyMarketService({ coinGeckoAPIKey, providerUrls }),
    ]
  }

  async findAll(args: FindAllMarketArgs): Promise<MarketCapResult> {
    let result: MarketCapResult | null = null
    // Go through market providers listed above and look for market data for all assets.
    // Once data is found, exit the loop and return result. If no data is found for any
    // provider, throw an error.
    for (let i = 0; i < this.marketProviders.length && !result; i++) {
      try {
        result = await this.marketProviders[i].findAll(args)
      } catch (e) {
        console.info(e)
      }
    }
    if (!result) throw new Error('Cannot find market service provider for market data.')
    return result
  }

  async findByAssetId({ assetId }: MarketDataArgs) {
    let result: MarketData | null = null
    // Loop through market providers and look for asset market data. Once found, exit loop.
    for (let i = 0; i < this.marketProviders.length && !result; i++) {
      try {
        result = await this.marketProviders[i].findByAssetId({ assetId })
      } catch (e) {
        // Swallow error, not every asset will be with every provider.
      }
    }
    if (!result) return null
    return result
  }

  async findPriceHistoryByAssetId({
    assetId,
    timeframe,
  }: PriceHistoryArgs): Promise<HistoryData[]> {
    let result: HistoryData[] | null = null
    // Loop through market providers and look for asset price history data. Once found, exit loop.
    for (let i = 0; i < this.marketProviders.length && !result?.length; i++) {
      try {
        result = await this.marketProviders[i].findPriceHistoryByAssetId({ assetId, timeframe })
      } catch (e) {
        // Swallow error, not every asset will be with every provider.
      }
    }
    if (!result) return []
    return result
  }
}
