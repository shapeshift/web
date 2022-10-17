import type { PayloadAction } from '@reduxjs/toolkit'
import { createSlice } from '@reduxjs/toolkit'
import { createApi } from '@reduxjs/toolkit/dist/query/react'
import { ethAssetId, foxAssetId } from '@shapeshiftoss/caip'
import { HistoryTimeframe } from '@shapeshiftoss/types'
import { Fetcher, Token } from '@uniswap/sdk'
import IUniswapV2Pair from '@uniswap/v2-core/build/IUniswapV2Pair.json'
import dayjs from 'dayjs'
import type { EarnOpportunityType } from 'features/defi/helpers/normalizeOpportunity'
import {
  foxEthLpAssetId,
  UNISWAP_V2_WETH_FOX_POOL_ADDRESS,
} from 'features/defi/providers/fox-eth-lp/constants'
import farmAbi from 'features/defi/providers/fox-farming/abis/farmingAbi.json'
import {
  calculateAPRFromToken0,
  getEthersProvider,
  makeTotalLpApr,
  rewardRatePerToken,
} from 'plugins/foxPage/utils'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { logger } from 'lib/logger'
import { BASE_RTK_CREATE_API_CONFIG } from 'state/apis/const'
import { marketData } from 'state/slices/marketDataSlice/marketDataSlice'

import { FOX_TOKEN_CONTRACT_ADDRESS, WETH_TOKEN_CONTRACT_ADDRESS } from './constants'
import { getOrCreateContract } from './contractManager'
import type { FoxEthLpEarnOpportunityType, FoxFarmingEarnOpportunityType } from './foxEthCommon'
import { farmingOpportunities, lpOpportunity } from './foxEthCommon'
import { fetchPairData } from './utils'

type FoxEthOpportunities = {
  farmingOpportunities: FoxFarmingEarnOpportunityType[]
  lpOpportunity: FoxEthLpEarnOpportunityType
}

type FoxEthState = Record<
  string, // accountAddress,
  FoxEthOpportunities
>

const initialState: FoxEthState = {}

const moduleLogger = logger.child({ namespace: ['foxEthSlice'] })

export const foxEth = createSlice({
  name: 'foxEth',
  initialState,
  reducers: {
    clear: () => initialState,
    upsertLpOpportunity: (state, action: PayloadAction<Partial<FoxEthLpEarnOpportunityType>>) => {
      if (action.payload.accountAddress && !state[action.payload.accountAddress]) {
        state[action.payload.accountAddress] = {} as FoxEthOpportunities
      }
      state[action.payload.accountAddress ?? ''].lpOpportunity = {
        ...lpOpportunity, // Shared LP properties
        ...(state[action.payload.accountAddress ?? '']?.lpOpportunity ?? {}),
        ...action.payload,
      }
    },
    upsertFarmingOpportunity: (
      state,
      action: PayloadAction<Partial<FoxFarmingEarnOpportunityType>>,
    ) => {
      // TODO: This is absolute immer madness 🤮 clean me before opening the PR
      const stateFarmingOpportunities =
        state[action.payload.accountAddress ?? '']?.farmingOpportunities ?? []

      const stateOpportunityIndex = (() => {
        const foundIndex = stateFarmingOpportunities.findIndex(
          opportunity => opportunity.contractAddress === action.payload.contractAddress,
        )

        return foundIndex < 0 ? stateFarmingOpportunities.length : foundIndex
      })()

      if (!state[action.payload.accountAddress ?? '']) {
        state[action.payload.accountAddress ?? ''] = {
          farmingOpportunities: [],
          lpOpportunity: {} as EarnOpportunityType,
        } as FoxEthOpportunities
      }

      if (!state[action.payload.accountAddress ?? ''].farmingOpportunities) {
        state[action.payload.accountAddress ?? ''].farmingOpportunities = []
      }
      const baseOpportunity =
        farmingOpportunities.find(
          opportunity => opportunity.contractAddress === action.payload.contractAddress ?? '',
        ) ?? {}
      state[action.payload.accountAddress ?? ''].farmingOpportunities[stateOpportunityIndex] = {
        ...baseOpportunity,
        ...(state[action.payload.accountAddress ?? '']?.farmingOpportunities?.[
          stateOpportunityIndex
        ] ?? {}),
        ...action.payload,
      }
    },
  },
})

type GetFoxEthLpMetricsReturn = {
  tvl: string
  apy: string
}

type GetFoxEthLpMetricsArgs = {
  accountAddress: string
}

type GetFoxEthLpAccountDataReturn = {
  underlyingFoxAmount: string
  underlyingEthAmount: string
  cryptoAmount: string
  fiatAmount: string
}

export type GetFoxFarmingContractMetricsReturn = {
  expired: boolean
} & GetFoxEthLpMetricsReturn

type GetFoxFarmingContractMetricsArgs = {
  accountAddress: string
  contractAddress: string
}

type GetFoxFarmingContractAccountDataReturn = {
  cryptoAmount: string
  fiatAmount: string
  unclaimedRewards: string
}

type GetFoxFarmingContractAccountDataArgs = {
  contractAddress: string
  accountAddress: string
}

type GetFoxEthLpAccountDataArgs = {
  accountAddress: string
}

export const foxEthApi = createApi({
  reducerPath: 'foxEthApi',
  ...BASE_RTK_CREATE_API_CONFIG,
  endpoints: build => ({
    getFoxEthLpMetrics: build.query<GetFoxEthLpMetricsReturn, GetFoxEthLpMetricsArgs>({
      queryFn: async ({ accountAddress }, injectedStore) => {
        try {
          const { getState, dispatch } = injectedStore
          const state: any = getState() // ReduxState causes circular dependency
          const ethPrecision = state.assets.byId[ethAssetId].precision
          const lpAssetPrecision = state.assets.byId[foxEthLpAssetId].precision
          const ethPrice = state.marketData.crypto.byId[ethAssetId].price
          const ethersProvider = getEthersProvider()
          const uniV2LPContract = getOrCreateContract(
            UNISWAP_V2_WETH_FOX_POOL_ADDRESS,
            IUniswapV2Pair.abi,
          )
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
          const data = { accountAddress, tvl, apy, isLoaded: true }
          dispatch(foxEth.actions.upsertLpOpportunity(data))
          return { data }
        } catch (err) {
          moduleLogger.error(err, 'getFoxEthLpMetrics')
          return {
            error: {
              error: 'LP metrics is not loaded',
              status: 'CUSTOM_ERROR',
            },
          }
        }
      },
    }),
    getFoxEthLpAccountData: build.query<GetFoxEthLpAccountDataReturn, GetFoxEthLpAccountDataArgs>({
      queryFn: async ({ accountAddress }, injectedStore) => {
        try {
          const { getState, dispatch } = injectedStore
          const state: any = getState() // ReduxState causes circular dependency\
          const ethPrecision = state.assets.byId[ethAssetId].precision
          const foxPrecision = state.assets.byId[foxAssetId].precision
          const lpAssetPrecision = state.assets.byId[foxEthLpAssetId].precision
          const lpTokenPrice = state.marketData.crypto.byId[foxEthLpAssetId].price
          const uniV2LPContract = getOrCreateContract(
            UNISWAP_V2_WETH_FOX_POOL_ADDRESS,
            IUniswapV2Pair.abi,
          )
          const balance = await uniV2LPContract.balanceOf(accountAddress)
          const cryptoAmount = bnOrZero(balance.toString()).div(bn(10).pow(lpAssetPrecision))
          const fiatAmount = cryptoAmount.times(lpTokenPrice).toFixed(2)
          const totalSupply = await uniV2LPContract.totalSupply()
          const reserves = await uniV2LPContract.getReserves()

          const userOwnershipOfPool = bnOrZero(balance.toString()).div(
            bnOrZero(totalSupply.toString()),
          )
          const underlyingEthAmount = userOwnershipOfPool
            .times(bnOrZero(reserves[0].toString()))
            .div(`1e${ethPrecision}`)
            .toString()
          const underlyingFoxAmount = userOwnershipOfPool
            .times(bnOrZero(reserves[1].toString()))
            .div(`1e${foxPrecision}`)
            .toString()

          const data = {
            underlyingFoxAmount,
            underlyingEthAmount,
            cryptoAmount: cryptoAmount.toString(),
            fiatAmount,
            accountAddress,
          }
          dispatch(foxEth.actions.upsertLpOpportunity(data))
          return { data }
        } catch (err) {
          moduleLogger.error(err, 'getFoxEthLpAccountData')
          return {
            error: {
              error: 'LP wallet data is not loaded',
              status: 'CUSTOM_ERROR',
            },
          }
        }
      },
    }),
    getFoxFarmingContractMetrics: build.query<
      GetFoxFarmingContractMetricsReturn,
      GetFoxFarmingContractMetricsArgs
    >({
      queryFn: async ({ accountAddress, contractAddress }, injectedStore) => {
        try {
          const { getState, dispatch } = injectedStore
          const state: any = getState() // ReduxState causes circular dependency
          const lpAssetPrecision = state.assets.byId[foxEthLpAssetId].precision
          const foxPrecision = state.assets.byId[foxAssetId].precision
          const ethPrecision = state.assets.byId[ethAssetId].precision
          const lpTokenPrice = state.marketData.crypto.byId[foxEthLpAssetId].price

          const ethersProvider = getEthersProvider()
          const foxFarmingContract = getOrCreateContract(contractAddress, farmAbi)
          const uniV2LPContract = getOrCreateContract(
            UNISWAP_V2_WETH_FOX_POOL_ADDRESS,
            IUniswapV2Pair.abi,
          )

          // tvl
          const totalSupply = await foxFarmingContract.totalSupply()
          const tvl = bnOrZero(totalSupply.toString())
            .div(bn(10).pow(lpAssetPrecision))
            .times(lpTokenPrice)
            .toFixed(2)

          // apr
          const foxRewardRatePerTokenV4 = await rewardRatePerToken(foxFarmingContract)
          const pair = await Fetcher.fetchPairData(
            new Token(0, WETH_TOKEN_CONTRACT_ADDRESS, ethPrecision),
            new Token(0, FOX_TOKEN_CONTRACT_ADDRESS, foxPrecision),
            ethersProvider,
          )

          const totalSupplyV2 = await uniV2LPContract.totalSupply()

          const token1PoolReservesEquivalent = bnOrZero(pair.reserve1.toFixed())
            .times(2) // Double to get equivalent of both sides of pool
            .times(bn(10).pow(pair.token1.decimals)) // convert to base unit value

          const foxEquivalentPerLPToken = token1PoolReservesEquivalent
            .div(bnOrZero(totalSupplyV2.toString()))
            .times(bn(10).pow(pair.token1.decimals)) // convert to base unit value
            .toString()
          const apy = bnOrZero(makeTotalLpApr(foxRewardRatePerTokenV4, foxEquivalentPerLPToken))
            .div(100)
            .toString()

          // expired
          let expired = false
          const timeStamp = await foxFarmingContract.periodFinish()
          if (timeStamp.toNumber() === 0) {
            expired = false
          } else {
            expired = dayjs().isAfter(dayjs.unix(timeStamp.toNumber()))
          }
          const data = {
            accountAddress,
            tvl,
            expired,
            apy,
            isLoaded: true,
            contractAddress,
          }
          dispatch(foxEth.actions.upsertFarmingOpportunity(data))
          return { data }
        } catch (err) {
          moduleLogger.error(err, 'getFoxFarmingContractMetrics')
          return {
            error: {
              error: 'Fox farming metrics is not loaded',
              status: 'CUSTOM_ERROR',
            },
          }
        }
      },
    }),
    getFoxFarmingContractAccountData: build.query<
      GetFoxFarmingContractAccountDataReturn,
      GetFoxFarmingContractAccountDataArgs
    >({
      queryFn: async ({ contractAddress, accountAddress }, injectedStore) => {
        try {
          const { getState, dispatch } = injectedStore
          const state: any = getState() // ReduxState causes circular dependency
          const lpAssetPrecision = state.assets.byId[foxEthLpAssetId].precision
          const foxPrecision = state.assets.byId[foxAssetId].precision
          const lpTokenPrice = state.marketData.crypto.byId[foxEthLpAssetId].price

          const foxFarmingContract = getOrCreateContract(contractAddress, farmAbi)

          const stakedBalance = await foxFarmingContract.balanceOf(accountAddress)
          const unclaimedRewards = await foxFarmingContract.earned(accountAddress)
          const balance = bnOrZero(stakedBalance.toString())
            .div(bn(10).pow(lpAssetPrecision))
            .toString()
          const rewards = bnOrZero(unclaimedRewards.toString())
            .div(bn(10).pow(foxPrecision))
            .toString()

          const data = {
            cryptoAmount: balance,
            fiatAmount: bnOrZero(balance).times(lpTokenPrice).toString(),
            unclaimedRewards: rewards,
            contractAddress,
            accountAddress,
          }

          dispatch(foxEth.actions.upsertFarmingOpportunity(data))
          return { data }
        } catch (err) {
          moduleLogger.error(err, 'getFoxFarmingContractAccountData')
          return {
            error: {
              error: 'Fox farming wallet data is not loaded',
              status: 'CUSTOM_ERROR',
            },
          }
        }
      },
    }),
  }),
})

export const {
  useGetFoxEthLpMetricsQuery,
  useGetFoxEthLpAccountDataQuery,
  useGetFoxFarmingContractMetricsQuery,
  useGetFoxFarmingContractAccountDataQuery,
} = foxEthApi
