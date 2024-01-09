import type { AssetId } from '@shapeshiftoss/caip'
import { ethChainId, toAssetId } from '@shapeshiftoss/caip'
import type { MarketCapResult, MarketData, MarketDataArgs } from '@shapeshiftoss/types'
import type { AxiosInstance } from 'axios'
import axios from 'axios'
import { setupCache } from 'axios-cache-interceptor'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'

import type { MarketService } from '../api'
import { CoinGeckoMarketService } from '../coingecko/coingecko'
import type { ProviderUrls } from '../market-service-manager'

interface IdleVault {
  tvl: number
  address: string
  pricePerShare: number
  underlyingAddress: string
  externalIntegration: boolean
}

type Opportunity = {
  marketCap: string
  pricePerShare: string
  underlyingAssetId: AssetId
}

type OpportunityByAssetId = Record<AssetId, Opportunity>

export class IdleMarketService extends CoinGeckoMarketService implements MarketService {
  baseUrl = ''
  providerUrls: ProviderUrls

  private idle: AxiosInstance
  private opportunities?: OpportunityByAssetId

  constructor({ providerUrls }: { providerUrls: ProviderUrls }) {
    super()

    this.baseUrl = 'https://api.idle.finance'
    this.providerUrls = providerUrls

    this.idle = setupCache(
      axios.create({
        timeout: 10000,
        baseURL: this.baseUrl,
        headers: {
          Authorization:
            'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjbGllbnRJZCI6IkFwcDIiLCJpYXQiOjE2NzAyMzc1Mjd9.pf4YYdBf_Lf6P2_oKZ5r63UMd6R44p9h5ybPprtJmT4',
        },
      }),
      {
        // 5 seconds
        ttl: 5 * 1000,
        interpretHeader: false,
        staleIfError: true,
        cacheTakeover: false,
      },
    )
  }

  async getOpportunities(): Promise<OpportunityByAssetId> {
    if (this.opportunities) return this.opportunities

    const { data: vaults } = await this.idle.get<IdleVault[] | undefined>('pools')

    if (!vaults) return {}

    this.opportunities = vaults.reduce<OpportunityByAssetId>((prev, vault: IdleVault) => {
      if (!vault.externalIntegration) return prev

      const assetId = toAssetId({
        assetNamespace: 'erc20',
        assetReference: vault.address,
        chainId: ethChainId,
      })

      prev[assetId] = {
        underlyingAssetId: toAssetId({
          assetNamespace: 'erc20',
          assetReference: vault.underlyingAddress,
          chainId: ethChainId,
        }),
        pricePerShare: bnOrZero(vault.pricePerShare).toFixed(),
        // For Idle, TVL and marketCap are effectively the same
        marketCap: bnOrZero(vault.tvl).toFixed(),
      }

      return prev
    }, {})

    return this.opportunities
  }

  async findAll() {
    const marketDataById: MarketCapResult = {}
    const opportunities = await this.getOpportunities()

    for (const [assetId, opportunity] of Object.entries(opportunities)) {
      const coinGeckoData = await super.findByAssetId({ assetId: opportunity.underlyingAssetId })

      if (!coinGeckoData) continue

      marketDataById[assetId] = {
        price: bn(coinGeckoData.price).times(opportunity.pricePerShare).toFixed(),
        marketCap: opportunity.marketCap,
        volume: '0',
        changePercent24Hr: 0,
      }
    }

    return marketDataById
  }

  async findByAssetId({ assetId }: MarketDataArgs): Promise<MarketData | null> {
    const opportunities = await this.getOpportunities()
    const opportunity = opportunities[assetId]

    if (!opportunity) return null

    const coinGeckoData = await super.findByAssetId({ assetId: opportunity.underlyingAssetId })

    if (!coinGeckoData) return null

    return {
      price: bn(coinGeckoData.price).times(opportunity.pricePerShare).toFixed(),
      marketCap: opportunity.marketCap,
      volume: '0',
      changePercent24Hr: 0,
    }
  }

  findPriceHistoryByAssetId() {
    return Promise.resolve([])
  }
}
