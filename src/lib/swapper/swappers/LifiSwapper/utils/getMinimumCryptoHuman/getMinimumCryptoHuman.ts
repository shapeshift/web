import type { BigNumber } from 'lib/bignumber/bignumber'
import { bn } from 'lib/bignumber/bignumber'
import {
  MIN_CROSS_CHAIN_AMOUNT_THRESHOLD_USD_HUMAN,
  MIN_SAME_CHAIN_AMOUNT_THRESHOLD_USD_HUMAN,
} from 'lib/swapper/swappers/LifiSwapper/utils/constants'

// TEMP: use a hardcoded minimum until we implement monadic error handling for swapper
// https://github.com/shapeshift/web/issues/4237
export const getMinimumCryptoHuman = (
  sellAssetPriceUsdPrecision: string,
  isSameChainSwap: boolean,
): BigNumber => {
  return bn(
    isSameChainSwap
      ? MIN_SAME_CHAIN_AMOUNT_THRESHOLD_USD_HUMAN
      : MIN_CROSS_CHAIN_AMOUNT_THRESHOLD_USD_HUMAN,
  ).dividedBy(sellAssetPriceUsdPrecision)
}
