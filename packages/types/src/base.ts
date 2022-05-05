import { HDWallet } from '@shapeshiftoss/hdwallet-core'

import { QuoteFeeData } from './chain-adapters'

/** Common */

export type BIP44Params = {
  purpose: number
  coinType: number
  accountNumber: number
  isChange?: boolean
  index?: number
}

export enum ChainTypes {
  Ethereum = 'ethereum',
  Bitcoin = 'bitcoin',
  Cosmos = 'cosmos',
  Osmosis = 'osmosis'
}

export enum NetworkTypes {
  MAINNET = 'MAINNET',
  TESTNET = 'TESTNET', // BTC, LTC, etc...
  ETH_ROPSTEN = 'ETH_ROPSTEN',
  ETH_RINKEBY = 'ETH_RINKEBY',
  COSMOSHUB_MAINNET = 'COSMOSHUB_MAINNET',
  COSMOSHUB_VEGA = 'COSMOSHUB_VEGA',
  OSMOSIS_MAINNET = 'OSMOSIS_MAINNET',
  OSMOSIS_TESTNET = 'OSMOSIS_TESTNET'
}

export enum WithdrawType {
  DELAYED,
  INSTANT
}

export enum UtxoAccountType {
  SegwitNative = 'SegwitNative',
  SegwitP2sh = 'SegwitP2sh',
  P2pkh = 'P2pkh'
}

// TODO(0xdef1cafe): remove this, client should not be aware of where data is from
// Describes the data source for where to get the asset details or asset description.
export enum AssetDataSource {
  CoinGecko = 'coingecko',
  YearnFinance = 'yearnfinance'
}

// asset-service

type AbstractAsset = {
  assetId: string
  chainId: string
  chain: ChainTypes
  description?: string
  isTrustedDescription?: boolean
  dataSource: AssetDataSource
  network: NetworkTypes
  symbol: string
  name: string
  precision: number
  slip44: number
  color: string
  secondaryColor: string
  icon: string
  explorer: string
  explorerTxLink: string
  explorerAddressLink: string
  sendSupport: boolean
  receiveSupport: boolean
}

type OmittedTokenAssetFields =
  | 'chain'
  | 'network'
  | 'slip44'
  | 'explorer'
  | 'explorerTxLink'
  | 'explorerAddressLink'
type TokenAssetFields = {
  tokenId: string
  contractType: 'erc20' | 'erc721' // Don't want to import caip here to prevent circular dependencies
}
export type TokenAsset = Omit<AbstractAsset, OmittedTokenAssetFields> & TokenAssetFields
export type BaseAsset = AbstractAsset & { tokens?: TokenAsset[] }
export type Asset = AbstractAsset & Partial<TokenAssetFields>

// swapper

export enum SwapperType {
  Zrx = '0x',
  Thorchain = 'Thorchain',
  Test = 'Test'
}

export type SwapSource = {
  name: string
  proportion: string
}

export interface MinMaxOutput {
  minimum: string
  maximum: string
}

export type QuoteResponse = {
  price: string
  to: string
  data?: string
  value?: string
  gas?: string
  estimatedGas?: string
  gasPrice?: string
  protocolFee?: string
  minimumProtocolFee?: string
  buyTokenAddress?: string
  sellTokenAddress?: string
  buyAmount?: string
  sellAmount?: string
  allowanceTarget?: string
  sources?: Array<SwapSource>
}

export type Quote<C extends ChainTypes> = {
  success: boolean
  statusReason?: string
  sellAssetAccountId?: string
  buyAssetAccountId?: string
  sellAsset: Asset
  buyAsset: Asset
  feeData?: QuoteFeeData<C>
  rate?: string
  depositAddress?: string // this is dex contract address for eth swaps
  receiveAddress?: string
  buyAmount?: string
  sellAmount?: string
  minimum?: string | null
  maximum?: string | null
  txData?: string
  value?: string
  allowanceContract?: string
  sources?: Array<SwapSource>
}

export type GetQuoteInput = {
  sellAsset: Asset
  buyAsset: Asset
  sellAmount?: string
  buyAmount?: string
  sellAssetAccountId?: string
  buyAssetAccountId?: string
  slippage?: string
  sendMax?: boolean
  priceImpact?: string // TODO this doesnt belong here but frontend needs it to not break (for now)
}

export type BuildQuoteTxInput = {
  input: GetQuoteInput
  wallet: HDWallet
}

export type ExecQuoteInput<C extends ChainTypes> = {
  quote: Quote<C>
  wallet: HDWallet
}

export type ExecQuoteOutput = {
  txid: string
}

export type ApprovalNeededOutput = {
  approvalNeeded: boolean
  gas?: string
  gasPrice?: string
}
