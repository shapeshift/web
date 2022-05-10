export enum Dex {
  Thor = 'thor',
  Zrx = 'zrx'
}

export interface Fee {
  assetId: string
  value: string
}

export enum Status {
  Confirmed = 'confirmed',
  Pending = 'pending',
  Failed = 'failed',
  Unknown = 'unknown'
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

export enum TradeType {
  Trade = 'trade',
  Refund = 'refund'
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

export enum TransferType {
  Send = 'send',
  Receive = 'receive'
}

export enum TxParser {
  Cosmos = 'cosmos',
  Yearn = 'yearn',
  UniV2 = 'uniV2',
  ZRX = 'zrx',
  Thor = 'thor',
  Foxy = 'foxy',
  WETH = 'weth'
}

export interface StandardTxMetadata {
  method?: string
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
  status: Status
  trade?: Trade
  transfers: Array<Transfer>
  txid: string
}

export type Tx = StandardTx
