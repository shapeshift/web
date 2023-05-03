import type { ChainId as LifiChainId, ChainKey as LifiChainKey, GetStatusRequest } from '@lifi/sdk'
import type { Asset } from '@shapeshiftoss/asset-service'
import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { fromChainId } from '@shapeshiftoss/caip'
import type { EvmChainId } from '@shapeshiftoss/chain-adapters'
import { evmChainIds } from '@shapeshiftoss/chain-adapters'
import type { Result } from '@sniptt/monads'
import { Ok } from '@sniptt/monads'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { toBaseUnit } from 'lib/math'
import type {
  ApprovalNeededInput,
  ApprovalNeededOutput,
  ApproveAmountInput,
  ApproveInfiniteInput,
  BuildTradeInput,
  BuyAssetBySellIdInput,
  GetEvmTradeQuoteInput,
  SwapErrorRight,
  Swapper,
  TradeResult,
  TradeTxs,
} from 'lib/swapper/api'
import { SwapperName, SwapperType } from 'lib/swapper/api'
import { approvalNeeded } from 'lib/swapper/swappers/LifiSwapper/approvalNeeded/approvalNeeded'
import { buildTrade } from 'lib/swapper/swappers/LifiSwapper/buildTrade/buildTrade'
import { executeTrade } from 'lib/swapper/swappers/LifiSwapper/executeTrade/executeTrade'
import { getTradeQuote } from 'lib/swapper/swappers/LifiSwapper/getTradeQuote/getTradeQuote'
import { getUsdRate } from 'lib/swapper/swappers/LifiSwapper/getUsdRate/getUsdRate'
import { MAX_LIFI_TRADE } from 'lib/swapper/swappers/LifiSwapper/utils/constants'
import { createLifiChainMap } from 'lib/swapper/swappers/LifiSwapper/utils/createLifiChainMap/createLifiChainMap'
import { getLifi } from 'lib/swapper/swappers/LifiSwapper/utils/getLifi'
import { getMinimumCryptoHuman } from 'lib/swapper/swappers/LifiSwapper/utils/getMinimumCryptoHuman/getMinimumCryptoHuman'
import type {
  LifiExecuteTradeInput,
  LifiTrade,
  LifiTradeQuote,
} from 'lib/swapper/swappers/LifiSwapper/utils/types'
import { approveAmount, approveInfinite } from 'lib/swapper/swappers/utils/approve/approve'
import { filterEvmAssetIdsBySellable } from 'lib/swapper/swappers/utils/filterAssetIdsBySellable/filterAssetIdsBySellable'
import { filterSameChainEvmBuyAssetsBySellAssetId } from 'lib/swapper/swappers/utils/filterBuyAssetsBySellAssetId/filterBuyAssetsBySellAssetId'
import { createEmptyEvmTradeQuote } from 'lib/swapper/swappers/utils/helpers/helpers'

export class LifiSwapper implements Swapper<EvmChainId> {
  readonly name = SwapperName.LIFI
  private lifiChainMap: Map<ChainId, LifiChainKey> = new Map()
  private executedTrades: Map<string, GetStatusRequest> = new Map()

  /** perform any necessary async initialization */
  async initialize(): Promise<Result<unknown, SwapErrorRight>> {
    const supportedChainRefs = evmChainIds.map(
      chainId => Number(fromChainId(chainId).chainReference) as LifiChainId,
    )

    const { chains } = await getLifi().getPossibilities({
      include: ['chains'],
      chains: supportedChainRefs,
    })

    if (chains !== undefined) this.lifiChainMap = createLifiChainMap(chains)

    return Ok(undefined)
  }

  /** Returns the swapper type */
  getType(): SwapperType {
    return SwapperType.LIFI
  }

  /**
   * Builds a trade with definitive rate & txData that can be executed with executeTrade
   **/
  async buildTrade(input: BuildTradeInput): Promise<Result<LifiTrade, SwapErrorRight>> {
    return await buildTrade(input, this.lifiChainMap)
  }

  /**
   * Get a trade quote
   */
  async getTradeQuote(
    input: GetEvmTradeQuoteInput,
  ): Promise<Result<LifiTradeQuote, SwapErrorRight>> {
    const minimumCryptoHuman = getMinimumCryptoHuman(input.sellAsset)
    const minimumSellAmountBaseUnit = toBaseUnit(minimumCryptoHuman, input.sellAsset.precision)
    const isBelowMinSellAmount = bnOrZero(input.sellAmountBeforeFeesCryptoBaseUnit).lt(
      minimumSellAmountBaseUnit,
    )

    // TEMP: return an empty quote to allow the UI to render state where buy amount is below minimum
    // TODO(gomes): the guts of this, handle properly in a follow-up after monads PR is merged
    // This is currently the same flow as before, but we may want to e.g propagate the below minimum error all the way to the client
    // then let the client return the same Ok() value, except it is now fully aware of the fact this isn't a quote from an actual rate
    // but rather a "mock" quote from a minimum sell amount.
    // https://github.com/shapeshift/web/issues/4237
    if (isBelowMinSellAmount) {
      return Ok(createEmptyEvmTradeQuote(input, minimumCryptoHuman.toString(), MAX_LIFI_TRADE))
    }

    return await getTradeQuote(input, this.lifiChainMap)
  }

  /**
   * Get the usd rate from either the assets symbol or tokenId
   */
  async getUsdRate(asset: Asset): Promise<Result<string, SwapErrorRight>> {
    return await getUsdRate(asset, this.lifiChainMap, getLifi())
  }

  /**
   * Execute a trade built with buildTrade by signing and broadcasting
   */
  async executeTrade(input: LifiExecuteTradeInput): Promise<Result<TradeResult, SwapErrorRight>> {
    const maybeExecutedTrade = await executeTrade(input)

    return maybeExecutedTrade.map(executedTrade => {
      const { tradeResult, getStatusRequest } = executedTrade
      this.executedTrades.set(tradeResult.tradeId, getStatusRequest)
      return tradeResult
    })
  }

  /**
   * Get a boolean if a quote needs approval
   */
  async approvalNeeded(
    input: ApprovalNeededInput<EvmChainId>,
  ): Promise<Result<ApprovalNeededOutput, SwapErrorRight>> {
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
    return filterSameChainEvmBuyAssetsBySellAssetId(input)
  }

  /**
   * Get supported sell AssetIds
   */
  filterAssetIdsBySellable(assetIds: AssetId[]): AssetId[] {
    return filterEvmAssetIdsBySellable(assetIds)
  }

  /**
   * Get transactions related to a trade
   */
  async getTradeTxs(tradeResult: TradeResult): Promise<Result<TradeTxs, SwapErrorRight>> {
    const getStatusRequest = this.executedTrades.get(tradeResult.tradeId)

    if (getStatusRequest === undefined) {
      return Ok({ sellTxid: tradeResult.tradeId })
    }

    const statusResponse = await getLifi().getStatus(getStatusRequest)

    return Ok({
      sellTxid: tradeResult.tradeId,
      buyTxid: statusResponse.receiving?.txHash,
    })
  }
}
