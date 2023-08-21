import { SwapperName } from 'lib/swapper/api'
import { assertUnreachable } from 'lib/utils'

export const getSwapperSupportsSlippage = (swapperName: SwapperName | undefined) => {
  if (swapperName === undefined) return false
  switch (swapperName) {
    case SwapperName.Thorchain:
    case SwapperName.Zrx:
    case SwapperName.OneInch:
    case SwapperName.LIFI:
    case SwapperName.CowSwap:
      return true
    case SwapperName.Osmosis:
    case SwapperName.Test:
      return false
    default:
      assertUnreachable(swapperName)
  }
}
