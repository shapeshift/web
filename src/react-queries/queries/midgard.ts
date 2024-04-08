import { createQueryKeys } from '@lukemorales/query-key-factory'
import axios from 'axios'
import { getConfig } from 'config'
import type { MidgardPoolResponse } from 'lib/swapper/swappers/ThorchainSwapper/types'
import type {
  MidgardPoolStats,
  MidgardSwapHistoryResponse,
  MidgardTvlHistoryResponse,
} from 'lib/utils/thorchain/lp/types'

type Period = 'all'
export type Interval = '5min' | 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year'

const midgardUrl = getConfig().REACT_APP_MIDGARD_URL

// Feature-agnostic, abstracts away midgard endpoints
export const midgard = createQueryKeys('midgard', {
  swapsData: (poolAssetId: string, interval: Interval, count: number) => ({
    queryKey: ['midgardSwapsData', poolAssetId, interval, count],
    staleTime: 60_000,
    queryFn: (): Promise<MidgardSwapHistoryResponse> => {
      const fetchSwapsDataChunks = async (
        remainingCount: number,
        to?: number,
      ): Promise<MidgardSwapHistoryResponse> => {
        // Midgard API has a limit of 400 intervals per swaps request
        const limit = Math.min(400, remainingCount)
        const queryParams = new URLSearchParams({
          pool: poolAssetId,
          interval,
          count: String(limit),
        })

        if (to) queryParams.set('to', String(to))

        const { data } = await axios.get<MidgardSwapHistoryResponse>(
          `${midgardUrl}/history/swaps?${queryParams.toString()}`,
        )

        // Fetching a smallish interval chunks, or only a smallish amount of interval chunks left to fetch
        if (data.intervals.length < limit || remainingCount <= 400) {
          return data
        }

        // Fetch more chunks until we reach the target limit
        const newTo = Number(data.intervals[0].startTime) - 1
        const nextData = await fetchSwapsDataChunks(remainingCount - limit, newTo)
        // Combine the intervals from the current and next data fetch.
        data.intervals = nextData.intervals.concat(data.intervals)
        return data
      }

      return fetchSwapsDataChunks(count)
    },
  }),

  tvl: (interval: Interval, count: number) => ({
    queryKey: ['tvl', interval, count],
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await axios.get<MidgardTvlHistoryResponse>(
        `${midgardUrl}/history/tvl?interval=${interval}&count=${count}`,
      )
      return data
    },
  }),
  poolData: (poolAssetId: string) => ({
    queryKey: ['midgardPoolData', poolAssetId],
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await axios.get<MidgardPoolResponse>(
        `${midgardUrl}/pool/${poolAssetId}?period=30d`,
      )
      return data
    },
  }),
  poolStats: (poolAssetId: string, period: Period) => ({
    queryKey: ['midgardPoolStats', poolAssetId, period],
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await axios.get<MidgardPoolStats>(
        `${midgardUrl}/pool/${poolAssetId}/stats?period=${period}`,
      )
      return data
    },
  }),
  poolsData: () => ({
    queryKey: ['midgardPoolsData'],
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await axios.get<MidgardPoolResponse[]>(`${midgardUrl}/pools?period=30d`)
      return data
    },
  }),
})
