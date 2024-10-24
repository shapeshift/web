import { SwapperName } from '@shapeshiftoss/swapper'
import { assertUnreachable } from 'lib/utils'

import type { FeatureFlags } from './slices/preferencesSlice/preferencesSlice'

export const isCrossAccountTradeSupported = (swapperName: SwapperName) => {
  switch (swapperName) {
    case SwapperName.Chainflip:
    case SwapperName.LIFI:
    case SwapperName.Thorchain:
      return true
    case SwapperName.ArbitrumBridge:
    case SwapperName.CowSwap:
    case SwapperName.Portals:
    case SwapperName.Zrx:
    case SwapperName.Test:
      // Technically supported for Arbitrum Bridge, but we disable it for the sake of simplicity for now
      return false
    default:
      assertUnreachable(swapperName)
  }
}

export const getEnabledSwappers = (
  { ArbitrumBridge, Chainflip, Cowswap, LifiSwap, Portals, ThorSwap, ZrxSwap  }: FeatureFlags,
  isCrossAccountTrade: boolean,
): Record<SwapperName, boolean> => {
  return {
    [SwapperName.ArbitrumBridge]:
      ArbitrumBridge && (!isCrossAccountTrade || isCrossAccountTradeSupported(SwapperName.ArbitrumBridge)),
    [SwapperName.Chainflip]:
      Chainflip && (!isCrossAccountTrade || isCrossAccountTradeSupported(SwapperName.Chainflip)),
    [SwapperName.CowSwap]:
      Cowswap && (!isCrossAccountTrade || isCrossAccountTradeSupported(SwapperName.CowSwap)),
    [SwapperName.LIFI]:
      LifiSwap && (!isCrossAccountTrade || isCrossAccountTradeSupported(SwapperName.LIFI)),
    [SwapperName.Portals]:
      Portals && (!isCrossAccountTrade || isCrossAccountTradeSupported(SwapperName.Portals)),
    [SwapperName.Thorchain]:
      ThorSwap && (!isCrossAccountTrade || isCrossAccountTradeSupported(SwapperName.Thorchain)),
    [SwapperName.Zrx]:
      ZrxSwap && (!isCrossAccountTrade || isCrossAccountTradeSupported(SwapperName.Zrx)),
    [SwapperName.Test]: false,
  }
}
