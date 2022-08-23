import { Contract } from '@ethersproject/contracts'
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/dist/query/react'
import { ethAssetId } from '@shapeshiftoss/caip'
import { MarketData } from '@shapeshiftoss/types'
import { Fetcher, Token } from '@uniswap/sdk'
import IUniswapV2Pair from '@uniswap/v2-core/build/IUniswapV2Pair.json'
import dayjs from 'dayjs'
import {
  foxAssetId,
  foxEthLpAssetId,
  UNISWAP_V2_WETH_FOX_POOL_ADDRESS,
} from 'features/defi/providers/fox-eth-lp/constants'
import farmAbi from 'features/defi/providers/fox-farming/abis/farmingAbi.json'
import { FOX_TOKEN_CONTRACT_ADDRESS, WETH_TOKEN_CONTRACT_ADDRESS } from 'plugins/foxPage/const'
import { getEthersProvider, makeTotalLpApr, rewardRatePerToken } from 'plugins/foxPage/utils'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { marketData } from 'state/slices/marketDataSlice/marketDataSlice'

type GetFoxEthLpMarketDataReturn = {
  [k: string]: MarketData
}

type GetFarmingContractDataReturn = {
  balance: string
  rewards: string
  expired: boolean
  tvl: string
  apr: string
}

type GetFarmingContractDataArgs = {
  contractAddress: string
  ethWalletAddress: string
}

export const foxEthApi = createApi({
  reducerPath: 'foxEthApi',
  // not actually used, only used to satisfy createApi, we use a custom queryFn
  baseQuery: fetchBaseQuery({ baseUrl: '/' }),
  // refetch if network connection is dropped, useful for mobile
  refetchOnReconnect: true,
  endpoints: build => ({
    getFoxEthLpMarketData: build.query<GetFoxEthLpMarketDataReturn, void>({
      queryFn: async (_args, injectedStore) => {
        const { getState, dispatch } = injectedStore
        const state: any = getState() // ReduxState causes circular dependency\
        const ethPrecision = state.assets.byId[ethAssetId].precision
        const lpAssetPrecision = state.assets.byId[foxEthLpAssetId].precision
        const ethPrice = state.marketData.crypto.byId[ethAssetId].price
        const ethersProvider = getEthersProvider()
        const uniV2LPContract = new Contract(
          UNISWAP_V2_WETH_FOX_POOL_ADDRESS,
          IUniswapV2Pair.abi,
          ethersProvider,
        )
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
        const data = {
          [foxEthLpAssetId]: { price, marketCap: '0', volume: '0', changePercent24Hr: 0 },
        }
        dispatch(marketData.actions.setCryptoMarketData(data))
        return { data }
      },
    }),
    getFarmingContractData: build.query<GetFarmingContractDataReturn, GetFarmingContractDataArgs>({
      queryFn: async ({ contractAddress, ethWalletAddress }, injectedStore) => {
        const { getState } = injectedStore
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
          .div(`1e${lpAssetPrecision}`)
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
          .times(`1e+${pair.token1.decimals}`) // convert to base unit value

        const foxEquivalentPerLPToken = token1PoolReservesEquivalent
          .div(bnOrZero(totalSupplyV2.toString()))
          .times(`1e+${pair.token1.decimals}`) // convert to base unit value
          .toString()
        const apr = bnOrZero(makeTotalLpApr(foxRewardRatePerTokenV4, foxEquivalentPerLPToken))
          .div(100)
          .toString()

        // balances
        const stakedBalance = await foxFarmingContract.balanceOf(ethWalletAddress)
        const unclaimedRewards = await foxFarmingContract.earned(ethWalletAddress)
        const balance = bnOrZero(stakedBalance.toString()).div(`1e${lpAssetPrecision}`).toString()
        const rewards = bnOrZero(unclaimedRewards.toString()).div(`1e${foxPrecision}`).toString()

        // expired
        let expired
        const timeStamp = await foxFarmingContract.periodFinish()
        if (timeStamp.toNumber() === 0) {
          expired = false
        } else {
          expired = dayjs().isAfter(dayjs.unix(timeStamp.toNumber()))
        }
        const data = {
          balance,
          rewards,
          tvl,
          expired,
          apr,
        }
        return { data }
      },
    }),
  }),
})

export const { useGetFarmingContractDataQuery } = foxEthApi
