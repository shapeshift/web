import { CAIP19 } from '@shapeshiftoss/caip'
import { BigNumber } from 'lib/bignumber/bignumber'

export enum StakingAction {
  Stake = 'stake',
  Unstake = 'unstake',
  Overview = 'overview',
  Claim = 'claim'
}

export type StakingModalProps = {
  assetId: CAIP19
  validatorAddress: string
}

export type StakingModalLocation = {
  cryptoAmount: BigNumber
  assetId: CAIP19
  fiatRate: BigNumber
  apr: string
}

export enum StakeRoutes {
  Stake = '/stake',
  Unstake = '/unstake',
  Overview = '/stake/overview',
  Claim = '/claim'
}

export enum UnstakingPath {
  Confirm = '/unstaking/confirm',
  Broadcast = '/unstaking/broadcast'
}

export enum StakingPath {
  Confirm = '/staking/confirm',
  Broadcast = '/staking/broadcast'
}

export enum ClaimPath {
  Confirm = '/claim/confirm',
  Broadcast = '/claim/broadcast'
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
  ClaimPath.Broadcast
]

export enum InputType {
  Crypto = 'crypto',
  Fiat = 'fiat'
}

export enum Field {
  FiatAmount = 'fiatAmount',
  CryptoAmount = 'cryptoAmount'
}

export type StakingValues = {
  [Field.FiatAmount]: string
  [Field.CryptoAmount]: string
}

export const stakeSteps = [
  { step: 0, path: StakeRoutes.Stake, label: 'Amount' },
  { step: 1, path: StakingPath.Confirm, label: 'Confirm' },
  { step: 2, path: StakingPath.Broadcast, label: 'Broadcast' }
]

export const unstakeSteps = [
  { step: 0, path: StakeRoutes.Unstake, label: 'Amount' },
  { step: 1, path: UnstakingPath.Confirm, label: 'Confirm' },
  { step: 2, path: UnstakingPath.Broadcast, label: 'Broadcast' }
]

export const claimSteps = [
  { step: 0, path: ClaimPath.Confirm, label: 'Confirm' },
  { step: 1, path: ClaimPath.Broadcast, label: 'Broadcast' }
]
