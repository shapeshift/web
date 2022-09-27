import { adapters, AssetId } from '@shapeshiftoss/caip'

import { SwapError, SwapErrorTypes } from '../../../../api'
import { bn } from '../../../utils/bignumber'
import { ThorchainSwapperDeps, ThornodePoolResponse } from '../../types'
import { isRune } from '../../utils/isRune/isRune'
import { thorService } from '../thorService'

export const getPriceRatio = async (
  deps: ThorchainSwapperDeps,
  input: { buyAssetId: AssetId; sellAssetId: AssetId },
): Promise<string> => {
  const { buyAssetId, sellAssetId } = input
  try {
    const buyPoolId = adapters.assetIdToPoolAssetId({ assetId: buyAssetId })
    const sellPoolId = adapters.assetIdToPoolAssetId({ assetId: sellAssetId })

    if (!buyPoolId && !isRune(buyAssetId)) {
      throw new SwapError(`[getPriceRatio]: No buyPoolId found for asset ${buyAssetId}`, {
        code: SwapErrorTypes.POOL_NOT_FOUND,
        fn: 'getPriceRatio',
        details: { buyAssetId },
      })
    }

    if (!sellPoolId && !isRune(sellAssetId)) {
      throw new SwapError(`[getPriceRatio]: No sellPoolId found for asset ${sellAssetId}`, {
        code: SwapErrorTypes.POOL_NOT_FOUND,
        fn: 'getPriceRatio',
        details: { sellAssetId },
      })
    }

    const { data: responseData } = await thorService.get<ThornodePoolResponse[]>(
      `${deps.daemonUrl}/lcd/thorchain/pools`,
    )

    const buyPool = responseData.find((response) => response.asset === buyPoolId)
    const sellPool = responseData.find((response) => response.asset === sellPoolId)

    if (!buyPool || !sellPool) {
      throw new SwapError(`[getPriceRatio]: pools not found`, {
        code: SwapErrorTypes.RESPONSE_ERROR,
        details: { buyPoolId, sellPoolId },
      })
    }

    const buyPrice = bn(buyPool.balance_rune).dividedBy(buyPool.balance_asset)
    const sellPrice = bn(sellPool.balance_rune).dividedBy(sellPool.balance_asset)

    if (!buyPrice.gt(0) || !sellPrice.gt(0)) {
      throw new SwapError(`[getPriceRatio]: invalid pool price`, {
        code: SwapErrorTypes.RESPONSE_ERROR,
        details: { buyPrice, sellPrice },
      })
    }

    return sellPrice.dividedBy(buyPrice).toString()
  } catch (e) {
    if (e instanceof SwapError) throw e
    throw new SwapError('[getPriceRatio]: Thorchain getPriceRatio failed', {
      code: SwapErrorTypes.PRICE_RATIO_FAILED,
      cause: e,
    })
  }
}
