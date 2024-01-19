import { createQueryKeyStore } from '@lukemorales/query-key-factory'
import type { AssetId } from '@shapeshiftoss/caip'
import type { AxiosError } from 'axios'
import axios from 'axios'
import { getConfig } from 'config'
import { getAddress, isAddress } from 'viem'
import { bn } from 'lib/bignumber/bignumber'
import type {
  MidgardPoolResponse,
  ThornodePoolResponse,
} from 'lib/swapper/swappers/ThorchainSwapper/types'
import { assetIdToPoolAssetId } from 'lib/swapper/swappers/ThorchainSwapper/utils/poolAssetHelpers/poolAssetHelpers'
import type { ThorchainBlock } from 'lib/utils/thorchain/lending/types'
import { getEarnings } from 'lib/utils/thorchain/lp'
import type {
  MidgardLiquidityProvider,
  MidgardLiquidityProvidersList,
  MidgardSwapHistoryResponse,
} from 'lib/utils/thorchain/lp/types'

export const reactQueries = createQueryKeyStore({
  // Feature-agnostic, abstracts away midgard endpoints
  midgard: {
    swapsData: (assetId: AssetId | undefined, timeframe: '24h' | 'previous24h' | '7d') => ({
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
      queryKey: ['midgardPoolsData'],
      staleTime: Infinity,
      queryFn: async () => {
        const { data: poolsData } = await axios.get<MidgardPoolResponse[]>(
          `${getConfig().REACT_APP_MIDGARD_URL}/pools`,
        )
        return poolsData
      },
    }),
  },
  // Feature-agnostic, abstracts away THORNode endpoints
  thornode: {
    poolData: (assetId: AssetId | undefined) => ({
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
    mimir: () => {
      // Current blocktime as per https://thorchain.network/stats
      const thorchainBlockTimeSeconds = '6.1'
      const thorchainBlockTimeMs = bn(thorchainBlockTimeSeconds).times(1000).toNumber()
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
      // Current blocktime as per https://thorchain.network/stats
      const thorchainBlockTimeSeconds = '6.1'
      const thorchainBlockTimeMs = bn(thorchainBlockTimeSeconds).times(1000).toNumber()

      return {
        // Mark blockHeight query as stale at the end of each THOR block
        staleTime: thorchainBlockTimeMs,
        queryKey: ['thorchainBlockHeight'],
        queryFn: async () => {
          const daemonUrl = getConfig().REACT_APP_THORCHAIN_NODE_URL
          const { data: block } = await axios.get<ThorchainBlock>(
            `${daemonUrl}/lcd/thorchain/block`,
          )

          return block
        },
        enabled: true,
      }
    },
  },
  thorchainLp: {
    earnings: (from: string | undefined) => ({
      enabled: Boolean(from),
      // We may or may not want to revisit this, but this will prevent overfetching for now
      staleTime: Infinity,
      queryKey: ['thorchainearnings', from],
      queryFn: () => {
        if (!from) throw new Error('from is required')
        return getEarnings({ from })
      },
    }),
    liquidityMembers: () => ({
      queryKey: ['thorchainLiquidityMembers'],
      // Don't forget to invalidate me alongside thorchainUserLpData if you want to refresh the data
      staleTime: Infinity,
      queryFn: async () => {
        const { data } = await axios.get<MidgardLiquidityProvidersList>(
          `${getConfig().REACT_APP_MIDGARD_URL}/members`,
        )

        return data
      },
    }),
    liquidityMember: (address: string) => ({
      queryKey: ['thorchainLiquidityMember', { address }],
      // Don't forget to invalidate me alongside thorchainUserLpData if you want to refresh the data
      staleTime: Infinity,
      queryFn: async () => {
        try {
          const checksumAddress = isAddress(address) ? getAddress(address) : address
          const { data } = await axios.get<MidgardLiquidityProvider>(
            `${getConfig().REACT_APP_MIDGARD_URL}/member/${checksumAddress}`,
          )

          return data
        } catch (e) {
          // THORCHain returns a 404 which is perfectly valid, but axios catches as an error
          // We only want to log errors to the console if they're actual errors, not 404s
          if ((e as AxiosError).isAxiosError && (e as AxiosError).response?.status !== 404)
            console.error(e)

          return null
        }
      },
    }),
  },
})
