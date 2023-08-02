import type { AssetId } from '@shapeshiftoss/caip'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { getConfig } from 'config'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import type { SwapErrorRight } from 'lib/swapper/api'
import { makeSwapErrorRight, SwapErrorType } from 'lib/swapper/api'
import type { ThornodePoolResponse } from 'lib/swapper/swappers/ThorchainSwapper/types'
import { isRune } from 'lib/swapper/swappers/ThorchainSwapper/utils/isRune/isRune'
import { assetIdToPoolAssetId } from 'lib/swapper/swappers/ThorchainSwapper/utils/poolAssetHelpers/poolAssetHelpers'
import { thorService } from 'lib/swapper/swappers/ThorchainSwapper/utils/thorService'

export const getPriceRatio = async (input: {
  buyAssetId: AssetId
  sellAssetId: AssetId
}): Promise<Result<string, SwapErrorRight>> => {
  const { buyAssetId, sellAssetId } = input
  const buyPoolId = assetIdToPoolAssetId({ assetId: buyAssetId })
  const sellPoolId = assetIdToPoolAssetId({ assetId: sellAssetId })

  if (!buyPoolId && !isRune(buyAssetId)) {
    return Err(
      makeSwapErrorRight({
        message: `[getPriceRatio]: No buyPoolId found for asset ${buyAssetId}`,
        code: SwapErrorType.POOL_NOT_FOUND,
        details: { buyAssetId },
      }),
    )
  }

  if (!sellPoolId && !isRune(sellAssetId)) {
    return Err(
      makeSwapErrorRight({
        message: `[getPriceRatio]: No sellPoolId found for asset ${sellAssetId}`,
        code: SwapErrorType.POOL_NOT_FOUND,
        details: { sellAssetId },
      }),
    )
  }
  const daemonUrl = getConfig().REACT_APP_THORCHAIN_NODE_URL

  return (
    await thorService.get<ThornodePoolResponse[]>(`${daemonUrl}/lcd/thorchain/pools`)
  ).andThen<string>(({ data: responseData }) => {
    const buyPool = responseData.find(response => response.asset === buyPoolId)
    const sellPool = responseData.find(response => response.asset === sellPoolId)

    /**
     * there is no rune pool, rune *is* the pool, special logic case buying RUNE
     */
    if (isRune(buyAssetId) && sellPool) {
      const sellAssetBalance = bnOrZero(sellPool.balance_asset)
      const runeBalance = bnOrZero(sellPool.balance_rune)
      // guard against division by zero
      if (sellAssetBalance.eq(0))
        return Err(
          makeSwapErrorRight({
            message: `[getPriceRatio] zero sell asset balance sellAssetId ${sellAssetId} buyAssetId ${buyAssetId}`,
          }),
        )
      return Ok(bn(runeBalance).dividedBy(sellAssetBalance).toString())
    }

    if (isRune(sellAssetId) && buyPool) {
      const buyAssetBalance = bnOrZero(buyPool.balance_asset)
      const runeBalance = bnOrZero(buyPool.balance_rune)
      // guard against division by zero
      if (buyAssetBalance.eq(0))
        return Err(
          makeSwapErrorRight({
            message: `[getPriceRatio] zero buy asset balance sellAssetId ${sellAssetId} buyAssetId ${buyAssetId}`,
          }),
        )
      return Ok(bn(buyAssetBalance).dividedBy(runeBalance).toString())
    }

    if (!buyPool || !sellPool) {
      return Err(
        makeSwapErrorRight({
          message: `[getPriceRatio]: pools not found`,
          code: SwapErrorType.RESPONSE_ERROR,
          details: { buyPoolId, sellPoolId },
        }),
      )
    }

    const buyPrice = bn(buyPool.balance_rune).dividedBy(buyPool.balance_asset)
    const sellPrice = bn(sellPool.balance_rune).dividedBy(sellPool.balance_asset)

    if (!buyPrice.gt(0) || !sellPrice.gt(0)) {
      return Err(
        makeSwapErrorRight({
          message: `[getPriceRatio]: invalid pool price`,
          code: SwapErrorType.RESPONSE_ERROR,
          details: { buyPrice, sellPrice },
        }),
      )
    }

    return Ok(sellPrice.dividedBy(buyPrice).toString())
  })
}
