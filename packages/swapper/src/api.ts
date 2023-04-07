import { Asset } from '@shapeshiftoss/asset-service'
import { AssetId, ChainId } from '@shapeshiftoss/caip'
import { CosmosSdkChainId, EvmChainId, UtxoChainId } from '@shapeshiftoss/chain-adapters'
import { createErrorClass } from '@shapeshiftoss/errors'
import { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { ChainSpecific, KnownChainIds, UtxoAccountType } from '@shapeshiftoss/types'

export const SwapError = createErrorClass('SwapError')

type ChainSpecificQuoteFeeData<T extends ChainId> = ChainSpecific<
  T,
  {
    [KnownChainIds.EthereumMainnet]: {
      estimatedGas?: string
      gasPriceCryptoBaseUnit?: string
      approvalFeeCryptoBaseUnit?: string
      totalFee?: string
    }
    [KnownChainIds.AvalancheMainnet]: {
      estimatedGas?: string
      gasPriceCryptoBaseUnit?: string
      approvalFeeCryptoBaseUnit?: string
      totalFee?: string
    }
    [KnownChainIds.OptimismMainnet]: {
      estimatedGas?: string
      gasPriceCryptoBaseUnit?: string
      approvalFeeCryptoBaseUnit?: string
      totalFee?: string
    }
    [KnownChainIds.BnbSmartChainMainnet]: {
      estimatedGas?: string
      gasPriceCryptoBaseUnit?: string
      approvalFeeCryptoBaseUnit?: string
      totalFee?: string
    }
    [KnownChainIds.BitcoinMainnet]: {
      byteCount: string
      satsPerByte: string
    }
    [KnownChainIds.DogecoinMainnet]: {
      byteCount: string
      satsPerByte: string
    }
    [KnownChainIds.LitecoinMainnet]: {
      byteCount: string
      satsPerByte: string
    }
    [KnownChainIds.BitcoinCashMainnet]: {
      byteCount: string
      satsPerByte: string
    }
    [KnownChainIds.CosmosMainnet]: {
      estimatedGas: string
    }
    [KnownChainIds.ThorchainMainnet]: {
      estimatedGas: string
    }
  }
>

export type QuoteFeeData<T extends ChainId> = {
  networkFeeCryptoBaseUnit: string // fee paid to the network from the fee asset
  buyAssetTradeFeeUsd: string // fee taken out of the trade from the buyAsset
  sellAssetTradeFeeUsd?: string // fee taken out of the trade from the sellAsset
} & ChainSpecificQuoteFeeData<T>

export type ByPairInput = {
  sellAssetId: AssetId
  buyAssetId: AssetId
}

export type GetSwappersWithQuoteMetadataArgs = GetTradeQuoteInput & { feeAsset: Asset }

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
  receiveAddress: string
  accountNumber: number
  receiveAccountNumber?: number
}

export type GetEvmTradeQuoteInput = CommonTradeInput & {
  chainId: EvmChainId
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

interface TradeBase<C extends ChainId> {
  buyAmountCryptoBaseUnit: string
  sellAmountBeforeFeesCryptoBaseUnit: string
  feeData: QuoteFeeData<C>
  rate: string
  sources: SwapSource[]
  buyAsset: Asset
  sellAsset: Asset
  accountNumber: number
}

export interface TradeQuote<C extends ChainId> extends TradeBase<C> {
  allowanceContract: string
  minimumCryptoHuman: string
  maximum: string
  recommendedSlippage?: string

  /** @deprecated Use minimumCryptoHuman instead */
  minimum?: string
}

export interface Trade<C extends ChainId> extends TradeBase<C> {
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

export type ApproveInput<C extends ChainId> = {
  quote: TradeQuote<C>
  wallet: HDWallet
}

export type ApproveInfiniteInput<C extends ChainId> = ApproveInput<C>

export type ApproveAmountInput<C extends ChainId> = ApproveInput<C> & {
  amount?: string
}

export type ApprovalNeededInput<C extends ChainId> = {
  quote: TradeQuote<C>
  wallet: HDWallet
}

export type SwapSource = {
  name: SwapperName | string
  proportion: string
}

export interface MinMaxOutput {
  minimum: string
  maximum: string
}

export type ApprovalNeededOutput = {
  approvalNeeded: boolean
}

export enum SwapperName {
  Thorchain = 'THORChain',
  Osmosis = 'Osmosis',
  CowSwap = 'CoW Swap',
  Zrx = '0x',
  Test = 'Test',
  LIFI = 'LI.FI',
}

export enum SwapperType {
  ZrxEthereum = '0xEthereum',
  ZrxAvalanche = '0xAvalanche',
  ZrxOptimism = '0xOptimism',
  ZrxBnbSmartChain = '0xBnbSmartChain',
  Thorchain = 'Thorchain',
  Osmosis = 'Osmosis',
  CowSwap = 'CoW Swap',
  Test = 'Test',
  LIFI = 'LI.FI',
}

export type TradeTxs = {
  sellTxid: string
  buyTxid?: string
}

// Swap Errors
export enum SwapErrorType {
  ALLOWANCE_REQUIRED_FAILED = 'ALLOWANCE_REQUIRED_FAILED',
  APPROVE_INFINITE_FAILED = 'APPROVE_INFINITE_FAILED',
  APPROVE_AMOUNT_FAILED = 'APPROVE_AMOUNT_FAILED',
  BUILD_TRADE_FAILED = 'BUILD_TRADE_FAILED',
  CHECK_APPROVAL_FAILED = 'CHECK_APPROVAL_FAILED',
  EXECUTE_TRADE_FAILED = 'EXECUTE_TRADE_FAILED',
  GRANT_ALLOWANCE_FAILED = 'GRANT_ALLOWANCE_FAILED',
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
}
export interface Swapper<T extends ChainId> {
  /** Human-readable swapper name */
  readonly name: SwapperName

  /** perform any necessary async initialization */
  initialize?(): Promise<void>

  /** Returns the swapper type */
  getType(): SwapperType

  /**
   * Get builds a trade with definitive rate & txData that can be executed with executeTrade
   **/
  buildTrade(args: BuildTradeInput): Promise<Trade<T>>

  /**
   * Get a trade quote
   */
  getTradeQuote(input: GetTradeQuoteInput): Promise<TradeQuote<T>>

  /**
   * Get the usd rate from either the assets symbol or tokenId
   */
  getUsdRate(input: Asset): Promise<string>

  /**
   * Execute a trade built with buildTrade by signing and broadcasting
   */
  executeTrade(args: ExecuteTradeInput<T>): Promise<TradeResult>

  /**
   * Get a boolean if a quote needs approval
   */
  approvalNeeded(args: ApprovalNeededInput<T>): Promise<ApprovalNeededOutput>

  /**
   * Get the txid of an approve infinite transaction
   */
  approveInfinite(args: ApproveInfiniteInput<T>): Promise<string>

  /**
   * Get the txid of an approve amount transaction
   * If no amount is specified the sell amount of the quote will be used
   */
  approveAmount(args: ApproveAmountInput<T>): Promise<string>

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
  getTradeTxs(tradeResult: TradeResult): Promise<TradeTxs>
}
