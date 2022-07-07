import {
  AssetId,
  ChainId,
  cosmosAssetId,
  cosmosChainId,
  osmosisAssetId,
  osmosisChainId,
} from '@shapeshiftoss/caip'
import { FeeDataKey } from '@shapeshiftoss/chain-adapters'

export enum StakingAction {
  Stake = 'stake',
  Unstake = 'unstake',
  Overview = 'overview',
  Claim = 'claim',
}

export type StakingModalProps = {
  assetId: AssetId
  validatorAddress: string
}

export enum StakeRoutes {
  Stake = '/stake',
  Unstake = '/unstake',
  Overview = '/overview',
}

export enum UnstakingPath {
  Confirm = '/unstaking/confirm',
  Broadcast = '/unstaking/broadcast',
}

export enum StakingPath {
  Confirm = '/staking/confirm',
  Broadcast = '/staking/broadcast',
}

export enum ClaimPath {
  Confirm = '/claim/confirm',
  Broadcast = '/claim/broadcast',
}

export const entries = [
  StakeRoutes.Overview,
  StakeRoutes.Stake,
  StakingPath.Confirm,
  StakingPath.Broadcast,
  StakeRoutes.Unstake,
  UnstakingPath.Confirm,
  UnstakingPath.Broadcast,
  ClaimPath.Confirm,
  ClaimPath.Broadcast,
]

export enum InputType {
  Crypto = 'crypto',
  Fiat = 'fiat',
}

export enum Field {
  AmountFieldError = 'amountFieldError',
  FiatAmount = 'fiatAmount',
  CryptoAmount = 'cryptoAmount',
  FeeType = 'feeType',
  GasLimit = 'gasLimit',
  TxFee = 'txFee',
  FiatFee = 'fiatFee',
}

export type StakingValues = {
  [Field.FiatAmount]: string
  [Field.CryptoAmount]: string
  [Field.FeeType]: FeeDataKey
  [Field.GasLimit]: string
  [Field.TxFee]: string
  [Field.FiatFee]: string
  [Field.AmountFieldError]: string | [string, { asset: string }]
}

export const stakeSteps = [
  { step: 0, path: StakeRoutes.Stake, label: 'Amount' },
  { step: 1, path: StakingPath.Confirm, label: 'Confirm' },
  { step: 2, path: StakingPath.Broadcast, label: 'Broadcast' },
]

export const unstakeSteps = [
  { step: 0, path: StakeRoutes.Unstake, label: 'Amount' },
  { step: 1, path: UnstakingPath.Confirm, label: 'Confirm' },
  { step: 2, path: UnstakingPath.Broadcast, label: 'Broadcast' },
]

export const claimSteps = [
  { step: 0, path: ClaimPath.Confirm, label: 'Confirm' },
  { step: 1, path: ClaimPath.Broadcast, label: 'Broadcast' },
]

// TODO(gomes): Make this dynamic, this should come from chain-adapters when ready there
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
