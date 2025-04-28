import type { AssetId } from '@shapeshiftoss/caip'
import type { CosmosSdkChainId } from '@shapeshiftoss/types'
import type * as unchained from '@shapeshiftoss/unchained-client'

import type * as types from '../types'

export type Account = {
  sequence: string
  accountNumber: string
  delegations: Delegation[]
  redelegations: Redelegation[]
  undelegations: Undelegation[]
  rewards: ValidatorReward[]
  assets: CosmosSDKToken[]
}

export enum ThorchainMessageType {
  MsgDeposit = 'thorchain/MsgDeposit',
  MsgSend = 'thorchain/MsgSend',
}

export enum MayachainMessageType {
  MsgDeposit = 'thorchain/MsgDeposit',
  MsgSend = 'thorchain/MsgSend',
}

export enum CosmosSdkMessageType {
  MsgBeginRedelegate = 'cosmos-sdk/MsgBeginRedelegate',
  MsgDelegate = 'cosmos-sdk/MsgDelegate',
  MsgSend = 'cosmos-sdk/MsgSend',
  MsgUndelegate = 'cosmos-sdk/MsgUndelegate',
  MsgWithdrawDelegationReward = 'cosmos-sdk/MsgWithdrawDelegationReward',
}

type MsgDeposit<
  T = ThorchainMessageType.MsgDeposit | MayachainMessageType.MsgDeposit,
  U = 'THOR.RUNE' | 'MAYA.CACAO',
> = {
  type: T
  value: {
    coins: [{ asset: U; amount: string }]
    memo: string
    signer: string
  }
}

type MsgSend<T = ThorchainMessageType.MsgSend | MayachainMessageType.MsgSend> = {
  type: T
  value: {
    amount: [{ amount: string; denom: string }]
    from_address: string
    to_address: string
  }
}

export type ThorchainMsgDeposit = MsgDeposit<ThorchainMessageType.MsgDeposit, 'THOR.RUNE'>
export type ThorchainMsgSend = MsgSend<ThorchainMessageType.MsgSend>

export type MayachainMsgDeposit = MsgDeposit<MayachainMessageType.MsgDeposit, 'MAYA.CACAO'>
export type MayachainMsgSend = MsgSend<MayachainMessageType.MsgSend>

export type CosmosSdkMsgBeginRedelegate = {
  type: CosmosSdkMessageType.MsgBeginRedelegate
  value: {
    amount: { amount: string; denom: string }
    delegator_address: string
    validator_src_address: string
    validator_dst_address: string
  }
}

export type CosmosSdkMsgDelegate = {
  type: CosmosSdkMessageType.MsgDelegate
  value: {
    amount: { amount: string; denom: string }
    delegator_address: string
    validator_address: string
  }
}

export type CosmosSdkMsgSend = {
  type: CosmosSdkMessageType.MsgSend
  value: {
    amount: [{ amount: string; denom: string }]
    from_address: string
    to_address: string
  }
}

export type CosmosSdkMsgUndelegate = {
  type: CosmosSdkMessageType.MsgUndelegate
  value: {
    amount: { amount: string; denom: string }
    delegator_address: string
    validator_address: string
  }
}

export type CosmosSdkMsgWithdrawDelegationReward = {
  type: CosmosSdkMessageType.MsgWithdrawDelegationReward
  value: {
    delegator_address: string
    validator_address: string
  }
}

export type Message =
  | ThorchainMsgDeposit
  | ThorchainMsgSend
  | MayachainMsgDeposit
  | MayachainMsgSend
  | CosmosSdkMsgBeginRedelegate
  | CosmosSdkMsgDelegate
  | CosmosSdkMsgSend
  | CosmosSdkMsgUndelegate
  | CosmosSdkMsgWithdrawDelegationReward

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
