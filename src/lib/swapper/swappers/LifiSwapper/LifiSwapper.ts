import type { ChainId as LifiChainId, ChainKey as LifiChainKey, GetStatusRequest } from '@lifi/sdk'
import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { fromChainId } from '@shapeshiftoss/caip'
import type { EvmChainId } from '@shapeshiftoss/chain-adapters'
import { evmChainIds } from '@shapeshiftoss/chain-adapters'
import type { Result } from '@sniptt/monads'
import { Ok } from '@sniptt/monads'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { toBaseUnit } from 'lib/math'
import type {
  BuildTradeInput,
  BuyAssetBySellIdInput,
  GetEvmTradeQuoteInput,
  SwapErrorRight,
  Swapper,
  TradeResult,
  TradeTxs,
} from 'lib/swapper/api'
import { SwapperName } from 'lib/swapper/api'
import { buildTrade } from 'lib/swapper/swappers/LifiSwapper/buildTrade/buildTrade'
import { executeTrade } from 'lib/swapper/swappers/LifiSwapper/executeTrade/executeTrade'
import { getTradeQuote } from 'lib/swapper/swappers/LifiSwapper/getTradeQuote/getTradeQuote'
import { createLifiChainMap } from 'lib/swapper/swappers/LifiSwapper/utils/createLifiChainMap/createLifiChainMap'
import { getLifi } from 'lib/swapper/swappers/LifiSwapper/utils/getLifi'
import { getMinimumCryptoHuman } from 'lib/swapper/swappers/LifiSwapper/utils/getMinimumCryptoHuman/getMinimumCryptoHuman'
import type {
  LifiExecuteTradeInput,
  LifiTrade,
  LifiTradeQuote,
} from 'lib/swapper/swappers/LifiSwapper/utils/types'
import { filterEvmAssetIdsBySellable } from 'lib/swapper/swappers/utils/filterAssetIdsBySellable/filterAssetIdsBySellable'
import { filterCrossChainEvmBuyAssetsBySellAssetId } from 'lib/swapper/swappers/utils/filterBuyAssetsBySellAssetId/filterBuyAssetsBySellAssetId'
import { createEmptyEvmTradeQuote } from 'lib/swapper/swappers/utils/helpers/helpers'

export class LifiSwapper implements Swapper<EvmChainId, true> {
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
  ): Promise<Result<LifiTradeQuote<true | false>, SwapErrorRight>> {
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
      return Ok(createEmptyEvmTradeQuote(input, minimumCryptoHuman.toString()))
    }

    return await getTradeQuote(input, this.lifiChainMap)
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
   * Get supported buyAssetId's by sellAssetId
   */
  filterBuyAssetsBySellAssetId(input: BuyAssetBySellIdInput): AssetId[] {
    return filterCrossChainEvmBuyAssetsBySellAssetId(input)
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
