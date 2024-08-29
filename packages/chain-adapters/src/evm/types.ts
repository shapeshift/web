import type { ChainId } from '@shapeshiftoss/caip'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import type * as unchained from '@shapeshiftoss/unchained-client'

import type * as common from '../types'

export type Account = {
  nonce: number
  tokens?: Token[]
}

// Token includes additional metadata for creating a placeholder asset if needed
export type Token = common.AssetBalance & {
  symbol: string
  name: string
  precision: number
}

export type BuildCustomTxInput = {
  wallet: HDWallet
  accountNumber: number
  to: string
  data: string
  value: string
  gasLimit: string
  checkLedgerAppOpenIfLedgerConnected: (chainId: ChainId) => Promise<void>
} & Fees

export type BuildCustomApiTxInput = Omit<
  BuildCustomTxInput,
  'wallet' | 'checkLedgerAppOpenIfLedgerConnected'
> & { from: string }

export type BuildTxInput = {
  gasLimit: string
  contractAddress?: string
  data?: string
  sendmax?: never
} & Fees &
  L1FeeData

export type EstimateFeeDataInput<T extends ChainId> = common.GetFeeDataInput<T> & {
  gasFeeData: GasFeeDataEstimate
}

export type EstimateGasRequest = {
  from: string
  to: string
  value: string
  data: string
}

export type L1FeeData = {
  l1GasPrice?: string
  l1GasLimit?: string
}

export type FeeData = {
  gasPrice: string
  gasLimit: string
  maxFeePerGas?: string
  maxPriorityFeePerGas?: string
} & L1FeeData

export type Fees =
  | {
      gasPrice: string
      maxFeePerGas?: never
      maxPriorityFeePerGas?: never
    }
  | {
      gasPrice?: never
      maxFeePerGas: string
      maxPriorityFeePerGas: string
    }

export type GasFeeData = Omit<FeeData, 'gasLimit' | 'l1GasLimit'>

export type GasFeeDataEstimate = {
  [common.FeeDataKey.Fast]: GasFeeData
  [common.FeeDataKey.Average]: GasFeeData
  [common.FeeDataKey.Slow]: GasFeeData
}

export type GetFeeDataInput = {
  contractAddress?: string
  from: string
  data?: string
  sendMax?: never
}

export type TransactionMetadata = unchained.evm.TxMetadata
