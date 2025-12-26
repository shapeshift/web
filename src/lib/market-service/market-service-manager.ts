import type { AssetId } from '@shapeshiftoss/caip'
import { isNft } from '@shapeshiftoss/caip'
import type {
  FindAllMarketArgs,
  HistoryData,
  MarketCapResult,
  MarketDataArgs,
  PriceHistoryArgs,
} from '@shapeshiftoss/types'
import type { ethers } from 'ethers'

import type { MarketService } from './api'
import { CoinCapMarketService } from './coincap/coincap'
import { CoinGeckoMarketService } from './coingecko/coingecko'
import { FoxyMarketService } from './foxy/foxy'
import { PortalsMarketService } from './portals/portals'
import { ThorchainAssetsMarketService } from './thorchainAssets/thorchainAssets'
import { ZerionMarketService } from './zerion/zerion'

import type { AssetService } from '@/lib/asset-service'
import { getAssetService } from '@/lib/asset-service'

export type ProviderUrls = {
  jsonRpcProviderUrl: string
  unchainedEthereumHttpUrl: string
  unchainedEthereumWsUrl: string
}

export type MarketServiceManagerArgs = {
  providerUrls: ProviderUrls
  provider: ethers.JsonRpcProvider
}

export class MarketServiceManager {
  marketProviders: MarketService[]
  assetService: AssetService

  constructor(args: MarketServiceManagerArgs) {
    const { providerUrls, provider } = args

    this.marketProviders = [
      // Order of this MarketProviders array constitutes the order of providers we will be checking first.
      // More reliable providers should be listed first.
      new CoinGeckoMarketService(),
      new CoinCapMarketService(),
      new PortalsMarketService(),
      new FoxyMarketService({ providerUrls, provider }),
      new ThorchainAssetsMarketService(),
      new ZerionMarketService(),
      // TODO: Debank market provider
    ]

    this.assetService = getAssetService()
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
      return null
    }
    const assets = this.assetService.assetsById

    const result = await (async () => {
      const portalsProvider = this.marketProviders.find(
        provider => provider instanceof PortalsMarketService,
      )

      const asset = assets[assetId]

      // Portals is prioritized when finding by AssetId, as it has more reliable data for LP tokens
      const prioritizedProviders = asset?.isPool
        ? [
            ...(portalsProvider ? [portalsProvider] : []),
            ...this.marketProviders.filter(provider => !(provider instanceof PortalsMarketService)),
          ]
        : this.marketProviders

      // Loop through market providers and look for asset market data. Once found, exit loop.
      for (const provider of prioritizedProviders) {
        try {
          const data = await provider.findByAssetId({ assetId })
          if (data) return data
        } catch (e) {
          // Swallow error, not every asset will be with every provider.
        }
      }

      // If we don't find any results, then we look for related assets
      const relatedAssetIds = this.assetService.getRelatedAssetIds(assetId)
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

  async findAllSortedByVolumeDesc(count: number): Promise<AssetId[]> {
    // coingecko is the only provider that allows us to specify the sorting of assets, so we don't bother with other services
    const coinGeckoMarketService = new CoinGeckoMarketService()
    const result = await coinGeckoMarketService.findAll({ count }, 'volume_desc')
    return Object.keys(result)
  }

  async findAllSortedByMarketCapDesc(count: number): Promise<AssetId[]> {
    // coingecko is the only provider that allows us to specify the sorting of assets, so we don't bother with other services
    const coinGeckoMarketService = new CoinGeckoMarketService()
    const result = await coinGeckoMarketService.findAll({ count }, 'market_cap_desc')
    return Object.keys(result)
  }
}
