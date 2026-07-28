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
  type: 'solana_instructions'
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

export type SolanaSerializedTxTransactionData = {
  type: 'solana_serialized_tx'
  serializedTx: string
}

export type UtxoTransactionData = {
  type: 'utxo'
  to: string
  opReturnData?: string
  value: string
}

export type CosmosSdkMsgSendTransactionData = {
  type: 'cosmossdk_msg_send'
  chainId: string
  to: string
  denom: string
  value: string
  memo?: string
}

export type CosmosSdkMsgDepositTransactionData = {
  type: 'cosmossdk_msg_deposit'
  chainId: string
  value: string
  memo: string
  coin: string
}

export type TransactionData =
  | EvmTransactionData
  | SolanaTransactionData
  | SolanaSerializedTxTransactionData
  | UtxoTransactionData
  | CosmosSdkMsgSendTransactionData
  | CosmosSdkMsgDepositTransactionData
