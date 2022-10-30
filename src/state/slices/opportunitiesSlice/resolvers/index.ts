import type { BaseQueryApi } from '@reduxjs/toolkit/dist/query/baseQueryTypes'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import { ethAssetId } from '@shapeshiftoss/caip'
import { bnOrZero } from '@shapeshiftoss/investor-foxy'
import type { MarketData } from '@shapeshiftoss/types'
import { HistoryTimeframe } from '@shapeshiftoss/types'
import { Fetcher, Token } from '@uniswap/sdk'
import IUniswapV2Pair from '@uniswap/v2-core/build/IUniswapV2Pair.json'
import { DefiProvider, DefiType } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import pipe from 'lodash/flow'
import { getEthersProvider } from 'plugins/foxPage/utils'
import { calculateAPRFromToken0 } from 'plugins/foxPage/utils'
import type { ReduxState } from 'state/reducer'

import type { AssetsState } from '../../assetsSlice/assetsSlice'
import {
  FOX_TOKEN_CONTRACT_ADDRESS,
  WETH_TOKEN_CONTRACT_ADDRESS,
} from '../../foxEthSlice/constants'
import { getOrCreateContract } from '../../foxEthSlice/contractManager'
import { fetchPairData } from '../../foxEthSlice/utils'
import { marketData } from '../../marketDataSlice/marketDataSlice'
import { selectPortfolioLoadingStatusGranular } from '../../portfolioSlice/selectors'
import { selectMarketDataById } from '../../selectors'
import { selectPortfolioAccountBalances } from '../../selectors'
import { foxEthPair } from '../constants'
import { foxEthLpAssetId } from '../constants'
import type { LpId } from '../opportunitiesSlice'
import type { StakingId } from '../opportunitiesSlice'

type ReduxApi = Pick<BaseQueryApi, 'dispatch' | 'getState'>

type IDefiProviderToMetadataResolverByDeFiType = {
  [key in DefiProvider]: {
    [key in DefiType]: (args: any) => Promise<any>
  }
}
export const DefiProviderToMetadataResolverByDeFiType = {
  [DefiProvider.FoxFarming]: {
    [DefiType.LiquidityPool]: async ({
      opportunityId,
      opportunityType,
      reduxApi,
    }: {
      opportunityId: LpId | StakingId
      opportunityType: 'lp' | 'staking'
      reduxApi: ReduxApi
    }) => {
      const { dispatch, getState } = reduxApi
      // TODO: protocol agnostic, this is EVM specific
      const { assetReference: contractAddress } = fromAssetId(opportunityId as AssetId) // TODO: abstract me, for EVM LPs an opportunity is an AccountId, but not always true for others
      const state: any = getState() // ReduxState causes circular dependency
      const assets: AssetsState = state.assets
      const ethMarketData: MarketData = selectMarketDataById(state, ethAssetId)

      if (!ethMarketData?.price) {
        throw new Error(`Market data not ready for ${ethAssetId}`)
      }

      const ethPrecision = assets.byId[ethAssetId].precision
      const lpAssetPrecision = assets.byId[foxEthLpAssetId].precision
      const ethPrice = ethMarketData.price
      const ethersProvider = getEthersProvider()
      const uniV2LPContract = getOrCreateContract(contractAddress, IUniswapV2Pair.abi)
      const pair = await fetchPairData(
        new Token(0, WETH_TOKEN_CONTRACT_ADDRESS, 18),
        new Token(0, FOX_TOKEN_CONTRACT_ADDRESS, 18),
        Fetcher.fetchPairData,
        ethersProvider,
      )

      const blockNumber = await ethersProvider.getBlockNumber()

      const calculatedApy = await calculateAPRFromToken0({
        token0Decimals: pair.token0.decimals,
        token0Reserves: pair.reserve0,
        blockNumber,
        uniswapLPContract: uniV2LPContract,
      })
      const apy = bnOrZero(calculatedApy).div(100).toString()
      const reserves = await uniV2LPContract.getReserves()
      // Amount of Eth in liquidity pool
      const ethInReserve = bnOrZero(reserves?.[0]?.toString()).div(`1e${ethPrecision}`)

      // Total market cap of liquidity pool in usdc.
      // Multiplied by 2 to show equal amount of eth and fox.
      const totalLiquidity = ethInReserve.times(ethPrice).times(2)
      const tvl = totalLiquidity.toString()
      const totalSupply = await uniV2LPContract.totalSupply()
      const price = bnOrZero(tvl)
        .div(bnOrZero(totalSupply.toString()).div(`1e${lpAssetPrecision}`))
        .toString()
      const lpMarketData = {
        [foxEthLpAssetId]: { price, marketCap: '0', volume: '0', changePercent24Hr: 0 },
      }
      // hacks for adding lp price and price history
      dispatch(marketData.actions.setCryptoMarketData(lpMarketData))
      Object.values(HistoryTimeframe).forEach(timeframe => {
        dispatch(
          marketData.actions.setCryptoPriceHistory({
            data: [{ price: bnOrZero(price).toNumber(), date: 0 }],
            args: { timeframe, assetId: foxEthLpAssetId },
          }),
        )
      })

      const data = {
        metadata: {
          [opportunityId]: {
            apy,
            assetId: opportunityId,
            provider: DefiProvider.FoxEthLP,
            tvl,
            type: DefiType.LiquidityPool,
            underlyingAssetIds: foxEthPair,
          },
        },
        type: opportunityType,
      }

      return { data }
    },
  },
} as IDefiProviderToMetadataResolverByDeFiType

// "Give me the resolvers for a given DeFi provider"
export const getDefiProviderMetadataResolvers = (defiProvider: DefiProvider) =>
  DefiProviderToDataResolverByDeFiType[defiProvider]
// "Give me the resolvers for a given DeFi type"
export const getDefiTypeMetadataResolvers = (
  defiType: DefiType,
  resolversByType: ReturnType<typeof getDefiProviderUserDataResolvers>,
) => resolversByType[defiType]

export const getMetadataResolversByDefiProviderAndDefiType = (
  defiProvider: DefiProvider,
  defiType: DefiType,
) =>
  pipe(
    getDefiProviderMetadataResolvers,
    getDefiTypeMetadataResolvers.bind(this, defiType),
  )(defiProvider)

type IDefiProviderToDataResolverByDeFiType = {
  [key in DefiProvider]: {
    [key in DefiType]: (args: any) => Promise<any>
  }
}

export const DefiProviderToDataResolverByDeFiType = {
  [DefiProvider.FoxFarming]: {
    [DefiType.LiquidityPool]: async ({
      opportunityId,
      // @ts-ignore, we'll need this for farming - maybe make this an object not to deal with arity?
      opportunityType: _opportunityType,
      accountId,
      reduxApi,
    }: {
      opportunityId: LpId | StakingId
      // @ts-ignore, we'll need this for farming - maybe make this an object not to deal with arity?
      opportunityType: 'lp' | 'staking'
      accountId: AccountId
      reduxApi: ReduxApi
    }) => {
      const { getState } = reduxApi
      const state: ReduxState = getState() as any
      const portfolioLoadingStatusGranular = selectPortfolioLoadingStatusGranular(state)
      if (portfolioLoadingStatusGranular[accountId] === 'loading')
        throw new Error(`Portfolio data not loaded for ${accountId}`)

      const balances = selectPortfolioAccountBalances(state)

      return { data: balances[accountId][opportunityId as AssetId] }
    },
  },
} as IDefiProviderToDataResolverByDeFiType

// "Give me the resolvers for a given DeFi provider"
export const getDefiProviderUserDataResolvers = (defiProvider: DefiProvider) =>
  DefiProviderToDataResolverByDeFiType[defiProvider]
// "Give me the resolvers for a given DeFi type"
export const getDefiTypeUserDataResolvers = (
  defiType: DefiType,
  resolversByType: ReturnType<typeof getDefiProviderUserDataResolvers>,
) => resolversByType[defiType]

// TODO: create a foxfarming folder and curry me
export const getUserDataResolversByDefiProviderAndDefiType = (
  defiProvider: DefiProvider,
  defiType: DefiType,
) =>
  pipe(
    getDefiProviderUserDataResolvers,
    getDefiTypeUserDataResolvers.bind(this, defiType),
  )(defiProvider)
