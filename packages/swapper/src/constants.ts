import { assertUnreachable } from '@shapeshiftoss/utils'

import { arbitrumBridgeSwapper } from './swappers/ArbitrumBridgeSwapper/ArbitrumBridgeSwapper'
import { arbitrumBridgeApi } from './swappers/ArbitrumBridgeSwapper/endpoints'
import { ARBITRUM_BRIDGE_SUPPORTED_CHAIN_IDS } from './swappers/ArbitrumBridgeSwapper/utils/constants'
import { chainflipSwapper } from './swappers/ChainflipSwapper/ChainflipSwapper'
import { CHAINFLIP_SUPPORTED_CHAIN_IDS } from './swappers/ChainflipSwapper/constants'
import { chainflipApi } from './swappers/ChainflipSwapper/endpoints'
import { cowSwapper } from './swappers/CowSwapper/CowSwapper'
import { cowApi } from './swappers/CowSwapper/endpoints'
import { COW_SWAP_SUPPORTED_CHAIN_IDS } from './swappers/CowSwapper/utils/constants'
import { lifiApi } from './swappers/LifiSwapper/endpoints'
import {
  LIFI_GET_TRADE_QUOTE_POLLING_INTERVAL,
  lifiSwapper,
} from './swappers/LifiSwapper/LifiSwapper'
import { LIFI_SUPPORTED_CHAIN_IDS } from './swappers/LifiSwapper/utils/constants'
import { PORTALS_SUPPORTED_CHAIN_IDS } from './swappers/PortalsSwapper/constants'
import { portalsApi } from './swappers/PortalsSwapper/endpoints'
import { portalsSwapper } from './swappers/PortalsSwapper/PortalsSwapper'
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
export const TRADE_POLL_INTERVAL_MILLISECONDS = 10_000

export const QUOTE_TIMEOUT_ERROR = makeSwapErrorRight({
  message: `quote timed out after ${QUOTE_TIMEOUT_MS / 1000}s`,
})

// PartialRecord not used to ensure exhaustiveness
export const swappers: Record<
  SwapperName,
  | (SwapperApi & Swapper & { supportedChainIds: SupportedChainIds; pollingInterval: number })
  | undefined
> = {
  [SwapperName.LIFI]: {
    ...lifiSwapper,
    ...lifiApi,
    supportedChainIds: LIFI_SUPPORTED_CHAIN_IDS,
    pollingInterval: LIFI_GET_TRADE_QUOTE_POLLING_INTERVAL,
  },
  [SwapperName.Thorchain]: {
    ...thorchainSwapper,
    ...thorchainApi,
    supportedChainIds: THORCHAIN_SUPPORTED_CHAIN_IDS,
    pollingInterval: DEFAULT_GET_TRADE_QUOTE_POLLING_INTERVAL,
  },
  [SwapperName.Zrx]: {
    ...zrxSwapper,
    ...zrxApi,
    supportedChainIds: ZRX_SUPPORTED_CHAIN_IDS,

    pollingInterval: DEFAULT_GET_TRADE_QUOTE_POLLING_INTERVAL,
  },
  [SwapperName.CowSwap]: {
    ...cowSwapper,
    ...cowApi,
    supportedChainIds: COW_SWAP_SUPPORTED_CHAIN_IDS,
    pollingInterval: DEFAULT_GET_TRADE_QUOTE_POLLING_INTERVAL,
  },
  [SwapperName.ArbitrumBridge]: {
    ...arbitrumBridgeSwapper,
    ...arbitrumBridgeApi,
    supportedChainIds: ARBITRUM_BRIDGE_SUPPORTED_CHAIN_IDS,
    pollingInterval: DEFAULT_GET_TRADE_QUOTE_POLLING_INTERVAL,
  },
  [SwapperName.Portals]: {
    ...portalsSwapper,
    ...portalsApi,
    supportedChainIds: PORTALS_SUPPORTED_CHAIN_IDS,
    pollingInterval: DEFAULT_GET_TRADE_QUOTE_POLLING_INTERVAL,
  },
  [SwapperName.Chainflip]: {
    ...chainflipSwapper,
    ...chainflipApi,
    supportedChainIds: CHAINFLIP_SUPPORTED_CHAIN_IDS,
    pollingInterval: DEFAULT_GET_TRADE_QUOTE_POLLING_INTERVAL,
  },
  [SwapperName.Test]: undefined,
}

// Slippage defaults. Don't export these to ensure the getDefaultSlippageDecimalPercentageForSwapper helper function is used.
const DEFAULT_SLIPPAGE_DECIMAL_PERCENTAGE = '0.002' // .2%
const DEFAULT_COWSWAP_SLIPPAGE_DECIMAL_PERCENTAGE = '0.005' // .5%
const DEFAULT_PORTALS_SLIPPAGE_DECIMAL_PERCENTAGE = '0.01' // 1%
const DEFAULT_LIFI_SLIPPAGE_DECIMAL_PERCENTAGE = '0.005' // .5%
const DEFAULT_THOR_SLIPPAGE_DECIMAL_PERCENTAGE = '0.01' // 1%
const DEFAULT_ARBITRUM_BRIDGE_SLIPPAGE_DECIMAL_PERCENTAGE = '0' // no slippage for Arbitrum Bridge, so no slippage tolerance
const DEFAULT_CHAINFLIP_SLIPPAGE_DECIMAL_PERCENTAGE = '0.02' // 2%

export const getDefaultSlippageDecimalPercentageForSwapper = (
  swapperName?: SwapperName,
): string => {
  if (swapperName === undefined) return DEFAULT_SLIPPAGE_DECIMAL_PERCENTAGE
  switch (swapperName) {
    case SwapperName.Zrx:
    case SwapperName.Test:
      return DEFAULT_SLIPPAGE_DECIMAL_PERCENTAGE
    case SwapperName.LIFI:
      return DEFAULT_LIFI_SLIPPAGE_DECIMAL_PERCENTAGE
    case SwapperName.CowSwap:
      return DEFAULT_COWSWAP_SLIPPAGE_DECIMAL_PERCENTAGE
    case SwapperName.Portals:
      return DEFAULT_PORTALS_SLIPPAGE_DECIMAL_PERCENTAGE
    case SwapperName.Thorchain:
      return DEFAULT_THOR_SLIPPAGE_DECIMAL_PERCENTAGE
    case SwapperName.ArbitrumBridge:
      return DEFAULT_ARBITRUM_BRIDGE_SLIPPAGE_DECIMAL_PERCENTAGE
    case SwapperName.Chainflip:
      return DEFAULT_CHAINFLIP_SLIPPAGE_DECIMAL_PERCENTAGE
    default:
      assertUnreachable(swapperName)
  }
}
