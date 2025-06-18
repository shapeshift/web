import { assertUnreachable } from '@shapeshiftoss/utils'

import { COW_SWAP_SUPPORTED_CHAIN_IDS } from './cowswap-utils/constants'
import { arbitrumBridgeSwapper } from './swappers/ArbitrumBridgeSwapper/ArbitrumBridgeSwapper'
import { arbitrumBridgeApi } from './swappers/ArbitrumBridgeSwapper/endpoints'
import { ARBITRUM_BRIDGE_SUPPORTED_CHAIN_IDS } from './swappers/ArbitrumBridgeSwapper/utils/constants'
import { chainflipSwapper } from './swappers/ChainflipSwapper/ChainflipSwapper'
import { CHAINFLIP_SUPPORTED_CHAIN_IDS } from './swappers/ChainflipSwapper/constants'
import { chainflipApi } from './swappers/ChainflipSwapper/endpoints'
import { cowSwapper } from './swappers/CowSwapper/CowSwapper'
import { cowApi } from './swappers/CowSwapper/endpoints'
import { jupiterApi } from './swappers/JupiterSwapper/endpoints'
import { jupiterSwapper } from './swappers/JupiterSwapper/JupiterSwapper'
import { JUPITER_SUPPORTED_CHAIN_IDS } from './swappers/JupiterSwapper/utils/constants'
import { MAYACHAIN_SUPPORTED_CHAIN_IDS } from './swappers/MayachainSwapper'
import { mayachainApi } from './swappers/MayachainSwapper/endpoints'
import { mayachainSwapper } from './swappers/MayachainSwapper/MayachainSwapper'
import { PORTALS_SUPPORTED_CHAIN_IDS } from './swappers/PortalsSwapper/constants'
import { portalsApi } from './swappers/PortalsSwapper/endpoints'
import { portalsSwapper } from './swappers/PortalsSwapper/PortalsSwapper'
import { relaySwapper } from './swappers/RelaySwapper'
import { RELAY_SUPPORTED_CHAIN_IDS } from './swappers/RelaySwapper/constant'
import { relayApi } from './swappers/RelaySwapper/endpoints'
import { THORCHAIN_SUPPORTED_CHAIN_IDS } from './swappers/ThorchainSwapper/constants'
import { thorchainApi } from './swappers/ThorchainSwapper/endpoints'
import { thorchainSwapper } from './swappers/ThorchainSwapper/ThorchainSwapper'
import { zrxApi } from './swappers/ZrxSwapper/endpoints'
import { ZRX_SUPPORTED_CHAIN_IDS } from './swappers/ZrxSwapper/utils/constants'
import { zrxSwapper } from './swappers/ZrxSwapper/ZrxSwapper'
import type { SupportedChainIds, Swapper, SwapperApi } from './types'
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
  (SwapperApi & Swapper & { supportedChainIds: SupportedChainIds }) | undefined
> = {
  [SwapperName.Thorchain]: {
    ...thorchainSwapper,
    ...thorchainApi,
    supportedChainIds: THORCHAIN_SUPPORTED_CHAIN_IDS,
  },
  [SwapperName.Mayachain]: {
    ...mayachainSwapper,
    ...mayachainApi,
    supportedChainIds: MAYACHAIN_SUPPORTED_CHAIN_IDS,
  },
  [SwapperName.Zrx]: {
    ...zrxSwapper,
    ...zrxApi,
    supportedChainIds: ZRX_SUPPORTED_CHAIN_IDS,
  },
  [SwapperName.CowSwap]: {
    ...cowSwapper,
    ...cowApi,
    supportedChainIds: COW_SWAP_SUPPORTED_CHAIN_IDS,
  },
  [SwapperName.ArbitrumBridge]: {
    ...arbitrumBridgeSwapper,
    ...arbitrumBridgeApi,
    supportedChainIds: ARBITRUM_BRIDGE_SUPPORTED_CHAIN_IDS,
  },
  [SwapperName.Portals]: {
    ...portalsSwapper,
    ...portalsApi,
    supportedChainIds: PORTALS_SUPPORTED_CHAIN_IDS,
  },
  [SwapperName.Chainflip]: {
    ...chainflipSwapper,
    ...chainflipApi,
    supportedChainIds: CHAINFLIP_SUPPORTED_CHAIN_IDS,
  },
  [SwapperName.Jupiter]: {
    ...jupiterSwapper,
    ...jupiterApi,
    supportedChainIds: JUPITER_SUPPORTED_CHAIN_IDS,
  },
  [SwapperName.Relay]: {
    ...relaySwapper,
    ...relayApi,
    supportedChainIds: RELAY_SUPPORTED_CHAIN_IDS,
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
