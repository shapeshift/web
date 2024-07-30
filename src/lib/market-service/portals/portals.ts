import type { ChainId } from '@shapeshiftoss/caip'
import {
  arbitrumChainId,
  ASSET_NAMESPACE,
  avalancheChainId,
  baseChainId,
  bscChainId,
  ethChainId,
  fromAssetId,
  gnosisChainId,
  optimismChainId,
  polygonChainId,
  toAssetId,
} from '@shapeshiftoss/caip'
import type {
  AssetsByIdPartial,
  FindAllMarketArgs,
  HistoryData,
  MarketCapResult,
  MarketData,
  MarketDataArgs,
  PriceHistoryArgs,
} from '@shapeshiftoss/types'
import { HistoryTimeframe } from '@shapeshiftoss/types'
import Axios from 'axios'
import { setupCache } from 'axios-cache-interceptor'
import dayjs from 'dayjs'
import qs from 'qs'
import { zeroAddress } from 'viem'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { sleep } from 'lib/poll/poll'
import { assertUnreachable, getTimeFrameBounds, isToken } from 'lib/utils'

import generatedAssetData from '../../asset-service/service/generatedAssetData.json'
import type { MarketService } from '../api'
import { DEFAULT_CACHE_TTL_MS } from '../config'
import { isValidDate } from '../utils/isValidDate'

const calculatePercentChange = (openPrice: string, closePrice: string): number => {
  const open = bnOrZero(openPrice)
  const close = bnOrZero(closePrice)
  if (open.isZero()) return 0
  return close.minus(open).dividedBy(open).times(100).toNumber()
}

// TODO(gomes): move me somewhere shared
// Non-exhaustive - https://api.portals.fi/docs#/Supported/SupportedController_getSupportedTokensV2 for full docs
type TokenInfo = {
  key: string
  name: string
  decimals: number
  symbol: string
  address: string
  images: string[] | undefined
  pricePerShare: string | undefined
}

type GetTokensResponse = {
  totalItems: number
  pageItems: number
  more: boolean
  page: number
  tokens: TokenInfo[]
}

type HistoryResponse = {
  totalItems: number
  pageItems: number
  more: boolean
  page: number
  history: {
    time: string
    highPrice: string
    lowPrice: string
    openPrice: string
    closePrice: string
    liquidity: string
    reserves: string[]
    totalSupply: string
    pricePerShare: string
    volume1dUsd: string
    apy: string
  }[]
}

const CHAIN_ID_TO_PORTALS_NETWORK: Partial<Record<ChainId, string>> = {
  [avalancheChainId]: 'avalanche',
  [ethChainId]: 'ethereum',
  [polygonChainId]: 'polygon',
  [bscChainId]: 'bsc',
  [optimismChainId]: 'optimism',
  [arbitrumChainId]: 'arbitrum',
  [gnosisChainId]: 'gnosis',
  [baseChainId]: 'base',
}

// TODO(gomes): can we have root-level utils so we don't redeclare this from the scripts folder?
const { throttle, clear } = (({
  capacity,
  costPerReq,
  drainPerInterval,
  intervalMs,
}: {
  capacity: number
  costPerReq: number
  drainPerInterval: number
  intervalMs: number
}) => {
  let currentLevel = 0
  let pendingResolves: ((value?: unknown) => void)[] = []

  const drain = () => {
    const drainAmount = Math.min(currentLevel, drainPerInterval)
    currentLevel -= drainAmount

    // Resolve pending promises if there's enough capacity
    while (pendingResolves.length > 0 && currentLevel + costPerReq <= capacity) {
      const resolve = pendingResolves.shift()
      if (resolve) {
        currentLevel += costPerReq
        resolve()
      }
    }
  }

  // Start the interval to drain the capacity
  const intervalId = setInterval(drain, intervalMs)

  const throttle = async () => {
    if (currentLevel + costPerReq <= capacity) {
      // If adding another request doesn't exceed capacity, proceed immediately
      currentLevel += costPerReq
    } else {
      // Otherwise, wait until there's enough capacity
      await new Promise(resolve => {
        pendingResolves.push(resolve)
      })
    }
  }

  const clear = () => clearInterval(intervalId)

  return { throttle, clear }
})({
  capacity: 500, // 500 rpm as per https://github.com/shapeshift/web/pull/7401#discussion_r1687499650
  costPerReq: 1,
  drainPerInterval: 125, // Replenish 125 requests every 15 seconds
  intervalMs: 15000, // 15 seconds
})

const axios = setupCache(Axios.create(), { ttl: DEFAULT_CACHE_TTL_MS, cacheTakeover: false })

const PORTALS_API_KEY = process.env.REACT_APP_PORTALS_API_KEY

export class PortalsMarketService implements MarketService {
  baseUrl = 'https://api.portals.fi'

  private readonly defaultGetByMarketCapArgs: FindAllMarketArgs = {
    count: 250,
  }

  async findAll(args?: FindAllMarketArgs): Promise<MarketCapResult> {
    const argsToUse = { ...this.defaultGetByMarketCapArgs, ...args }
    const { count } = argsToUse
    const tokensUrl = `${this.baseUrl}/v2/tokens`
    const historyUrl = `${this.baseUrl}/v2/tokens/history`

    const marketCapResult: MarketCapResult = {}

    try {
      for (const [chainId, network] of Object.entries(CHAIN_ID_TO_PORTALS_NETWORK)) {
        let page = 0
        let hasMore = true

        while (hasMore && Object.keys(marketCapResult).length < count) {
          await throttle()

          const params = {
            limit: '250',
            minLiquidity: '1000',
            minApy: '1',
            networks: [network],
            page: page.toString(),
          }

          const { data } = await axios.get<GetTokensResponse>(tokensUrl, {
            paramsSerializer: params => qs.stringify(params, { arrayFormat: 'repeat' }),
            headers: {
              Authorization: `Bearer ${PORTALS_API_KEY}`,
            },
            params,
          })

          hasMore = data.more
          page++

          for (const token of data.tokens) {
            await sleep(200)
            await throttle()
            if (Object.keys(marketCapResult).length >= count) break

            const assetId = toAssetId({
              chainId: chainId as ChainId,
              assetNamespace:
                chainId === bscChainId ? ASSET_NAMESPACE.bep20 : ASSET_NAMESPACE.erc20,
              assetReference: token.address,
            })

            if (assetId) {
              const historyParams = {
                id: `${network}:${token.address}`,
                from: Math.floor(Date.now() / 1000) - 86400, // 24 hours ago
                resolution: '1d',
                page: '0',
              }

              const { data: historyData } = await axios.get<HistoryResponse>(historyUrl, {
                headers: {
                  Authorization: `Bearer ${PORTALS_API_KEY}`,
                },
                params: historyParams,
              })

              if (historyData.history.length > 0) {
                const latestData = historyData.history[0]
                marketCapResult[assetId] = {
                  price: bnOrZero(latestData.closePrice).toFixed(),
                  marketCap: bnOrZero(latestData.liquidity).toFixed(),
                  volume: latestData.volume1dUsd,
                  changePercent24Hr: calculatePercentChange(
                    latestData.openPrice,
                    latestData.closePrice,
                  ),
                  supply: latestData.totalSupply,
                  maxSupply: undefined, // This endpoint doesn't provide max supply
                }
              }
            }

            if (Object.keys(marketCapResult).length >= count) break
          }
        }

        if (Object.keys(marketCapResult).length >= count) break
      }

      return marketCapResult
    } catch (e) {
      console.error('Error fetching Portals data:', e)
      return marketCapResult
    } finally {
      clear()
    }
  }
  async findByAssetId({ assetId }: MarketDataArgs): Promise<MarketData | null> {
    const assets = generatedAssetData as unknown as AssetsByIdPartial

    try {
      const asset = assets[assetId]
      if (!asset) return null
      const { chainId, assetReference } = fromAssetId(assetId)

      const network = CHAIN_ID_TO_PORTALS_NETWORK[chainId]
      if (!network) {
        console.error(`Unsupported chainId: ${chainId}`)
        return null
      }

      const id = `${network}:${isToken(assetReference) ? assetReference : zeroAddress}`
      const url = `${this.baseUrl}/v2/tokens/history`
      const params = {
        id,
        from: Math.floor(Date.now() / 1000) - 86400, // 24 hours ago
        resolution: '1d',
        page: 0,
      }

      const { data } = await axios.get<HistoryResponse>(url, {
        headers: {
          Authorization: `Bearer ${PORTALS_API_KEY}`,
        },
        params,
      })

      if (!data.history.length) return null

      const latestData = data.history[0]

      return {
        price: bnOrZero(latestData.closePrice).toFixed(),
        marketCap: bnOrZero(latestData.liquidity).toFixed(),
        volume: latestData.volume1dUsd,
        changePercent24Hr: calculatePercentChange(latestData.openPrice, latestData.closePrice),
        supply: latestData.totalSupply,
        maxSupply: undefined, // This endpoint doesn't provide max supply
      }
    } catch (e) {
      console.error(`MarketService(findByAssetId): error fetching market data: ${e}`)
      return null
    }
  }

  async findPriceHistoryByAssetId({
    assetId,
    timeframe,
  }: PriceHistoryArgs): Promise<HistoryData[]> {
    const { chainId, assetReference } = fromAssetId(assetId)
    const network = CHAIN_ID_TO_PORTALS_NETWORK[chainId]

    if (!network) {
      console.error(`Unsupported chainId: ${chainId}`)
      return []
    }

    const id = `${network}:${isToken(assetReference) ? assetReference : zeroAddress}`
    const { start: _start, end } = getTimeFrameBounds(timeframe)

    const resolution = (() => {
      switch (timeframe) {
        case HistoryTimeframe.HOUR:
        case HistoryTimeframe.DAY:
          return '15m'
        case HistoryTimeframe.WEEK:
          return '1h'
        case HistoryTimeframe.MONTH:
          return '4h'
        case HistoryTimeframe.YEAR:
        case HistoryTimeframe.ALL:
          return '1d'
        default:
          assertUnreachable(timeframe)
      }
    })()

    try {
      // Portals can only get historical market data up to 1 year ago
      const start =
        timeframe === HistoryTimeframe.ALL ? dayjs().startOf('minute').subtract(1, 'year') : _start
      const from = Math.floor(start.valueOf() / 1000)
      const to = Math.floor(end.valueOf() / 1000)
      const url = `${this.baseUrl}/v2/tokens/history`

      const params = {
        id,
        from,
        to,
        resolution,
      }

      const { data } = await axios.get<HistoryResponse>(url, {
        headers: {
          Authorization: `Bearer ${PORTALS_API_KEY}`,
        },
        params,
      })

      return data.history.reverse().reduce<HistoryData[]>((acc, current) => {
        const date = new Date(current.time).getTime()
        if (!isValidDate(date)) {
          console.error('PortalsMarketService(findPriceHistoryByAssetId): invalid date')
          return acc
        }

        const price = bn(current.closePrice)
        if (price.isNaN()) {
          console.error('PortalsMarketService(findPriceHistoryByAssetId): invalid price')
          return acc
        }

        acc.push({ date, price: price.toNumber() })
        return acc
      }, [])
    } catch (err) {
      console.error(err)
      throw new Error(
        'PortalsMarketService(findPriceHistoryByAssetId): error fetching price history',
      )
    }
  }
}
