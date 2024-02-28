import { createMutationKeys, createQueryKeys, mergeQueryKeys } from '@lukemorales/query-key-factory'
import { type AssetId, fromAssetId } from '@shapeshiftoss/caip'
import type { EvmChainId } from '@shapeshiftoss/chain-adapters'
import { CONTRACT_INTERACTION, evmChainIds } from '@shapeshiftoss/chain-adapters'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import axios from 'axios'
import { getConfig } from 'config'
import type {
  InboundAddressResponse,
  MidgardPoolResponse,
  ThornodePoolResponse,
} from 'lib/swapper/swappers/ThorchainSwapper/types'
import { assetIdToPoolAssetId } from 'lib/swapper/swappers/ThorchainSwapper/utils/poolAssetHelpers/poolAssetHelpers'
import { thorService } from 'lib/swapper/swappers/ThorchainSwapper/utils/thorService'
import { assertGetChainAdapter } from 'lib/utils'
import {
  assertGetEvmChainAdapter,
  buildAndBroadcast,
  getApproveContractData,
  getErc20Allowance,
  getFees,
} from 'lib/utils/evm'
import type { ThorchainBlock, ThorchainMimir } from 'lib/utils/thorchain/lending/types'
import type {
  MidgardPoolStats,
  MidgardSwapHistoryResponse,
  MidgardTvlHistoryResponse,
} from 'lib/utils/thorchain/lp/types'
import { thorchainLp } from 'pages/ThorChainLP/queries/queries'

import { GetAllowanceErr } from './types'

const midgardUrl = getConfig().REACT_APP_MIDGARD_URL
const thornodeUrl = getConfig().REACT_APP_THORCHAIN_NODE_URL

const common = createQueryKeys('common', {
  allowanceCryptoBaseUnit: (
    assetId: AssetId | undefined,
    spender: string | undefined,
    from: string | undefined,
  ) => ({
    queryKey: ['allowanceCryptoBaseUnit', assetId, spender, from],
    queryFn: async (): Promise<Result<string, GetAllowanceErr>> => {
      if (!assetId) throw new Error('assetId is required')
      if (!spender) throw new Error('spender is required')
      if (!from) throw new Error('from address is required')

      const { chainId, assetReference } = fromAssetId(assetId)

      if (!evmChainIds.includes(chainId as EvmChainId)) {
        return Err(GetAllowanceErr.NotEVMChain)
      }

      // Asserts and makes the query error (i.e isError) if this errors - *not* a monadic error
      const adapter = assertGetChainAdapter(chainId)

      // No approval needed for selling a fee asset
      if (assetId === adapter.getFeeAssetId()) {
        return Err(GetAllowanceErr.IsFeeAsset)
      }

      const allowanceOnChainCryptoBaseUnit = await getErc20Allowance({
        address: assetReference,
        spender,
        from,
        chainId,
      })

      return Ok(allowanceOnChainCryptoBaseUnit)
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

type Period = 'all'
type Interval = '5min' | 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year'

// Feature-agnostic, abstracts away midgard endpoints
const midgard = createQueryKeys('midgard', {
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

// Feature-agnostic, abstracts away THORNode endpoints
const thornode = createQueryKeys('thornode', {
  poolData: (assetId: AssetId | undefined) => ({
    queryKey: ['thornodePoolData', assetId],
    queryFn: async () => {
      if (!assetId) throw new Error('assetId is required')

      const poolAssetId = assetIdToPoolAssetId({ assetId })
      const { data } = await axios.get<ThornodePoolResponse>(
        `${thornodeUrl}/lcd/thorchain/pool/${poolAssetId}`,
      )

      return data
    },
  }),
  poolsData: () => ({
    queryKey: ['thornodePoolsData'],
    queryFn: async () => {
      const poolResponse = await thorService.get<ThornodePoolResponse[]>(
        `${thornodeUrl}/lcd/thorchain/pools`,
      )

      if (poolResponse.isOk()) {
        return poolResponse.unwrap().data
      }

      return []
    },
  }),
  mimir: () => {
    return {
      queryKey: ['thorchainMimir'],
      queryFn: async () => {
        const { data } = await axios.get<ThorchainMimir>(`${thornodeUrl}/lcd/thorchain/mimir`)
        return data
      },
    }
  },
  block: () => {
    return {
      queryKey: ['thorchainBlockHeight'],
      queryFn: async () => {
        const { data } = await axios.get<ThorchainBlock>(`${thornodeUrl}/lcd/thorchain/block`)
        return data
      },
    }
  },
  inboundAddresses: () => {
    return {
      queryKey: ['thorchainInboundAddress'],
      queryFn: async () => {
        return (
          // Get all inbound addresses
          (
            await thorService.get<InboundAddressResponse[]>(
              `${thornodeUrl}/lcd/thorchain/inbound_addresses`,
            )
          ).andThen(({ data: inboundAddresses }) => {
            // Exclude halted
            const activeInboundAddresses = inboundAddresses.filter(a => !a.halted)
            return Ok(activeInboundAddresses)
          })
        )
      },
    }
  },
})

export const reactQueries = mergeQueryKeys(common, mutations, midgard, thornode, thorchainLp)
