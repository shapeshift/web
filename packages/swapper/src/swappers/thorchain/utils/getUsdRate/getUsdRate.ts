import { adapters } from '@shapeshiftoss/caip'
import { Asset } from '@shapeshiftoss/types'

import { SwapError, SwapErrorTypes } from '../../../../api'
import { PoolResponse, ThorchainSwapperDeps } from '../../types'
import { thorService } from '../thorService'

export const getUsdRate = async ({
  deps,
  input
}: {
  deps: ThorchainSwapperDeps
  input: Pick<Asset, 'assetId'>
}): Promise<string> => {
  const { assetId } = input
  try {
    const thorchainPoolId = adapters.assetIdToPoolAssetId({ assetId })

    if (!thorchainPoolId)
      throw new SwapError(`[getUsdRate]: No thorchainPoolId found for assetId: ${assetId}`, {
        code: SwapErrorTypes.USD_RATE_FAILED
      })

    const { data: responseData } = await thorService.get<PoolResponse>(
      `${deps.midgardUrl}/pool/${thorchainPoolId}`
    )

    const rate = responseData?.assetPriceUSD

    if (!rate)
      throw new SwapError(`[getUsdRate]: No rate found`, {
        code: SwapErrorTypes.USD_RATE_FAILED
      })

    return rate
  } catch (e) {
    if (e instanceof SwapError) throw e
    throw new SwapError('[getUsdRate]: Thorchain getUsdRate failed', {
      code: SwapErrorTypes.USD_RATE_FAILED,
      cause: e
    })
  }
}
