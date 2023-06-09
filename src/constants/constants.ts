import { SwapperName } from 'lib/swapper/api'
import { assertUnreachable } from 'lib/utils'

export const USDC_PRECISION = 6

// Slippage defaults. Don't export these to ensure the getDefaultSlippagePercentageForSwapper helper function is used.
const DEFAULT_SLIPPAGE_DECIMAL_PERCENTAGE = '0.002' // .2%
const DEFAULT_COWSWAP_SLIPPAGE_DECIMAL_PERCENTAGE = '0.005' // .5%
const DEFAULT_LIFI_SLIPPAGE_DECIMAL_PERCENTAGE = '0.005' // .5%

export const getDefaultSlippagePercentageForSwapper = (swapperName?: SwapperName): string => {
  if (swapperName === undefined) return DEFAULT_SLIPPAGE_DECIMAL_PERCENTAGE
  switch (swapperName) {
    case SwapperName.Thorchain:
    case SwapperName.Zrx:
    case SwapperName.OneInch:
    case SwapperName.Osmosis:
    case SwapperName.Test:
      return DEFAULT_SLIPPAGE_DECIMAL_PERCENTAGE
    case SwapperName.LIFI:
      return DEFAULT_LIFI_SLIPPAGE_DECIMAL_PERCENTAGE
    case SwapperName.CowSwap:
      return DEFAULT_COWSWAP_SLIPPAGE_DECIMAL_PERCENTAGE
    default:
      assertUnreachable(swapperName)
  }
}
