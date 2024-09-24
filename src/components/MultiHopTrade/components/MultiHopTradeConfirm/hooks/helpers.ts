import { SwapperName, type TradeQuoteStep } from '@shapeshiftoss/swapper'
import { getConfig } from 'config'

export const isPermit2Hop = (tradeQuoteStep: TradeQuoteStep | undefined) => {
  const isPermit2Enabled = getConfig().REACT_APP_FEATURE_ZRX_PERMIT2
  return isPermit2Enabled && tradeQuoteStep?.source === SwapperName.Zrx
}
