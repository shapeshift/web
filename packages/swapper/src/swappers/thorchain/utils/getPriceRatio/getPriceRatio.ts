import { adapters, AssetId } from '@shapeshiftoss/caip'

import { SwapError, SwapErrorTypes } from '../../../../api'
import { bnOrZero } from '../../../utils/bignumber'
import { PoolResponse, ThorchainSwapperDeps } from '../../types'
import { thorService } from '../thorService'

export const getPriceRatio = async (
  deps: ThorchainSwapperDeps,
  input: { buyAssetId: AssetId; sellAssetId: AssetId }
): Promise<string> => {
  const { buyAssetId, sellAssetId } = input
  try {
    const buyPoolId = adapters.assetIdToPoolAssetId({ assetId: buyAssetId })
    const sellPoolId = adapters.assetIdToPoolAssetId({ assetId: sellAssetId })

    if (!buyPoolId || !sellPoolId)
      throw new SwapError(`[getPriceRatio]: No thorchain pool found`, {
        code: SwapErrorTypes.RESPONSE_ERROR,
        details: { buyPoolId, sellPoolId }
      })

    const { data: responseData } = await thorService.get<PoolResponse[]>(`${deps.midgardUrl}/pools`)

    const buyUsdPrice = responseData.find((response) => response.asset === buyPoolId)?.assetPrice
    const sellUsdPrice = responseData.find((response) => response.asset === sellPoolId)?.assetPrice

    if (!buyUsdPrice || !sellUsdPrice)
      throw new SwapError(`[getPriceRatio]: No rate found for pools`, {
        code: SwapErrorTypes.RESPONSE_ERROR,
        details: { buyPoolId, sellPoolId }
      })
    return bnOrZero(buyUsdPrice).dividedBy(sellUsdPrice).toString()
  } catch (e) {
    if (e instanceof SwapError) throw e
    throw new SwapError('[getUsdRate]: Thorchain getUsdRate failed', {
      code: SwapErrorTypes.PRICE_RATIO_FAILED,
      cause: e
    })
  }
}
