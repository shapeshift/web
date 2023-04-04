import type { AssetId } from '@shapeshiftoss/caip'
import type * as unchained from '@shapeshiftoss/unchained-client'

import type * as types from '../types'
import type { CosmosSdkChainId } from './CosmosSdkBaseAdapter'

export type Account = {
  sequence: string
  accountNumber: string
  delegations: Delegation[]
  redelegations: Redelegation[]
  undelegations: Undelegation[]
  rewards: ValidatorReward[]
  assets: CosmosSDKToken[]
}

export type Message = {
  type: string
  value: Record<string, unknown>
}

export type ValidatorAction = {
  address: string
  type: 'delegate' | 'undelegate' | 'redelegate' | 'claim'
}

export type BuildTransactionInput<T extends CosmosSdkChainId> = {
  account: types.Account<T>
  accountNumber: number
  msg: Message
  memo?: string
} & types.ChainSpecificBuildTxData<T>

export type BuildTxInput = { gas: string; fee: string; denom?: string }

export type Info = {
  totalSupply: string
  bondedTokens: string
}

export type Validator = {
  address: string
  moniker: string
  tokens?: string
  apr: string
  commission: string
}

export type Delegation = {
  assetId: string
  amount: string
  validator: Validator
}

export type RedelegationEntry = {
  assetId: string
  completionTime: number
  amount: string
}

export type Redelegation = {
  destinationValidator: Validator
  sourceValidator: Validator
  entries: RedelegationEntry[]
}

export type UndelegationEntry = {
  assetId: string
  completionTime: number
  amount: string
}

export type Undelegation = {
  validator: Validator
  entries: UndelegationEntry[]
}

export type Reward = {
  assetId: string
  amount: string
}

export type ValidatorReward = {
  validator: Validator
  rewards: Reward[]
}

export type FeeData = {
  gasLimit: string
}

export type CosmosSDKToken = {
  assetId: AssetId
  amount: string
}

export type TransactionMetadata = unchained.cosmossdk.TxMetadata
