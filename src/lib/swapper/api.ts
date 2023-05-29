import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import type { CosmosSdkChainId, EvmChainId, UtxoChainId } from '@shapeshiftoss/chain-adapters'
import { createErrorClass } from '@shapeshiftoss/errors'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import type {
  ChainSpecific,
  KnownChainIds,
  MarketData,
  UtxoAccountType,
} from '@shapeshiftoss/types'
import type { Result } from '@sniptt/monads'
import type { Asset } from 'lib/asset-service'

export const SwapError = createErrorClass('SwapError')

export type SwapErrorRight = {
  name: 'SwapError'
  message: string
  cause?: unknown
  details?: unknown
  code?: string
}

export const makeSwapErrorRight = ({
  details,
  cause,
  code,
  message,
}: {
  message: string
  details?: unknown
  cause?: unknown
  code?: string
}): SwapErrorRight => ({
  name: 'SwapError',
  message,
  details,
  cause,
  code,
})

export type UtxoFeeData = {
  byteCount: string
  satsPerByte: string
}

export type CosmosSdkFeeData = {
  estimatedGasCryptoBaseUnit: string
}

type ChainSpecificQuoteFeeData<T extends ChainId> = ChainSpecific<
  T,
  {
    [KnownChainIds.BitcoinMainnet]: UtxoFeeData
    [KnownChainIds.DogecoinMainnet]: UtxoFeeData
    [KnownChainIds.LitecoinMainnet]: UtxoFeeData
    [KnownChainIds.BitcoinCashMainnet]: UtxoFeeData
    [KnownChainIds.CosmosMainnet]: CosmosSdkFeeData
    [KnownChainIds.ThorchainMainnet]: CosmosSdkFeeData
  }
>

export type ProtocolFee = { requiresBalance: boolean } & AmountDisplayMeta

export type QuoteFeeData<T extends ChainId, MissingNetworkFee extends boolean = false> = {
  networkFeeCryptoBaseUnit: MissingNetworkFee extends true ? undefined : string // fee paid to the network from the fee asset
  protocolFees: Record<AssetId, ProtocolFee> // fee(s) paid to the protocol(s)
} & ChainSpecificQuoteFeeData<T>

export type ByPairInput = {
  sellAssetId: AssetId
  buyAssetId: AssetId
}

export type GetSwappersWithQuoteMetadataArgs = GetTradeQuoteInput & {
  feeAsset: Asset
  cryptoMarketDataById: Partial<Record<AssetId, Pick<MarketData, 'price'>>>
}

export type SwapperWithQuoteMetadata = {
  swapper: Swapper<ChainId>
  quote: TradeQuote<ChainId>
  inputOutputRatio: number | undefined
}
export type GetSwappersWithQuoteMetadataReturn = SwapperWithQuoteMetadata[]

export type BuyAssetBySellIdInput = {
  sellAssetId: AssetId
  assetIds: AssetId[]
}

export type SupportedSellAssetsInput = {
  assetIds: AssetId[]
}

type CommonTradeInput = {
  sellAsset: Asset
  buyAsset: Asset
  sellAmountBeforeFeesCryptoBaseUnit: string
  sendMax: boolean
  receiveAddress: string | undefined
  accountNumber: number
  receiveAccountNumber?: number
  affiliateBps: string
}

export type GetEvmTradeQuoteInput = CommonTradeInput & {
  chainId: EvmChainId
  eip1559Support: boolean
}

export type GetCosmosSdkTradeQuoteInput = CommonTradeInput & {
  chainId: CosmosSdkChainId
}

export type GetUtxoTradeQuoteInput = CommonTradeInput & {
  chainId: UtxoChainId
  accountType: UtxoAccountType
  accountNumber: number
  xpub: string
}

export type GetTradeQuoteInput =
  | GetUtxoTradeQuoteInput
  | GetEvmTradeQuoteInput
  | GetCosmosSdkTradeQuoteInput

export type BuildTradeInput = GetTradeQuoteInput & {
  slippage?: string
  wallet: HDWallet
}

export type AmountDisplayMeta = {
  amountCryptoBaseUnit: string
  asset: Pick<Asset, 'symbol' | 'chainId' | 'precision'>
}

interface TradeBase<C extends ChainId, MissingNetworkFee extends boolean = false> {
  buyAmountBeforeFeesCryptoBaseUnit: string
  sellAmountBeforeFeesCryptoBaseUnit: string
  feeData: QuoteFeeData<C, MissingNetworkFee>
  rate: string
  sources: SwapSource[]
  buyAsset: Asset
  sellAsset: Asset
  accountNumber: number
  // describes intermediary asset and amount the user may end up with in the event of a trade
  // execution failure
  intermediaryTransactionOutputs?: AmountDisplayMeta[]
}

export interface TradeQuote<C extends ChainId, UnknownNetworkFee extends boolean = false>
  extends TradeBase<C, UnknownNetworkFee> {
  allowanceContract: string
  minimumCryptoHuman: string
  maximumCryptoHuman: string
  recommendedSlippage?: string
  id?: string
}

export interface Trade<C extends ChainId> extends TradeBase<C, false> {
  receiveAddress: string
  receiveAccountNumber?: number
}

export type ExecuteTradeInput<C extends ChainId> = {
  trade: Trade<C>
  wallet: HDWallet
}

export type TradeResult = {
  tradeId: string
}

export type SwapSource = {
  name: SwapperName | string
  proportion: string
}

export interface MinMaxOutput {
  minimumAmountCryptoHuman: string
  maximumAmountCryptoHuman: string
}

export enum SwapperName {
  Thorchain = 'THORChain',
  Osmosis = 'Osmosis',
  CowSwap = 'CoW Swap',
  Zrx = '0x',
  Test = 'Test',
  LIFI = 'LI.FI',
  OneInch = '1INCH',
}

export enum SwapperType {
  ZrxEthereum = '0xEthereum',
  ZrxAvalanche = '0xAvalanche',
  ZrxOptimism = '0xOptimism',
  ZrxBnbSmartChain = '0xBnbSmartChain',
  ZrxPolygon = '0xPolygon',
  CowSwapEth = 'CoW Swap Eth',
  CowSwapGnosis = 'CoW Swap Gnosis',
  Thorchain = 'Thorchain',
  Osmosis = 'Osmosis',
  Test = 'Test',
  LIFI = 'LI.FI',
  OneInch = '1INCH',
}

export type TradeTxs = {
  sellTxid: string
  buyTxid?: string
}

// Swap Errors
export enum SwapErrorType {
  BUILD_TRADE_FAILED = 'BUILD_TRADE_FAILED',
  EXECUTE_TRADE_FAILED = 'EXECUTE_TRADE_FAILED',
  INITIALIZE_FAILED = 'INITIALIZE_FAILED',
  MANAGER_ERROR = 'MANAGER_ERROR',
  MIN_MAX_FAILED = 'MIN_MAX_FAILED',
  RESPONSE_ERROR = 'RESPONSE_ERROR',
  SIGN_AND_BROADCAST_FAILED = 'SIGN_AND_BROADCAST_FAILED',
  TRADE_QUOTE_FAILED = 'TRADE_QUOTE_FAILED',
  TRADE_QUOTE_AMOUNT_TOO_SMALL = 'TRADE_QUOTE_AMOUNT_TOO_SMALL',
  TRADE_QUOTE_INPUT_LOWER_THAN_FEES = 'TRADE_QUOTE_INPUT_LOWER_THAN_FEES',
  UNSUPPORTED_PAIR = 'UNSUPPORTED_PAIR',
  USD_RATE_FAILED = 'USD_RATE_FAILED',
  UNSUPPORTED_CHAIN = 'UNSUPPORTED_CHAIN',
  UNSUPPORTED_NAMESPACE = 'UNSUPPORTED_NAMESPACE',
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  MAKE_MEMO_FAILED = 'MAKE_MEMO_FAILED',
  PRICE_RATIO_FAILED = 'PRICE_RATIO_FAILED',
  POOL_NOT_FOUND = 'POOL_NOT_FOUND',
  GET_TRADE_TXS_FAILED = 'GET_TRADE_TXS_FAILED',
  TRADE_FAILED = 'TRADE_FAILED',
  RECEIVE_ACCOUNT_NUMBER_NOT_PROVIDED = 'RECEIVE_ACCOUNT_NUMBER_NOT_PROVIDED',
  TRADE_BELOW_MINIMUM = 'TRADE_BELOW_MINIMUM',
  // Catch-all for XHRs that can fail
  QUERY_FAILED = 'QUERY_FAILED',
  // Catch-all for missing input e.g AssetId missing when making a request
  MISSING_INPUT = 'MISSING_INPUT',
  // Catch-all for happy responses, but entity not found according to our criteria
  NOT_FOUND = 'NOT_FOUND',
}
export interface Swapper<T extends ChainId, MaybeUnknownNetworkFee extends boolean = false> {
  /** Human-readable swapper name */
  readonly name: SwapperName

  /** perform any necessary async initialization */
  initialize?(): Promise<Result<unknown, SwapErrorRight>>

  /** Returns the swapper type */
  getType(): SwapperType

  /**
   * Get builds a trade with definitive rate & txData that can be executed with executeTrade
   **/
  buildTrade(args: BuildTradeInput): Promise<Result<Trade<T>, SwapErrorRight>>

  /**
   * Get a trade quote
   */
  getTradeQuote(
    input: GetTradeQuoteInput,
  ): Promise<
    Result<
      TradeQuote<ChainId, MaybeUnknownNetworkFee extends true ? true | false : false>,
      SwapErrorRight
    >
  >

  /**
   * Execute a trade built with buildTrade by signing and broadcasting
   */
  executeTrade(args: ExecuteTradeInput<T>): Promise<Result<TradeResult, SwapErrorRight>>

  /**
   * Get supported buyAssetId's by sellAssetId
   */
  filterBuyAssetsBySellAssetId(args: BuyAssetBySellIdInput): AssetId[]

  /**
   * Get supported sell assetIds
   */
  filterAssetIdsBySellable(assetIds: AssetId[]): AssetId[]

  /**
   * Get transactions related to a trade
   */
  getTradeTxs(tradeResult: TradeResult): Promise<Result<TradeTxs, SwapErrorRight>>
}
