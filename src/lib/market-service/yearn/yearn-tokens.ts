import { adapters, CHAIN_NAMESPACE, CHAIN_REFERENCE, toAssetId } from '@shapeshiftoss/caip'
import type {
  FindAllMarketArgs,
  HistoryData,
  MarketCapResult,
  MarketData,
  MarketDataArgs,
} from '@shapeshiftoss/types'
import type { ChainId, Token, Yearn } from '@yfi/sdk'
import uniqBy from 'lodash/uniqBy'
import { bnOrZero } from 'lib/bignumber/bignumber'

import type { MarketService } from '../api'

type YearnTokenMarketCapServiceArgs = {
  yearnSdk: Yearn<ChainId>
}

const USDC_PRECISION = 6

export class YearnTokenMarketCapService implements MarketService {
  baseUrl = 'https://api.yearn.finance'
  yearnSdk: Yearn<ChainId>

  private readonly defaultGetByMarketCapArgs: FindAllMarketArgs = {
    count: 2500,
  }

  constructor(args: YearnTokenMarketCapServiceArgs) {
    this.yearnSdk = args.yearnSdk
  }

  async findAll(args?: FindAllMarketArgs) {
    try {
      const argsToUse = { ...this.defaultGetByMarketCapArgs, ...args }
      const response = await Promise.allSettled([
        this.yearnSdk.tokens.supported(),
        this.yearnSdk.vaults.tokens(),
      ])
      const [zapperResponse, underlyingTokensResponse] = response

      // Ignore rejected promises, return successful responses.
      const responseTokens = [
        ...(zapperResponse.status === 'fulfilled' ? zapperResponse.value : []),
        ...(underlyingTokensResponse.status === 'fulfilled' ? underlyingTokensResponse.value : []),
      ]
      const uniqueTokens: Token[] = uniqBy(responseTokens, 'address')
      const tokens = uniqueTokens.slice(0, argsToUse.count)

      return tokens.reduce((acc, token) => {
        const _assetId: string = toAssetId({
          chainNamespace: CHAIN_NAMESPACE.Evm,
          chainReference: CHAIN_REFERENCE.EthereumMainnet,
          assetNamespace: 'erc20',
          assetReference: token.address,
        })
        acc[_assetId] = {
          price: bnOrZero(token.priceUsdc).div(`1e+${USDC_PRECISION}`).toString(),
          // TODO: figure out how to get these values.
          marketCap: '0',
          volume: '0',
          changePercent24Hr: 0,
        }

        return acc
      }, {} as MarketCapResult)
    } catch (e) {
      console.warn(e)
      return {}
    }
  }

  async findByAssetId({ assetId: _assetId }: MarketDataArgs): Promise<MarketData | null> {
    const address = adapters.assetIdToYearn(_assetId)
    if (!address) return null
    try {
      // the yearnSdk caches the response to all of these calls and returns the cache if found.
      // Unfortunately, the functions do not take in an argument for a single address to return a
      // single token, so we are limited to getting all tokens then doing a find on them to return
      // the price to web. Doing allSettled so that one rejection does not interfere with the other
      // calls.
      const response = await Promise.allSettled([
        this.yearnSdk.tokens.supported(),
        this.yearnSdk.vaults.tokens(),
      ])
      const [zapperResponse, underlyingTokensResponse] = response

      // Ignore rejected promises, return successful responses.
      const responseTokens = [
        ...(zapperResponse.status === 'fulfilled' ? zapperResponse.value : []),
        ...(underlyingTokensResponse.status === 'fulfilled' ? underlyingTokensResponse.value : []),
      ]
      const token = responseTokens.find((tok: Token) => tok.address === address)
      if (!token) return null

      return {
        price: bnOrZero(token.priceUsdc).div(`1e+${USDC_PRECISION}`).toString(),
        marketCap: '0',
        volume: '0',
        changePercent24Hr: 0,
      }
    } catch (e) {
      console.warn(e)
      throw new Error('YearnMarketService(findByAssetId): error fetching market data')
    }
  }

  findPriceHistoryByAssetId(): Promise<HistoryData[]> {
    // TODO: figure out a way to get zapper and underlying token historical data.
    return Promise.resolve([])
  }
}
