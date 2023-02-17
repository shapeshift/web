import { ethChainId, fromAccountId, fromAssetId, toAssetId } from '@shapeshiftoss/caip'
import type { MarketData } from '@shapeshiftoss/types'
import { HistoryTimeframe } from '@shapeshiftoss/types'
import dayjs from 'dayjs'
import { DefiProvider, DefiType } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { calculateAPRFromToken0, makeTotalLpApr, rewardRatePerToken } from 'plugins/foxPage/utils'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { getEthersProvider } from 'lib/ethersProviderSingleton'
import { toBaseUnit } from 'lib/math'
import type { ReduxState } from 'state/reducer'
import type { AssetsState } from 'state/slices/assetsSlice/assetsSlice'
import { marketData } from 'state/slices/marketDataSlice/marketDataSlice'
import type { PortfolioAccountBalancesById } from 'state/slices/portfolioSlice/portfolioSliceCommon'
import { selectPortfolioLoadingStatusGranular } from 'state/slices/portfolioSlice/selectors'
import { selectMarketDataById, selectPortfolioAccountBalances } from 'state/slices/selectors'

import type { foxEthLpContractAddress } from '../../constants'
import {
  assertIsFoxEthStakingContractAddress,
  foxEthLpAssetId,
  foxEthLpAssetIds,
  foxEthPair,
  foxEthStakingIds,
  STAKING_ID_TO_VERSION,
} from '../../constants'
import type {
  GetOpportunityIdsOutput,
  GetOpportunityMetadataOutput,
  GetOpportunityUserStakingDataOutput,
} from '../../types'
import { serializeUserStakingId } from '../../utils'
import type { OpportunityMetadataResolverInput, OpportunityUserDataResolverInput } from '../types'
import { fetchUniV2PairData, getOrCreateContract } from './contractManager'

export const uniV2LpMetadataResolver = async ({
  opportunityId,
  opportunityType,
  reduxApi,
}: OpportunityMetadataResolverInput): Promise<{
  data: GetOpportunityMetadataOutput
}> => {
  const { dispatch, getState } = reduxApi
  const state: any = getState() // ReduxState causes circular dependency

  const assets: AssetsState = state.assets

  const ethersProvider = getEthersProvider()

  const pair = await fetchUniV2PairData(opportunityId)

  console.log({ pair })

  const blockNumber = await ethersProvider.getBlockNumber()

  const calculatedApy = await calculateAPRFromToken0({
    token0Decimals: pair.token0.decimals,
    token0Reserves: pair.reserve0,
    blockNumber,
    pairAssetId: opportunityId,
  })

  const { chainId } = fromAssetId(opportunityId)
  const token0MarketData: MarketData = selectMarketDataById(
    state,
    toAssetId({
      assetNamespace: 'erc20',
      assetReference: pair.token0.address,
      chainId,
    }),
  )

  const underlyingAssetIds = [
    toAssetId({ assetNamespace: 'erc20', assetReference: pair.token0.address, chainId }),
    toAssetId({ assetNamespace: 'erc20', assetReference: pair.token1.address, chainId }),
  ] as const

  if (bnOrZero(token0MarketData?.price).isZero()) {
    throw new Error(`Market data not ready for ${underlyingAssetIds[0]}`)
  }

  const token0Price = token0MarketData.price

  const { assetReference: contractAddress } = fromAssetId(opportunityId)
  // TODO(gomes): discrimination required because of typechain
  // Import the standard UniV2 Pool ABI and cast `contractAddress` with it
  const uniV2LPContract = getOrCreateContract(contractAddress as typeof foxEthLpContractAddress)
  const apy = bnOrZero(calculatedApy).div(100).toString()
  const reserves = await uniV2LPContract.getReserves()

  // Getting the ratio of the LP token for each asset
  const totalSupply = (await uniV2LPContract.totalSupply()).toString()
  const token0Reserves = bnOrZero(bnOrZero(reserves[0].toString()).toString())
  const token1Reserves = bnOrZero(bnOrZero(reserves[1].toString()).toString())
  const token0PoolRatio = token0Reserves.div(totalSupply).toString()
  const token1PoolRatio = token1Reserves.div(totalSupply).toString()
  // Amount of token 0 in liquidity pool
  const token0ReservesCryptoPrecision = bnOrZero(reserves?.[0]?.toString()).div(
    bn(10).pow(pair.token0.decimals ?? 18),
  )

  // TODO(gomes): This is a hackish way we were previously doing this, getting the ETH liquidity * 2 will get us close to the real fiat TVL but we can do better
  // Total market cap of liquidity pool in usdc.
  // Multiplied by 2 to show equal amount of token0 and token1.
  const totalLiquidityFiat = token0ReservesCryptoPrecision.times(token0Price).times(2)
  const tvl = totalLiquidityFiat.toString()
  const price = bnOrZero(tvl)
    .div(bnOrZero(totalSupply.toString()).div(bn(10).div(pair.token1.decimals)))
    .toString()

  const lpMarketData = {
    [opportunityId]: { price, marketCap: '0', volume: '0', changePercent24Hr: 0 },
  }
  // hacks for adding lp price and price history
  dispatch(marketData.actions.setCryptoMarketData(lpMarketData))
  Object.values(HistoryTimeframe).forEach(timeframe => {
    dispatch(
      marketData.actions.setCryptoPriceHistory({
        data: [{ price: bnOrZero(price).toNumber(), date: 0 }],
        args: { timeframe, assetId: opportunityId },
      }),
    )
  })

  const data = {
    byId: {
      [opportunityId]: {
        apy,
        assetId: opportunityId,
        id: opportunityId,
        provider: DefiProvider.UniV2,
        tvl,
        type: DefiType.LiquidityPool,
        underlyingAssetId: opportunityId,
        underlyingAssetIds,
        underlyingAssetRatiosBaseUnit: [
          toBaseUnit(token0PoolRatio.toString(), pair.token0.decimals ?? 18),
          toBaseUnit(token1PoolRatio.toString(), pair.token1.decimals ?? 18),
        ] as const,
        name: `${assets.byId[underlyingAssetIds[0]]?.name}/${
          assets.byId[underlyingAssetIds[1]]?.name
        } Pool`,
      },
    },

    type: opportunityType,
  } as const

  return { data }
}

export const ethFoxShapeShiftStakingMetadataResolver = async ({
  opportunityId,
  opportunityType,
  reduxApi,
}: OpportunityMetadataResolverInput): Promise<{
  data: GetOpportunityMetadataOutput
}> => {
  const { getState } = reduxApi
  const state: any = getState() // ReduxState causes circular dependency
  const assets: AssetsState = state.assets

  const { assetReference: contractAddress, chainId } = fromAssetId(opportunityId)

  assertIsFoxEthStakingContractAddress(contractAddress)
  const foxFarmingContract = getOrCreateContract(contractAddress)
  const underlyingAssetAddress = await foxFarmingContract.stakingToken()
  const underlyingAssetId = toAssetId({
    assetNamespace: 'erc20',
    assetReference: underlyingAssetAddress,
    chainId,
  })
  const lpAssetPrecision = assets.byId[underlyingAssetId]?.precision ?? 0
  const lpTokenMarketData: MarketData = selectMarketDataById(state, underlyingAssetId)
  const lpTokenPrice = lpTokenMarketData?.price

  const uniV2LPContract = getOrCreateContract(
    underlyingAssetAddress as typeof foxEthLpContractAddress,
  )

  if (bnOrZero(lpTokenPrice).isZero()) {
    throw new Error(`Market data not ready for ${underlyingAssetId}`)
  }

  // tvl
  const totalSupply = await foxFarmingContract.totalSupply()
  const tvl = bnOrZero(totalSupply.toString())
    .div(bn(10).pow(lpAssetPrecision))
    .times(lpTokenPrice)
    .toFixed(2)

  // apr
  const foxRewardRatePerTokenV5 = await rewardRatePerToken(uniV2LPContract)

  const pair = await fetchUniV2PairData(opportunityId)

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
  const version = STAKING_ID_TO_VERSION[opportunityId]

  const underlyingAssetIds = [
    toAssetId({ assetNamespace: 'erc20', assetReference: pair.token0.address, chainId }),
    toAssetId({ assetNamespace: 'erc20', assetReference: pair.token1.address, chainId }),
  ] as const

  const data = {
    byId: {
      [opportunityId]: {
        apy,
        assetId: opportunityId,
        id: opportunityId,
        provider: DefiProvider.UniV2,
        tvl,
        type: DefiType.Staking,
        underlyingAssetId,
        underlyingAssetIds,
        underlyingAssetRatiosBaseUnit: [
          toBaseUnit(ethPoolRatio.toString(), assets.byId[foxEthPair[0]]?.precision ?? 0),
          toBaseUnit(foxPoolRatio.toString(), assets.byId[foxEthPair[1]]?.precision ?? 0),
        ] as const,
        expired,
        name: 'Fox Farming',
        version,
      },
    },
    type: opportunityType,
  } as const

  return { data }
}

export const foxFarmingLpUserDataResolver = ({
  opportunityId,
  opportunityType: _opportunityType,
  accountId,
  reduxApi,
}: OpportunityUserDataResolverInput): Promise<void> => {
  const { chainId: accountChainId } = fromAccountId(accountId)
  // Looks the same as the happy path but isn't, we won't hit this as a guard with non-Ethereum account ChainIds
  if (accountChainId !== ethChainId) return Promise.resolve()

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
  const { chainId: accountChainId } = fromAccountId(accountId)
  if (accountChainId !== ethChainId)
    return {
      data: {
        byId: {},
      },
    }
  const { getState } = reduxApi
  const state: any = getState() // ReduxState causes circular dependency
  const lpTokenMarketData: MarketData = selectMarketDataById(state, foxEthLpAssetId)
  const lpTokenPrice = lpTokenMarketData?.price

  const { assetReference: contractAddress } = fromAssetId(opportunityId)
  const { account: accountAddress } = fromAccountId(accountId)

  if (bnOrZero(lpTokenPrice).isZero()) {
    throw new Error(`Market data not ready for ${foxEthLpAssetId}`)
  }

  assertIsFoxEthStakingContractAddress(contractAddress)

  const foxFarmingContract = getOrCreateContract(contractAddress)

  const stakedBalance = await foxFarmingContract.balanceOf(accountAddress)
  const earned = await foxFarmingContract.earned(accountAddress)
  const stakedAmountCryptoBaseUnit = bnOrZero(stakedBalance.toString()).toString()
  const rewardsAmountsCryptoBaseUnit = [earned.toString()] as [string]

  const userStakingId = serializeUserStakingId(accountId, opportunityId)

  const data = {
    byId: {
      [userStakingId]: {
        userStakingId,
        stakedAmountCryptoBaseUnit,
        rewardsAmountsCryptoBaseUnit,
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
