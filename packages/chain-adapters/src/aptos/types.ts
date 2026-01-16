export type AptosAccount = {
  resources: Array<{
    type: string
    data: any
  }>
  accountSequence: string
}

export type AptosFeeData = {
  maxGasAmount: string
  gasUnitPrice: string
}

export type AptosBuildTxInput = {
  from: string
  to: string
  value: string
  maxGasAmount?: string
  gasUnitPrice?: string
}

export type AptosGetFeeDataInput = {
  from: string
  to: string
  value: string
}

export type AptosSignTx = {
  addressNList: number[]
  transactionBytes: Uint8Array
}

export type AptosSignedTx = {
  signature: string
  publicKey: string
  transactionBytes: Uint8Array
}
