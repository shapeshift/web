import { Asset } from '@shapeshiftoss/asset-service'
import { adapters } from '@shapeshiftoss/caip'

import { SwapError, SwapErrorTypes } from '../../../../api'
import { bn, bnOrZero } from '../../../utils/bignumber'
import { PoolResponse, ThorchainSwapperDeps } from '../../types'
import { isRune } from '../isRune/isRune'
import { thorService } from '../thorService'

const THOR_PRECISION = 8
// not sure what to do for rune usd rate - inverting USDC pool rate for now
const usdcPool = 'ETH.USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48'

export const getUsdRate = async ({
  deps,
  input,
}: {
  deps: ThorchainSwapperDeps
  input: Pick<Asset, 'assetId'>
}): Promise<string> => {
  const { assetId } = input
  try {
    const thorchainPoolId: string | undefined = (() => {
      if (isRune(assetId)) {
        return usdcPool
      }
      return adapters.assetIdToPoolAssetId({ assetId })
    })()

    if (!thorchainPoolId)
      throw new SwapError(`[getUsdRate]: No thorchainPoolId found for assetId: ${assetId}`, {
        code: SwapErrorTypes.USD_RATE_FAILED,
      })

    const { data: responseData } = await thorService.get<PoolResponse>(
      `${deps.midgardUrl}/pool/${thorchainPoolId}`,
    )

    const rate: string | undefined = (() => {
      if (isRune(assetId)) {
        const bnRate = bnOrZero(responseData?.assetPrice)
        if (bnRate.isZero()) {
          throw new SwapError('[getUsdRate]: cannot invert rate zero', {
            code: SwapErrorTypes.USD_RATE_FAILED,
          })
        }
        const inverseRate = bn(1).div(bnRate)
        return inverseRate.toFixed(THOR_PRECISION)
      }
      return responseData?.assetPriceUSD
    })()

    if (!rate)
      throw new SwapError(`[getUsdRate]: No rate for ${assetId}`, {
        code: SwapErrorTypes.USD_RATE_FAILED,
      })

    return rate
  } catch (e) {
    if (e instanceof SwapError) throw e
    throw new SwapError('[getUsdRate]: Thorchain getUsdRate failed', {
      code: SwapErrorTypes.USD_RATE_FAILED,
      cause: e,
    })
  }
}
