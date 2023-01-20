import { ChainId } from '@shapeshiftoss/caip'
import { HDWallet } from '@shapeshiftoss/hdwallet-core'
import * as unchained from '@shapeshiftoss/unchained-client'

import * as common from '../types'

export type Account = {
  nonce: number
  tokens?: common.AssetBalance[]
}

export type BuildCustomTxInput = {
  wallet: HDWallet
  accountNumber: number
  to: string
  data: string
  value: string
  gasLimit: string
} & Fees

export type BuildTxInput = {
  gasLimit: string
  erc20ContractAddress?: string
} & Fees

export type EstimateFeeDataInput<T extends ChainId> = common.GetFeeDataInput<T> & {
  gasFeeData: GasFeeDataEstimate
}

export type EstimateGasRequest = {
  from: string
  to: string
  value: string
  data: string
}

export type FeeData = {
  gasPrice: string
  gasLimit: string
  maxFeePerGas?: string
  maxPriorityFeePerGas?: string
}

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

export type GasFeeData = Omit<FeeData, 'gasLimit'>

export type GasFeeDataEstimate = {
  [common.FeeDataKey.Fast]: GasFeeData
  [common.FeeDataKey.Average]: GasFeeData
  [common.FeeDataKey.Slow]: GasFeeData
}

export type GetFeeDataInput = {
  contractAddress?: string
  from: string
  contractData?: string
}

export type TransactionMetadata = unchained.evm.TxMetadata
