import { ChainId } from '@shapeshiftoss/caip'
import uniq from 'lodash/uniq'

import { BuyAssetBySellIdInput, ByPairInput, SupportedSellAssetsInput, Swapper } from '..'
import { SwapError, SwapErrorTypes, SwapperType } from '../api'

function validateSwapper(swapper: Swapper<ChainId>) {
  if (!(typeof swapper === 'object' && typeof swapper.getType === 'function'))
    throw new SwapError('[validateSwapper] - invalid swapper instance', {
      code: SwapErrorTypes.MANAGER_ERROR
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
   * @param swapperType swapper type {SwapperType|string}
   * @param swapperInstance swapper instance {Swapper}
   * @returns {SwapperManager}
   */
  addSwapper(swapperType: SwapperType, swapperInstance: Swapper<ChainId>): this {
    const swapper = this.swappers.get(swapperType)
    if (swapper)
      throw new SwapError('[addSwapper] - swapper already exists', {
        code: SwapErrorTypes.MANAGER_ERROR,
        details: { swapperType }
      })
    validateSwapper(swapperInstance)
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
        details: { swapperType }
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
        details: { swapperType }
      })
    this.swappers.delete(swapperType)
    return this
  }

  async getBestSwapper(args: ByPairInput): Promise<Swapper<ChainId> | undefined> {
    // TODO: This will eventually have logic to determine the best swapper.
    // For now we return the first swapper we get from getSwappersByPair
    return this.getSwappersByPair(args)[0]
  }

  /**
   *
   * @param pair type {GetQuoteInput}
   * @returns {SwapperType}
   */
  getSwappersByPair(pair: ByPairInput): Swapper<ChainId>[] {
    const { sellAssetId, buyAssetId } = pair
    return Array.from(this.swappers.values()).filter(
      (swapper: Swapper<ChainId>) =>
        swapper.filterBuyAssetsBySellAssetId({ sellAssetId, assetIds: [buyAssetId] }).length
    )
  }

  getSupportedBuyAssetIdsFromSellId(args: BuyAssetBySellIdInput) {
    return uniq(
      Array.from(this.swappers.values()).flatMap((swapper: Swapper<ChainId>) =>
        swapper.filterBuyAssetsBySellAssetId(args)
      )
    )
  }

  getSupportedSellableAssetIds(args: SupportedSellAssetsInput) {
    const { assetIds } = args

    return uniq(
      Array.from(this.swappers.values()).flatMap((swapper: Swapper<ChainId>) =>
        swapper.filterAssetIdsBySellable(assetIds)
      )
    )
  }
}
