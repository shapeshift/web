import { SwapperName } from '@shapeshiftoss/swapper'

import { assertUnreachable } from '../lib/utils'

export const isCrossAccountTradeSupported = (swapperName: SwapperName) => {
  switch (swapperName) {
    case SwapperName.Thorchain:
    case SwapperName.LIFI:
      return true
    case SwapperName.OneInch:
    case SwapperName.Zrx:
    case SwapperName.CowSwap:
    case SwapperName.Test:
      return false
    default:
      assertUnreachable(swapperName)
  }
}
