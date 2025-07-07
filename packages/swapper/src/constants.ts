import { assertUnreachable } from '@shapeshiftoss/utils'

import { arbitrumBridgeSwapper } from './swappers/ArbitrumBridgeSwapper/ArbitrumBridgeSwapper'
import { arbitrumBridgeApi } from './swappers/ArbitrumBridgeSwapper/endpoints'
import { butterSwap } from './swappers/ButterSwap/ButterSwap'
import { butterSwapApi } from './swappers/ButterSwap/endpoints'
import { chainflipSwapper } from './swappers/ChainflipSwapper/ChainflipSwapper'
import { chainflipApi } from './swappers/ChainflipSwapper/endpoints'
import { cowSwapper } from './swappers/CowSwapper/CowSwapper'
import { cowApi } from './swappers/CowSwapper/endpoints'
import { jupiterApi } from './swappers/JupiterSwapper/endpoints'
import { jupiterSwapper } from './swappers/JupiterSwapper/JupiterSwapper'
import { mayachainApi } from './swappers/MayachainSwapper/endpoints'
import { mayachainSwapper } from './swappers/MayachainSwapper/MayachainSwapper'
import { portalsApi } from './swappers/PortalsSwapper/endpoints'
import { portalsSwapper } from './swappers/PortalsSwapper/PortalsSwapper'
import { relaySwapper } from './swappers/RelaySwapper'
import { relayApi } from './swappers/RelaySwapper/endpoints'
import { thorchainApi } from './swappers/ThorchainSwapper/endpoints'
import { thorchainSwapper } from './swappers/ThorchainSwapper/ThorchainSwapper'
import { zrxApi } from './swappers/ZrxSwapper/endpoints'
import { zrxSwapper } from './swappers/ZrxSwapper/ZrxSwapper'
import type { Swapper, SwapperApi } from './types'
import { SwapperName } from './types'
import { makeSwapErrorRight } from './utils'

export const DEFAULT_GET_TRADE_QUOTE_POLLING_INTERVAL = 20_000
export const QUOTE_TIMEOUT_MS = 60_000
export const TRADE_STATUS_POLL_INTERVAL_MILLISECONDS = 5_000

export const QUOTE_TIMEOUT_ERROR = makeSwapErrorRight({
  message: `quote timed out after ${QUOTE_TIMEOUT_MS / 1000}s`,
})

// PartialRecord not used to ensure exhaustiveness
export const swappers: Record<
  SwapperName,
  (SwapperApi & Swapper & { pollingInterval: number }) | undefined
> = {
  [SwapperName.Thorchain]: {
    ...thorchainSwapper,
    ...thorchainApi,
    pollingInterval: DEFAULT_GET_TRADE_QUOTE_POLLING_INTERVAL,
  },
  [SwapperName.Mayachain]: {
    ...mayachainSwapper,
    ...mayachainApi,
    pollingInterval: DEFAULT_GET_TRADE_QUOTE_POLLING_INTERVAL,
  },
  [SwapperName.Zrx]: {
    ...zrxSwapper,
    ...zrxApi,

    pollingInterval: DEFAULT_GET_TRADE_QUOTE_POLLING_INTERVAL,
  },
  [SwapperName.CowSwap]: {
    ...cowSwapper,
    ...cowApi,
    pollingInterval: DEFAULT_GET_TRADE_QUOTE_POLLING_INTERVAL,
  },
  [SwapperName.ArbitrumBridge]: {
    ...arbitrumBridgeSwapper,
    ...arbitrumBridgeApi,
    pollingInterval: DEFAULT_GET_TRADE_QUOTE_POLLING_INTERVAL,
  },
  [SwapperName.Portals]: {
    ...portalsSwapper,
    ...portalsApi,
    pollingInterval: DEFAULT_GET_TRADE_QUOTE_POLLING_INTERVAL,
  },
  [SwapperName.Chainflip]: {
    ...chainflipSwapper,
    ...chainflipApi,
    pollingInterval: DEFAULT_GET_TRADE_QUOTE_POLLING_INTERVAL,
  },
  [SwapperName.Jupiter]: {
    ...jupiterSwapper,
    ...jupiterApi,
    pollingInterval: DEFAULT_GET_TRADE_QUOTE_POLLING_INTERVAL,
  },
  [SwapperName.Relay]: {
    ...relaySwapper,
    ...relayApi,
    pollingInterval: DEFAULT_GET_TRADE_QUOTE_POLLING_INTERVAL,
  },
  [SwapperName.ButterSwap]: {
    ...butterSwap,
    ...butterSwapApi,
    pollingInterval: DEFAULT_GET_TRADE_QUOTE_POLLING_INTERVAL,
  },
  [SwapperName.Test]: undefined,
}

// Slippage defaults. Don't export these to ensure the getDefaultSlippageDecimalPercentageForSwapper helper function is used.
const DEFAULT_SLIPPAGE_DECIMAL_PERCENTAGE = '0.002' // .2%
const DEFAULT_COWSWAP_SLIPPAGE_DECIMAL_PERCENTAGE = '0.005' // .5%
const DEFAULT_PORTALS_SLIPPAGE_DECIMAL_PERCENTAGE = '0.025' // 2.5%
const DEFAULT_THOR_SLIPPAGE_DECIMAL_PERCENTAGE = '0.01' // 1%
const DEFAULT_MAYA_SLIPPAGE_DECIMAL_PERCENTAGE = '0.01' // 1%
const DEFAULT_ARBITRUM_BRIDGE_SLIPPAGE_DECIMAL_PERCENTAGE = '0' // no slippage for Arbitrum Bridge, so no slippage tolerance
const DEFAULT_CHAINFLIP_SLIPPAGE_DECIMAL_PERCENTAGE = '0.02' // 2%
const DEFAULT_BUTTERSWAP_SLIPPAGE_DECIMAL_PERCENTAGE = '0.015' // 1.5%

export const getDefaultSlippageDecimalPercentageForSwapper = (
  swapperName: SwapperName | undefined,
): string => {
  if (swapperName === undefined) return DEFAULT_SLIPPAGE_DECIMAL_PERCENTAGE
  switch (swapperName) {
    case SwapperName.Zrx:
    case SwapperName.Test:
      return DEFAULT_SLIPPAGE_DECIMAL_PERCENTAGE
    case SwapperName.CowSwap:
      return DEFAULT_COWSWAP_SLIPPAGE_DECIMAL_PERCENTAGE
    case SwapperName.Portals:
      return DEFAULT_PORTALS_SLIPPAGE_DECIMAL_PERCENTAGE
    case SwapperName.Thorchain:
      return DEFAULT_THOR_SLIPPAGE_DECIMAL_PERCENTAGE
    case SwapperName.Mayachain:
      return DEFAULT_MAYA_SLIPPAGE_DECIMAL_PERCENTAGE
    case SwapperName.ArbitrumBridge:
      return DEFAULT_ARBITRUM_BRIDGE_SLIPPAGE_DECIMAL_PERCENTAGE
    case SwapperName.Chainflip:
      return DEFAULT_CHAINFLIP_SLIPPAGE_DECIMAL_PERCENTAGE
    case SwapperName.Jupiter:
      throw new Error('Default slippage not supported by Jupiter')
    case SwapperName.Relay:
      throw new Error('Default slippage not supported by Relay')
    case SwapperName.ButterSwap:
      return DEFAULT_BUTTERSWAP_SLIPPAGE_DECIMAL_PERCENTAGE
    default:
      return assertUnreachable(swapperName)
  }
}

export const isAutoSlippageSupportedBySwapper = (swapperName: SwapperName): boolean => {
  switch (swapperName) {
    case SwapperName.Jupiter:
      return true
    case SwapperName.Relay:
      return true
    default:
      return false
  }
}
