import {
  arbitrumChainId,
  baseChainId,
  bscChainId,
  ethChainId,
  hyperEvmChainId,
  monadChainId,
  optimismChainId,
  plasmaChainId,
  polygonChainId,
  solanaChainId,
  zkSyncEraChainId,
} from '@shapeshiftoss/caip'
import invert from 'lodash/invert'
import { zeroAddress } from 'viem'
import {
  arbitrum,
  base,
  bsc,
  hyperEvm,
  mainnet as ethereum,
  monad,
  optimism,
  plasma,
  polygon,
  zksync,
} from 'viem/chains'

import { TradeQuoteError } from '../../types'
import { AcrossErrorCode } from './utils/types'

export const chainIdToAcrossChainId: Record<string, number> = {
  [ethChainId]: ethereum.id,
  [arbitrumChainId]: arbitrum.id,
  [baseChainId]: base.id,
  [optimismChainId]: optimism.id,
  [polygonChainId]: polygon.id,
  [bscChainId]: bsc.id,
  [monadChainId]: monad.id,
  [hyperEvmChainId]: hyperEvm.id,
  [plasmaChainId]: plasma.id,
  [zkSyncEraChainId]: zksync.id,
  // Across uses a custom Solana chain ID
  [solanaChainId]: 34268394551451,
}

export const acrossChainIdToChainId = invert(chainIdToAcrossChainId)

export const ACROSS_SUPPORTED_CHAIN_IDS = Object.keys(chainIdToAcrossChainId)

export const DEFAULT_ACROSS_EVM_TOKEN_ADDRESS = zeroAddress
export const ACROSS_SOLANA_TOKEN_ADDRESS = '11111111111111111111111111111111'

export const DEFAULT_ACROSS_EVM_USER_ADDRESS = '0x000000000000000000000000000000000000dead'
export const DEFAULT_ACROSS_SOLANA_USER_ADDRESS = 'CbKGgVKLJFb8bBrf58DnAkdryX6ubewVytn7X957YwNr'

export const acrossErrorCodeToTradeQuoteError: Partial<Record<string, TradeQuoteError>> = {
  [AcrossErrorCode.AmountTooLow]: TradeQuoteError.SellAmountBelowMinimum,
  [AcrossErrorCode.RouteNotFound]: TradeQuoteError.NoRouteFound,
  [AcrossErrorCode.NoBridgeRoutes]: TradeQuoteError.NoRouteFound,
  [AcrossErrorCode.UnsupportedToken]: TradeQuoteError.UnsupportedTradePair,
  [AcrossErrorCode.InsufficientLiquidity]: TradeQuoteError.SellAmountBelowTradeFee,
  [AcrossErrorCode.InvalidParam]: TradeQuoteError.UnknownError,
  [AcrossErrorCode.InternalError]: TradeQuoteError.InternalError,
}
