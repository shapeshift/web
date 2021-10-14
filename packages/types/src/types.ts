import { ETHSignTx, BTCSignTx, HDWallet, BTCInputScriptType } from '@shapeshiftoss/hdwallet-core'

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
  Bitcoin = 'bitcoin'
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

export type ETHFeeData = {
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

export type ThorVaultInfo = {
  routerContractAddress?: string
  vaultAddress: string
  timestamp: string
}

export type SignTx = ETHSignTx | BTCSignTx

type ChainTxTypeInner = {
  [ChainTypes.Ethereum]: ETHSignTx
  [ChainTypes.Bitcoin]: BTCSignTx
}

export type ChainTxType<T> = T extends keyof ChainTxTypeInner ? ChainTxTypeInner[T] : never

export type BuildThorTradeOutput = SignTxInput<unknown> & ThorVaultInfo

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
  txData?: string
  value?: string
  feeData?: ETHFeeData
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

type TransactionBase<T extends ChainTypes> = {
  network: NetworkTypes
  chain: T
  symbol: string
  txid: string
  status: string
  from: string
  to?: string
  blockHash?: string
  blockHeight?: number
  confirmations?: number
  timestamp?: number
  value: string
  fee: string
}

type EthereumSpecificFields = {
  // nonce: string
}

type BitcoinSpecificFields = {
  opReturnData?: string
}

type ChainFieldMap = {
  [ChainTypes.Ethereum]: EthereumSpecificFields
  [ChainTypes.Bitcoin]: BitcoinSpecificFields
}

type ChainSpecificFields<T extends ChainTypes> = T extends keyof ChainFieldMap
  ? ChainFieldMap[T]
  : never

export type Transaction<T extends ChainTypes = ChainTypes> = TransactionBase<T> & {
  // this intersection looks redundant, but is actually required
  // see the types.assert.ts file for the desired behaviour
  details: ChainSpecificFields<T> & Record<string, string | undefined>
}

export type TxHistoryResponse<T extends ChainTypes> = {
  page: number
  totalPages: number
  txs: number
  transactions: Transaction<T>[]
}

type BaseAccount<T extends ChainTypes> = {
  balance: string
  pubkey: string
  symbol: string
  chain: T
  network: NetworkTypes
}

export type BitcoinAccount = {
  nextChangeAddressIndex?: number
  nextReceiveAddressIndex?: number
}

type AccountInnerMap = {
  [ChainTypes.Ethereum]: EthereumAccount
  [ChainTypes.Bitcoin]: BitcoinAccount
}

export type Account<T extends ChainTypes = ChainTypes> = BaseAccount<T> &
  (AccountInnerMap[T] & Record<string, any>)

export type EthereumToken = {
  balance: string
  contract: string
  precision: number
  name: string
  symbol: string
  contractType: ContractTypes
}

export type EthereumAccount = {
  nonce: number
}

export type BroadcastTxResponse = {
  network: NetworkTypes
  txid: string
}

export type BTCRecipient = {
  value: number
  address?: string
}

export type BitcoinTxSpecificScriptSig = {
  hex: string
  asm: string
}

export type BitcoinTxSpecificVin = {
  txinwitness?: string
  scriptSig?: BitcoinTxSpecificScriptSig
  coinbase?: string
  sequence?: number
  vout?: number
  txid?: string
}

export type BitcoinTxSpecificVout = {
  scriptPubKey?: BitcoinTxSpecificScriptPubKey
  n?: number
  value?: string | number
}

export type BitcoinTxSpecificScriptPubKey = {
  addresses: Array<string>
  type: string
  reqSigs: number
  hex: string
  asm: string
}

export type BitcoinTxSpecific = {
  txid: string
  hash: string
  version: number
  size: number
  vsize: number
  weight: number
  locktime: number
  vin: Array<BitcoinTxSpecificVin>
  vout: Array<BitcoinTxSpecificVout>
  hex: string
  blockhash: string
  confirmations: number
  time: number
  blocktime: number
}

export type FormattedUTXO = {
  addressNList: number[]
  scriptType: BTCInputScriptType
  amount: string
  tx: BitcoinTxSpecific
  hex: string
}

export type BuildSendTxInput = {
  to?: string
  value?: string
  wallet: HDWallet
  /*** In base units */
  fee?: string
  /*** Optional param for eth txs indicating what ERC20 is being sent */
  erc20ContractAddress?: string
  recipients?: BTCRecipient[]
  opReturnData?: string
  scriptType?: BTCInputScriptType
  gasLimit?: string
  bip32Params?: BIP32Params
  feeSpeed?: FeeDataKey
}

export type SignTxInput<TxType> = {
  txToSign: TxType
  wallet: HDWallet
}

export type BIP32Params = {
  purpose: number
  coinType: number
  accountNumber: number
  isChange?: boolean
  index?: number
}

export interface TxHistoryInput {
  readonly pubkey: string
  readonly page?: number
  readonly pageSize?: number
  readonly contract?: string
}

export type GetAddressInputBase = {
  wallet: HDWallet
  bip32Params?: BIP32Params
}

export type GetBitcoinAddressInput = GetAddressInputBase & {
  scriptType: BTCInputScriptType
}

export type GetEthereumAddressInput = GetAddressInputBase

export type GetAddressInput = GetBitcoinAddressInput | GetEthereumAddressInput

export type GetFeeDataInput = {
  contractAddress?: string
  from: string
  to: string
  value: string
}

export type BTCFeeDataType = {
  minMinutes: number
  maxMinutes: number
  effort: number
  fee?: number
}

export enum FeeDataKey {
  Slow = 'slow',
  Average = 'average',
  Fast = 'fast'
}

export type BTCFeeDataEstimate = {
  [FeeDataKey.Slow]: BTCFeeDataType
  [FeeDataKey.Average]: BTCFeeDataType
  [FeeDataKey.Fast]: BTCFeeDataType
}

export type FeeDataEstimate = ETHFeeDataEstimate | BTCFeeDataEstimate

export type ETHFeeDataType = {
  feeUnitPrice: string
  networkFee: string
  feeUnits: string
}

export type ETHFeeDataEstimate = {
  [FeeDataKey.Slow]: ETHFeeDataType
  [FeeDataKey.Average]: ETHFeeDataType
  [FeeDataKey.Fast]: ETHFeeDataType
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
