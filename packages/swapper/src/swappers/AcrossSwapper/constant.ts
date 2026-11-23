import {
  arbitrumChainId,
  avalancheChainId,
  baseChainId,
  bscChainId,
  ethChainId,
  hyperEvmChainId,
  inkChainId,
  megaethChainId,
  monadChainId,
  optimismChainId,
  plasmaChainId,
  polygonChainId,
  robinhoodChainId,
  solanaChainId,
  unichainChainId,
} from '@shapeshiftoss/caip'
import {
  arbitrum,
  avalanche,
  base,
  bsc,
  hyperEvm,
  ink,
  mainnet as ethereum,
  megaeth,
  monad,
  optimism,
  plasma,
  polygon,
  robinhood,
  unichain,
} from 'viem/chains'

import { TradeQuoteError } from '../../types'

export const chainIdToAcrossChainId: Record<string, number> = {
  [ethChainId]: ethereum.id,
  [arbitrumChainId]: arbitrum.id,
  [avalancheChainId]: avalanche.id,
  [baseChainId]: base.id,
  [optimismChainId]: optimism.id,
  [polygonChainId]: polygon.id,
  [bscChainId]: bsc.id,
  [monadChainId]: monad.id,
  [hyperEvmChainId]: hyperEvm.id,
  [inkChainId]: ink.id,
  [plasmaChainId]: plasma.id,
  [unichainChainId]: unichain.id,
  [solanaChainId]: 34268394551451, // Across uses a custom Solana chain ID
  [megaethChainId]: megaeth.id,
  [robinhoodChainId]: robinhood.id,
}

export const ACROSS_SOLANA_NATIVE_TOKEN_ADDRESS = '11111111111111111111111111111111'
export const DEFAULT_ACROSS_EVM_USER_ADDRESS = '0x000000000000000000000000000000000000dead'
export const DEFAULT_ACROSS_SOLANA_USER_ADDRESS = 'CbKGgVKLJFb8bBrf58DnAkdryX6ubewVytn7X957YwNr'

export const ACROSS_TRANSFER_BASE_URL = 'https://across.to/transfer'

// Across keeps 25% of the app fee, so request the gross bps that nets affiliateBps
export const ACROSS_APP_FEE_SHARE = 0.75

export const acrossErrorCodeToTradeQuoteError: Partial<Record<string, TradeQuoteError>> = {
  'not_found.route': TradeQuoteError.NoRouteFound,
  'rate_limit.exceeded': TradeQuoteError.RateLimitExceeded,
  'system.unavailable': TradeQuoteError.QueryFailed,
  'system.internal_error': TradeQuoteError.InternalError,
}
