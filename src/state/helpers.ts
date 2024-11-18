import { SwapperName } from '@shapeshiftoss/swapper'
import { assertUnreachable } from 'lib/utils'

import type { FeatureFlags } from './slices/preferencesSlice/preferencesSlice'

export const isCrossAccountTradeSupported = (swapperName: SwapperName) => {
  switch (swapperName) {
    case SwapperName.Thorchain:
    case SwapperName.LIFI:
    case SwapperName.Chainflip:
      return true
    case SwapperName.Zrx:
    case SwapperName.CowSwap:
    case SwapperName.ArbitrumBridge:
    case SwapperName.Portals:
    case SwapperName.Test:
      // Technically supported for Arbitrum Bridge, but we disable it for the sake of simplicity for now
      return false
    default:
      assertUnreachable(swapperName)
  }
}

export const getEnabledSwappers = (
  { Chainflip, Portals, LifiSwap, ThorSwap, ZrxSwap, ArbitrumBridge, Cowswap }: FeatureFlags,
  isCrossAccountTrade: boolean,
): Record<SwapperName, boolean> => {
  return {
    [SwapperName.LIFI]:
      LifiSwap && (!isCrossAccountTrade || isCrossAccountTradeSupported(SwapperName.LIFI)),
    [SwapperName.Thorchain]:
      ThorSwap && (!isCrossAccountTrade || isCrossAccountTradeSupported(SwapperName.Thorchain)),
    [SwapperName.Zrx]:
      ZrxSwap && (!isCrossAccountTrade || isCrossAccountTradeSupported(SwapperName.Zrx)),
    [SwapperName.CowSwap]:
      Cowswap && (!isCrossAccountTrade || isCrossAccountTradeSupported(SwapperName.CowSwap)),
    [SwapperName.ArbitrumBridge]:
      ArbitrumBridge &&
      (!isCrossAccountTrade || isCrossAccountTradeSupported(SwapperName.ArbitrumBridge)),
    [SwapperName.Portals]:
      Portals && (!isCrossAccountTrade || isCrossAccountTradeSupported(SwapperName.Portals)),
    [SwapperName.Chainflip]:
      Chainflip && (!isCrossAccountTrade || isCrossAccountTradeSupported(SwapperName.Chainflip)),
    [SwapperName.Test]: false,
  }
}
