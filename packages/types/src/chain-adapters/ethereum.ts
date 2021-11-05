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
  /**
   * estimated gas units in gwei
   */
  estimatedGas?: string
  /**
   * gas price per gwei
   */
  gasPrice?: string
  /**
   * total approval fee in eth
   */
  approvalFee?: string
  /**
   * total fee including approval
   */
  totalFee?: string
}

export type BuildTxInput = {
  fee: string
  gasLimit: string
  erc20ContractAddress?: string
}
