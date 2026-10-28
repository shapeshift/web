import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import {
  ASSET_NAMESPACE,
  CHAIN_NAMESPACE,
  fromAssetId,
  fromChainId,
  toAssetId,
  tronChainId,
} from '@shapeshiftoss/caip'
import type {
  FindAllMarketArgs,
  HistoryData,
  MarketCapResult,
  MarketData,
  MarketDataArgs,
  PriceHistoryArgs,
  ZerionChainId,
} from '@shapeshiftoss/types'
import { HistoryTimeframe, ZERION_CHAINS_MAP } from '@shapeshiftoss/types'
import { createThrottle, isToken } from '@shapeshiftoss/utils'
import Axios from 'axios'
import { setupCache } from 'axios-cache-interceptor'
import qs from 'qs'

import type { MarketService } from '../api'
import { DEFAULT_CACHE_TTL_MS } from '../config'
import type { ListFungiblesResponse, ZerionChartResponse, ZerionMarketData } from './types'
import { zerionMarketDataToMarketData } from './utils'

import { getConfig } from '@/config'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { assertUnreachable } from '@/lib/utils'

// The production key allows 300 RPS shared org-wide, so each client stays well below it
const { throttle } = createThrottle({
  capacity: 30,
  costPerReq: 1,
  drainPerInterval: 10,
  intervalMs: 1000,
})

const axios = setupCache(Axios.create(), { ttl: DEFAULT_CACHE_TTL_MS, cacheTakeover: false })

const LOOKUP_BATCH_WINDOW_MS = 50
const MAX_IMPLEMENTATIONS_PER_REQUEST = 25

const ZERION_CHAIN_ID_BY_CHAIN_ID = Object.fromEntries(
  Object.entries(ZERION_CHAINS_MAP).map(([zerionChainId, chainId]) => [chainId, zerionChainId]),
) as Partial<Record<ChainId, ZerionChainId>>

type FungibleLookup = { id: string; marketData: ZerionMarketData } | null

type PendingLookup = {
  resolve: (lookup: FungibleLookup) => void
  reject: (err: unknown) => void
}

// evm addresses are case insensitive, while other chains (e.g. solana mints) are not
const toImplementationKey = (zerionChainId: string, address: string, chainId?: ChainId): string =>
  `${zerionChainId}:${
    !chainId || fromChainId(chainId).chainNamespace === CHAIN_NAMESPACE.Evm
      ? address.toLowerCase()
      : address
  }`

export class ZerionMarketService implements MarketService {
  baseUrl = getConfig().VITE_ZERION_BASE_URL

  private readonly defaultGetByMarketCapArgs: FindAllMarketArgs = {
    count: 250,
  }

  private pendingLookups = new Map<string, PendingLookup[]>()
  private lookupTimer: ReturnType<typeof setTimeout> | undefined

  private getFungible = (assetId: AssetId): Promise<FungibleLookup> => {
    if (!isToken(assetId)) return Promise.resolve(null)

    const { chainId, assetReference } = fromAssetId(assetId)
    const zerionChainId = ZERION_CHAIN_ID_BY_CHAIN_ID[chainId]

    // zerion indexes no trc20 tokens and rejects the whole request for a base58 address
    if (!zerionChainId || chainId === tronChainId) return Promise.resolve(null)

    const key = toImplementationKey(zerionChainId, assetReference, chainId)

    return new Promise((resolve, reject) => {
      this.pendingLookups.set(key, [...(this.pendingLookups.get(key) ?? []), { resolve, reject }])
      this.lookupTimer ??= setTimeout(() => this.flushLookups(), LOOKUP_BATCH_WINDOW_MS)
    })
  }

  private flushLookups = async (): Promise<void> => {
    const pending = this.pendingLookups

    this.pendingLookups = new Map()
    this.lookupTimer = undefined

    const keys = [...pending.keys()]
    const batches = Array.from(
      { length: Math.ceil(keys.length / MAX_IMPLEMENTATIONS_PER_REQUEST) },
      (_, i) =>
        keys.slice(i * MAX_IMPLEMENTATIONS_PER_REQUEST, (i + 1) * MAX_IMPLEMENTATIONS_PER_REQUEST),
    )

    await Promise.all(
      batches.map(async batch => {
        try {
          await throttle()

          const { data: res } = await axios.get<ListFungiblesResponse>(
            `${this.baseUrl}/fungibles`,
            {
              params: { 'filter[fungible_implementations]': batch.join(',') },
            },
          )

          const found = new Map<string, FungibleLookup>()
          for (const fungible of res.data) {
            const lookup = { id: fungible.id, marketData: fungible.attributes.market_data }
            for (const { chain_id, address } of fungible.attributes.implementations) {
              found.set(toImplementationKey(chain_id, address, ZERION_CHAINS_MAP[chain_id]), lookup)
            }
          }

          for (const key of batch) {
            const lookup = found.get(key) ?? null
            pending.get(key)?.forEach(({ resolve }) => resolve(lookup))
          }
        } catch (err) {
          batch.forEach(key => pending.get(key)?.forEach(({ reject }) => reject(err)))
        }
      }),
    )
  }

  getZerionPriceHistory = async ({
    assetId,
    timeframe,
  }: PriceHistoryArgs): Promise<ZerionChartResponse | null> => {
    // Fee assets aren't supported in this implementation
    const fungible = await this.getFungible(assetId)
    if (!fungible) return null

    const period = (() => {
      switch (timeframe) {
        case HistoryTimeframe.HOUR:
          return 'hour'
        case HistoryTimeframe.DAY:
          return 'day'
        case HistoryTimeframe.WEEK:
          return 'week'
        case HistoryTimeframe.MONTH:
          return 'month'
        case HistoryTimeframe.YEAR:
          return 'year'
        case HistoryTimeframe.ALL:
          return 'max'
        default:
          assertUnreachable(timeframe)
      }
    })()

    const url = `${this.baseUrl}/fungibles/${fungible.id}/charts/${period}`
    const { data: res } = await axios.get<ZerionChartResponse>(url)
    return res
  }

  async findAll(args: FindAllMarketArgs): Promise<MarketCapResult> {
    const argsToUse = { ...this.defaultGetByMarketCapArgs, ...args }
    const { count } = argsToUse
    let url = `${this.baseUrl}/fungibles/`

    const marketCapResult: MarketCapResult = {}

    try {
      let isFirstRequest = true
      let consecutiveEmptyPages = 0

      while (Object.keys(marketCapResult).length < count) {
        await throttle()

        let params = {}
        if (isFirstRequest) {
          params = {
            sort: 'market_data.market_cap',
            'page[size]': 100, // Between 1 and 100
          }
          isFirstRequest = false
        }

        const { data } = await axios.get<ListFungiblesResponse>(url, {
          paramsSerializer: params => qs.stringify(params, { arrayFormat: 'repeat' }),
          params,
        })

        let addedInThisPage = 0

        for (const token of data.data) {
          if (Object.keys(marketCapResult).length >= count) break
          const marketData = token.attributes.market_data

          for (const implementation of token.attributes.implementations) {
            const chainId = ZERION_CHAINS_MAP[implementation.chain_id]
            if (!chainId) continue // We don't support this chain, skip this implementation
            const assetId = toAssetId({
              chainId: chainId as ChainId,
              assetNamespace: ASSET_NAMESPACE.erc20,
              assetReference: implementation.address,
            })

            if (!marketCapResult[assetId]) {
              marketCapResult[assetId] = {
                price: bnOrZero(marketData.price).toFixed(),
                marketCap: marketData.market_cap?.toFixed() ?? '0',
                volume: '0', // Not provided by Zerion
                changePercent24Hr: marketData.changes.percent_1d ?? 0,
                supply: marketData.circulating_supply?.toFixed() ?? undefined,
                maxSupply: marketData.total_supply?.toFixed() ?? undefined,
              }
              addedInThisPage++
              if (Object.keys(marketCapResult).length >= count) break
            }
          }
        }

        if (addedInThisPage === 0) {
          consecutiveEmptyPages++
        } else {
          consecutiveEmptyPages = 0
        }

        // If we've had 3 consecutive pages with no new additions, assume we've exhausted all options
        if (consecutiveEmptyPages >= 3) {
          console.warn(`No new assets added in the last 3 pages. Stopping the fetch.`)
          break
        }

        if (data.links.next) {
          const nextUrl = new URL(data.links.next)
          const path = nextUrl.pathname.split('/v1/')[1]
          const query = nextUrl.search
          url = `${this.baseUrl}/${path}${query}`
        } else {
          break // No more pages to fetch
        }
      }

      return marketCapResult
    } catch (e) {
      console.error('Error fetching Zerion data:', e)
      return marketCapResult
    }
  }

  async findPriceHistoryByAssetId({
    assetId,
    timeframe,
  }: PriceHistoryArgs): Promise<HistoryData[]> {
    const zerionPriceHistory = await this.getZerionPriceHistory({ assetId, timeframe })
    if (!zerionPriceHistory)
      throw new Error('MarketService(findPriceHistoryByAssetId): error fetching price history')

    return zerionPriceHistory.data.attributes.points.map(([date, price]) => ({
      date: date * 1000,
      price,
    }))
  }

  async findByAssetId({ assetId }: MarketDataArgs): Promise<MarketData | null> {
    try {
      const fungible = await this.getFungible(assetId)
      if (!fungible) throw new Error('MarketService(findByAssetId): error fetching market data')

      return zerionMarketDataToMarketData(fungible.marketData)
    } catch (e) {
      throw new Error(`MarketService(findByAssetId): error fetching market data: ${e}`)
    }
  }
}
