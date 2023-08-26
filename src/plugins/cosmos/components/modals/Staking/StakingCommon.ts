import type { AssetId } from '@shapeshiftoss/caip'
import { cosmosAssetId } from '@shapeshiftoss/caip'
import type { cosmos } from '@shapeshiftoss/chain-adapters'
import { bnOrZero } from 'lib/bignumber/bignumber'

export enum StakingAction {
  Stake = 'stake',
  Unstake = 'unstake',
  Overview = 'overview',
  Claim = 'claim',
}

// UnbondingTime is an IBC-chain specific parameter
// Hardcoded to CosmosHub staking for now, but in the future we should find a better home for this with the right unbonding days per protocol-level unbonding days
// https://docs.cosmos.network/v0.44/modules/staking/08_params.html
export const COSMOS_UNBONDING_DAYS = '21'

export const isStakingChainAdapter = (adapter: unknown): adapter is cosmos.ChainAdapter => {
  const a = adapter as cosmos.ChainAdapter

  return (
    a.buildClaimRewardsTransaction !== undefined &&
    a.buildDelegateTransaction !== undefined &&
    a.buildUndelegateTransaction !== undefined
  )
}

export const assetIdToUnbondingDays = (assetId: AssetId): string => {
  const assetIdToUnbondingDaysMap: Record<AssetId, string> = {
    [cosmosAssetId]: COSMOS_UNBONDING_DAYS,
  }
  return assetIdToUnbondingDaysMap[assetId]
}

export function calculateYearlyYield(apy: string, amount: string = '') {
  return bnOrZero(amount).times(apy).toString()
}
