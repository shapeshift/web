import { CAIP19 } from '@shapeshiftoss/caip'

export enum StakingAction {
  Stake = 'stake',
  Unstake = 'unstake',
  Overview = 'overview',
  Claim = 'claim'
}

export type StakingModalProps = {
  assetId: CAIP19
  action: StakingAction
  validatorAddress: string
}

export enum StakeRoutes {
  Stake = '/stake',
  Unstake = '/unstake',
  StakeConfirm = '/stake/confirm',
  UnstakeConfirm = '/unstake/confirm',
  Overview = '/stake/overview',
  Claim = '/claim'
}

export const entries = [
  StakeRoutes.Stake,
  StakeRoutes.Unstake,
  StakeRoutes.StakeConfirm,
  StakeRoutes.UnstakeConfirm,
  StakeRoutes.Overview
]

export enum UnstakingPath {
  Confirm = '/unstaking/confirm',
  Broadcast = '/unstaking/broadcast'
}

export enum StakingPath {
  Confirm = '/staking/confirm',
  Broadcast = '/staking/broadcast'
}

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
