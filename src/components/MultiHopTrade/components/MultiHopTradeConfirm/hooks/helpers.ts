import type { TradeQuoteStep } from '@shapeshiftoss/swapper'
import { SwapperName } from '@shapeshiftoss/swapper'
import { isNativeEvmAsset } from '@shapeshiftoss/swapper/dist/swappers/utils/helpers/helpers'

export const isPermit2Hop = (tradeQuoteStep: TradeQuoteStep | undefined) => {
  if (!tradeQuoteStep) return false
  const isNativeSellAsset = isNativeEvmAsset(tradeQuoteStep.sellAsset.assetId)
  return tradeQuoteStep.source === SwapperName.Zrx && !isNativeSellAsset
}
