import type { ChainId } from '@shapeshiftoss/caip'

export type SafeTxInfo = {
  transaction: SafeTransactionSuccess | null
  isSafeTxHash: boolean
}

export type SafeTransactionSuccess = {
  safe: string
  to: string
  value: string
  data: string
  operation: number
  gasToken: string
  safeTxGas: number
  baseGas: number
  gasPrice: string
  refundReceiver: string
  nonce: number
  executionDate: string | null
  submissionDate: string
  modified: string
  blockNumber: number | null
  transactionHash: string | null
  safeTxHash: string
  proposer: string
  executor: string | null
  isExecuted: boolean
  isSuccessful: boolean | null
  ethGasPrice: string | null
  maxFeePerGas: string | null
  maxPriorityFeePerGas: string | null
  gasUsed: number | null
  fee: string | null
  origin: string
  dataDecoded: any
  confirmationsRequired: number
  confirmations: {
    owner: string
    submissionDate: string
    transactionHash: string | null
    signature: string
    signatureType: string
  }[]
  trusted: boolean
  signatures: string | null
}

export type SafeTransactionError = {
  detail: string
}

export type FetchSafeTransactionArgs = {
  chainId: ChainId
  maybeSafeTxHash: string
}
