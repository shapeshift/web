import type { Network } from '@shapeshiftoss/bitcoinjs-lib'

export type Utxo = {
  txid: string
  vout: number
  value: bigint
}

export type BuildTransferPsbtArgs = {
  network?: Network
  address: string
  publicKey?: string
  utxos: Utxo[]
  getPrevTxHex: (txid: string) => Promise<string>
  to: string
  amount: bigint
  opReturnData?: string
  feePerByte: bigint
}

export type BuiltTransferPsbt = {
  psbt: string
  signInputs: { address: string; index: number }[]
}

export type FinalizeSignedPsbtArgs = {
  signedPsbt: string
  network?: Network
}

export type FinalizedTransfer = {
  txHex: string
  txid: string
}

export type AddressType = 'pkh' | 'sh' | 'wpkh' | 'tr'

export type SpendData = { redeemScript?: Uint8Array; tapInternalKey?: Uint8Array }
