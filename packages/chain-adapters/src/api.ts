import { PaginationParams } from './types/PaginationParams.type'
import { ETHSignTx, HDWallet } from '@shapeshiftoss/hdwallet-core'

type Transaction = {
  network: string
  symbol: string
  txid: string
  status: string
  from: string
  to: string
  blockHash: string
  blockHeight: number
  confirmations: number
  timestamp: number
  value: string
  fee: string
}

export type TxHistoryResponse = {
  page: number
  totalPages: number
  txs: number
  transactions: Transaction[]
}

export type Token = {
  type: string
  name: string
  path?: string
  contract?: string
  transfers: number
  symbol?: string
  decimals?: number
  balance?: string
  totalReceived?: string
  totalSent?: string
}

export type BalanceResponse = {
  network: string
  symbol: string
  address: string
  balance: string
  unconfirmedBalance: string
  unconfirmedTxs: number
  txs: number
  tokens: Token[]
}

export type BroadcastTxResponse = {
  network: string
  txid: string
}

export type BuildSendTxInput = {
  to: string
  value: string
  /**
   * Optional param for eth txs indicating what ERC20 is being sent
   */
  erc20ContractAddress?: string
  wallet: HDWallet
  path: string
  chainId?: number
}

export type SignTxInput = {
  txToSign: ETHSignTx
  wallet: HDWallet
}

export type GetAddressInput = {
  wallet: HDWallet
  path: string
}

export type FeeData = {
  /**
   * gas (ethereum), vbytes (btc), etc
   */
  units: string
  /**
   * price per unit
   */
  price: string
}

export type FeeEstimateInput = {
  to: string
  from: string
  data: string
  value: string
}

export enum ChainIdentifier {
  Ethereum = 'ethereum'
}

export enum ValidAddressResultType {
  Valid = 'valid',
  Invalid = 'invalid'
}

export type ValidAddressResult = {
  /**
   * Is this Address valid
   */
  valid: boolean
  /**
   * Result type of valid address
   */
  result: ValidAddressResultType
}

export interface ChainAdapter {
  /**
   * Get type of adapter
   */
  getType(): ChainIdentifier

  /**
   * Get the balance of an address
   */
  getBalance(address: string): Promise<BalanceResponse | undefined>

  /**
   * Get Transaction History for an address
   */
  getTxHistory(address: string, paginationParams?: PaginationParams): Promise<TxHistoryResponse>

  buildSendTransaction(input: BuildSendTxInput): Promise<any>

  getAddress(input: GetAddressInput): Promise<string>

  signTransaction(signTxInput: SignTxInput): Promise<string>

  getFeeData(input: FeeEstimateInput): Promise<FeeData>

  broadcastTransaction(hex: string): Promise<string>

  validateAddress(address: string): Promise<ValidAddressResult>
}
