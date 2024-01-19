import { createQueryKeys, mergeQueryKeys } from '@lukemorales/query-key-factory'
import type { AssetId } from '@shapeshiftoss/caip'
import axios from 'axios'
import { getConfig } from 'config'
import { bn } from 'lib/bignumber/bignumber'
import type {
  MidgardPoolResponse,
  ThornodePoolResponse,
} from 'lib/swapper/swappers/ThorchainSwapper/types'
import { assetIdToPoolAssetId } from 'lib/swapper/swappers/ThorchainSwapper/utils/poolAssetHelpers/poolAssetHelpers'
import { thorService } from 'lib/swapper/swappers/ThorchainSwapper/utils/thorService'
import type { ThorchainBlock } from 'lib/utils/thorchain/lending/types'
import type { MidgardSwapHistoryResponse } from 'lib/utils/thorchain/lp/types'
import { thorchainLp } from 'pages/ThorChainLP/queries/queries'

// Current blocktime as per https://thorchain.network/stats
export const thorchainBlockTimeSeconds = '6.1'
const thorchainBlockTimeMs = bn(thorchainBlockTimeSeconds).times(1000).toNumber()

// Feature-agnostic, abstracts away midgard endpoints
const midgard = createQueryKeys('midgard', {
  swapsData: (assetId: AssetId | undefined, timeframe: '24h' | 'previous24h' | '7d') => ({
    // We may or may not want to revisit this, but this will prevent overfetching for now
    staleTime: Infinity,
    enabled: !!assetId,
    queryKey: ['midgardSwapsData', assetId ?? '', timeframe],
    queryFn: async () => {
      if (!assetId) throw new Error('assetId is required')
      const poolAssetId = assetIdToPoolAssetId({ assetId })

      const { from, to } = (() => {
        const now = Math.floor(Date.now() / 1000)

        if (timeframe === '24h') {
          const twentyFourHoursAgo = now - 24 * 60 * 60
          return { from: twentyFourHoursAgo, to: now }
        }

        if (timeframe === 'previous24h') {
          const fortyEightHoursAgo = now - 2 * 24 * 60 * 60
          const twentyFourHoursAgo = now - 24 * 60 * 60
          return { from: fortyEightHoursAgo, to: twentyFourHoursAgo }
        }

        if (timeframe === '7d') {
          const sevenDaysAgo = now - 7 * 24 * 60 * 60
          return { from: sevenDaysAgo, to: now }
        }

        throw new Error(`Invalid timeframe ${timeframe}`)
      })()

      const { data } = await axios.get<MidgardSwapHistoryResponse>(
        `${
          getConfig().REACT_APP_MIDGARD_URL
        }/history/swaps?pool=${poolAssetId}&from=${from}&to=${to}`,
      )
      return data
    },
  }),
  poolData: (assetId: AssetId | undefined) => ({
    // We may or may not want to revisit this, but this will prevent overfetching for now
    staleTime: Infinity,
    enabled: !!assetId,
    queryKey: ['midgardPoolData', assetId],
    queryFn: async () => {
      if (!assetId) throw new Error('assetId is required')
      const poolAssetId = assetIdToPoolAssetId({ assetId })
      const { data: poolData } = await axios.get<MidgardPoolResponse>(
        `${getConfig().REACT_APP_MIDGARD_URL}/pool/${poolAssetId}`,
      )

      return poolData
    },
  }),
  poolsData: () => ({
    // We may or may not want to revisit this, but this will prevent overfetching for now
    staleTime: Infinity,
    queryKey: ['midgardPoolsData'],
    queryFn: async () => {
      const { data: poolsData } = await axios.get<MidgardPoolResponse[]>(
        `${getConfig().REACT_APP_MIDGARD_URL}/pools`,
      )
      return poolsData
    },
  }),
})

// Feature-agnostic, abstracts away THORNode endpoints
const thornode = createQueryKeys('thornode', {
  poolData: (assetId: AssetId | undefined) => ({
    // We may or may not want to revisit this, but this will prevent overfetching for now
    staleTime: Infinity,
    enabled: !!assetId,
    queryKey: ['thornodePoolData', assetId],
    queryFn: async () => {
      if (!assetId) throw new Error('assetId is required')
      const poolAssetId = assetIdToPoolAssetId({ assetId })
      const { data: poolData } = await axios.get<ThornodePoolResponse>(
        `${getConfig().REACT_APP_THORCHAIN_NODE_URL}/lcd/thorchain/pool/${poolAssetId}`,
      )

      return poolData
    },
  }),
  poolsData: () => ({
    queryKey: ['thornodePoolsData'],
    // Typically 60 second staleTime to handle pools going to live/halt states
    // This may not be required in your specific consumption, override if needed
    staleTime: 60_000,
    queryFn: async () => {
      const daemonUrl = getConfig().REACT_APP_THORCHAIN_NODE_URL
      const poolResponse = await thorService.get<ThornodePoolResponse[]>(
        `${daemonUrl}/lcd/thorchain/pools`,
      )

      if (poolResponse.isOk()) {
        return poolResponse.unwrap().data
      }

      return []
    },
  }),
  mimir: () => {
    return {
      // We use the mimir query to get the repayment maturity block, so need to mark it stale at the end of each THOR block
      staleTime: thorchainBlockTimeMs,
      queryKey: ['thorchainMimir'],
      queryFn: async () => {
        const daemonUrl = getConfig().REACT_APP_THORCHAIN_NODE_URL
        const { data: mimir } = await axios.get<Record<string, unknown>>(
          `${daemonUrl}/lcd/thorchain/mimir`,
        )
        return mimir
      },
      enabled: true,
    }
  },
  block: () => {
    return {
      // Mark blockHeight query as stale at the end of each THOR block
      staleTime: thorchainBlockTimeMs,
      queryKey: ['thorchainBlockHeight'],
      queryFn: async () => {
        const daemonUrl = getConfig().REACT_APP_THORCHAIN_NODE_URL
        const { data: block } = await axios.get<ThorchainBlock>(`${daemonUrl}/lcd/thorchain/block`)

        return block
      },
      enabled: true,
    }
  },
})
export const reactQueries = mergeQueryKeys(midgard, thornode, thorchainLp)
