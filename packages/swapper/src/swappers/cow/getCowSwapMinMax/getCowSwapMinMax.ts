import { Asset } from '@shapeshiftoss/types'

import { MinMaxOutput, SwapError, SwapErrorTypes } from '../../../api'
import { bn, bnOrZero } from '../../utils/bignumber'
import { CowSwapperDeps } from '../CowSwapper'
import { MAX_COWSWAP_TRADE, MIN_COWSWAP_VALUE_USD } from '../utils/constants'
import { getUsdRate } from '../utils/helpers/helpers'

export const getCowSwapMinMax = async (
  deps: CowSwapperDeps,
  sellAsset: Asset,
  buyAsset: Asset
): Promise<MinMaxOutput> => {
  try {
    if (
      !sellAsset.assetId.startsWith('eip155:1/erc20') ||
      !buyAsset.assetId.startsWith('eip155:1/erc20')
    ) {
      throw new SwapError('[getCowSwapMinMax]', { code: SwapErrorTypes.UNSUPPORTED_PAIR })
    }

    const usdRate = await getUsdRate(deps, sellAsset)

    const minimum = bn(MIN_COWSWAP_VALUE_USD).dividedBy(bnOrZero(usdRate)).toString() // $10 worth of the sell token.
    const maximum = MAX_COWSWAP_TRADE // Arbitrarily large value. 10e+28 here.
    return {
      minimum,
      maximum
    }
  } catch (e) {
    if (e instanceof SwapError) throw e
    throw new SwapError('[getCowSwapMinMax]', { cause: e, code: SwapErrorTypes.MIN_MAX_FAILED })
  }
}
