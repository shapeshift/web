import { ETHSignTx, HDWallet } from '@shapeshiftoss/hdwallet-core'

// asset-service

type AbstractAsset = {
  chain: ChainTypes
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
  sendSupport: boolean
  receiveSupport: boolean
}

type OmittedTokenAssetFields = 'chain' | 'network' | 'slip44' | 'explorer' | 'explorerTxLink'
type TokenAssetFields = {
  tokenId: string
  contractType: ContractTypes
}
export type TokenAsset = Omit<AbstractAsset, OmittedTokenAssetFields> & TokenAssetFields
export type BaseAsset = AbstractAsset & { tokens?: TokenAsset[] }
export type Asset = AbstractAsset & Partial<TokenAssetFields>

export enum ContractTypes {
  ERC20 = 'ERC20',
  ERC721 = 'ERC721',
  OTHER = 'OTHER',
  NONE = 'NONE'
}

export enum ChainTypes {
  Ethereum = 'ethereum',
  Bitcoin = 'bitcoin',
  Litecoin = 'litecoin'
}

export enum NetworkTypes {
  MAINNET = 'MAINNET',
  TESTNET = 'TESTNET', // BTC, LTC, etc...
  ETH_ROPSTEN = 'ETH_ROPSTEN',
  ETH_RINKEBY = 'ETH_RINKEBY'
}

// market-service

export type MarketData = {
  price: string
  marketCap: string
  volume: string
  changePercent24Hr: number
}

export enum HistoryTimeframe {
  HOUR = '1H',
  DAY = '24H',
  WEEK = '1W',
  MONTH = '1M',
  YEAR = '1Y',
  ALL = 'All'
}

export type HistoryData = {
  price: number
  date: string
}

export type PriceHistoryArgs = {
  chain: ChainTypes
  timeframe: HistoryTimeframe
  tokenId?: string
}

export type MarketDataArgs = {
  chain: ChainTypes
  tokenId?: string
}

export type MarketDataType = (args: MarketDataArgs) => Promise<MarketData | null>

export type PriceHistoryType = (args: PriceHistoryArgs) => Promise<HistoryData[] | null>

// swapper

export enum SwapperType {
  Zrx = '0x',
  Thorchain = 'Thorchain'
}

export type FeeData = {
  fee?: string
  gas?: string
  estimatedGas?: string
  gasPrice?: string
  approvalFee?: string
  protocolFee?: string
  minimumProtocolFee?: string
  receiveNetworkFee?: string
}

export type SwapSource = {
  name: string
  proportion: string
}

export interface MinMaxOutput {
  minimum: string
  maximum: string
  minimumPrice?: string
}

export type QuoteResponse = {
  price: string
  guaranteedPrice: string
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
export type Quote = {
  success: boolean
  statusCode?: number
  statusReason?: string
  sellAssetAccountId?: string
  buyAssetAccountId?: string
  sellAsset: Asset
  buyAsset: Asset
  rate?: string
  depositAddress?: string // this is dex contract address for eth swaps
  receiveAddress?: string
  buyAmount?: string
  sellAmount?: string
  minimum?: string | null
  maximum?: string | null
  guaranteedPrice?: string
  slipScore?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  txData?: any // unsigned tx if available at quote time
  value?: string
  feeData?: FeeData
  allowanceContract?: string
  allowanceGrantRequired?: boolean
  slippage?: string
  priceImpact?: string
  orderId?: string
  sources?: Array<SwapSource>
  timestamp?: number
}

export type GetQuoteInput = {
  sellAsset: Asset
  buyAsset: Asset
  sellAmount?: string
  buyAmount?: string
  sellAssetAccountId?: string
  buyAssetAccountId?: string
  slippage?: string
  priceImpact?: string
  sendMax?: boolean
  minimumPrice?: string
  minimum?: string
}

export type BuildQuoteTxInput = {
  input: GetQuoteInput
  wallet: HDWallet
}

export type ExecQuoteInput = {
  quote: Quote
  wallet: HDWallet
}

export type ExecQuoteOutput = {
  txid: string
}

export type ApprovalNeededInput = {
  quote: Quote
  wallet: HDWallet
}

export type ApprovalNeededOutput = {
  approvalNeeded: boolean
  gas?: string
  gasPrice?: string
}

// chain-adapters

export type Transaction = {
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
  wallet: HDWallet
  path: string
  /*** In base units */
  fee?: string
  /*** Optional param for eth txs indicating what ERC20 is being sent */
  erc20ContractAddress?: string
  limit?: string
}

export type SignTxInput = {
  txToSign: ETHSignTx
  wallet: HDWallet
}
export type GetAddressInput = {
  wallet: HDWallet
  path: string
}

export type GetFeeDataInput = {
  contractAddress?: string
  from: string
  to: string
  value: string
}

export enum FeeDataKey {
  Slow = 'slow',
  Average = 'average',
  Fast = 'fast'
}

export type FeeDataType = {
  feeUnitPrice: string
  networkFee: string
  feeUnits: string
}

export type FeeDataEstimate = {
  [FeeDataKey.Slow]: FeeDataType
  [FeeDataKey.Average]: FeeDataType
  [FeeDataKey.Fast]: FeeDataType
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

export type FeeEstimateInput = {
  to: string
  from: string
  data: string
  value: string
}
