import { assertUnreachable } from '@shapeshiftoss/utils'

import { acrossApi, acrossSwapper } from './swappers/AcrossSwapper'
import { arbitrumBridgeApi, arbitrumBridgeSwapper } from './swappers/ArbitrumBridgeSwapper'
import { avnuApi, avnuSwapper } from './swappers/AvnuSwapper'
import { bebopApi, bebopSwapper } from './swappers/BebopSwapper'
import { bobGatewayApi, bobGatewaySwapper } from './swappers/BobGatewaySwapper'
import { butterSwap, butterSwapApi } from './swappers/ButterSwap'
import { cetusApi, cetusSwapper } from './swappers/CetusSwapper'
import { chainflipApi, chainflipSwapper } from './swappers/ChainflipSwapper'
import { cowApi, cowSwapper } from './swappers/CowSwapper'
import { debridgeApi, debridgeSwapper } from './swappers/DebridgeSwapper'
import { mayachainApi, mayachainSwapper } from './swappers/MayachainSwapper'
import { nearIntentsApi, nearIntentsSwapper } from './swappers/NearIntentsSwapper'
import { portalsApi, portalsSwapper } from './swappers/PortalsSwapper'
import { relayApi, relaySwapper } from './swappers/RelaySwapper'
import { stonfiApi, stonfiSwapper } from './swappers/StonfiSwapper'
import { sunioApi, sunioSwapper } from './swappers/SunioSwapper'
import { thorchainApi, thorchainSwapper } from './swappers/ThorchainSwapper'
import { zrxApi, zrxSwapper } from './swappers/ZrxSwapper'
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
  [SwapperName.Debridge]: {
    ...debridgeSwapper,
    ...debridgeApi,
  },
  [SwapperName.BobGateway]: {
    ...bobGatewaySwapper,
    ...bobGatewayApi,
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
// deBridge API off-chain simulation overestimates output on some chains (e.g. SEI ~2.4%), so auto slippage (1%) is insufficient
const DEFAULT_DEBRIDGE_SLIPPAGE_DECIMAL_PERCENTAGE = '0.03'
const DEFAULT_BOB_GATEWAY_SLIPPAGE_DECIMAL_PERCENTAGE = '0.03'

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
    case SwapperName.Relay:
      throw new Error('Default slippage not supported by Relay')
    case SwapperName.Across:
      throw new Error('Default slippage not supported by Across')
    case SwapperName.Debridge:
      return DEFAULT_DEBRIDGE_SLIPPAGE_DECIMAL_PERCENTAGE
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
    case SwapperName.BobGateway:
      return DEFAULT_BOB_GATEWAY_SLIPPAGE_DECIMAL_PERCENTAGE
    default:
      return assertUnreachable(swapperName)
  }
}

export const isAutoSlippageSupportedBySwapper = (swapperName: SwapperName): boolean => {
  switch (swapperName) {
    case SwapperName.Relay:
    case SwapperName.Across:
    case SwapperName.Debridge:
      return true
    default:
      return false
  }
}
