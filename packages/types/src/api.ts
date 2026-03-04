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

export type UtxoPsbtTransactionData = {
  type: 'utxo_psbt'
  psbt: string
  opReturnData?: string
}

export type UtxoDepositTransactionData = {
  type: 'utxo_deposit'
  depositAddress: string
  memo: string
  value: string
}

export type UtxoTransactionData = UtxoPsbtTransactionData | UtxoDepositTransactionData

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
