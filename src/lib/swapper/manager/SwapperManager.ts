import type { ChainId } from '@shapeshiftoss/caip'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { sortBy } from 'lodash'
import uniq from 'lodash/uniq'
import type {
  BuyAssetBySellIdInput,
  ByPairInput,
  GetSwappersWithQuoteMetadataArgs,
  GetSwappersWithQuoteMetadataReturn,
  SupportedSellAssetsInput,
  SwapErrorRight,
  Swapper,
  SwapperWithQuoteMetadata,
} from 'lib/swapper/api'
import { SwapError, SwapErrorType, SwapperName } from 'lib/swapper/api'
import { getRatioFromQuote } from 'lib/swapper/manager/utils'

function validateSwapper(swapper: Swapper<ChainId>) {
  if (!(typeof swapper === 'object' && Object.values(SwapperName).includes(swapper.name)))
    throw new SwapError('[validateSwapper] - invalid swapper instance', {
      code: SwapErrorType.MANAGER_ERROR,
    })
}

// TODO: remove me
export class SwapperManager {
  public swappers: Map<SwapperName, Swapper<ChainId>>

  constructor() {
    this.swappers = new Map<SwapperName, Swapper<ChainId, boolean>>()
  }

  /**
   *
   * @param swapperInstance swapper instance {Swapper}
   * @returns {SwapperManager}
   */
  addSwapper(swapperInstance: Swapper<ChainId, boolean>): this {
    validateSwapper(swapperInstance)
    this.swappers.set(swapperInstance.name, swapperInstance)
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
    const { sellAsset, buyAsset, feeAsset, cryptoMarketDataById } = args

    // Get all swappers that support the pair
    const supportedSwappers: Swapper<ChainId, boolean>[] = this.getSwappersByPair({
      sellAssetId: sellAsset.assetId,
      buyAssetId: buyAsset.assetId,
    })

    const resolvedSwapperDetailRequests: Result<SwapperWithQuoteMetadata, SwapErrorRight>[] =
      await Promise.all(
        supportedSwappers.map(async swapper => {
          const maybeQuote = await swapper.getTradeQuote(args)

          if (maybeQuote.isErr()) return Promise.resolve(Err(maybeQuote.unwrapErr()))
          const quote = maybeQuote.unwrap()

          const ratio = getRatioFromQuote({
            quote,
            feeAsset,
            cryptoMarketDataById,
          })

          return Ok({
            swapper,
            quote,
            inputOutputRatio: ratio,
          })
        }),
      )

    // Swappers with quote and ratio details, sorted by descending input output ratio (best to worst)
    const swappersWithDetail: SwapperWithQuoteMetadata[] = sortBy(
      resolvedSwapperDetailRequests
        .filter(resolvedSwapperDetailRequest => resolvedSwapperDetailRequest.isOk())
        .map(swapperDetailRequest => swapperDetailRequest.unwrap()),
      ['inputOutputRatio'],
    ).reverse()

    return swappersWithDetail
  }

  /**
   *
   * @param pair type {GetQuoteInput}
   * @returns {SwapperType}
   */
  getSwappersByPair(pair: ByPairInput): Swapper<ChainId, boolean>[] {
    const { sellAssetId, buyAssetId } = pair
    const availableSwappers = Array.from(this.swappers.values())
    return availableSwappers.filter(
      (swapper: Swapper<ChainId, boolean>) =>
        swapper.filterBuyAssetsBySellAssetId({ sellAssetId, assetIds: [buyAssetId] }).length,
    )
  }

  getSupportedBuyAssetIdsFromSellId(args: BuyAssetBySellIdInput) {
    return uniq(
      Array.from(this.swappers.values()).flatMap((swapper: Swapper<ChainId, boolean>) =>
        swapper.filterBuyAssetsBySellAssetId(args),
      ),
    )
  }

  getSupportedSellableAssetIds(args: SupportedSellAssetsInput) {
    const { assetIds } = args

    return uniq(
      Array.from(this.swappers.values()).flatMap((swapper: Swapper<ChainId, boolean>) =>
        swapper.filterAssetIdsBySellable(assetIds),
      ),
    )
  }
}
