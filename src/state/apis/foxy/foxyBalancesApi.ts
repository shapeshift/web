import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/dist/query/react'
import { AssetId, ChainId, toAssetId } from '@shapeshiftoss/caip'
import { DefiType, FoxyApi, WithdrawInfo } from '@shapeshiftoss/investor-foxy'
import { KnownChainIds } from '@shapeshiftoss/types'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { BigNumber, BN, bn, bnOrZero } from 'lib/bignumber/bignumber'
import { logger } from 'lib/logger'
import { AssetsById } from 'state/slices/assetsSlice/assetsSlice'
import { PortfolioBalancesById } from 'state/slices/portfolioSlice/portfolioSliceCommon'
import {
  selectAssets,
  selectMarketData,
  selectPortfolioAssetBalances,
  selectPortfolioLoading,
} from 'state/slices/selectors'

import { getFoxyApi } from './foxyApiSingleton'

type InputArgs = {
  supportsEthereumChain: boolean
  userAddress: string | null
  foxyApr: string | null
}
type OutputArgs = {
  opportunities: MergedFoxyOpportunity[]
  totalBalance: string
}

export type FoxyOpportunity = {
  type: DefiType
  provider: string
  version: string
  contractAddress: string
  rewardToken: string
  stakingToken: string
  chainId: ChainId
  tvl?: string
  expired?: boolean
  apy?: string
  balance: string
  contractAssetId: AssetId
  tokenAssetId: AssetId
  rewardTokenAssetId: AssetId
  pricePerShare: string
  withdrawInfo: WithdrawInfo
}

export type MergedFoxyOpportunity = FoxyOpportunity & {
  cryptoAmount: string
  fiatAmount: string
}

const moduleLogger = logger.child({
  namespace: ['state', 'apis', 'foxy', 'UseFoxyBalances'],
})

const makeFiatAmount = (opportunity: FoxyOpportunity, assets: any, marketData: any) => {
  const asset = assets[opportunity.tokenAssetId]
  const pricePerShare = bnOrZero(opportunity.pricePerShare).div(`1e+${asset?.precision}`)
  const marketPrice = marketData[opportunity.tokenAssetId]?.price
  return bnOrZero(opportunity.balance)
    .div(`1e+${asset?.precision}`)
    .times(pricePerShare)
    .times(bnOrZero(marketPrice))
}

const makeTotalBalance = (
  opportunities: Record<string, FoxyOpportunity>,
  assets: AssetsById,
  marketData: any,
): BN =>
  Object.values(opportunities).reduce((acc: BigNumber, opportunity: FoxyOpportunity) => {
    const amount = makeFiatAmount(opportunity, assets, marketData)
    return acc.plus(bnOrZero(amount))
  }, bn(0))

const makeMergedOpportunities = (
  opportunities: Record<string, FoxyOpportunity>,
  assets: AssetsById,
  marketData: any,
) =>
  Object.values(opportunities).map(opportunity => {
    const asset = assets[opportunity.tokenAssetId]
    const fiatAmount = makeFiatAmount(opportunity, assets, marketData)
    const marketPrice = marketData[opportunity.tokenAssetId]?.price ?? 0
    const tvl = bnOrZero(opportunity.tvl)
      .div(`1e+${asset?.precision}`)
      .times(marketPrice)
      .toString()
    const data = {
      ...opportunity,
      tvl,
      cryptoAmount: bnOrZero(opportunity.balance).div(`1e+${asset?.precision}`).toString(),
      fiatAmount: fiatAmount.toString(),
    }
    return data
  })

async function getFoxyOpportunities(
  balances: PortfolioBalancesById,
  api: FoxyApi,
  userAddress: string,
  foxyApr: string,
) {
  const acc: Record<string, FoxyOpportunity> = {}
  try {
    const opportunities = await api.getFoxyOpportunities()
    for (let index = 0; index < opportunities.length; index++) {
      // TODO: assetIds in vaults
      const opportunity = opportunities[index]
      const withdrawInfo = await api.getWithdrawInfo({
        contractAddress: opportunity.contractAddress,
        userAddress,
      })
      const rewardTokenAssetId = toAssetId({
        chainId: opportunity.chain,
        assetNamespace: 'erc20',
        assetReference: opportunity.rewardToken,
      })
      const contractAssetId = toAssetId({
        chainId: opportunity.chain,
        assetNamespace: 'erc20',
        assetReference: opportunity.contractAddress,
      })
      const tokenAssetId = toAssetId({
        chainId: opportunity.chain,
        assetNamespace: 'erc20',
        assetReference: opportunity.stakingToken,
      })
      const balance = balances[rewardTokenAssetId]

      const pricePerShare = api.pricePerShare()
      acc[opportunity.contractAddress] = {
        ...opportunity,
        tvl: opportunity.tvl.toString(),
        apy: foxyApr,
        chainId: opportunity.chain,
        balance: bnOrZero(balance).toString(),
        contractAssetId,
        tokenAssetId,
        rewardTokenAssetId,
        pricePerShare: bnOrZero(pricePerShare).toString(),
        withdrawInfo,
      }
    }
    return acc
  } catch (e) {
    moduleLogger.error(e, { fn: 'getFoxyOpportunities' }, 'Error getting opportunities')
    return acc
  }
}

export const foxyBalancesApi = createApi({
  reducerPath: 'foxyBalancesApi',
  // not actually used, only used to satisfy createApi, we use a custom queryFn
  baseQuery: fetchBaseQuery({ baseUrl: '/' }),
  // refetch if network connection is dropped, useful for mobile
  refetchOnReconnect: true,
  endpoints: build => ({
    getFoxyBalances: build.query<OutputArgs, InputArgs>({
      queryFn: async ({ supportsEthereumChain, userAddress, foxyApr }, injected) => {
        const chainAdapterManager = getChainAdapterManager()
        if (!chainAdapterManager.has(KnownChainIds.EthereumMainnet))
          return {
            error: {
              data: `EthereumChainAdapter not found in chainAdapterManager`,
              status: 400,
            },
          }

        const { getState } = injected
        const state: any = getState() // ReduxState causes circular dependency

        if (!supportsEthereumChain || !userAddress || !foxyApr) {
          return {
            error: {
              data: 'Not ready args',
              status: '400',
            },
          }
        }

        const balancesLoading = selectPortfolioLoading(state)

        if (balancesLoading)
          return {
            error: {
              data: 'Portfolio balances not loaded',
              status: '400',
            },
          }

        const foxy = getFoxyApi()

        const marketData = selectMarketData(state)
        const assets = selectAssets(state)
        const balances = selectPortfolioAssetBalances(state)

        try {
          const foxyOpportunities = await getFoxyOpportunities(
            balances,
            foxy,
            userAddress,
            foxyApr ?? '',
          )

          const totalBalance = makeTotalBalance(foxyOpportunities, assets, marketData)
          const mergedOpportunities = makeMergedOpportunities(foxyOpportunities, assets, marketData)

          return {
            error: null,
            data: {
              opportunities: mergedOpportunities,
              totalBalance: totalBalance.toString(),
            },
          }
        } catch (error) {
          console.error('error', error)
          return {
            error: {
              data: `foxyBalancesAPI Error`,
              status: 400,
            },
          }
        }
      },
    }),
  }),
})

export const { useGetFoxyBalancesQuery } = foxyBalancesApi
