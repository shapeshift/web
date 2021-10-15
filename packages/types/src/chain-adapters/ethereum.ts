import { ContractTypes } from '../base'
import { FeeDataKey } from '.'

export type Account = {
  nonce: number
  tokens?: Array<Token>
}

export type Token = {
  balance: string
  contract: string
  precision: number
  name: string
  symbol: string
  contractType: ContractTypes
}

export type FeeData = {
  feePerTx: string
  feeLimit: string
}

export type QuoteFeeData = {
  fee?: string
  gas?: string
  estimatedGas?: string
  gasPrice?: string
  approvalFee?: string
  protocolFee?: string
  minimumProtocolFee?: string
  receiveNetworkFee?: string
}
