import { ChainId } from '@shapeshiftoss/caip'
import { isUndefined } from 'lodash'
import uniq from 'lodash/uniq'

import {
  BuyAssetBySellIdInput,
  ByPairInput,
  GetBestSwapperArgs,
  SupportedSellAssetsInput,
  Swapper,
  TradeQuote,
} from '..'
import { SwapError, SwapErrorTypes, SwapperType } from '../api'
import { isFulfilled } from '../typeGuards'
import { getRatioFromQuote } from './utils'

type SwapperQuoteTuple = readonly [swapper: Swapper<ChainId>, quote: TradeQuote<ChainId>]
type SwapperRatioTuple = readonly [swapper: Swapper<ChainId>, ratio: number | undefined]

function validateSwapper(swapper: Swapper<ChainId>) {
  if (!(typeof swapper === 'object' && typeof swapper.getType === 'function'))
    throw new SwapError('[validateSwapper] - invalid swapper instance', {
      code: SwapErrorTypes.MANAGER_ERROR,
    })
}

// TODO: remove me
export class SwapperManager {
  public swappers: Map<SwapperType, Swapper<ChainId>>

  constructor() {
    this.swappers = new Map<SwapperType, Swapper<ChainId>>()
  }

  /**
   *
   * @param swapperInstance swapper instance {Swapper}
   * @returns {SwapperManager}
   */
  addSwapper(swapperInstance: Swapper<ChainId>): this {
    validateSwapper(swapperInstance)
    const swapperType = swapperInstance.getType()
    this.swappers.set(swapperType, swapperInstance)
    return this
  }

  /**
   *
   * @param swapperType swapper type {SwapperType|string}
   * @returns {Swapper}
   */
  getSwapper(swapperType: SwapperType): Swapper<ChainId> {
    const swapper = this.swappers.get(swapperType)
    if (!swapper)
      throw new SwapError('[getSwapper] - swapperType doesnt exist', {
        code: SwapErrorTypes.MANAGER_ERROR,
        details: { swapperType },
      })
    return swapper
  }

  /**
   *
   * @param swapperType swapper type {SwapperType|string}
   * @returns {SwapperManager}
   */
  removeSwapper(swapperType: SwapperType): this {
    const swapper = this.swappers.get(swapperType)
    if (!swapper)
      throw new SwapError('[removeSwapper] - swapperType doesnt exist', {
        code: SwapErrorTypes.MANAGER_ERROR,
        details: { swapperType },
      })
    this.swappers.delete(swapperType)
    return this
  }

  /**
   *
   * @param args {GetBestSwapperArgs}
   * @returns {Promise<Swapper<ChainId> | undefined>}
   */
  async getBestSwapper(args: GetBestSwapperArgs): Promise<Swapper<ChainId> | undefined> {
    const { sellAsset, buyAsset, feeAsset } = args

    // Get all swappers that support the pair
    const supportedSwappers: Swapper<ChainId>[] = this.getSwappersByPair({
      sellAssetId: sellAsset.assetId,
      buyAssetId: buyAsset.assetId,
    })

    // Get quotes from all swappers that support the pair
    const quotePromises: Promise<SwapperQuoteTuple>[] = supportedSwappers.map(
      async (swapper) => [swapper, await swapper.getTradeQuote(args)] as const,
    )
    const settledQuoteRequests = await Promise.allSettled(quotePromises)
    // For each swapper, get receive amount/(input amount + gas fee), where all values are in fiat
    const fulfilledQuoteTuples = settledQuoteRequests
      .filter(isFulfilled)
      .map((quoteRequest) => quoteRequest.value)

    // The best swapper is the one with the highest ratio
    const bestQuoteTuple = await fulfilledQuoteTuples.reduce(
      async (acc: Promise<SwapperRatioTuple> | undefined, currentQuoteTuple: SwapperQuoteTuple) => {
        const resolvedAcc = await acc
        const [currentSwapper, currentQuote] = currentQuoteTuple
        const currentRatio = await getRatioFromQuote(currentQuote, currentSwapper, feeAsset)

        // It's our first iteration, so we just return the current SwapperQuoteTuple
        if (!resolvedAcc) return Promise.resolve([currentSwapper, currentRatio])

        const [, bestRatio] = resolvedAcc
        const isCurrentSwapperBestSwapper = (() => {
          // Happy path - no div by 0's in getRatioFromQuote evaluations so we have both ratios
          if (!isUndefined(currentRatio) && !isUndefined(bestRatio)) return currentRatio > bestRatio
          // We don't know, neither has a ratio, so we can't compare (big edge case div by 0 scenario)
          if (isUndefined(currentRatio) && isUndefined(bestRatio)) return false
          // We don't have a best, but we do have a current, so current is the new best
          return !isUndefined(currentRatio)
        })()

        const currentSwapperRatioTuple = [currentSwapper, currentRatio] as const
        return Promise.resolve(isCurrentSwapperBestSwapper ? currentSwapperRatioTuple : resolvedAcc)
      },
      undefined,
    )

    const bestSwapper = bestQuoteTuple?.[0]
    return bestSwapper
  }

  /**
   *
   * @param pair type {GetQuoteInput}
   * @returns {SwapperType}
   */
  getSwappersByPair(pair: ByPairInput): Swapper<ChainId>[] {
    const { sellAssetId, buyAssetId } = pair
    const availableSwappers = Array.from(this.swappers.values())
    return availableSwappers.filter(
      (swapper: Swapper<ChainId>) =>
        swapper.filterBuyAssetsBySellAssetId({ sellAssetId, assetIds: [buyAssetId] }).length,
    )
  }

  getSupportedBuyAssetIdsFromSellId(args: BuyAssetBySellIdInput) {
    return uniq(
      Array.from(this.swappers.values()).flatMap((swapper: Swapper<ChainId>) =>
        swapper.filterBuyAssetsBySellAssetId(args),
      ),
    )
  }

  getSupportedSellableAssetIds(args: SupportedSellAssetsInput) {
    const { assetIds } = args

    return uniq(
      Array.from(this.swappers.values()).flatMap((swapper: Swapper<ChainId>) =>
        swapper.filterAssetIdsBySellable(assetIds),
      ),
    )
  }
}
