import { ethAssetId, foxAssetId, fromAccountId, fromAssetId } from '@shapeshiftoss/caip'
import type { MarketData } from '@shapeshiftoss/types'
import { HistoryTimeframe } from '@shapeshiftoss/types'
import { Fetcher, Token } from '@uniswap/sdk'
import IUniswapV2Pair from '@uniswap/v2-core/build/IUniswapV2Pair.json'
import type BNJS from 'bn.js'
import dayjs from 'dayjs'
import { DefiProvider, DefiType } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
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
import { marketData } from 'state/slices/marketDataSlice/marketDataSlice'
import type { PortfolioAccountBalancesById } from 'state/slices/portfolioSlice/portfolioSliceCommon'
import { selectPortfolioLoadingStatusGranular } from 'state/slices/portfolioSlice/selectors'
import { selectMarketDataById, selectPortfolioAccountBalances } from 'state/slices/selectors'

import {
  foxEthLpAssetId,
  foxEthLpAssetIds,
  foxEthPair,
  foxEthStakingIds,
  LP_EARN_OPPORTUNITIES,
  STAKING_ID_TO_NAME,
} from '../../constants'
import type {
  GetOpportunityIdsOutput,
  GetOpportunityMetadataOutput,
  GetOpportunityUserStakingDataOutput,
  OpportunitiesState,
} from '../../types'
import { serializeUserStakingId } from '../../utils'
import type { OpportunityMetadataResolverInput, OpportunityUserDataResolverInput } from '../types'
import { fetchPairData, getOrCreateContract } from './contractManager'

export const foxFarmingLpMetadataResolver = async ({
  opportunityId,
  opportunityType,
  reduxApi,
}: OpportunityMetadataResolverInput): Promise<{ data: GetOpportunityMetadataOutput }> => {
  const { dispatch, getState } = reduxApi
  const { assetReference: contractAddress } = fromAssetId(opportunityId)
  const state: any = getState() // ReduxState causes circular dependency
  const assets: AssetsState = state.assets
  const ethMarketData: MarketData = selectMarketDataById(state, ethAssetId)

  if (bnOrZero(ethMarketData?.price).isZero()) {
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
        underlyingAssetId: foxEthLpAssetId,
        underlyingAssetIds: foxEthPair,
        underlyingAssetRatios: [
          toBaseUnit(ethPoolRatio.toString(), assets.byId[foxEthPair[0]].precision),
          toBaseUnit(foxPoolRatio.toString(), assets.byId[foxEthPair[1]].precision),
        ] as const,
        name: LP_EARN_OPPORTUNITIES[opportunityId].opportunityName,
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
}: OpportunityMetadataResolverInput): Promise<{ data: GetOpportunityMetadataOutput }> => {
  const { getState } = reduxApi
  const state: any = getState() // ReduxState causes circular dependency
  const assets: AssetsState = state.assets
  const lpAssetPrecision = assets.byId[foxEthLpAssetId].precision
  const foxPrecision = assets.byId[foxAssetId].precision
  const ethPrecision = assets.byId[ethAssetId].precision
  const lpTokenMarketData: MarketData = selectMarketDataById(state, foxEthLpAssetId)
  const lpTokenPrice = lpTokenMarketData?.price

  const { assetReference: contractAddress } = fromAssetId(opportunityId)

  if (bnOrZero(lpTokenPrice).isZero()) {
    throw new Error(`Market data not ready for ${foxEthLpAssetId}`)
  }

  const ethersProvider = getEthersProvider()
  const foxFarmingContract = getOrCreateContract(contractAddress, farmingAbi)
  const uniV2LPContract = getOrCreateContract(
    fromAssetId(foxEthLpAssetId).assetReference,
    IUniswapV2Pair.abi,
  )

  // tvl
  const totalSupply = await foxFarmingContract.totalSupply()
  const tvl = bnOrZero(totalSupply.toString())
    .div(bn(10).pow(lpAssetPrecision))
    .times(lpTokenPrice)
    .toFixed(2)

  // apr
  const foxRewardRatePerTokenV5 = await rewardRatePerToken(foxFarmingContract)
  const pair = await Fetcher.fetchPairData(
    new Token(0, WETH_TOKEN_CONTRACT_ADDRESS, ethPrecision),
    new Token(0, FOX_TOKEN_CONTRACT_ADDRESS, foxPrecision),
    ethersProvider,
  )

  // Getting the ratio of the LP token for each asset
  const reserves = await uniV2LPContract.getReserves()
  const lpTotalSupply = (await uniV2LPContract.totalSupply()).toString()
  const foxReserves = bnOrZero(bnOrZero(reserves[1].toString()).toString())
  const ethReserves = bnOrZero(bnOrZero(reserves[0].toString()).toString())
  const ethPoolRatio = ethReserves.div(lpTotalSupply).toString()
  const foxPoolRatio = foxReserves.div(lpTotalSupply).toString()

  const totalSupplyV2 = await uniV2LPContract.totalSupply()

  const token1PoolReservesEquivalent = bnOrZero(pair.reserve1.toFixed())
    .times(2) // Double to get equivalent of both sides of pool
    .times(bn(10).pow(pair.token1.decimals)) // convert to base unit value

  const foxEquivalentPerLPToken = token1PoolReservesEquivalent
    .div(bnOrZero(totalSupplyV2.toString()))
    .times(bn(10).pow(pair.token1.decimals)) // convert to base unit value
    .toString()
  const apy = bnOrZero(makeTotalLpApr(foxRewardRatePerTokenV5, foxEquivalentPerLPToken))
    .div(100)
    .toString()

  const timeStamp = await foxFarmingContract.periodFinish()
  const expired =
    timeStamp.toNumber() === 0 ? false : dayjs().isAfter(dayjs.unix(timeStamp.toNumber()))
  const name = STAKING_ID_TO_NAME[opportunityId]

  const data = {
    byId: {
      [opportunityId]: {
        apy,
        assetId: opportunityId,
        provider: DefiProvider.FoxFarming,
        tvl,
        type: DefiType.Farming,
        underlyingAssetId: foxEthLpAssetId,
        underlyingAssetIds: foxEthPair,
        underlyingAssetRatios: [
          toBaseUnit(ethPoolRatio.toString(), assets.byId[foxEthPair[0]].precision),
          toBaseUnit(foxPoolRatio.toString(), assets.byId[foxEthPair[1]].precision),
        ] as const,
        expired,
        name,
      },
    } as OpportunitiesState[DefiType.LiquidityPool]['byId'],
    type: opportunityType,
  }

  return { data }
}

export const foxFarmingLpUserDataResolver = ({
  opportunityId,
  opportunityType: _opportunityType,
  accountId,
  reduxApi,
}: OpportunityUserDataResolverInput): Promise<void> => {
  const { getState } = reduxApi
  const state: ReduxState = getState() as any
  const portfolioLoadingStatusGranular = selectPortfolioLoadingStatusGranular(state)

  // Reject RTK query if account portfolio data is granularily loading
  if (portfolioLoadingStatusGranular?.[accountId] === 'loading')
    throw new Error(`Portfolio data not loaded for ${accountId}`)

  const balances: PortfolioAccountBalancesById = selectPortfolioAccountBalances(state)

  const hasPortfolioData = Boolean(balances[accountId][opportunityId])

  // Reject RTK query if there's no account portfolio data for this LP token
  if (!hasPortfolioData) {
    throw new Error('no portfolio data')
  }

  // All checks passed, resolve the promise so we continue the RTK query execution and populate LP/Account IDs
  return Promise.resolve()
}

export const foxFarmingStakingUserDataResolver = async ({
  opportunityId,
  opportunityType,
  accountId,
  reduxApi,
}: OpportunityUserDataResolverInput): Promise<{ data: GetOpportunityUserStakingDataOutput }> => {
  const { getState } = reduxApi
  const state: any = getState() // ReduxState causes circular dependency
  const assets: AssetsState = state.assets
  const foxPrecision = assets.byId[foxAssetId].precision
  const lpTokenMarketData: MarketData = selectMarketDataById(state, foxEthLpAssetId)
  const lpTokenPrice = lpTokenMarketData?.price
  const lpAssetPrecision = assets.byId[foxEthLpAssetId].precision

  const { assetReference: contractAddress } = fromAssetId(opportunityId)
  const { account: accountAddress } = fromAccountId(accountId)

  if (bnOrZero(lpTokenPrice).isZero()) {
    throw new Error(`Market data not ready for ${foxEthLpAssetId}`)
  }

  const foxFarmingContract = getOrCreateContract(contractAddress, farmingAbi)

  const stakedBalance: BNJS = await foxFarmingContract.balanceOf(accountAddress)
  const earned = await foxFarmingContract.earned(accountAddress)
  // Do NOT use toFixed() here:
  // - ethers balanceOf() returns base unit amounts, so precision is a non-issue
  // - ethers uses BN.js BigNumber flavor as opposed to BigNumber.js, and toFixed() only exists in the latter
  // BN.js only works with integers, so we need to parse back the stringified BN to get the precision amount from it
  // https://docs.ethers.io/v5/api/utils/bignumber/
  const stakedAmountCryptoBaseUnit = stakedBalance.toString()
  const stakedAmountCryptoPrecision = bn(stakedAmountCryptoBaseUnit)
    .div(bn(10).pow(lpAssetPrecision))
    .toFixed()
  const rewardsAmountsCryptoPrecision = [
    bnOrZero(earned.toString()).div(bn(10).pow(foxPrecision)).toFixed(),
  ] as [string]

  const data = {
    byId: {
      [serializeUserStakingId(accountId, opportunityId)]: {
        stakedAmountCryptoBaseUnit,
        stakedAmountCryptoPrecision,
        rewardsAmountsCryptoPrecision,
      },
    },
    type: opportunityType,
  }

  return { data }
}

export const foxFarmingLpOpportunityIdsResolver = (): Promise<{
  data: GetOpportunityIdsOutput
}> => Promise.resolve({ data: [...foxEthLpAssetIds] })

export const foxFarmingStakingOpportunityIdsResolver = (): Promise<{
  data: GetOpportunityIdsOutput
}> => Promise.resolve({ data: [...foxEthStakingIds] })
