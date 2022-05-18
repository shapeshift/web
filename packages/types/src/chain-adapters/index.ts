import {
  BTCSignTx,
  CosmosSignTx,
  ETHSignTx,
  HDWallet,
  OsmosisSignTx
} from '@shapeshiftoss/hdwallet-core'

import { BIP44Params, ChainTypes, UtxoAccountType } from '../base'
import { ChainSpecific } from '../utility'
import * as bitcoin from './bitcoin'
import * as cosmos from './cosmos'
import * as ethereum from './ethereum'
import * as osmosis from './osmosis'
export { bitcoin, cosmos, ethereum }

type ChainSpecificAccount<T> = ChainSpecific<
  T,
  {
    [ChainTypes.Ethereum]: ethereum.Account
    [ChainTypes.Bitcoin]: bitcoin.Account
    [ChainTypes.Cosmos]: cosmos.Account
    [ChainTypes.Osmosis]: osmosis.Account
  }
>

export type Account<T extends ChainTypes> = {
  balance: string
  pubkey: string
  chainId: string
  assetId: string
  chain: T
} & ChainSpecificAccount<T>

export type AssetBalance = {
  balance: string
  assetId: string
}

export enum FeeDataKey {
  Slow = 'slow',
  Average = 'average',
  Fast = 'fast'
}

type ChainSpecificFeeData<T> = ChainSpecific<
  T,
  {
    [ChainTypes.Ethereum]: ethereum.FeeData
    [ChainTypes.Bitcoin]: bitcoin.FeeData
    [ChainTypes.Cosmos]: cosmos.FeeData
    [ChainTypes.Osmosis]: osmosis.FeeData
  }
>

// ChainTypes.Ethereum:
// feePerUnit = gasPrice
// feePerTx = estimateGas (estimated transaction cost)
// feeLimit = gasLimit (max gas willing to pay)

// ChainTypes.Bitcoin:
// feePerUnit = sats/kbyte

export type FeeData<T extends ChainTypes> = {
  txFee: string
} & ChainSpecificFeeData<T>

export type FeeDataEstimate<T extends ChainTypes> = {
  [FeeDataKey.Slow]: FeeData<T>
  [FeeDataKey.Average]: FeeData<T>
  [FeeDataKey.Fast]: FeeData<T>
}

export type SubscribeTxsInput = {
  wallet: HDWallet
  bip44Params?: BIP44Params
  accountType?: UtxoAccountType
}

export type TxFee = {
  assetId: string
  value: string
}

export enum TxType {
  Send = 'send',
  Receive = 'receive',
  Contract = 'contract',
  Unknown = 'unknown'
}

export enum TxStatus {
  Confirmed = 'confirmed',
  Pending = 'pending',
  Failed = 'failed',
  Unknown = 'unknown'
}

export type Transaction<T extends ChainTypes> = {
  address: string
  blockHash?: string
  blockHeight: number
  blockTime: number
  chain: T
  chainId: string
  confirmations: number
  txid: string
  fee?: TxFee
  status: TxStatus
  tradeDetails?: TradeDetails
  transfers: Array<TxTransfer>
  data?: TxMetadata
}

export enum TradeType {
  Trade = 'trade',
  Refund = 'refund'
}

export type TradeDetails = {
  dexName: string
  memo?: string
  type: TradeType
}

export interface TxMetadata {
  method?: string
  parser: string
}

export type TxTransfer = {
  assetId: string
  from: string
  to: string
  type: TxType
  value: string
}

export type SubscribeError = {
  message: string
}

export type TxHistoryResponse<T extends ChainTypes> = {
  cursor: string
  pubkey: string
  transactions: Array<Transaction<T>>
}

type ChainTxTypeInner = {
  [ChainTypes.Ethereum]: ETHSignTx
  [ChainTypes.Bitcoin]: BTCSignTx
  [ChainTypes.Cosmos]: CosmosSignTx
  [ChainTypes.Osmosis]: OsmosisSignTx
}

export type ChainTxType<T> = T extends keyof ChainTxTypeInner ? ChainTxTypeInner[T] : never

export type BuildDelegateTxInput<T extends ChainTypes> = {
  validator: string
  value: string
  wallet: HDWallet
  bip44Params?: BIP44Params
  memo?: string
} & ChainSpecificBuildTxData<T>

export type BuildUndelegateTxInput<T extends ChainTypes> = {
  validator: string
  value: string
  wallet: HDWallet
  bip44Params?: BIP44Params
  memo?: string
} & ChainSpecificBuildTxData<T>

export type BuildRedelegateTxInput<T extends ChainTypes> = {
  fromValidator: string
  toValidator: string
  value: string
  wallet: HDWallet
  bip44Params?: BIP44Params
  memo?: string
} & ChainSpecificBuildTxData<T>

export type BuildClaimRewardsTxInput<T extends ChainTypes> = {
  validator: string
  wallet: HDWallet
  bip44Params?: BIP44Params
  memo?: string
} & ChainSpecificBuildTxData<T>

export type BuildSendTxInput<T extends ChainTypes> = {
  to: string
  value: string
  wallet: HDWallet
  bip44Params?: BIP44Params // TODO maybe these shouldnt be optional
  sendMax?: boolean
  memo?: string
} & ChainSpecificBuildTxData<T>

type ChainSpecificBuildTxData<T> = ChainSpecific<
  T,
  {
    [ChainTypes.Ethereum]: ethereum.BuildTxInput
    [ChainTypes.Bitcoin]: bitcoin.BuildTxInput
    [ChainTypes.Cosmos]: cosmos.BuildTxInput
    [ChainTypes.Osmosis]: cosmos.BuildTxInput
  }
>

export type SignTxInput<TxType> = {
  txToSign: TxType
  wallet: HDWallet
}

export interface TxHistoryInput {
  readonly cursor?: string
  readonly pubkey: string
  readonly pageSize?: number
}

export type GetAddressInputBase = {
  wallet: HDWallet
  bip44Params?: BIP44Params
  /**
   * Request that the address be shown to the user by the device, if supported
   */
  showOnDevice?: boolean
}

export type GetAddressInput = GetAddressInputBase | bitcoin.GetAddressInput

type ChainSpecificGetFeeDataInput<T> = ChainSpecific<
  T,
  {
    [ChainTypes.Ethereum]: ethereum.GetFeeDataInput
    [ChainTypes.Bitcoin]: bitcoin.GetFeeDataInput
  }
>
export type GetFeeDataInput<T extends ChainTypes> = {
  to: string
  value: string
  sendMax?: boolean
} & ChainSpecificGetFeeDataInput<T>

export enum ValidAddressResultType {
  Valid = 'valid',
  Invalid = 'invalid'
}

export type ValidAddressResult = {
  /** Is this Address valid */
  valid: boolean
  /** Result type of valid address */
  result: ValidAddressResultType
}

export type ZrxFeeResult = {
  fast: number
  instant: number
  low: number
  source:
    | 'ETH_GAS_STATION'
    | 'ETHERSCAN'
    | 'ETHERCHAIN'
    | 'GAS_NOW'
    | 'MY_CRYPTO'
    | 'UP_VEST'
    | 'GETH_PENDING'
    | 'MEDIAN'
    | 'AVERAGE'
  standard: number
  timestamp: number
}

export type ZrxGasApiResponse = {
  result: ZrxFeeResult[]
}
