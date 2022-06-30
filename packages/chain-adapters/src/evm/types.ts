import { AssetBalance } from '../types'

export type Account = {
  nonce: number
  tokens?: Array<AssetBalance>
}

export type FeeData = {
  gasPrice: string
  gasLimit: string
  maxFeePerGas: string
  maxPriorityFeePerGas: string
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

export type BuildTxInput = {
  gasLimit: string
  erc20ContractAddress?: string
} & Fees

export type GetFeeDataInput = {
  contractAddress?: string
  from: string
  contractData?: string
}
