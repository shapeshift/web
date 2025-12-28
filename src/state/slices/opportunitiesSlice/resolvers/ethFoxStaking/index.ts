import { foxAssetId, fromAccountId, fromAssetId } from '@shapeshiftoss/caip'
import type {
  FoxEthStakingContract,
  FoxEthStakingContractAbi,
  KnownContractAddress,
} from '@shapeshiftoss/contracts'
import {
  ETH_FOX_POOL_CONTRACT,
  fetchUniV2PairData,
  getOrCreateContractByAddress,
} from '@shapeshiftoss/contracts'
import dayjs from 'dayjs'
import { getAddress } from 'viem'

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

import { bn, bnOrZero } from '@/lib/bignumber/bignumber'
import { toBaseUnit } from '@/lib/math'
import { selectAssetById } from '@/state/slices/assetsSlice/selectors'
import { selectMarketDataByAssetIdUserCurrency } from '@/state/slices/marketDataSlice/selectors'

export const ethFoxStakingMetadataResolver = async ({
  opportunityId,
  defiType,
  reduxApi,
}: OpportunityMetadataResolverInput): Promise<{
  data: GetOpportunityMetadataOutput
}> => {
  const { getState } = reduxApi
  const state: any = getState() // ReduxState causes circular dependency
  const lpAsset = selectAssetById(state, foxEthLpAssetId)
  const lpAssetPrecision = lpAsset?.precision ?? 0
  const lpTokenMarketData = selectMarketDataByAssetIdUserCurrency(state, foxEthLpAssetId)
  const lpTokenPrice = lpTokenMarketData?.price

  const { assetReference: contractAddress } = fromAssetId(opportunityId)

  if (bnOrZero(lpTokenPrice).isZero()) {
    throw new Error(`Market data not ready for ${foxEthLpAssetId}`)
  }

  assertIsFoxEthStakingContractAddress(contractAddress)
  const foxFarmingContract = getOrCreateContractByAddress(
    contractAddress as KnownContractAddress,
  ) as FoxEthStakingContract<FoxEthStakingContractAbi>
  const uniV2LPContract = getOrCreateContractByAddress(ETH_FOX_POOL_CONTRACT)

  // tvl
  const totalSupply = await foxFarmingContract.read.totalSupply()
  const tvl = bnOrZero(totalSupply.toString())
    .div(bn(10).pow(lpAssetPrecision))
    .times(bnOrZero(lpTokenPrice))
    .toFixed(2)

  // apr
  const foxRewardRatePerTokenV7 = await rewardRatePerToken(foxFarmingContract)

  const pair = await fetchUniV2PairData(foxEthLpAssetId)

  // Getting the ratio of the LP token for each asset
  const reserves = await uniV2LPContract.read.getReserves()
  const lpTotalSupply = (await uniV2LPContract.read.totalSupply()).toString()
  const foxReserves = bnOrZero(bnOrZero(reserves[1].toString()).toString())
  const ethReserves = bnOrZero(bnOrZero(reserves[0].toString()).toString())
  const ethPoolRatio = ethReserves.div(bnOrZero(lpTotalSupply)).toString()
  const foxPoolRatio = foxReserves.div(bnOrZero(lpTotalSupply)).toString()

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
          toBaseUnit(
            ethPoolRatio.toString(),
            selectAssetById(state, foxEthPair[0])?.precision ?? 0,
          ),
          toBaseUnit(
            foxPoolRatio.toString(),
            selectAssetById(state, foxEthPair[1])?.precision ?? 0,
          ),
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
  const lpTokenMarketData = selectMarketDataByAssetIdUserCurrency(state, foxEthLpAssetId)
  const lpTokenPrice = lpTokenMarketData?.price

  const { assetReference } = fromAssetId(opportunityId)
  const { account } = fromAccountId(accountId)
  const accountAddress = getAddress(account)

  if (bnOrZero(lpTokenPrice).isZero()) {
    throw new Error(`Market data not ready for ${foxEthLpAssetId}`)
  }

  const maybeContractAddress = assetReference as string

  assertIsFoxEthStakingContractAddress(maybeContractAddress)

  const foxFarmingContract = getOrCreateContractByAddress(maybeContractAddress)

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
