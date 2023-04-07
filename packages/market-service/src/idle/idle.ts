import { fromAssetId, toAssetId } from '@shapeshiftoss/caip'
import { ethereum } from '@shapeshiftoss/chain-adapters'
import { IdleInvestor } from '@shapeshiftoss/investor-idle'
import { MarketCapResult, MarketData, MarketDataArgs } from '@shapeshiftoss/types'
import * as unchained from '@shapeshiftoss/unchained-client'

import { MarketService } from '../api'
import { CoinGeckoMarketService } from '../coingecko/coingecko'
import { ProviderUrls } from '../market-service-manager'
import { bn } from '../utils/bignumber'

export class IdleMarketService extends CoinGeckoMarketService implements MarketService {
  baseUrl = ''
  providerUrls: ProviderUrls
  idleInvestor: IdleInvestor

  constructor({
    providerUrls,
    coinGeckoAPIKey,
  }: {
    providerUrls: ProviderUrls
    coinGeckoAPIKey: string
  }) {
    super({ coinGeckoAPIKey })

    this.providerUrls = providerUrls
    this.idleInvestor = new IdleInvestor({
      chainAdapter: new ethereum.ChainAdapter({
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
      }),
      providerUrl: this.providerUrls.jsonRpcProviderUrl,
    })
  }

  async findAll() {
    const idleOpportunities = await (async () => {
      const maybeOpportunities = await this.idleInvestor.findAll()
      if (maybeOpportunities.length) return maybeOpportunities

      await this.idleInvestor.initialize()
      return await this.idleInvestor.findAll()
    })()

    const marketDataById: MarketCapResult = {}

    for (const idleOpportunity of idleOpportunities) {
      const assetId = toAssetId({
        assetNamespace: 'erc20',
        assetReference: idleOpportunity.id,
        chainId: fromAssetId(idleOpportunity.feeAsset.assetId).chainId,
      })

      const coinGeckoData = await super.findByAssetId({
        assetId: idleOpportunity.underlyingAsset.assetId,
      })

      if (!coinGeckoData) continue

      marketDataById[assetId] = {
        price: bn(coinGeckoData.price)
          .times(idleOpportunity.positionAsset.underlyingPerPosition)
          .toFixed(),
        marketCap: idleOpportunity.tvl.balanceUsdc.toFixed(), // For Idle, TVL and marketCap are effectively the same
        volume: '0',
        changePercent24Hr: 0,
      }
    }

    return marketDataById
  }

  async findByAssetId({ assetId }: MarketDataArgs): Promise<MarketData | null> {
    const opportunity = await (async () => {
      const maybeOpportunities = await this.idleInvestor.findAll()
      if (maybeOpportunities.length) return await this.idleInvestor.findByOpportunityId(assetId)

      await this.idleInvestor.initialize()
      return await this.idleInvestor.findByOpportunityId(assetId)
    })()

    if (!opportunity) return null

    const coinGeckoData = await super.findByAssetId({
      assetId: opportunity.underlyingAsset.assetId,
    })

    if (!coinGeckoData) return null

    return {
      price: bn(coinGeckoData.price)
        .times(opportunity.positionAsset.underlyingPerPosition)
        .toFixed(),
      marketCap: opportunity.tvl.balanceUsdc.toFixed(), // For Idle, TVL and marketCap are effectively the same
      volume: '0',
      changePercent24Hr: 0,
    }
  }

  async findPriceHistoryByAssetId() {
    return []
  }
}
