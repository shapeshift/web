import { createMutationKeys, createQueryKeys, mergeQueryKeys } from '@lukemorales/query-key-factory'
import { type AssetId, fromAssetId } from '@shapeshiftoss/caip'
import { CONTRACT_INTERACTION } from '@shapeshiftoss/chain-adapters'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import type { SwapperName } from '@shapeshiftoss/swapper'
import type { KnownChainIds } from '@shapeshiftoss/types'
import axios from 'axios'
import { getConfig } from 'config'
import { bn } from 'lib/bignumber/bignumber'
import type {
  MidgardPoolResponse,
  ThornodePoolResponse,
} from 'lib/swapper/swappers/ThorchainSwapper/types'
import { assetIdToPoolAssetId } from 'lib/swapper/swappers/ThorchainSwapper/utils/poolAssetHelpers/poolAssetHelpers'
import { thorService } from 'lib/swapper/swappers/ThorchainSwapper/utils/thorService'
import { isToken } from 'lib/utils'
import {
  assertGetEvmChainAdapter,
  buildAndBroadcast,
  getApproveContractData,
  getErc20Allowance,
  getFees,
  getSupportedEvmChainIds,
} from 'lib/utils/evm'
import { getInboundAddressDataForChain } from 'lib/utils/thorchain/getInboundAddressDataForChain'
import type { ThorchainBlock } from 'lib/utils/thorchain/lending/types'
import type { MidgardSwapHistoryResponse } from 'lib/utils/thorchain/lp/types'
import { thorchainLp } from 'pages/ThorChainLP/queries/queries'
import { isTradingActive } from 'state/apis/swapper/helpers'

// Current blocktime as per https://thorchain.network/stats
export const thorchainBlockTimeSeconds = '6.1'
const thorchainBlockTimeMs = bn(thorchainBlockTimeSeconds).times(1000).toNumber()

const common = createQueryKeys('common', {
  allowanceCryptoBaseUnit: (
    assetId: AssetId | undefined,
    spender: string | undefined,
    from: string | undefined,
  ) => ({
    queryKey: ['allowanceCryptoBaseUnit', assetId, spender, from],
    queryFn: async () => {
      if (!assetId) throw new Error('assetId is required')
      if (!spender) throw new Error('spender is required')
      if (!from) throw new Error('from address is required')

      const { chainId, assetReference } = fromAssetId(assetId)
      if (!isToken(assetReference)) return null
      const supportedEvmChainIds = getSupportedEvmChainIds()
      if (!supportedEvmChainIds.includes(chainId as KnownChainIds)) return null

      const allowanceOnChainCryptoBaseUnit = await getErc20Allowance({
        address: assetReference,
        spender,
        from,
        chainId,
      })

      return allowanceOnChainCryptoBaseUnit
    },
  }),
  isTradingActive: ({
    assetId,
    swapperName,
  }: {
    assetId: AssetId | undefined
    swapperName: SwapperName | undefined
  }) => ({
    queryKey: ['isTradingActive', assetId, swapperName],
    queryFn: async () => {
      if (!assetId) throw new Error('assetId is required')
      if (!swapperName) throw new Error('swapperName is required')

      const maybeIsTradingActive = await isTradingActive(assetId, swapperName)

      // Do not return things in a monadic way so that we can leverage native react-query error-handling
      if (maybeIsTradingActive.isErr()) throw maybeIsTradingActive.unwrapErr()
      return maybeIsTradingActive.unwrap()
    },
  }),
})

const mutations = createMutationKeys('mutations', {
  approve: ({
    assetId,
    spender,
    amount,
    wallet,
    from,
    accountNumber,
  }: {
    assetId: AssetId | undefined
    spender: string | undefined
    amount: string | undefined
    wallet: HDWallet | null
    from: string | undefined
    accountNumber: number | undefined
  }) => ({
    // note how we don't add the wallet here because of its non-serializable nature
    mutationKey: ['approve', { assetId, spender, amount, from }],
    mutationFn: async () => {
      if (!assetId) throw new Error('assetId is required')
      if (!spender) throw new Error('spender is required')
      if (!amount) throw new Error('amount is required')
      if (!from) throw new Error('from address is required')
      if (!wallet) throw new Error('wallet is required')
      if (accountNumber === undefined) throw new Error('accountNumber is required')

      const { assetReference, chainId } = fromAssetId(assetId)
      const approvalCalldata = getApproveContractData({
        approvalAmountCryptoBaseUnit: amount,
        spender,
        to: assetReference,
        chainId,
      })

      const adapter = assertGetEvmChainAdapter(chainId)

      const { networkFeeCryptoBaseUnit, ...fees } = await getFees({
        adapter,
        to: assetReference,
        value: '0',
        data: approvalCalldata,
        from,
        supportsEIP1559: supportsETH(wallet) && (await wallet.ethSupportsEIP1559()),
      })

      const buildCustomTxInput = {
        accountNumber,
        data: approvalCalldata,
        to: assetReference,
        value: '0',
        wallet,
        ...fees,
      }

      const txHash = await buildAndBroadcast({
        adapter,
        buildCustomTxInput,
        receiverAddress: CONTRACT_INTERACTION,
      })

      return txHash
    },
  }),
})
// Feature-agnostic, abstracts away midgard endpoints
const midgard = createQueryKeys('midgard', {
  swapsData: (assetId: AssetId | undefined, timeframe: '24h' | 'previous24h' | '7d') => ({
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
  inboundAddress: (assetId: AssetId | undefined) => {
    return {
      staleTime: 60_000, // 60 seconds to handle pools going to/from live/halt states
      queryKey: ['thorchainInboundAddress', assetId],
      queryFn: async () => {
        if (!assetId) throw new Error('assetId is required')
        const daemonUrl = getConfig().REACT_APP_THORCHAIN_NODE_URL
        const data = await getInboundAddressDataForChain(daemonUrl, assetId)

        return data
      },
    }
  },
})
export const reactQueries = mergeQueryKeys(common, mutations, midgard, thornode, thorchainLp)
