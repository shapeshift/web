import type {
  BridgeDefinition as LifiBridgeDefinition,
  ChainId as LifiChainId,
  ChainKey as LifiChainKey,
  Token as LifiToken,
} from '@lifi/sdk'
import type { Asset } from '@shapeshiftoss/asset-service'
import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { fromChainId } from '@shapeshiftoss/caip'
import type { EvmChainId } from '@shapeshiftoss/chain-adapters'
import { evmChainIds } from '@shapeshiftoss/chain-adapters'
import type {
  ApprovalNeededInput,
  ApprovalNeededOutput,
  ApproveAmountInput,
  ApproveInfiniteInput,
  BuildTradeInput,
  BuyAssetBySellIdInput,
  GetEvmTradeQuoteInput,
  Swapper,
  TradeQuote,
  TradeResult,
  TradeTxs,
} from '@shapeshiftoss/swapper'
import { SwapperName, SwapperType } from '@shapeshiftoss/swapper'
import { approvalNeeded } from 'lib/swapper/LifiSwapper/approvalNeeded/approvalNeeded'
import { approveAmount, approveInfinite } from 'lib/swapper/LifiSwapper/approve/approve'
import { buildTrade } from 'lib/swapper/LifiSwapper/buildTrade/buildTrade'
import { executeTrade } from 'lib/swapper/LifiSwapper/executeTrade/executeTrade'
import { filterAssetIdsBySellable } from 'lib/swapper/LifiSwapper/filterAssetIdsBySellable/filterAssetIdsBySellable'
import { filterBuyAssetsBySellAssetId } from 'lib/swapper/LifiSwapper/filterBuyAssetsBySellAssetId/filterBuyAssetsBySellAssetId'
import { getTradeQuote } from 'lib/swapper/LifiSwapper/getTradeQuote/getTradeQuote'
import { getUsdRate } from 'lib/swapper/LifiSwapper/getUsdRate/getUsdRate'
import { createLifiAssetMap } from 'lib/swapper/LifiSwapper/utils/createLifiAssetMap/createLifiAssetMap'
import { createLifiChainMap } from 'lib/swapper/LifiSwapper/utils/createLifiChainMap/createLifiChainMap'
import { getLifi } from 'lib/swapper/LifiSwapper/utils/getLifi'
import type { LifiExecuteTradeInput, LifiTrade } from 'lib/swapper/LifiSwapper/utils/types'

export class LifiSwapper implements Swapper<EvmChainId> {
  readonly name = SwapperName.LIFI
  private lifiChainMap: Map<ChainId, LifiChainKey> = new Map()
  private lifiAssetMap: Map<AssetId, LifiToken> = new Map()
  private lifiBridges: LifiBridgeDefinition[] = []

  /** perform any necessary async initialization */
  async initialize(): Promise<void> {
    const supportedChainRefs = evmChainIds.map(
      chainId => Number(fromChainId(chainId).chainReference) as LifiChainId,
    )

    const { bridges, chains, tokens } = await getLifi().getPossibilities({
      include: ['bridges', 'chains', 'tokens'],
      chains: supportedChainRefs,
    })

    if (chains !== undefined) this.lifiChainMap = createLifiChainMap(chains)
    if (tokens !== undefined) this.lifiAssetMap = createLifiAssetMap(tokens)
    if (bridges !== undefined) this.lifiBridges = bridges
  }

  /** Returns the swapper type */
  getType(): SwapperType {
    return SwapperType.LIFI
  }

  /**
   * Builds a trade with definitive rate & txData that can be executed with executeTrade
   **/
  async buildTrade(input: BuildTradeInput): Promise<LifiTrade> {
    return await buildTrade(input, this.lifiAssetMap, this.lifiChainMap, this.lifiBridges)
  }

  /**
   * Get a trade quote
   */
  async getTradeQuote(input: GetEvmTradeQuoteInput): Promise<TradeQuote<EvmChainId>> {
    return await getTradeQuote(input, this.lifiAssetMap, this.lifiChainMap, this.lifiBridges)
  }

  /**
   * Get the usd rate from either the assets symbol or tokenId
   */
  async getUsdRate(asset: Asset): Promise<string> {
    return await getUsdRate(asset, this.lifiAssetMap, this.lifiChainMap, getLifi())
  }

  /**
   * Execute a trade built with buildTrade by signing and broadcasting
   */
  async executeTrade(input: LifiExecuteTradeInput): Promise<TradeResult> {
    return await executeTrade(input)
  }

  /**
   * Get a boolean if a quote needs approval
   */
  async approvalNeeded(input: ApprovalNeededInput<EvmChainId>): Promise<ApprovalNeededOutput> {
    return await approvalNeeded(input)
  }

  /**
   * Broadcasts an infinite approval Tx and returns the Txid
   */
  async approveInfinite(input: ApproveInfiniteInput<EvmChainId>): Promise<string> {
    return await approveInfinite(input)
  }

  /**
   * Get the txid of an approve amount transaction
   * If no amount is specified the sell amount of the quote will be used
   */
  async approveAmount(input: ApproveAmountInput<EvmChainId>): Promise<string> {
    return await approveAmount(input)
  }

  /**
   * Get supported buyAssetId's by sellAssetId
   */
  filterBuyAssetsBySellAssetId(input: BuyAssetBySellIdInput): AssetId[] {
    return filterBuyAssetsBySellAssetId(input, this.lifiAssetMap)
  }

  /**
   * Get supported sell AssetIds
   */
  filterAssetIdsBySellable(assetIds: AssetId[]): AssetId[] {
    return filterAssetIdsBySellable(assetIds, this.lifiAssetMap)
  }

  /**
   * Get transactions related to a trade
   */
  async getTradeTxs(tradeResult: TradeResult): Promise<TradeTxs> {
    // the tradeId is currently a lifi route ID
    return await Promise.resolve({
      sellTxid: tradeResult.tradeId,
      buyTxid: tradeResult.tradeId,
    })
  }
}
