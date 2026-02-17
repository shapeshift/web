import { assertUnreachable } from '@shapeshiftoss/utils'

import { acrossSwapper } from './swappers/AcrossSwapper'
import { acrossApi } from './swappers/AcrossSwapper/endpoints'
import { arbitrumBridgeSwapper } from './swappers/ArbitrumBridgeSwapper/ArbitrumBridgeSwapper'
import { arbitrumBridgeApi } from './swappers/ArbitrumBridgeSwapper/endpoints'
import { avnuSwapper } from './swappers/AvnuSwapper/AvnuSwapper'
import { avnuApi } from './swappers/AvnuSwapper/endpoints'
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
import { stonfiApi } from './swappers/StonfiSwapper/endpoints'
import { stonfiSwapper } from './swappers/StonfiSwapper/StonfiSwapper'
import { sunioApi } from './swappers/SunioSwapper/endpoints'
import { sunioSwapper } from './swappers/SunioSwapper/SunioSwapper'
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
  [SwapperName.Sunio]: {
    ...sunioSwapper,
    ...sunioApi,
  },
  [SwapperName.Avnu]: {
    ...avnuSwapper,
    ...avnuApi,
  },
  [SwapperName.Stonfi]: {
    ...stonfiSwapper,
    ...stonfiApi,
  },
  [SwapperName.Across]: {
    ...acrossSwapper,
    ...acrossApi,
  },
  [SwapperName.Test]: undefined,
}

const DEFAULT_SLIPPAGE_DECIMAL_PERCENTAGE = '0.002'
const DEFAULT_COWSWAP_SLIPPAGE_DECIMAL_PERCENTAGE = '0.005'
const DEFAULT_NEAR_INTENTS_SLIPPAGE_DECIMAL_PERCENTAGE = '0.005'
const DEFAULT_PORTALS_SLIPPAGE_DECIMAL_PERCENTAGE = '0.025'
const DEFAULT_THOR_SLIPPAGE_DECIMAL_PERCENTAGE = '0.01'
const DEFAULT_MAYA_SLIPPAGE_DECIMAL_PERCENTAGE = '0.01'
const DEFAULT_ARBITRUM_BRIDGE_SLIPPAGE_DECIMAL_PERCENTAGE = '0'
const DEFAULT_CHAINFLIP_SLIPPAGE_DECIMAL_PERCENTAGE = '0.02'
const DEFAULT_BUTTERSWAP_SLIPPAGE_DECIMAL_PERCENTAGE = '0.015'
const DEFAULT_CETUS_SLIPPAGE_DECIMAL_PERCENTAGE = '0.005'
const DEFAULT_SUNIO_SLIPPAGE_DECIMAL_PERCENTAGE = '0.005'
// Starknet swaps can have more latency, so use higher default slippage
const DEFAULT_AVNU_SLIPPAGE_DECIMAL_PERCENTAGE = '0.02'
const DEFAULT_STONFI_SLIPPAGE_DECIMAL_PERCENTAGE = '0.01'

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
    case SwapperName.Across:
      throw new Error('Default slippage not supported by Across')
    case SwapperName.ButterSwap:
      return DEFAULT_BUTTERSWAP_SLIPPAGE_DECIMAL_PERCENTAGE
    case SwapperName.NearIntents:
      return DEFAULT_NEAR_INTENTS_SLIPPAGE_DECIMAL_PERCENTAGE
    case SwapperName.Cetus:
      return DEFAULT_CETUS_SLIPPAGE_DECIMAL_PERCENTAGE
    case SwapperName.Sunio:
      return DEFAULT_SUNIO_SLIPPAGE_DECIMAL_PERCENTAGE
    case SwapperName.Avnu:
      return DEFAULT_AVNU_SLIPPAGE_DECIMAL_PERCENTAGE
    case SwapperName.Stonfi:
      return DEFAULT_STONFI_SLIPPAGE_DECIMAL_PERCENTAGE
    default:
      return assertUnreachable(swapperName)
  }
}

export const isAutoSlippageSupportedBySwapper = (swapperName: SwapperName): boolean => {
  switch (swapperName) {
    case SwapperName.Jupiter:
      return true
    case SwapperName.Relay:
    case SwapperName.Across:
      return true
    default:
      return false
  }
}
