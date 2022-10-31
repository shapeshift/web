import { BIP44Params } from '@shapeshiftoss/types'
import * as unchained from '@shapeshiftoss/unchained-client'

import * as types from '../types'
import { CosmosSdkChainId } from './CosmosSdkBaseAdapter'

export type Account = {
  sequence: string
  accountNumber: string
  delegations: Delegation[]
  redelegations: Redelegation[]
  undelegations: Undelegation[]
  rewards: ValidatorReward[]
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
  bip44Params: BIP44Params
  msg: Message
  memo?: string
} & types.ChainSpecificBuildTxData<T>

export type BuildTxInput = { gas: string; fee: string }

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

export type TransactionMetadata = unchained.cosmossdk.TxMetadata
