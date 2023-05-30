import type { AssetId } from '@shapeshiftoss/caip'
import type {
  avalanche,
  bnbsmartchain,
  ethereum,
  EvmChainId,
  gnosis,
  optimism,
} from '@shapeshiftoss/chain-adapters'
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import type { KnownChainIds } from '@shapeshiftoss/types'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { toBaseUnit } from 'lib/math'
import type {
  BuildTradeInput,
  BuyAssetBySellIdInput,
  GetEvmTradeQuoteInput,
  SwapErrorRight,
  Swapper,
  TradeQuote,
  TradeResult,
  TradeTxs,
} from 'lib/swapper/api'
import { makeSwapErrorRight, SwapErrorType, SwapperName } from 'lib/swapper/api'
import { filterEvmAssetIdsBySellable } from 'lib/swapper/swappers/utils/filterAssetIdsBySellable/filterAssetIdsBySellable'
import {
  createEmptyEvmTradeQuote,
  isNativeEvmAsset,
} from 'lib/swapper/swappers/utils/helpers/helpers'

import { buildTrade } from './buildTrade/buildTrade'
import { executeTrade } from './executeTrade/executeTrade'
import { filterBuyAssetsBySellAssetId } from './filterBuyAssetsBySellAssetId/filterBuyAssetsBySellAssetId'
import { getMinMax } from './getMinMax/getMinMax'
import { getTradeQuote } from './getTradeQuote/getTradeQuote'
import type { OneInchExecuteTradeInput, OneInchSwapperDeps, OneInchTrade } from './utils/types'

export type OneInchSupportedChainId =
  | KnownChainIds.EthereumMainnet
  | KnownChainIds.BnbSmartChainMainnet
  | KnownChainIds.OptimismMainnet
  | KnownChainIds.AvalancheMainnet
  | KnownChainIds.GnosisMainnet

export type OneInchSupportedChainAdapter =
  | ethereum.ChainAdapter
  | bnbsmartchain.ChainAdapter
  | optimism.ChainAdapter
  | avalanche.ChainAdapter
  | gnosis.ChainAdapter

export class OneInchSwapper implements Swapper<EvmChainId, true> {
  readonly name = SwapperName.OneInch
  deps: OneInchSwapperDeps

  constructor(deps: OneInchSwapperDeps) {
    this.deps = deps
  }

  /**
   * Get a trade quote
   */
  async getTradeQuote(
    input: GetEvmTradeQuoteInput,
  ): Promise<Result<TradeQuote<EvmChainId, true | false>, SwapErrorRight>> {
    const { chainId, sellAsset, buyAsset } = input

    if (sellAsset.chainId !== buyAsset.chainId) {
      return Err(
        makeSwapErrorRight({
          message: '[getTradeQuote] cross chain swaps not supported',
          code: SwapErrorType.UNSUPPORTED_PAIR,
        }),
      )
    }

    if (
      !isEvmChainId(chainId) ||
      !isEvmChainId(sellAsset.chainId) ||
      !isEvmChainId(buyAsset.chainId)
    ) {
      return Err(
        makeSwapErrorRight({
          message: '[getTradeQuote] invalid chainId',
          code: SwapErrorType.UNSUPPORTED_CHAIN,
        }),
      )
    }

    if (isNativeEvmAsset(sellAsset.assetId) || isNativeEvmAsset(buyAsset.assetId)) {
      return Err(
        makeSwapErrorRight({
          message: '[getTradeQuote] 1inch swapper only supports ERC20s',
          code: SwapErrorType.UNSUPPORTED_CHAIN,
        }),
      )
    }

    const maybeMinMax = await getMinMax(input.sellAsset, input.buyAsset)

    return maybeMinMax.match({
      ok: minMax => {
        const minimumSellAmountBaseUnit = toBaseUnit(
          minMax.minimumAmountCryptoHuman,
          input.sellAsset.precision,
        )
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
          return Ok(
            createEmptyEvmTradeQuote(
              input,
              minMax.minimumAmountCryptoHuman.toString(),
              minMax.maximumAmountCryptoHuman,
            ),
          )
        }

        return getTradeQuote(this.deps, input)
      },
      err: err => Promise.resolve(Err(err)),
    })
  }

  buildTrade(input: BuildTradeInput): Promise<Result<OneInchTrade<EvmChainId>, SwapErrorRight>> {
    return buildTrade(this.deps, input)
  }

  executeTrade(
    input: OneInchExecuteTradeInput<EvmChainId>,
  ): Promise<Result<TradeResult, SwapErrorRight>> {
    return executeTrade(input)
  }

  filterAssetIdsBySellable(assetIds: AssetId[]): AssetId[] {
    return filterEvmAssetIdsBySellable(assetIds)
  }

  filterBuyAssetsBySellAssetId(input: BuyAssetBySellIdInput): AssetId[] {
    return filterBuyAssetsBySellAssetId(input)
  }

  getTradeTxs(tradeResult: TradeResult): Promise<Result<TradeTxs, SwapErrorRight>> {
    return Promise.resolve(
      Ok({
        sellTxid: tradeResult.tradeId,
        buyTxid: tradeResult.tradeId,
      }),
    )
  }
}
