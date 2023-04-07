import { Asset } from '@shapeshiftoss/asset-service'
import { fromAssetId } from '@shapeshiftoss/caip'
import { KnownChainIds } from '@shapeshiftoss/types'

import { MinMaxOutput, SwapError, SwapErrorType } from '../../../api'
import { bn, bnOrZero } from '../../utils/bignumber'
import { CowSwapperDeps } from '../CowSwapper'
import { MAX_COWSWAP_TRADE, MIN_COWSWAP_VALUE_USD } from '../utils/constants'
import { getUsdRate } from '../utils/helpers/helpers'

export const getCowSwapMinMax = async (
  deps: CowSwapperDeps,
  sellAsset: Asset,
  buyAsset: Asset,
): Promise<MinMaxOutput> => {
  try {
    const { assetNamespace: sellAssetNamespace } = fromAssetId(sellAsset.assetId)
    const { chainId: buyAssetChainId } = fromAssetId(buyAsset.assetId)

    if (sellAssetNamespace !== 'erc20' || buyAssetChainId !== KnownChainIds.EthereumMainnet) {
      throw new SwapError('[getCowSwapMinMax]', { code: SwapErrorType.UNSUPPORTED_PAIR })
    }

    const usdRate = await getUsdRate(deps, sellAsset)

    const minimum = bn(MIN_COWSWAP_VALUE_USD).dividedBy(bnOrZero(usdRate)).toString() // $10 worth of the sell token.
    const maximum = MAX_COWSWAP_TRADE // Arbitrarily large value. 10e+28 here.
    return {
      minimum,
      maximum,
    }
  } catch (e) {
    if (e instanceof SwapError) throw e
    throw new SwapError('[getCowSwapMinMax]', { cause: e, code: SwapErrorType.MIN_MAX_FAILED })
  }
}
