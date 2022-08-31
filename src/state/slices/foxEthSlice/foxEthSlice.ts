import { Contract } from '@ethersproject/contracts'
import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { createApi } from '@reduxjs/toolkit/dist/query/react'
import { ethAssetId } from '@shapeshiftoss/caip'
import { HistoryTimeframe } from '@shapeshiftoss/types'
import { Fetcher, Token } from '@uniswap/sdk'
import IUniswapV2Pair from '@uniswap/v2-core/build/IUniswapV2Pair.json'
import dayjs from 'dayjs'
import {
  foxAssetId,
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
import {
  farmOpportunities,
  FoxEthLpEarnOpportunityType,
  FoxFarmingEarnOpportunityType,
  lpOpportunity,
} from './foxEthCommon'
import { fetchPairData } from './utils'

type FoxEthState = {
  farmOpportunities: FoxFarmingEarnOpportunityType[]
  lpOpportunity: FoxEthLpEarnOpportunityType
}

const initialState: FoxEthState = {
  farmOpportunities,
  lpOpportunity,
}

const moduleLogger = logger.child({ namespace: ['foxEthSlice'] })

export const foxEth = createSlice({
  name: 'foxEth',
  initialState,
  reducers: {
    clear: () => initialState,
    upsertLpOpportunity: (state, action: PayloadAction<Partial<FoxEthLpEarnOpportunityType>>) => {
      state.lpOpportunity = {
        ...state.lpOpportunity,
        ...action.payload,
      }
    },
    upsertFarmingOpportunity: (
      state,
      action: PayloadAction<Partial<FoxFarmingEarnOpportunityType>>,
    ) => {
      const stateOpportunityIndex = state.farmOpportunities.findIndex(
        opportunity => opportunity.contractAddress === action.payload.contractAddress,
      )
      state.farmOpportunities[stateOpportunityIndex] = {
        ...state.farmOpportunities[stateOpportunityIndex],
        ...action.payload,
      }
    },
  },
})

type GetFoxEthLpGeneralDataReturn = {
  tvl: string
  apy: string
}
type GetFoxEthLpWalletDataReturn = {
  underlyingFoxAmount: string
  underlyingEthAmount: string
  cryptoAmount: string
  fiatAmount: string
}

type GetFoxFarmingContractGeneralDataReturn = {
  expired: boolean
} & GetFoxEthLpGeneralDataReturn

type GetFoxFarmingContractGeneralDataArgs = {
  contractAddress: string
}

type GetFoxFarmingContractWalletDataReturn = {
  cryptoAmount: string
  fiatAmount: string
  unclaimedRewards: string
}

type GetFoxFarmingContractWalletDataArgs = {
  contractAddress: string
  ethWalletAddress: string
}

type GetFoxEthLpWalletDataArgs = {
  ethWalletAddress: string
}

export const foxEthApi = createApi({
  reducerPath: 'foxEthApi',
  ...BASE_RTK_CREATE_API_CONFIG,
  endpoints: build => ({
    getFoxEthLpGeneralData: build.query<GetFoxEthLpGeneralDataReturn, void>({
      queryFn: async (_args, injectedStore) => {
        try {
          const { getState, dispatch } = injectedStore
          const state: any = getState() // ReduxState causes circular dependency
          const ethPrecision = state.assets.byId[ethAssetId].precision
          const lpAssetPrecision = state.assets.byId[foxEthLpAssetId].precision
          const ethPrice = state.marketData.crypto.byId[ethAssetId].price
          const ethersProvider = getEthersProvider()
          const uniV2LPContract = new Contract(
            UNISWAP_V2_WETH_FOX_POOL_ADDRESS,
            IUniswapV2Pair.abi,
            ethersProvider,
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
          const data = { tvl, apy, isLoaded: true }
          dispatch(foxEth.actions.upsertLpOpportunity(data))
          return { data }
        } catch (err) {
          moduleLogger.error(err, 'getFoxEthLpGeneralData')
          return {
            error: {
              error: 'LP general data is not loaded',
              status: 'CUSTOM_ERROR',
            },
          }
        }
      },
    }),
    getFoxEthLpWalletData: build.query<GetFoxEthLpWalletDataReturn, GetFoxEthLpWalletDataArgs>({
      queryFn: async ({ ethWalletAddress }, injectedStore) => {
        try {
          const { getState, dispatch } = injectedStore
          const state: any = getState() // ReduxState causes circular dependency\
          const ethPrecision = state.assets.byId[ethAssetId].precision
          const foxPrecision = state.assets.byId[foxAssetId].precision
          const lpAssetPrecision = state.assets.byId[foxEthLpAssetId].precision
          const lpTokenPrice = state.marketData.crypto.byId[foxEthLpAssetId].price
          const ethersProvider = getEthersProvider()
          const uniV2LPContract = new Contract(
            UNISWAP_V2_WETH_FOX_POOL_ADDRESS,
            IUniswapV2Pair.abi,
            ethersProvider,
          )
          const balance = await uniV2LPContract.balanceOf(ethWalletAddress)
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
          }
          dispatch(foxEth.actions.upsertLpOpportunity(data))
          return { data }
        } catch (err) {
          moduleLogger.error(err, 'getFoxEthLpWalletData')
          return {
            error: {
              error: 'LP wallet data is not loaded',
              status: 'CUSTOM_ERROR',
            },
          }
        }
      },
    }),
    getFoxFarmingContractGeneralData: build.query<
      GetFoxFarmingContractGeneralDataReturn,
      GetFoxFarmingContractGeneralDataArgs
    >({
      queryFn: async ({ contractAddress }, injectedStore) => {
        try {
          const { getState, dispatch } = injectedStore
          const state: any = getState() // ReduxState causes circular dependency
          const lpAssetPrecision = state.assets.byId[foxEthLpAssetId].precision
          const foxPrecision = state.assets.byId[foxAssetId].precision
          const ethPrecision = state.assets.byId[ethAssetId].precision
          const lpTokenPrice = state.marketData.crypto.byId[foxEthLpAssetId].price

          const ethersProvider = getEthersProvider()
          const foxFarmingContract = new Contract(contractAddress, farmAbi, ethersProvider)
          const uniV2LPContract = new Contract(
            UNISWAP_V2_WETH_FOX_POOL_ADDRESS,
            IUniswapV2Pair.abi,
            ethersProvider,
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
            tvl,
            expired,
            apy,
            isLoaded: true,
            contractAddress,
          }
          dispatch(foxEth.actions.upsertFarmingOpportunity(data))
          return { data }
        } catch (err) {
          moduleLogger.error(err, 'getFoxFarmingContractGeneralData')
          return {
            error: {
              error: 'Fox farming general data is not loaded',
              status: 'CUSTOM_ERROR',
            },
          }
        }
      },
    }),
    getFoxFarmingContractWalletData: build.query<
      GetFoxFarmingContractWalletDataReturn,
      GetFoxFarmingContractWalletDataArgs
    >({
      queryFn: async ({ contractAddress, ethWalletAddress }, injectedStore) => {
        try {
          const { getState, dispatch } = injectedStore
          const state: any = getState() // ReduxState causes circular dependency
          const lpAssetPrecision = state.assets.byId[foxEthLpAssetId].precision
          const foxPrecision = state.assets.byId[foxAssetId].precision
          const lpTokenPrice = state.marketData.crypto.byId[foxEthLpAssetId].price

          const ethersProvider = getEthersProvider()
          const foxFarmingContract = new Contract(contractAddress, farmAbi, ethersProvider)

          const stakedBalance = await foxFarmingContract.balanceOf(ethWalletAddress)
          const unclaimedRewards = await foxFarmingContract.earned(ethWalletAddress)
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
          }
          dispatch(foxEth.actions.upsertFarmingOpportunity(data))
          return { data }
        } catch (err) {
          moduleLogger.error(err, 'getFoxFarmingContractWalletData')
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

export const { useGetFoxEthLpGeneralDataQuery, useGetFoxFarmingContractGeneralDataQuery } =
  foxEthApi
