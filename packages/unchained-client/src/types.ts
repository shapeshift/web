// these are user facing values, and should be rendered as such
export enum Dex {
  Thor = 'THORChain',
  Zrx = '0x',
  CowSwap = 'CowSwap'
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
  Unknown = 'Unknown'
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
  Refund = 'Refund'
}

export interface Transfer {
  from: string
  to: string
  assetId: string
  type: TransferType
  totalValue: string
  components: Array<{ value: string }>
  token?: Token
}

// these are user facing values, and should be rendered as such
export enum TransferType {
  Send = 'Send',
  Receive = 'Receive',
  Contract = 'Contract'
}

export enum TxParser {
  Cosmos = 'cosmos',
  Yearn = 'yearn',
  UniV2 = 'uniV2',
  ZRX = 'zrx',
  Thor = 'thor',
  Foxy = 'foxy',
  WETH = 'weth',
  CowSwap = 'cowswap'
}

export interface BaseTxMetadata {
  method?: string
  parser: string
}

export interface StandardTxMetadata extends BaseTxMetadata {
  parser: TxParser
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
  transfers: Array<Transfer>
  txid: string
}

export type ParsedTx = StandardTx
