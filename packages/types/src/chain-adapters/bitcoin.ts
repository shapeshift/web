import { BTCInputScriptType } from '@shapeshiftoss/hdwallet-core'

import { GetAddressInputBase } from '.'

export type Account = {
  /** Derived addresses and associated balances if account is xpub based (gap limit 20) */
  addresses?: Array<Address>
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
  scriptType: BTCInputScriptType
}

export type TransactionSpecific = {
  opReturnData?: string
}

export type Recipient = {
  value: number
  address?: string
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
  addresses: Array<string>
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
  vin: Array<Vin>
  vout: Array<Vout>
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
  opReturnData?: string
  scriptType: BTCInputScriptType
  satoshiPerByte: string
}

export type GetFeeDataInput = {
  pubkey: string
}
