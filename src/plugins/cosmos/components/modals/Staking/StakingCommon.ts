import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { cosmosAssetId, cosmosChainId, osmosisAssetId, osmosisChainId } from '@shapeshiftoss/caip'
import { bnOrZero } from 'lib/bignumber/bignumber'

export enum StakingAction {
  Stake = 'stake',
  Unstake = 'unstake',
  Overview = 'overview',
  Claim = 'claim',
}

// UnbondingTime is an IBC-chain specific parameter
// Hardcoded to CosmosHub and Osmosis staking for now, but in the future we should find a better home for this with the right unbonding days per protocol-level unbonding days
// https://docs.cosmos.network/v0.44/modules/staking/08_params.html
export const COSMOS_UNBONDING_DAYS = '21'
export const OSMOSIS_UNBONDING_DAYS = '14'

export const isCosmosChainId = (chainId: ChainId) => chainId === cosmosChainId
export const isOsmosisChainId = (chainId: ChainId) => chainId === osmosisChainId
export const isCosmosAssetId = (assetId: AssetId) => assetId === cosmosAssetId
export const isOsmosisAssetId = (assetId: AssetId) => assetId === osmosisAssetId

export const assetIdToUnbondingDays = (assetId: AssetId): string => {
  const assetIdToUnbondingDaysMap: Record<AssetId, string> = {
    [cosmosAssetId]: COSMOS_UNBONDING_DAYS,
    [osmosisAssetId]: OSMOSIS_UNBONDING_DAYS,
  }
  return assetIdToUnbondingDaysMap[assetId]
}

export function calculateYearlyYield(apy: string, amount: string = '') {
  return bnOrZero(amount).times(apy).toString()
}
