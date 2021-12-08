import { BTCSignTx, ETHSignTx, HDWallet } from '@shapeshiftoss/hdwallet-core'

import { BIP32Params, ChainTypes, NetworkTypes, SwapperType, UtxoAccountType } from '../base'
import { ChainAndSwapperSpecific, ChainSpecific } from '../utility'
import * as bitcoin from './bitcoin'
import * as ethereum from './ethereum'

export { bitcoin, ethereum }

type ChainSpecificAccount<T> = ChainSpecific<
  T,
  {
    [ChainTypes.Ethereum]: ethereum.Account
    [ChainTypes.Bitcoin]: bitcoin.Account
  }
>

export type Account<T extends ChainTypes> = {
  balance: string
  pubkey: string
  symbol: string
  chain: T
  network: NetworkTypes
} & ChainSpecificAccount<T>

type ChainSpecificTransaction<T> = ChainSpecific<
  T,
  {
    [ChainTypes.Bitcoin]: bitcoin.TransactionSpecific
  }
>

export type Transaction<T extends ChainTypes> = {
  network: NetworkTypes
  chain: T
  symbol: string
  txid: string
  status: string
  from: string
  to?: string
  blockHash?: string
  blockHeight?: number
  confirmations?: number
  timestamp?: number
  value: string
  fee: string
} & ChainSpecificTransaction<T>

export enum FeeDataKey {
  Slow = 'slow',
  Average = 'average',
  Fast = 'fast'
}

type ChainSpecificQuoteFeeData<T1, T2> = ChainAndSwapperSpecific<
  T1,
  {
    [ChainTypes.Ethereum]: ethereum.QuoteFeeData
  },
  T2,
  {
    [SwapperType.Thorchain]: {
      receiveFee: string
    }
  }
>

type ChainSpecificFeeData<T> = ChainSpecific<
  T,
  {
    [ChainTypes.Ethereum]: ethereum.FeeData
    [ChainTypes.Bitcoin]: bitcoin.FeeData
  }
>

export type QuoteFeeData<T1 extends ChainTypes, T2 extends SwapperType> = {
  fee: string
} & ChainSpecificQuoteFeeData<T1, T2>

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
  bip32Params?: BIP32Params
  accountType?: UtxoAccountType
}

export type TxFee = {
  caip19: string
  value: string
}

export enum TxType {
  Send = 'send',
  Receive = 'receive',
  Unknown = 'unknown'
}

export enum TxStatus {
  Confirmed = 'confirmed',
  Pending = 'pending',
  Failed = 'failed',
  Unknown = 'unknown'
}

export type SubscribeTxsMessage<T extends ChainTypes> = {
  address: string
  blockHash?: string
  blockHeight: number
  blockTime: number
  chain: T
  caip2: string
  confirmations: number
  txid: string
  fee?: TxFee
  status: TxStatus
  tradeDetails?: TradeDetails
  transfers: Array<TxTransfer>
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

export type TxTransfer = {
  caip19: string
  from: string
  to: string
  type: TxType
  value: string
}

export type SubscribeError = {
  message: string
}

export type TxHistoryResponse<T extends ChainTypes> = {
  page: number
  totalPages: number
  txs: number
  transactions: Array<Transaction<T>>
}

type ChainTxTypeInner = {
  [ChainTypes.Ethereum]: ETHSignTx
  [ChainTypes.Bitcoin]: BTCSignTx
}

export type ChainTxType<T> = T extends keyof ChainTxTypeInner ? ChainTxTypeInner[T] : never

export type BuildSendTxInput<T extends ChainTypes> = {
  to: string
  value: string
  wallet: HDWallet
  bip32Params?: BIP32Params // TODO maybe these shouldnt be optional
  sendMax?: boolean
} & ChainSpecificBuildTxData<T>

type ChainSpecificBuildTxData<T> = ChainSpecific<
  T,
  {
    [ChainTypes.Ethereum]: ethereum.BuildTxInput
    [ChainTypes.Bitcoin]: bitcoin.BuildTxInput
  }
>

export type SignTxInput<TxType> = {
  txToSign: TxType
  wallet: HDWallet
}

export interface TxHistoryInput {
  readonly pubkey: string
  readonly page?: number
  readonly pageSize?: number
  readonly contract?: string
}

export type GetAddressInputBase = {
  wallet: HDWallet
  bip32Params?: BIP32Params
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
