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
type Interval = '5min' | 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year'

const midgardUrl = getConfig().REACT_APP_MIDGARD_URL

// Feature-agnostic, abstracts away midgard endpoints
export const midgard = createQueryKeys('midgard', {
  swapsData: (poolAssetId: string, interval: Interval, count: number) => ({
    queryKey: ['midgardSwapsData', poolAssetId, interval, count],
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await axios.get<MidgardSwapHistoryResponse>(
        `${midgardUrl}/history/swaps?pool=${poolAssetId}&interval=${interval}&count=${count}`,
      )
      return data
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
