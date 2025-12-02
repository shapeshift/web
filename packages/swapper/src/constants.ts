import { assertUnreachable } from '@shapeshiftoss/utils'

import { arbitrumBridgeSwapper } from './swappers/ArbitrumBridgeSwapper/ArbitrumBridgeSwapper'
import { arbitrumBridgeApi } from './swappers/ArbitrumBridgeSwapper/endpoints'
import { bebopSwapper } from './swappers/BebopSwapper/BebopSwapper'
import { bebopApi } from './swappers/BebopSwapper/endpoints'
import { butterSwap } from './swappers/ButterSwap/ButterSwap'
import { butterSwapApi } from './swappers/ButterSwap/endpoints'
import { cetusSwapper } from './swappers/CetusSwapper/CetusSwapper'
import { cetusApi } from './swappers/CetusSwapper/endpoints'
import { chainflipSwapper } from './swappers/ChainflipSwapper/ChainflipSwapper'
import { chainflipApi } from './swappers/ChainflipSwapper/endpoints'
import { cowSwapper } from './swappers/CowSwapper/CowSwapper'
import { cowApi } from './swappers/CowSwapper/endpoints'
import { jupiterApi } from './swappers/JupiterSwapper/endpoints'
import { jupiterSwapper } from './swappers/JupiterSwapper/JupiterSwapper'
import { mayachainApi } from './swappers/MayachainSwapper/endpoints'
import { mayachainSwapper } from './swappers/MayachainSwapper/MayachainSwapper'
import { nearIntentsApi } from './swappers/NearIntentsSwapper/endpoints'
import { nearIntentsSwapper } from './swappers/NearIntentsSwapper/NearIntentsSwapper'
import { portalsApi } from './swappers/PortalsSwapper/endpoints'
import { portalsSwapper } from './swappers/PortalsSwapper/PortalsSwapper'
import { relaySwapper } from './swappers/RelaySwapper'
import { relayApi } from './swappers/RelaySwapper/endpoints'
import { thorchainApi } from './swappers/ThorchainSwapper/endpoints'
import { thorchainSwapper } from './swappers/ThorchainSwapper/ThorchainSwapper'
import { zrxApi } from './swappers/ZrxSwapper/endpoints'
import { zrxSwapper } from './swappers/ZrxSwapper/ZrxSwapper'
import type { Swapper, SwapperApi } from './types'
import { SwapperName, TradeQuoteError } from './types'
import { makeSwapErrorRight } from './utils'

export const QUOTE_TIMEOUT_MS = 60_000
export const TRADE_STATUS_POLL_INTERVAL_MILLISECONDS = 5_000

export const QUOTE_TIMEOUT_ERROR = makeSwapErrorRight({
  code: TradeQuoteError.Timeout,
  message: `quote timed out after ${QUOTE_TIMEOUT_MS / 1000}s`,
})

// PartialRecord not used to ensure exhaustiveness
export const swappers: Record<SwapperName, (SwapperApi & Swapper) | undefined> = {
  [SwapperName.Thorchain]: {
    ...thorchainSwapper,
    ...thorchainApi,
  },
  [SwapperName.Mayachain]: {
    ...mayachainSwapper,
    ...mayachainApi,
  },
  [SwapperName.Zrx]: {
    ...zrxSwapper,
    ...zrxApi,
  },
  [SwapperName.CowSwap]: {
    ...cowSwapper,
    ...cowApi,
  },
  [SwapperName.ArbitrumBridge]: {
    ...arbitrumBridgeSwapper,
    ...arbitrumBridgeApi,
  },
  [SwapperName.Portals]: {
    ...portalsSwapper,
    ...portalsApi,
  },
  [SwapperName.Chainflip]: {
    ...chainflipSwapper,
    ...chainflipApi,
  },
  [SwapperName.Jupiter]: {
    ...jupiterSwapper,
    ...jupiterApi,
  },
  [SwapperName.Relay]: {
    ...relaySwapper,
    ...relayApi,
  },
  [SwapperName.ButterSwap]: {
    ...butterSwap,
    ...butterSwapApi,
  },
  [SwapperName.Bebop]: {
    ...bebopSwapper,
    ...bebopApi,
  },
  [SwapperName.NearIntents]: {
    ...nearIntentsSwapper,
    ...nearIntentsApi,
  },
  [SwapperName.Cetus]: {
    ...cetusSwapper,
    ...cetusApi,
  },
  [SwapperName.Test]: undefined,
}

// Slippage defaults. Don't export these to ensure the getDefaultSlippageDecimalPercentageForSwapper helper function is used.
const DEFAULT_SLIPPAGE_DECIMAL_PERCENTAGE = '0.002' // .2%
const DEFAULT_COWSWAP_SLIPPAGE_DECIMAL_PERCENTAGE = '0.005' // .5%
const DEFAULT_NEAR_INTENTS_SLIPPAGE_DECIMAL_PERCENTAGE = '0.005' // .5%
const DEFAULT_PORTALS_SLIPPAGE_DECIMAL_PERCENTAGE = '0.025' // 2.5%
const DEFAULT_THOR_SLIPPAGE_DECIMAL_PERCENTAGE = '0.01' // 1%
const DEFAULT_MAYA_SLIPPAGE_DECIMAL_PERCENTAGE = '0.01' // 1%
const DEFAULT_ARBITRUM_BRIDGE_SLIPPAGE_DECIMAL_PERCENTAGE = '0' // no slippage for Arbitrum Bridge, so no slippage tolerance
const DEFAULT_CHAINFLIP_SLIPPAGE_DECIMAL_PERCENTAGE = '0.02' // 2%
const DEFAULT_BUTTERSWAP_SLIPPAGE_DECIMAL_PERCENTAGE = '0.015' // 1.5%
const DEFAULT_CETUS_SLIPPAGE_DECIMAL_PERCENTAGE = '0.005' // .5%

export const getDefaultSlippageDecimalPercentageForSwapper = (
  swapperName: SwapperName | undefined,
): string => {
  if (swapperName === undefined) return DEFAULT_SLIPPAGE_DECIMAL_PERCENTAGE
  switch (swapperName) {
    case SwapperName.Zrx:
    case SwapperName.Bebop:
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
    case SwapperName.NearIntents:
      return DEFAULT_NEAR_INTENTS_SLIPPAGE_DECIMAL_PERCENTAGE
    case SwapperName.Cetus:
      return DEFAULT_CETUS_SLIPPAGE_DECIMAL_PERCENTAGE
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
