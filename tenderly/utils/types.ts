export type EstimateGasParams = {
  from?: string
  to: string
  gas?: number
  gasPrice?: number
  value?: number
  data?: string
}

export type Transaction = {
  blockHash?: string
  blockNumber?: string
  from: string
  gas: string
  gasPrice: string
  maxFeePerGas: string
  maxPriorityFeePerGas: string
  hash: string
  input: string
  nonce: string
  to: string
  transactionIndex?: string
  value: string
  type: string
  accessList: string
  chainId?: string
  v: string
  r: string
  s: string
}
