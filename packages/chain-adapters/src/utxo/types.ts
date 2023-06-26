import type { UtxoAccountType } from '@shapeshiftoss/types'

import type { GetAddressInputBase } from '../types'

export type Account = {
  /** Derived addresses and associated balances if account is xpub based (gap limit 20) */
  addresses?: Address[]
  /** Next unused change address index for current account if account is xpub based */
  nextChangeAddressIndex?: number
  /** Next unused receive address index for current account if account is xpub based */
  nextReceiveAddressIndex?: number
}

export type Address = {
  pubkey: string
  balance: string
}

export type GetAddressInput = GetAddressInputBase & {
  accountType?: UtxoAccountType
}

export type TransactionSpecific = {
  opReturnData?: string
}

export type ScriptSig = {
  hex: string
  asm: string
}

export type Vin = {
  txinwitness?: string
  scriptSig?: ScriptSig
  coinbase?: string
  sequence?: number
  vout?: number
  txid?: string
}

export type Vout = {
  scriptPubKey?: ScriptPubKey
  n?: number
  value?: string | number
}

export type ScriptPubKey = {
  addresses: string[]
  type: string
  reqSigs: number
  hex: string
  asm: string
}

export type NodeTransaction = {
  txid: string
  hash: string
  version: number
  size: number
  vsize: number
  weight: number
  locktime: number
  vin: Vin[]
  vout: Vout[]
  hex: string
  blockhash: string
  confirmations: number
  time: number
  blocktime: number
}

export type FeeData = {
  satoshiPerByte: string
}

export type BuildTxInput = {
  // The from address UTXOs should be filtered by
  // Note, this voids all privacy guarantees of UTXO-based chains
  from?: string
  opReturnData?: string
  accountType: UtxoAccountType
  satoshiPerByte: string
}

export type GetFeeDataInput = {
  from?: string
  pubkey: string
  opReturnData?: string
}
