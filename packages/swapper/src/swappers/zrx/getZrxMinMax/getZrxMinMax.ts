import { Asset } from '@shapeshiftoss/asset-service'
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'

import { MinMaxOutput, SwapError, SwapErrorType } from '../../../api'
import { bn, bnOrZero } from '../../utils/bignumber'
import { MAX_ZRX_TRADE } from '../utils/constants'
import { getUsdRate } from '../utils/helpers/helpers'

export const getZrxMinMax = async (sellAsset: Asset, buyAsset: Asset): Promise<MinMaxOutput> => {
  try {
    if (
      !(
        isEvmChainId(sellAsset.chainId) &&
        isEvmChainId(buyAsset.chainId) &&
        buyAsset.chainId === sellAsset.chainId
      )
    ) {
      throw new SwapError('[getZrxMinMax]', { code: SwapErrorType.UNSUPPORTED_PAIR })
    }

    const usdRate = await getUsdRate({ ...sellAsset })

    const minimum = bn(1).dividedBy(bnOrZero(usdRate)).toString() // $1 worth of the sell token.
    const maximum = MAX_ZRX_TRADE // Arbitrarily large value. 10e+28 here.
    return {
      minimum,
      maximum,
    }
  } catch (e) {
    if (e instanceof SwapError) throw e
    throw new SwapError('[getZrxMinMax]', { cause: e, code: SwapErrorType.MIN_MAX_FAILED })
  }
}
