import { ethereum } from '@shapeshiftoss/chain-adapters'
import type {
  HistoryData,
  MarketCapResult,
  MarketData,
  MarketDataArgs,
  PriceHistoryArgs,
} from '@shapeshiftoss/types'
import * as unchained from '@shapeshiftoss/unchained-client'
import type { ethers } from 'ethers'
import { foxyAddresses, FoxyApi } from 'lib/investor/investor-foxy'

import type { MarketService } from '../api'
import { CoinGeckoMarketService } from '../coingecko/coingecko'
import type { ProviderUrls } from '../market-service-manager'

export const FOXY_ASSET_ID = 'eip155:1/erc20:0xDc49108ce5C57bc3408c3A5E95F3d864eC386Ed3'
const FOX_ASSET_ID = 'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d'
const FOXY_ASSET_PRECISION = '18'

export class FoxyMarketService extends CoinGeckoMarketService implements MarketService {
  providerUrls: ProviderUrls
  provider: ethers.providers.StaticJsonRpcProvider

  constructor({
    providerUrls,
    provider,
  }: {
    providerUrls: ProviderUrls
    provider: ethers.providers.StaticJsonRpcProvider
  }) {
    super()

    this.providerUrls = providerUrls
    this.provider = provider
  }

  async findAll() {
    try {
      const assetId = FOXY_ASSET_ID
      const marketData = await this.findByAssetId({ assetId })

      return { [assetId]: marketData } as MarketCapResult
    } catch (e) {
      console.warn(e)
      return {}
    }
  }

  async findByAssetId({ assetId }: MarketDataArgs): Promise<MarketData | null> {
    try {
      if (assetId.toLowerCase() !== FOXY_ASSET_ID.toLowerCase()) {
        console.warn('FoxyMarketService(findByAssetId): Failed to find by AssetId')
        return null
      }

      const coinGeckoData = await super.findByAssetId({
        assetId: FOX_ASSET_ID,
      })

      if (!coinGeckoData) return null

      const ethChainAdapter = new ethereum.ChainAdapter({
        providers: {
          ws: new unchained.ws.Client<unchained.ethereum.Tx>(
            this.providerUrls.unchainedEthereumWsUrl,
          ),
          http: new unchained.ethereum.V1Api(
            new unchained.ethereum.Configuration({
              basePath: this.providerUrls.unchainedEthereumHttpUrl,
            }),
          ),
        },
        rpcUrl: this.providerUrls.jsonRpcProviderUrl,
        midgardUrl: '',
      })

      // Make maxSupply as an additional field, effectively EIP-20's totalSupply
      const api = new FoxyApi({
        adapter: ethChainAdapter,
        providerUrl: this.providerUrls.jsonRpcProviderUrl,
        foxyAddresses,
        provider: this.provider,
      })

      const tokenContractAddress = foxyAddresses[0].foxy
      const foxyTotalSupply = await api.tvl({ tokenContractAddress })
      const supply = foxyTotalSupply

      return {
        price: coinGeckoData.price,
        marketCap: '0', // TODO: add marketCap once able to get foxy marketCap data
        changePercent24Hr: coinGeckoData.changePercent24Hr,
        volume: '0', // TODO: add volume once able to get foxy volume data
        supply: supply?.div(`1e+${FOXY_ASSET_PRECISION}`).toString(),
        maxSupply: foxyTotalSupply?.div(`1e+${FOXY_ASSET_PRECISION}`).toString(),
      }
    } catch (e) {
      console.warn(e)
      throw new Error('FoxyMarketService(findByAssetId): error fetching market data')
    }
  }

  async findPriceHistoryByAssetId({
    assetId,
    timeframe,
  }: PriceHistoryArgs): Promise<HistoryData[]> {
    if (assetId.toLowerCase() !== FOXY_ASSET_ID.toLowerCase()) return []

    try {
      const priceHistory = await super.findPriceHistoryByAssetId({
        assetId: FOX_ASSET_ID,
        timeframe,
      })
      return priceHistory
    } catch (e) {
      console.warn(e)
      throw new Error('FoxyMarketService(findPriceHistoryByAssetId): error fetching price history')
    }
  }
}
