import type { Asset } from '@shapeshiftoss/asset-service'
import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import type { EvmChainId } from '@shapeshiftoss/chain-adapters'
import type {
  ApprovalNeededOutput,
  BuildTradeInput,
  BuyAssetBySellIdInput,
  ExecuteTradeInput,
  GetEvmTradeQuoteInput,
  Swapper,
  SwapperType,
  Trade,
  TradeQuote,
  TradeResult,
  TradeTxs,
} from '@shapeshiftoss/swapper'
import { SwapError } from '@shapeshiftoss/swapper'
import { SWAPPER_NAME, SWAPPER_TYPE } from 'lib/swapper/LifiSwapper/utils/constants'

export class LifiSwapper implements Swapper<EvmChainId> {
  readonly name = SWAPPER_NAME

  /** perform any necessary async initialization */
  async initialize(): Promise<void> {}

  /** Returns the swapper type */
  getType(): SwapperType {
    return SWAPPER_TYPE
  }

  /**
   * Builds a trade with definitive rate & txData that can be executed with executeTrade
   **/
  async buildTrade(_args: BuildTradeInput): Promise<Trade<EvmChainId>> {
    return await Promise.reject(new SwapError('LifiSwapper: buildTrade unimplemented'))
  }

  /**
   * Get a trade quote
   */
  async getTradeQuote(_input: GetEvmTradeQuoteInput): Promise<TradeQuote<EvmChainId>> {
    return await Promise.reject(new SwapError('LifiSwapper: getTradeQuote unimplemented'))
  }

  /**
   * Get the usd rate from either the assets symbol or tokenId
   */
  async getUsdRate(_asset: Asset): Promise<string> {
    return await Promise.reject(new SwapError('LifiSwapper: getUsdRate unimplemented'))
  }

  /**
   * Execute a trade built with buildTrade by signing and broadcasting
   */
  async executeTrade(_args: ExecuteTradeInput<ChainId>): Promise<TradeResult> {
    return await Promise.reject(new SwapError('LifiSwapper: executeTrade unimplemented'))
  }

  /**
   * Get a boolean if a quote needs approval
   */
  async approvalNeeded(): Promise<ApprovalNeededOutput> {
    return await Promise.resolve({ approvalNeeded: false })
  }

  /**
   * Get the txid of an approve infinite transaction
   */
  async approveInfinite(): Promise<string> {
    return await Promise.reject(new SwapError('LifiSwapper: approveInfinite unimplemented'))
  }

  /**
   * Get the txid of an approve amount transaction
   * If no amount is specified the sell amount of the quote will be used
   */
  async approveAmount(): Promise<string> {
    return await Promise.reject(new SwapError('LifiSwapper: approveAmount unimplemented'))
  }

  /**
   * Get supported buyAssetId's by sellAssetId
   */
  filterBuyAssetsBySellAssetId(_args: BuyAssetBySellIdInput): AssetId[] {
    throw new SwapError('LifiSwapper: filterBuyAssetsBySellAssetId unimplemented')
  }

  /**
   * Get supported sell assetIds
   */
  filterAssetIdsBySellable(_assetIds: AssetId[]): AssetId[] {
    throw new SwapError('LifiSwapper: filterAssetIdsBySellable unimplemented')
  }

  /**
   * Get transactions related to a trade
   */
  async getTradeTxs(_tradeResult: TradeResult): Promise<TradeTxs> {
    return await Promise.reject(new SwapError('LifiSwapper: getTradeTxs unimplemented'))
  }
}
