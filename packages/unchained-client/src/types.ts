// these are user facing values, and should be rendered as such
export enum Dex {
  Thor = 'THORChain',
  Zrx = '0x',
  CowSwap = 'CoW Swap',
  Osmosis = 'Osmosis',
}

export interface Fee {
  assetId: string
  value: string
}

// these are user facing values, and should be rendered as such
export enum TxStatus {
  Confirmed = 'Confirmed',
  Pending = 'Pending',
  Failed = 'Failed',
  Unknown = 'Unknown',
}

export interface Token {
  contract: string
  decimals: number
  name: string
  symbol: string
}

export interface Trade {
  dexName: Dex
  memo?: string
  type: TradeType
}

// these are user facing values, and should be rendered as such
export enum TradeType {
  Trade = 'Trade',
  Refund = 'Refund',
}

export interface Transfer {
  from: string
  to: string
  assetId: string
  type: TransferType
  totalValue: string
  components: { value: string }[]
  token?: Token
  id?: string
}

// these are user facing values, and should be rendered as such
export enum TransferType {
  Send = 'Send',
  Receive = 'Receive',
  Contract = 'Contract',
}

export interface BaseTxMetadata {
  method?: string
  parser: string
}

export interface StandardTx {
  address: string
  blockHash?: string
  blockHeight: number
  blockTime: number
  chainId: string
  confirmations: number
  fee?: Fee
  status: TxStatus
  trade?: Trade
  transfers: Transfer[]
  txid: string
}

export type ParsedTx = StandardTx
