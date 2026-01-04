import type { AssetId } from '@shapeshiftoss/caip'
import { adapters } from '@shapeshiftoss/caip'
import type { HistoryData, HistoryTimeframe } from '@shapeshiftoss/types'
import { gql } from 'graphql-request'

import { getGraphQLClient } from './client'

import { marketData } from '@/state/slices/marketDataSlice/marketDataSlice'
import { store } from '@/state/store'

const GET_PRICE_HISTORIES = gql`
  query GetPriceHistories($requests: [PriceHistoryRequest!]!, $timeframe: HistoryTimeframe!) {
    priceHistories(requests: $requests, timeframe: $timeframe) {
      assetId
      data {
        date
        price
      }
      error
    }
  }
`

type PriceHistoryResponse = {
  priceHistories: {
    assetId: string
    data: { date: number; price: number }[]
    error: string | null
  }[]
}

type PriceHistoryRequest = {
  assetId: AssetId
  coingeckoId: string
}

type PendingRequest = {
  resolve: (value: HistoryData[]) => void
  reject: (error: Error) => void
}

type TimeframeKey = string

const DEBOUNCE_MS = 100
const MAX_WAIT_MS = 500

const pendingRequestsByTimeframe = new Map<TimeframeKey, Map<AssetId, PendingRequest[]>>()
let debounceTimer: ReturnType<typeof setTimeout> | null = null
let maxWaitTimer: ReturnType<typeof setTimeout> | null = null
let flushInProgress = false
let currentTimeframe: HistoryTimeframe | null = null

function scheduleFlush(): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }
  debounceTimer = setTimeout(flushPendingRequests, DEBOUNCE_MS)

  if (!maxWaitTimer) {
    maxWaitTimer = setTimeout(flushPendingRequests, MAX_WAIT_MS)
  }
}

async function flushPendingRequests(): Promise<void> {
  if (flushInProgress || pendingRequestsByTimeframe.size === 0) return

  flushInProgress = true

  if (debounceTimer) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }
  if (maxWaitTimer) {
    clearTimeout(maxWaitTimer)
    maxWaitTimer = null
  }

  const timeframesToProcess = new Map(pendingRequestsByTimeframe)
  pendingRequestsByTimeframe.clear()
  currentTimeframe = null

  for (const [timeframe, assetRequests] of timeframesToProcess) {
    const assetIds = Array.from(assetRequests.keys())
    console.log(
      `[GraphQL PriceHistory] Flushing ${assetIds.length} batched requests for timeframe ${timeframe}`,
    )

    const requests: PriceHistoryRequest[] = []
    for (const assetId of assetIds) {
      const coingeckoId = adapters.assetIdToCoingecko(assetId)
      if (coingeckoId) {
        requests.push({ assetId, coingeckoId })
      }
    }

    if (requests.length === 0) {
      assetRequests.forEach(pendingList => {
        pendingList.forEach(({ resolve }) => resolve([]))
      })
      continue
    }

    try {
      const client = getGraphQLClient()
      const response = await client.request<PriceHistoryResponse>(GET_PRICE_HISTORIES, {
        requests: requests.map(r => ({ assetId: r.assetId, coingeckoId: r.coingeckoId })),
        timeframe: timeframeToGraphQL(timeframe as HistoryTimeframe),
      })

      const historyDataByAssetId: Record<AssetId, HistoryData[]> = {}

      for (const result of response.priceHistories) {
        const assetId = result.assetId as AssetId
        const data: HistoryData[] = result.data.map(point => ({
          date: point.date,
          price: point.price,
        }))

        historyDataByAssetId[assetId] = data

        const pendingList = assetRequests.get(assetId)
        pendingList?.forEach(({ resolve }) => resolve(data))
      }

      store.dispatch(
        marketData.actions.setCryptoPriceHistory({
          timeframe: timeframe as HistoryTimeframe,
          historyDataByAssetId,
        }),
      )

      assetRequests.forEach((pendingList, assetId) => {
        if (!historyDataByAssetId[assetId]) {
          pendingList.forEach(({ resolve }) => resolve([]))
        }
      })
    } catch (error) {
      console.error('[GraphQL PriceHistory] Failed to batch fetch:', error)
      assetRequests.forEach(pendingList => {
        pendingList.forEach(({ reject }) => reject(error as Error))
      })
    }
  }

  flushInProgress = false

  if (pendingRequestsByTimeframe.size > 0) {
    scheduleFlush()
  }
}

function timeframeToGraphQL(timeframe: HistoryTimeframe): string {
  const mapping: Record<HistoryTimeframe, string> = {
    '1H': 'HOUR',
    '24H': 'DAY',
    '1W': 'WEEK',
    '1M': 'MONTH',
    '1Y': 'YEAR',
    All: 'ALL',
  }
  return mapping[timeframe] || 'DAY'
}

function queueRequest(assetId: AssetId, timeframe: HistoryTimeframe): Promise<HistoryData[]> {
  return new Promise((resolve, reject) => {
    if (currentTimeframe && currentTimeframe !== timeframe) {
      flushPendingRequests()
    }
    currentTimeframe = timeframe

    let assetRequests = pendingRequestsByTimeframe.get(timeframe)
    if (!assetRequests) {
      assetRequests = new Map()
      pendingRequestsByTimeframe.set(timeframe, assetRequests)
    }

    const existing = assetRequests.get(assetId)
    if (existing) {
      existing.push({ resolve, reject })
    } else {
      assetRequests.set(assetId, [{ resolve, reject }])
    }
    scheduleFlush()
  })
}

export function fetchPriceHistoryGraphQL(
  assetId: AssetId,
  timeframe: HistoryTimeframe,
): Promise<HistoryData[]> {
  const coingeckoId = adapters.assetIdToCoingecko(assetId)
  if (!coingeckoId) {
    return Promise.resolve([])
  }

  return queueRequest(assetId, timeframe)
}

export async function fetchPriceHistoriesBatchGraphQL(
  assetIds: AssetId[],
  timeframe: HistoryTimeframe,
): Promise<void> {
  const validAssets = assetIds.filter(assetId => adapters.assetIdToCoingecko(assetId))

  if (validAssets.length === 0) return

  await Promise.all(validAssets.map(assetId => queueRequest(assetId, timeframe)))
}

export function clearPriceHistoryLoaderCache(): void {
  pendingRequestsByTimeframe.clear()
  if (debounceTimer) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }
  if (maxWaitTimer) {
    clearTimeout(maxWaitTimer)
    maxWaitTimer = null
  }
}
