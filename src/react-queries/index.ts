import { createMutationKeys, createQueryKeys, mergeQueryKeys } from '@lukemorales/query-key-factory'
import type { AccountId } from '@shapeshiftoss/caip'
import {
  type AssetId,
  avalancheChainId,
  bchChainId,
  bscChainId,
  btcChainId,
  cosmosChainId,
  dogeChainId,
  fromAccountId,
  fromAssetId,
  ltcChainId,
} from '@shapeshiftoss/caip'
import type { EvmChainId } from '@shapeshiftoss/chain-adapters'
import { CONTRACT_INTERACTION, evmChainIds } from '@shapeshiftoss/chain-adapters'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import axios from 'axios'
import { getConfig } from 'config'
import type { MidgardPoolResponse } from 'lib/swapper/swappers/ThorchainSwapper/types'
import { assertGetChainAdapter } from 'lib/utils'
import {
  assertGetEvmChainAdapter,
  buildAndBroadcast,
  getApproveContractData,
  getErc20Allowance,
  getFees,
} from 'lib/utils/evm'
import type {
  MidgardPoolStats,
  MidgardSwapHistoryResponse,
  MidgardTvlHistoryResponse,
} from 'lib/utils/thorchain/lp/types'
import { thorchainLp } from 'pages/ThorChainLP/queries/queries'
import {
  fetchAllOpportunitiesIdsByChainId,
  fetchAllOpportunitiesMetadataByChainId,
  fetchAllOpportunitiesUserDataByAccountId,
} from 'state/slices/opportunitiesSlice/thunks'
import type { PortfolioAccount } from 'state/slices/portfolioSlice/portfolioSliceCommon'
import type { PortfolioLoadingStatus } from 'state/slices/selectors'
import type { AppDispatch } from 'state/store'

import { thornode } from './queries/thornode'
import { GetAllowanceErr } from './types'

const midgardUrl = getConfig().REACT_APP_MIDGARD_URL

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

const opportunities = createQueryKeys('opportunities', {
  all: (
    dispatch: AppDispatch,
    requestedAccountIds: AccountId[],
    portfolioAssetIds: AssetId[],
    portfolioAccounts: Record<AccountId, PortfolioAccount>,
    portfolioLoadingStatus: PortfolioLoadingStatus,
  ) => {
    return {
      queryKey: ['allOpportunities', { requestedAccountIds, portfolioAssetIds, portfolioAccounts }],
      queryFn: async () => {
        await Promise.all(
          requestedAccountIds.map(async accountId => {
            const { chainId } = fromAccountId(accountId)
            switch (chainId) {
              case btcChainId:
              case ltcChainId:
              case dogeChainId:
              case bchChainId:
              case cosmosChainId:
              case bscChainId:
              case avalancheChainId:
                await fetchAllOpportunitiesIdsByChainId(dispatch, chainId)
                await fetchAllOpportunitiesMetadataByChainId(dispatch, chainId)
                await fetchAllOpportunitiesUserDataByAccountId(dispatch, accountId)
                break
              default:
                break
            }
          }),
        )

        // We *have* to return a value other than undefined from react-query queries, see
        // https://tanstack.com/query/v4/docs/react/guides/migrating-to-react-query-4#undefined-is-an-illegal-cache-value-for-successful-queries
        return null
      },
      enabled: portfolioLoadingStatus !== 'loading' && requestedAccountIds.length > 0,
      staleTime: Infinity,
      gcTime: Infinity,
    }
  },
})

export const reactQueries = mergeQueryKeys(
  common,
  mutations,
  midgard,
  thornode,
  thorchainLp,
  opportunities,
)
