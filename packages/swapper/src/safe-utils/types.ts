import type { AccountId, ChainId } from '@shapeshiftoss/caip'

export type SafeTxInfo = {
  transaction: SafeMultisigTransactionSuccess | null
  isSafeTxHash: boolean
}

type SafeMultisigConfirmationResponse = {
  owner: string
  submissionDate: string
  transactionHash?: string
  confirmationType?: string
  signature: string
  signatureType?: string
}

// https://github.com/safe-global/safe-core-sdk/blob/a9e595af13d1b8b8190c7088dcedd8d90b003c27/packages/safe-core-sdk-types/src/types.ts#L214
export type SafeMultisigTransactionSuccess = {
  safe: string
  to: string
  value: string
  data?: string
  operation: number
  gasToken: string
  safeTxGas: number
  baseGas: number
  gasPrice: string
  refundReceiver?: string
  nonce: number
  executionDate: string
  submissionDate: string
  modified: string
  blockNumber?: number
  transactionHash: string
  safeTxHash: string
  executor?: string
  proposer: string
  isExecuted: boolean
  isSuccessful?: boolean
  ethGasPrice?: string
  gasUsed?: number
  fee?: string
  origin: string
  dataDecoded?: string
  confirmationsRequired: number
  confirmations?: SafeMultisigConfirmationResponse[]
  trusted: boolean
  signatures?: string
}

export type SafeTransactionError = {
  detail: string
}

export type FetchSafeTransactionArgs = {
  safeTxHash: string
  accountId: AccountId
  fetchIsSmartContractAddressQuery: (userAddress: string, chainId: ChainId) => Promise<boolean>
}
