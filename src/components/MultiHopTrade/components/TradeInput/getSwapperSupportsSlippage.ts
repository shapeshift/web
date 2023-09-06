import { SwapperName } from 'lib/swapper/types'
import { assertUnreachable } from 'lib/utils'

export const getSwapperSupportsSlippage = (swapperName: SwapperName | undefined) => {
  if (swapperName === undefined) return false
  switch (swapperName) {
    case SwapperName.Thorchain:
    case SwapperName.Zrx:
    case SwapperName.OneInch:
    case SwapperName.LIFI:
      return true
    case SwapperName.Test:
    case SwapperName.CowSwap:
      return false
    default:
      assertUnreachable(swapperName)
  }
}
