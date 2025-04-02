import { SwapperName } from '@shapeshiftoss/swapper'

import type { FeatureFlags } from './slices/preferencesSlice/preferencesSlice'

import { assertUnreachable } from '@/lib/utils'

export const isCrossAccountTradeSupported = (swapperName: SwapperName) => {
  switch (swapperName) {
    case SwapperName.Thorchain:
    case SwapperName.LIFI:
    case SwapperName.Chainflip:
    case SwapperName.Jupiter:
    case SwapperName.Relay:
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
  {
    ChainflipSwap,
    PortalsSwap,
    LifiSwap,
    ThorSwap,
    ZrxSwap,
    ArbitrumBridge,
    Cowswap,
    JupiterSwap,
    RelaySwapper,
  }: FeatureFlags,
  isCrossAccountTrade: boolean,
  isSolBuyAssetId: boolean,
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
      PortalsSwap && (!isCrossAccountTrade || isCrossAccountTradeSupported(SwapperName.Portals)),
    [SwapperName.Chainflip]:
      ChainflipSwap &&
      (!isCrossAccountTrade || isCrossAccountTradeSupported(SwapperName.Chainflip)),
    [SwapperName.Jupiter]:
      JupiterSwap &&
      (!isCrossAccountTrade ||
        (isCrossAccountTradeSupported(SwapperName.Jupiter) && !isSolBuyAssetId)),
    [SwapperName.Relay]:
      RelaySwapper && (!isCrossAccountTrade || isCrossAccountTradeSupported(SwapperName.Relay)),
    [SwapperName.Test]: false,
  }
}
