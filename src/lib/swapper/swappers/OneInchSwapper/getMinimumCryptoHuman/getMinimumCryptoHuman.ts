import { bn, bnOrZero } from 'lib/bignumber/bignumber'

import { MIN_ONEINCH_VALUE_USD } from '../utils/constants'

export const getMinimumCryptoHuman = (sellAssetUsdRate: string): string => {
  const minimumCryptoHuman = bn(MIN_ONEINCH_VALUE_USD)
    .dividedBy(bnOrZero(sellAssetUsdRate))
    .toString() // $1 worth of the sell token.
  return minimumCryptoHuman
}
