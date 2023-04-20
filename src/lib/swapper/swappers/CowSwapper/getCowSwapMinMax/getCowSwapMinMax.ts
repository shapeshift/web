import type { Asset } from '@shapeshiftoss/asset-service'
import { fromAssetId } from '@shapeshiftoss/caip'
import { KnownChainIds } from '@shapeshiftoss/types'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import type { MinMaxOutput } from 'lib/swapper/api'
import { SwapError, SwapErrorType } from 'lib/swapper/api'
import type { CowSwapperDeps } from 'lib/swapper/swappers/CowSwapper/CowSwapper'
import {
  MAX_COWSWAP_TRADE,
  MIN_COWSWAP_VALUE_USD,
} from 'lib/swapper/swappers/CowSwapper/utils/constants'
import { getUsdRate } from 'lib/swapper/swappers/CowSwapper/utils/helpers/helpers'

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

    const minimumAmountCryptoHuman = bn(MIN_COWSWAP_VALUE_USD)
      .dividedBy(bnOrZero(usdRate))
      .toString() // $10 worth of the sell token.
    const maximumAmountCryptoHuman = MAX_COWSWAP_TRADE // Arbitrarily large value. 10e+28 here.
    return {
      minimumAmountCryptoHuman,
      maximumAmountCryptoHuman,
    }
  } catch (e) {
    if (e instanceof SwapError) throw e
    throw new SwapError('[getCowSwapMinMax]', { cause: e, code: SwapErrorType.MIN_MAX_FAILED })
  }
}
