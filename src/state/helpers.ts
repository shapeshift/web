import { SwapperName } from 'lib/swapper/api'
import { assertUnreachable } from 'lib/utils'

export const isCrossAccountTradeSupported = (swapperName: SwapperName) => {
  switch (swapperName) {
    case SwapperName.Thorchain:
    case SwapperName.Osmosis:
      return true
    // NOTE: Before enabling cross-account for LIFI and OneInch - we must pass the sending address
    // to the swappers up so allowance checks work. They're currently using the receive address
    // assuming it's the same address as the sending address.
    case SwapperName.LIFI:
    case SwapperName.OneInch:
    case SwapperName.Zrx:
    case SwapperName.CowSwap:
    case SwapperName.Test:
      return false
    default:
      assertUnreachable(swapperName)
  }
}
