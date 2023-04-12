import type { Asset } from '@shapeshiftoss/asset-service'
import type { BigNumber } from 'lib/bignumber/bignumber'
import { bn } from 'lib/bignumber/bignumber'
import { MIN_AMOUNT_THRESHOLD_USD_HUMAN } from 'lib/swapper/LifiSwapper/utils/constants'
import { selectMarketDataById } from 'state/slices/selectors'
import { store } from 'state/store'

// TEMP: use a hardcoded minimum until we implement monadic error handling for swapper
// https://github.com/shapeshift/web/issues/4237
export const getMinimumCryptoHuman = (sellAsset: Asset): BigNumber => {
  const { price } = selectMarketDataById(store.getState(), sellAsset.assetId)
  return bn(MIN_AMOUNT_THRESHOLD_USD_HUMAN).dividedBy(bn(price))
}
