import type { TradeQuoteStep } from '@shapeshiftoss/swapper'
import { SwapperName } from '@shapeshiftoss/swapper'
import { isNativeEvmAsset } from '@shapeshiftoss/swapper/dist/swappers/utils/helpers/helpers'
import { getConfig } from 'config'

export const isPermit2Hop = (tradeQuoteStep: TradeQuoteStep | undefined) => {
  if (!tradeQuoteStep) return false
  const isPermit2Enabled = getConfig().REACT_APP_FEATURE_ZRX_PERMIT2
  const isNativeSellAsset = isNativeEvmAsset(tradeQuoteStep.sellAsset.assetId)
  return isPermit2Enabled && tradeQuoteStep.source === SwapperName.Zrx && !isNativeSellAsset
}
