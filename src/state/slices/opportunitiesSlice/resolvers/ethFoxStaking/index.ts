import { foxAssetId, fromAccountId, fromAssetId } from '@shapeshiftoss/caip'
import type { MarketData } from '@shapeshiftoss/types'
import { ETH_FOX_POOL_CONTRACT_ADDRESS } from 'contracts/constants'
import { fetchUniV2PairData, getOrCreateContractByAddress } from 'contracts/contractManager'
import dayjs from 'dayjs'
import { getAddress } from 'viem'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { toBaseUnit } from 'lib/math'
import type { AssetsState } from 'state/slices/assetsSlice/assetsSlice'
import { selectMarketDataByAssetIdUserCurrency } from 'state/slices/marketDataSlice/selectors'

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
import { DefiProvider, DefiType } from '../../types'
import { serializeUserStakingId } from '../../utils'
import type { OpportunityMetadataResolverInput, OpportunityUserDataResolverInput } from '../types'
import { makeTotalLpApr, rewardRatePerToken } from './utils'

export const ethFoxStakingMetadataResolver = async ({
  opportunityId,
  defiType,
  reduxApi,
}: OpportunityMetadataResolverInput): Promise<{
  data: GetOpportunityMetadataOutput
}> => {
  const { getState } = reduxApi
  const state: any = getState() // ReduxState causes circular dependency
  const assets: AssetsState = state.assets
  const lpAssetPrecision = assets.byId[foxEthLpAssetId]?.precision ?? 0
  const lpTokenMarketData: MarketData = selectMarketDataByAssetIdUserCurrency(
    state,
    foxEthLpAssetId,
  )
  const lpTokenPrice = lpTokenMarketData?.price

  const { assetReference: contractAddress } = fromAssetId(opportunityId)

  if (bnOrZero(lpTokenPrice).isZero()) {
    throw new Error(`Market data not ready for ${foxEthLpAssetId}`)
  }

  assertIsFoxEthStakingContractAddress(contractAddress)
  const foxFarmingContract = getOrCreateContractByAddress(contractAddress)
  const uniV2LPContract = getOrCreateContractByAddress(ETH_FOX_POOL_CONTRACT_ADDRESS)

  // tvl
  const totalSupply = await foxFarmingContract.read.totalSupply()
  const tvl = bnOrZero(totalSupply.toString())
    .div(bn(10).pow(lpAssetPrecision))
    .times(lpTokenPrice)
    .toFixed(2)

  // apr
  const foxRewardRatePerTokenV7 = await rewardRatePerToken(foxFarmingContract)

  const pair = await fetchUniV2PairData(foxEthLpAssetId)

  // Getting the ratio of the LP token for each asset
  const reserves = await uniV2LPContract.read.getReserves()
  const lpTotalSupply = (await uniV2LPContract.read.totalSupply()).toString()
  const foxReserves = bnOrZero(bnOrZero(reserves[1].toString()).toString())
  const ethReserves = bnOrZero(bnOrZero(reserves[0].toString()).toString())
  const ethPoolRatio = ethReserves.div(lpTotalSupply).toString()
  const foxPoolRatio = foxReserves.div(lpTotalSupply).toString()

  const totalSupplyV2 = await uniV2LPContract.read.totalSupply()

  const token1PoolReservesEquivalent = bnOrZero(pair.reserve1.toFixed())
    .times(2) // Double to get equivalent of both sides of pool
    .times(bn(10).pow(pair.token1.decimals)) // convert to base unit value

  const foxEquivalentPerLPToken = token1PoolReservesEquivalent
    .div(bnOrZero(totalSupplyV2.toString()))
    .times(bn(10).pow(pair.token1.decimals)) // convert to base unit value
    .toString()
  const apy = bnOrZero(makeTotalLpApr(foxRewardRatePerTokenV7, foxEquivalentPerLPToken))
    .div(100)
    .toString()

  const timeStamp = await foxFarmingContract.read.periodFinish()
  const expired = Number(timeStamp) === 0 ? false : dayjs().isAfter(dayjs.unix(Number(timeStamp)))
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
        isClaimableRewards: true,
      },
    },
    type: defiType,
  } as const

  return { data }
}

export const ethFoxStakingUserDataResolver = async ({
  opportunityId,
  accountId,
  reduxApi,
}: OpportunityUserDataResolverInput): Promise<{ data: GetOpportunityUserStakingDataOutput }> => {
  const { getState } = reduxApi
  const state: any = getState() // ReduxState causes circular dependency
  const lpTokenMarketData: MarketData = selectMarketDataByAssetIdUserCurrency(
    state,
    foxEthLpAssetId,
  )
  const lpTokenPrice = lpTokenMarketData?.price

  const { assetReference: contractAddress } = fromAssetId(opportunityId)
  const { account } = fromAccountId(accountId)
  const accountAddress = getAddress(account)

  if (bnOrZero(lpTokenPrice).isZero()) {
    throw new Error(`Market data not ready for ${foxEthLpAssetId}`)
  }

  assertIsFoxEthStakingContractAddress(contractAddress)

  const foxFarmingContract = getOrCreateContractByAddress(contractAddress)

  const stakedBalance = await foxFarmingContract.read.balanceOf([accountAddress])
  const earned = await foxFarmingContract.read.earned([accountAddress])
  const stakedAmountCryptoBaseUnit = bnOrZero(stakedBalance.toString()).toString()
  const rewardsCryptoBaseUnit = { amounts: [earned.toString()] as [string], claimable: true }

  const userStakingId = serializeUserStakingId(accountId, opportunityId)

  const data = {
    byId: {
      [userStakingId]: {
        isLoaded: true,
        userStakingId,
        stakedAmountCryptoBaseUnit,
        rewardsCryptoBaseUnit,
      },
    },
    type: DefiType.Staking,
  }

  return { data }
}

export const ethFoxStakingOpportunityIdsResolver = (): Promise<{
  data: GetOpportunityIdsOutput
}> => Promise.resolve({ data: [...foxEthStakingIds] })
