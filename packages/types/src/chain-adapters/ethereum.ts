import { AssetBalance } from '.'

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
  gasPrice: string
  gasLimit: string
  erc20ContractAddress?: string
}
export type GetFeeDataInput = {
  contractAddress?: string
  from: string
  contractData?: string
}
