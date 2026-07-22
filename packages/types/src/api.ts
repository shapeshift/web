export type Permit2SignatureRequired = {
  type: 'permit2'
  eip712: Record<string, unknown>
}

export type EvmTransactionData = {
  type: 'evm'
  chainId: number
  to: string
  data: string
  value: string
  gasLimit?: string
  signatureRequired?: Permit2SignatureRequired
}

export type SolanaTransactionData = {
  type: 'solana'
  instructions: {
    programId: string
    keys: {
      pubkey: string
      isSigner: boolean
      isWritable: boolean
    }[]
    data: string
  }[]
  addressLookupTableAddresses: string[]
}

export type UtxoTransactionData = {
  type: 'utxo'
  to: string
  opReturnData?: string
  value: string
}

export type CosmosTransactionData = {
  type: 'cosmos'
  chainId: string
  to: string
  value: string
  memo?: string
}

export type TransactionData =
  | EvmTransactionData
  | SolanaTransactionData
  | UtxoTransactionData
  | CosmosTransactionData
