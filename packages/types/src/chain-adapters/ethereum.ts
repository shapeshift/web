import { ContractTypes } from '../base'

export type Account = {
  nonce: number
  tokens?: Array<TokenWithBalance>
}

export type Token = {
  contract: string
  precision: number
  name: string
  symbol: string
  contractType: ContractTypes
}

export type TokenWithBalance = Token & {
  balance: string
}

export type TxTransfer = {
  token?: Token
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
