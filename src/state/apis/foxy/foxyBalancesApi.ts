import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/dist/query/react'
import { AssetId, ChainId, toAssetId } from '@shapeshiftoss/caip'
import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import { DefiType, FoxyApi, WithdrawInfo } from '@shapeshiftoss/investor-foxy'
import { KnownChainIds } from '@shapeshiftoss/types'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { BigNumber, bn, bnOrZero } from 'lib/bignumber/bignumber'
import { logger } from 'lib/logger'
import {
  selectAssets,
  selectMarketData,
  selectPortfolioAssetBalances,
} from 'state/slices/selectors'

type InputArgs = {
  wallet: any
  foxy: any
  foxyApr: any
}
type OutputArgs = Record<string, FoxyOpportunity>

export type FoxyOpportunity = {
  type: DefiType
  provider: string
  version: string
  contractAddress: string
  rewardToken: string
  stakingToken: string
  chainId: ChainId
  tvl?: BigNumber
  expired?: boolean
  apy?: string
  balance: string
  contractAssetId: AssetId
  tokenAssetId: AssetId
  rewardTokenAssetId: AssetId
  pricePerShare: BigNumber
  withdrawInfo: WithdrawInfo
}

export type MergedFoxyOpportunity = FoxyOpportunity & {
  cryptoAmount: string
  fiatAmount: string
}

// DITCHME: We don't use a hook anymore
export type UseFoxyBalancesReturn = {
  opportunities: MergedFoxyOpportunity[]
  totalBalance: string
  loading: boolean
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

const makeTotalBalance = (opportunities: any, assets: any, marketData: any) =>
  Object.values(opportunities).reduce((acc: BigNumber, opportunity: FoxyOpportunity) => {
    const amount = makeFiatAmount(opportunity, assets, marketData)
    return acc.plus(bnOrZero(amount))
  }, bn(0))

const makeMergedOpportunities = (opportunities: any, assets: any, marketData: any) =>
  Object.values(opportunities).map(opportunity => {
    const asset = assets[opportunity.tokenAssetId]
    const fiatAmount = makeFiatAmount(opportunity, assets, marketData)
    const marketPrice = marketData[opportunity.tokenAssetId]?.price ?? 0
    const tvl = bnOrZero(opportunity.tvl).div(`1e+${asset?.precision}`).times(marketPrice)
    const data = {
      ...opportunity,
      tvl,
      cryptoAmount: bnOrZero(opportunity.balance).div(`1e+${asset?.precision}`).toString(),
      fiatAmount: fiatAmount.toString(),
    }
    return data
  })

async function getFoxyOpportunities(
  balances: any, // PortfolioBalancesById,
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
        apy: foxyApr,
        chainId: opportunity.chain,
        balance: bnOrZero(balance).toString(),
        contractAssetId,
        tokenAssetId,
        rewardTokenAssetId,
        pricePerShare: bnOrZero(pricePerShare),
        withdrawInfo,
      }
    }
    return acc
  } catch (e) {
    moduleLogger.error(e, { fn: 'getFoxyOpportunities' }, 'Error getting opportunities')
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
      queryFn: async ({ wallet, foxy, foxyApr }, injected) => {
        debugger
        const supportsEthereumChain = supportsETH(wallet)

        if (!wallet || !supportsEthereumChain || !foxy || !foxyApr) {
          return {
            error: {
              data: '',
              status: 'Not ready args',
            },
          }
        }

        console.info('########### foxyBalancesAPI requesting ##########')
        const { getState } = injected
        const state: any = getState() // ReduxState causes circular dependency
        const marketData = selectMarketData(state)
        const assets = selectAssets(state)
        const chainAdapterManager = getChainAdapterManager()
        const balances = selectPortfolioAssetBalances(state)

        try {
          const chainAdapter = await chainAdapterManager.get(KnownChainIds.EthereumMainnet)
          if (!chainAdapter) return
          const userAddress = await chainAdapter.getAddress({ wallet })
          const foxyOpportunities = await getFoxyOpportunities(
            balances,
            foxy,
            userAddress,
            foxyApr ?? '',
          )
          if (!foxyOpportunities) return

          opportunities = foxyOpportunities
          const totalBalance = makeTotalBalance(opportunities, assets, marketData)
          const mergedOpportunities = makeMergedOpportunities(opportunities, assets, marketData)

          return {
            data: {
              opportunities: mergedOpportunities,
              totalBalance: totalBalance.toString(),
            },
          }
          // TODO: mid-fn error handling
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
