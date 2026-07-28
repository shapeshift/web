// 0x settler convention: sign eip712, then append a 32-byte signature-length word followed by
// the signature to the transaction data before broadcasting
export type ZrxPermit2SignatureRequired = {
  type: 'zrx_permit2'
  eip712: Record<string, unknown>
}

export type EvmTransactionData = {
  type: 'evm'
  chainId: number
  to: string
  data: string
  value: string
  gasLimit?: string
  signatureRequired?: ZrxPermit2SignatureRequired
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
