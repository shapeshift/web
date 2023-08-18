import { isNft } from '@shapeshiftoss/caip'
import type {
  FindAllMarketArgs,
  HistoryData,
  MarketCapResult,
  MarketDataArgs,
  PriceHistoryArgs,
} from '@shapeshiftoss/types'
import { _getRelatedAssetIds } from 'state/apis/zerion/zerionApi'

// import { Yearn } from '@yfi/sdk'
import type { MarketService } from './api'
import { CoinCapMarketService } from './coincap/coincap'
import { CoinGeckoMarketService } from './coingecko/coingecko'
import { FoxyMarketService } from './foxy/foxy'
import { IdleMarketService } from './idle/idle'
import { OsmosisMarketService } from './osmosis/osmosis'
// import { YearnTokenMarketCapService } from './yearn/yearn-tokens'
// import { YearnVaultMarketCapService } from './yearn/yearn-vaults'

export type ProviderUrls = {
  jsonRpcProviderUrl: string
  unchainedEthereumHttpUrl: string
  unchainedEthereumWsUrl: string
  osmosisMarketDataUrl: string
  osmosisPoolMetadataUrl: string
}

export type MarketServiceManagerArgs = {
  yearnChainReference: 1 | 250 | 1337 | 42161 // from @yfi/sdk
  providerUrls: ProviderUrls
}

export class MarketServiceManager {
  marketProviders: MarketService[]

  constructor(args: MarketServiceManagerArgs) {
    const { providerUrls } = args

    // TODO(0xdef1cafe): after chain agnosticism, we need to dependency inject a chainReference here
    // YearnVaultMarketCapService deps
    // const network = yearnChainReference ?? 1 // 1 for mainnet
    // const provider = new JsonRpcProvider(providerUrls.jsonRpcProviderUrl)
    // const yearnSdk = new Yearn(network, { provider })

    this.marketProviders = [
      // Order of this MarketProviders array constitutes the order of providers we will be checking first.
      // More reliable providers should be listed first.
      new CoinGeckoMarketService(),
      new CoinCapMarketService(),
      // Yearn is currently borked upstream
      // new YearnVaultMarketCapService({ yearnSdk }),
      // new YearnTokenMarketCapService({ yearnSdk }),
      new IdleMarketService({ providerUrls }),
      new OsmosisMarketService(providerUrls),
      new FoxyMarketService({ providerUrls }),
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
        console.warn(e, '')
      }
    }
    if (!result) throw new Error('Cannot find market service provider for market data.')
    return result
  }

  async findByAssetId({ assetId }: MarketDataArgs) {
    if (isNft(assetId)) {
      return {
        price: '0',
        marketCap: '0',
        volume: '0',
        changePercent24Hr: 0,
      }
    }

    const result = await (async () => {
      // Loop through market providers and look for asset market data. Once found, exit loop.
      for (const provider of this.marketProviders) {
        try {
          const data = await provider.findByAssetId({ assetId })
          if (data) return data
        } catch (e) {
          // Swallow error, not every asset will be with every provider.
        }
      }

      // If we don't find any results, then we look for related assets
      const relatedAssetIds = await _getRelatedAssetIds(assetId)
      if (!relatedAssetIds.length) return null

      // Loop through related assets and look for market data
      // Once found for any related asset, exit loop.
      for (const relatedAssetId of relatedAssetIds) {
        for (const provider of this.marketProviders) {
          try {
            const maybeResult = await provider.findByAssetId({ assetId: relatedAssetId })
            if (maybeResult) {
              // We only need the price as a last resort fallback in case we can't get a related asset's USD rate from any provider
              return {
                price: maybeResult.price,
                marketCap: '0',
                volume: '0',
                changePercent24Hr: 0,
              }
            }
          } catch (e) {
            // Swallow error, not every related asset will be with every provider.
          }
        }
      }

      return null
    })()

    return result
  }

  async findPriceHistoryByAssetId({
    assetId,
    timeframe,
  }: PriceHistoryArgs): Promise<HistoryData[]> {
    if (isNft(assetId)) return []

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
