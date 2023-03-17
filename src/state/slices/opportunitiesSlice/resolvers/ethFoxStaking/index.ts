import { ethChainId, foxAssetId, fromAccountId, fromAssetId } from '@shapeshiftoss/caip'
import type { MarketData } from '@shapeshiftoss/types'
import { ETH_FOX_POOL_CONTRACT_ADDRESS } from 'contracts/constants'
import { fetchUniV2PairData, getOrCreateContract } from 'contracts/contractManager'
import dayjs from 'dayjs'
import { DefiProvider, DefiType } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { toBaseUnit } from 'lib/math'
import type { AssetsState } from 'state/slices/assetsSlice/assetsSlice'
import { selectMarketDataById } from 'state/slices/selectors'

import {
  assertIsFoxEthStakingContractAddress,
  foxEthLpAssetId,
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
import { makeTotalLpApr, rewardRatePerToken } from './utils'

export const ethFoxStakingMetadataResolver = async ({
  opportunityId,
  opportunityType,
  reduxApi,
}: OpportunityMetadataResolverInput): Promise<{
  data: GetOpportunityMetadataOutput
}> => {
  const { getState } = reduxApi
  const state: any = getState() // ReduxState causes circular dependency
  const assets: AssetsState = state.assets
  const lpAssetPrecision = assets.byId[foxEthLpAssetId]?.precision ?? 0
  const lpTokenMarketData: MarketData = selectMarketDataById(state, foxEthLpAssetId)
  const lpTokenPrice = lpTokenMarketData?.price

  const { assetReference: contractAddress } = fromAssetId(opportunityId)

  if (bnOrZero(lpTokenPrice).isZero()) {
    throw new Error(`Market data not ready for ${foxEthLpAssetId}`)
  }

  assertIsFoxEthStakingContractAddress(contractAddress)
  const foxFarmingContract = getOrCreateContract(contractAddress)
  const uniV2LPContract = getOrCreateContract(ETH_FOX_POOL_CONTRACT_ADDRESS)

  // tvl
  const totalSupply = await foxFarmingContract.totalSupply()
  const tvl = bnOrZero(totalSupply.toString())
    .div(bn(10).pow(lpAssetPrecision))
    .times(lpTokenPrice)
    .toFixed(2)

  // apr
  const foxRewardRatePerTokenV5 = await rewardRatePerToken(foxFarmingContract)

  const pair = await fetchUniV2PairData(foxEthLpAssetId)

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

  const data = {
    byId: {
      [opportunityId]: {
        apy,
        assetId: opportunityId,
        id: opportunityId,
        provider: DefiProvider.EthFoxStaking,
        tvl,
        type: DefiType.Staking,
        underlyingAssetId: foxEthLpAssetId,
        underlyingAssetIds: foxEthPair,
        underlyingAssetRatiosBaseUnit: [
          toBaseUnit(ethPoolRatio.toString(), assets.byId[foxEthPair[0]]?.precision ?? 0),
          toBaseUnit(foxPoolRatio.toString(), assets.byId[foxEthPair[1]]?.precision ?? 0),
        ] as const,
        expired,
        name: 'Fox Farming',
        version,
        rewardAssetIds: [foxAssetId] as const,
      },
    },
    type: opportunityType,
  } as const

  return { data }
}

export const ethFoxStakingUserDataResolver = async ({
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

export const ethFoxStakingOpportunityIdsResolver = (): Promise<{
  data: GetOpportunityIdsOutput
}> => Promise.resolve({ data: [...foxEthStakingIds] })
