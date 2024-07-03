import { SwapperName } from '@shapeshiftoss/swapper'
import { assertUnreachable } from 'lib/utils'

export const USDC_PRECISION = 6

// Slippage defaults. Don't export these to ensure the getDefaultSlippageDecimalPercentageForSwapper helper function is used.
const DEFAULT_SLIPPAGE_DECIMAL_PERCENTAGE = '0.002' // .2%
const DEFAULT_COWSWAP_SLIPPAGE_DECIMAL_PERCENTAGE = '0.005' // .5%
const DEFAULT_LIFI_SLIPPAGE_DECIMAL_PERCENTAGE = '0.005' // .5%
const DEFAULT_THOR_SLIPPAGE = '0.01' // 1%
const DEFAULT_ARBITRUM_BRIDGE_SLIPPAGE = '0' // no slippage for Arbitrum Bridge, so no slippage tolerance

export const getDefaultSlippageDecimalPercentageForSwapper = (
  swapperName?: SwapperName,
): string => {
  if (swapperName === undefined) return DEFAULT_SLIPPAGE_DECIMAL_PERCENTAGE
  switch (swapperName) {
    case SwapperName.Zrx:
    case SwapperName.OneInch:
    case SwapperName.Portals:
    case SwapperName.Test:
      return DEFAULT_SLIPPAGE_DECIMAL_PERCENTAGE
    case SwapperName.LIFI:
      return DEFAULT_LIFI_SLIPPAGE_DECIMAL_PERCENTAGE
    case SwapperName.CowSwap:
      return DEFAULT_COWSWAP_SLIPPAGE_DECIMAL_PERCENTAGE
    case SwapperName.Thorchain:
      return DEFAULT_THOR_SLIPPAGE
    case SwapperName.ArbitrumBridge:
      return DEFAULT_ARBITRUM_BRIDGE_SLIPPAGE
    default:
      assertUnreachable(swapperName)
  }
}
