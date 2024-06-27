import type { SupportedChainIds, Swapper, SwapperApi } from '@shapeshiftoss/swapper'
import { makeSwapErrorRight, SwapperName } from '@shapeshiftoss/swapper'
import { cowSwapper } from 'lib/swapper/swappers/CowSwapper/CowSwapper'
import { cowApi } from 'lib/swapper/swappers/CowSwapper/endpoints'
import { lifiApi } from 'lib/swapper/swappers/LifiSwapper/endpoints'
import {
  LIFI_GET_TRADE_QUOTE_POLLING_INTERVAL,
  lifiSwapper,
} from 'lib/swapper/swappers/LifiSwapper/LifiSwapper'
import { oneInchApi } from 'lib/swapper/swappers/OneInchSwapper/endpoints'
import { oneInchSwapper } from 'lib/swapper/swappers/OneInchSwapper/OneInchSwapper'
import { thorchainApi } from 'lib/swapper/swappers/ThorchainSwapper/endpoints'
import { thorchainSwapper } from 'lib/swapper/swappers/ThorchainSwapper/ThorchainSwapper'
import { zrxApi } from 'lib/swapper/swappers/ZrxSwapper/endpoints'
import { zrxSwapper } from 'lib/swapper/swappers/ZrxSwapper/ZrxSwapper'

import { arbitrumBridgeSwapper } from './swappers/ArbitrumBridgeSwapper/ArbitrumBridgeSwapper'
import { arbitrumBridgeApi } from './swappers/ArbitrumBridgeSwapper/endpoints'
import { ARBITRUM_BRIDGE_SUPPORTED_CHAIN_IDS } from './swappers/ArbitrumBridgeSwapper/utils/constants'
import { COW_SWAP_SUPPORTED_CHAIN_IDS } from './swappers/CowSwapper/utils/constants'
import { LIFI_SUPPORTED_CHAIN_IDS } from './swappers/LifiSwapper/utils/constants'
import { ONE_INCH_SUPPORTED_CHAIN_IDS } from './swappers/OneInchSwapper/utils/constants'
import { THORCHAIN_SUPPORTED_CHAIN_IDS } from './swappers/ThorchainSwapper/constants'
import { ZRX_SUPPORTED_CHAIN_IDS } from './swappers/ZrxSwapper/utils/constants'

export const DEFAULT_GET_TRADE_QUOTE_POLLING_INTERVAL = 20_000
export const QUOTE_TIMEOUT_MS = 60_000

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
  [SwapperName.OneInch]: {
    ...oneInchSwapper,
    ...oneInchApi,
    supportedChainIds: ONE_INCH_SUPPORTED_CHAIN_IDS,
    pollingInterval: DEFAULT_GET_TRADE_QUOTE_POLLING_INTERVAL,
  },
  [SwapperName.ArbitrumBridge]: {
    ...arbitrumBridgeSwapper,
    ...arbitrumBridgeApi,
    supportedChainIds: ARBITRUM_BRIDGE_SUPPORTED_CHAIN_IDS,
    pollingInterval: DEFAULT_GET_TRADE_QUOTE_POLLING_INTERVAL,
  },
  [SwapperName.Test]: undefined,
}
