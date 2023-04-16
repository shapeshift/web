import type { ChainId } from '@shapeshiftoss/caip'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { sortBy } from 'lodash'
import uniq from 'lodash/uniq'
import util from 'util'

import type {
  BuyAssetBySellIdInput,
  ByPairInput,
  GetSwappersWithQuoteMetadataArgs,
  GetSwappersWithQuoteMetadataReturn,
  SupportedSellAssetsInput,
  Swapper,
  SwapperWithQuoteMetadata,
} from '..'
import type { SwapErrorMonad, SwapperType } from '../api'
import { SwapError, SwapErrorType } from '../api'
import { isFulfilled } from '../typeGuards'
import { getRatioFromQuote } from './utils'

function validateSwapper(swapper: Swapper<ChainId>) {
  if (!(typeof swapper === 'object' && typeof swapper.getType === 'function'))
    throw new SwapError('[validateSwapper] - invalid swapper instance', {
      code: SwapErrorType.MANAGER_ERROR,
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
        code: SwapErrorType.MANAGER_ERROR,
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
        code: SwapErrorType.MANAGER_ERROR,
        details: { swapperType },
      })
    this.swappers.delete(swapperType)
    return this
  }

  /**
   *
   * Returns an ordered list of SwapperWithQuoteMetadata objects, descending from best to worst input output ratios
   *
   * @param args {GetSwappersWithQuoteMetadataArgs}
   * @returns {Promise<GetSwappersWithQuoteMetadataReturn>}
   */
  async getSwappersWithQuoteMetadata(
    args: GetSwappersWithQuoteMetadataArgs,
  ): Promise<GetSwappersWithQuoteMetadataReturn> {
    const { sellAsset, buyAsset, feeAsset } = args

    // Get all swappers that support the pair
    const supportedSwappers: Swapper<ChainId>[] = this.getSwappersByPair({
      sellAssetId: sellAsset.assetId,
      buyAssetId: buyAsset.assetId,
    })

    const settledSwapperDetailRequests: PromiseSettledResult<
      Result<SwapperWithQuoteMetadata, SwapErrorMonad>
      // TODO(gomes): do we still need allSettled? Can we use Promise.all? This should never reject anymore
      // as long as we scutinize the error-handling flow
    >[] = await Promise.allSettled(
      supportedSwappers.map(async swapper => {
        const maybeQuote = await swapper.getTradeQuote(args)

        if (maybeQuote.isErr()) return Err(maybeQuote.unwrapErr())
        const quote = maybeQuote.unwrap()

        const ratio = await getRatioFromQuote(quote, swapper, feeAsset)

        return Ok({
          swapper,
          quote,
          inputOutputRatio: ratio,
        })
      }),
    )

    // Swappers with quote and ratio details, sorted by descending input output ratio (best to worst)
    const swappersWithDetail: SwapperWithQuoteMetadata[] = sortBy(
      settledSwapperDetailRequests
        .filter(isFulfilled)
        .filter(settledSwapperDetailRequests => settledSwapperDetailRequests.value.isOk())
        .map(swapperDetailRequest => swapperDetailRequest.value.unwrap()),
      ['inputOutputRatio'],
    ).reverse()

    return swappersWithDetail
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
