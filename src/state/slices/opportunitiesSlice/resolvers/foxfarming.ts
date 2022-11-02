import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import { foxAssetId } from '@shapeshiftoss/caip'
import { ethAssetId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import type { MarketData } from '@shapeshiftoss/types'
import { HistoryTimeframe } from '@shapeshiftoss/types'
import { Fetcher, Token } from '@uniswap/sdk'
import IUniswapV2Pair from '@uniswap/v2-core/build/IUniswapV2Pair.json'
import dayjs from 'dayjs'
import { DefiProvider, DefiType } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import {
  foxEthLpAssetId,
  UNISWAP_V2_WETH_FOX_POOL_ADDRESS,
} from 'features/defi/providers/fox-eth-lp/constants'
import farmingAbi from 'features/defi/providers/fox-farming/abis/farmingAbi.json'
import { FOX_TOKEN_CONTRACT_ADDRESS, WETH_TOKEN_CONTRACT_ADDRESS } from 'plugins/foxPage/const'
import {
  calculateAPRFromToken0,
  getEthersProvider,
  makeTotalLpApr,
  rewardRatePerToken,
} from 'plugins/foxPage/utils'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { toBaseUnit } from 'lib/math'
import type { ReduxState } from 'state/reducer'
import type { AssetsState } from 'state/slices/assetsSlice/assetsSlice'
import { getOrCreateContract } from 'state/slices/foxEthSlice/contractManager'
import { fetchPairData } from 'state/slices/foxEthSlice/utils'
import { marketData } from 'state/slices/marketDataSlice/marketDataSlice'
import type { PortfolioAccountBalancesById } from 'state/slices/portfolioSlice/portfolioSliceCommon'
import { selectPortfolioLoadingStatusGranular } from 'state/slices/portfolioSlice/selectors'
import { selectMarketDataById, selectPortfolioAccountBalances } from 'state/slices/selectors'

import { foxEthPair } from '../constants'
import type {
  GetOpportunityMetadataOutput,
  LpId,
  OpportunitiesState,
  OpportunityDefiType,
  StakingId,
  UserStakingOpportunity,
} from '../types'
import type { ReduxApi } from './types'

export const foxFarmingLpMetadataResolver = async ({
  opportunityId,
  opportunityType,
  reduxApi,
}: {
  opportunityId: LpId | StakingId
  opportunityType: OpportunityDefiType
  reduxApi: ReduxApi
}): Promise<{ data: GetOpportunityMetadataOutput }> => {
  const { dispatch, getState } = reduxApi
  const { assetReference: contractAddress } = fromAssetId(opportunityId as AssetId)
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

  // Getting the ratio of the LP token for each asset
  const totalSupply = (await uniV2LPContract.totalSupply()).toString()
  const foxReserves = bnOrZero(bnOrZero(reserves[1].toString()).toString())
  const ethReserves = bnOrZero(bnOrZero(reserves[0].toString()).toString())
  const ethPoolRatio = ethReserves.div(totalSupply).toString()
  const foxPoolRatio = foxReserves.div(totalSupply).toString()
  // Amount of Eth in liquidity pool
  const ethInReserve = bnOrZero(reserves?.[0]?.toString()).div(`1e${ethPrecision}`)

  // TODO(gomes): This is a hackish way we were previously doing this, getting the ETH liquidity * 2 will get us close to the real fiat TVL but we can do better
  // Total market cap of liquidity pool in usdc.
  // Multiplied by 2 to show equal amount of eth and fox.
  const totalLiquidityFiat = ethInReserve.times(ethPrice).times(2)
  const tvl = totalLiquidityFiat.toString()
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
    byId: {
      [opportunityId]: {
        apy,
        assetId: opportunityId,
        provider: DefiProvider.FoxEthLP,
        tvl,
        type: DefiType.LiquidityPool,
        underlyingAssetIds: foxEthPair,
        underlyingAssetRatios: [
          toBaseUnit(ethPoolRatio.toString(), assets.byId[foxEthPair[0]].precision),
          toBaseUnit(foxPoolRatio.toString(), assets.byId[foxEthPair[1]].precision),
        ] as const,
      },
    } as OpportunitiesState[DefiType.LiquidityPool]['byId'],
    type: opportunityType,
  }

  return { data }
}

export const foxFarmingStakingMetadataResolver = async ({
  opportunityId,
  opportunityType,
  reduxApi,
}: {
  opportunityId: LpId | StakingId
  opportunityType: OpportunityDefiType
  reduxApi: ReduxApi
}): Promise<{ data: GetOpportunityMetadataOutput }> => {
  const { getState } = reduxApi
  const state: any = getState() // ReduxState causes circular dependency
  const assets: AssetsState = state.assets
  const lpAssetPrecision = assets.byId[foxEthLpAssetId].precision
  const foxPrecision = assets.byId[foxAssetId].precision
  const ethPrecision = assets.byId[ethAssetId].precision
  const lpTokenMarketData: MarketData = selectMarketDataById(state, foxEthLpAssetId)
  const lpTokenPrice = lpTokenMarketData?.price

  const { assetReference: contractAddress } = fromAssetId(opportunityId as AssetId)

  if (!lpTokenPrice) {
    throw new Error(`Market data not ready for ${foxEthLpAssetId}`)
  }

  const ethersProvider = getEthersProvider()
  const foxFarmingContract = getOrCreateContract(contractAddress, farmingAbi)
  const uniV2LPContract = getOrCreateContract(UNISWAP_V2_WETH_FOX_POOL_ADDRESS, IUniswapV2Pair.abi)

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

  // Getting the ratio of the LP token for each asset
  const foxReserves = bnOrZero(bnOrZero(pair.reserve1.toFixed()).toString())
  const ethReserves = bnOrZero(bnOrZero(pair.reserve0.toFixed()).toString())
  const ethPoolRatio = ethReserves.div(totalSupply.toString()).toString()
  const foxPoolRatio = foxReserves.div(totalSupply.toString()).toString()

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

  const timeStamp = await foxFarmingContract.periodFinish()
  const expired =
    timeStamp.toNumber() === 0 ? false : dayjs().isAfter(dayjs.unix(timeStamp.toNumber()))

  const data = {
    byId: {
      [opportunityId]: {
        apy,
        assetId: opportunityId,
        provider: DefiProvider.FoxEthLP,
        tvl,
        type: DefiType.Farming,
        underlyingAssetIds: foxEthPair,
        underlyingAssetRatios: [foxPoolRatio.toString(), ethPoolRatio.toString()] as const,
        opportunitySpecific: {
          expired,
        },
      },
    } as OpportunitiesState[DefiType.LiquidityPool]['byId'],
    type: opportunityType,
  }

  return { data }
}

export const foxFarmingLpUserDataResolver = async ({
  opportunityId,
  opportunityType: _opportunityType,
  accountId,
  reduxApi,
}: {
  opportunityId: LpId | StakingId
  opportunityType: OpportunityDefiType
  accountId: AccountId
  reduxApi: ReduxApi
}): Promise<{ data: string }> => {
  const { getState } = reduxApi
  const state: ReduxState = getState() as any
  const portfolioLoadingStatusGranular = selectPortfolioLoadingStatusGranular(state)
  if (portfolioLoadingStatusGranular?.[accountId] === 'loading')
    throw new Error(`Portfolio data not loaded for ${accountId}`)

  const balances: PortfolioAccountBalancesById = selectPortfolioAccountBalances(state)

  return { data: balances[accountId][opportunityId as AssetId] }
}

export const foxFarmingStakingUserDataResolver = async ({
  opportunityId,
  opportunityType: _opportunityType,
  accountId,
  reduxApi,
}: {
  opportunityId: LpId | StakingId
  opportunityType: OpportunityDefiType
  accountId: AccountId
  reduxApi: ReduxApi
}): Promise<{ data: UserStakingOpportunity }> => {
  const { getState } = reduxApi
  const state: any = getState() // ReduxState causes circular dependency
  const assets: AssetsState = state.assets
  const lpAssetPrecision = assets.byId[foxEthLpAssetId].precision
  const foxPrecision = assets.byId[foxAssetId].precision
  const lpTokenMarketData: MarketData = selectMarketDataById(state, foxEthLpAssetId)
  const lpTokenPrice = lpTokenMarketData?.price

  const { assetReference: contractAddress } = fromAssetId(opportunityId as AssetId)
  const { account: accountAddress } = fromAccountId(accountId)

  if (!lpTokenPrice) {
    throw new Error(`Market data not ready for ${foxEthLpAssetId}`)
  }

  const foxFarmingContract = getOrCreateContract(contractAddress, farmingAbi)

  const stakedBalance = await foxFarmingContract.balanceOf(accountAddress)
  const unclaimedRewards = await foxFarmingContract.earned(accountAddress)
  const stakedAmountCryptoPrecision = bnOrZero(stakedBalance.toString())
    .div(bn(10).pow(lpAssetPrecision))
    .toString()
  const rewardsAmountCryptoPrecision = bnOrZero(unclaimedRewards.toString())
    .div(bn(10).pow(foxPrecision))
    .toString()

  const data = {
    stakedAmountCryptoPrecision,
    rewardsAmountCryptoPrecision,
  }

  return { data }
}
