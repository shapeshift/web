import type { ChainId } from '@shapeshiftoss/caip'
import {
  arbitrumChainId,
  avalancheChainId,
  baseChainId,
  bscChainId,
  btcChainId,
  CHAIN_NAMESPACE,
  ethChainId,
  fromChainId,
  gnosisChainId,
  hyperEvmChainId,
  katanaChainId,
  monadChainId,
  optimismChainId,
  plasmaChainId,
  polygonChainId,
  solanaChainId,
  tronChainId,
} from '@shapeshiftoss/caip'
import { zeroAddress } from 'viem'
import {
  arbitrum,
  avalanche,
  base,
  bsc,
  gnosis,
  hyperEvm,
  katana,
  mainnet as ethereum,
  monad,
  optimism,
  plasma,
  polygon,
} from 'viem/chains'

import { TradeQuoteError } from '../../types'
import { RelayErrorCode } from './utils/types'

const knownChainIdToRelayChainId: Record<string, number> = {
  [btcChainId]: 8253038,
  [ethChainId]: ethereum.id,
  [arbitrumChainId]: arbitrum.id,
  [baseChainId]: base.id,
  [optimismChainId]: optimism.id,
  [polygonChainId]: polygon.id,
  [solanaChainId]: 792703809,
  [gnosisChainId]: gnosis.id,
  [avalancheChainId]: avalanche.id,
  [bscChainId]: bsc.id,
  [tronChainId]: 728126428,
  [monadChainId]: monad.id,
  [hyperEvmChainId]: hyperEvm.id,
  [plasmaChainId]: plasma.id,
  [katanaChainId]: katana.id,
}

export const getRelayChainId = (chainId: ChainId): number | undefined => {
  const known = knownChainIdToRelayChainId[chainId]
  if (known !== undefined) return known

  const { chainNamespace, chainReference } = fromChainId(chainId)
  if (chainNamespace === CHAIN_NAMESPACE.Evm) {
    const numericChainId = Number(chainReference)
    if (!Number.isNaN(numericChainId)) return numericChainId
  }

  return undefined
}

export const getChainIdFromRelayChainId = (relayChainId: number): ChainId | undefined => {
  for (const [chainId, id] of Object.entries(knownChainIdToRelayChainId)) {
    if (id === relayChainId) return chainId as ChainId
  }

  return `eip155:${relayChainId}` as ChainId
}

export const chainIdToRelayChainId: Record<string, number> = new Proxy(knownChainIdToRelayChainId, {
  get(target, prop: string) {
    if (prop in target) return target[prop]

    const relayChainId = getRelayChainId(prop as ChainId)
    return relayChainId
  },
})

export enum RelayStatusMessage {
  WaitingForDeposit = 'Waiting for deposit...',
  DepositDetected = 'Deposit detected, processing swap...',
  Retrying = 'Taking a bit longer than usual to find a route, hang tight...',
  SwapComplete = 'Swap complete',
  SwapFailed = 'Swap failed',
}

export const relayChainIdToChainId = (relayChainId: number): ChainId | undefined => {
  return getChainIdFromRelayChainId(relayChainId)
}

export const DEFAULT_RELAY_EVM_TOKEN_ADDRESS = zeroAddress
export const RELAY_BTC_TOKEN_ADDRESS = 'bc1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqmql8k8'
export const RELAY_SOLANA_TOKEN_ADDRESS = '11111111111111111111111111111111'
export const RELAY_TRON_TOKEN_ADDRESS = 'T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb'

export const DEFAULT_RELAY_EVM_USER_ADDRESS = '0x000000000000000000000000000000000000dead'
export const DEFAULT_RELAY_BTC_USER_ADDRESS = 'bc1q4vxn43l44h30nkluqfxd9eckf45vr2awz38lwa'
export const DEFAULT_RELAY_SOLANA_USER_ADDRESS = 'CbKGgVKLJFb8bBrf58DnAkdryX6ubewVytn7X957YwNr'
export const DEFAULT_RELAY_TRON_USER_ADDRESS = 'TLsV52sRDL79HXGGm9yzwKibb6BeruhUzy'

export const MAXIMUM_SUPPORTED_RELAY_STEPS = 2

export const relayErrorCodeToTradeQuoteError: Record<RelayErrorCode, TradeQuoteError> = {
  [RelayErrorCode.AmountTooLow]: TradeQuoteError.SellAmountBelowMinimum,
  [RelayErrorCode.ChainDisabled]: TradeQuoteError.TradingHalted,
  [RelayErrorCode.Erc20RouterAddressNotFound]: TradeQuoteError.UnsupportedTradePair,
  [RelayErrorCode.ExtraTransactionsNotSupported]: TradeQuoteError.UnsupportedTradePair,
  [RelayErrorCode.InsufficientFunds]: TradeQuoteError.SellAmountBelowTradeFee,
  [RelayErrorCode.InsufficientLiquidity]: TradeQuoteError.SellAmountBelowTradeFee,
  [RelayErrorCode.InvalidAddress]: TradeQuoteError.UnsupportedTradePair,
  [RelayErrorCode.InvalidExtraTransactions]: TradeQuoteError.UnsupportedTradePair,
  [RelayErrorCode.NoQuotes]: TradeQuoteError.NoRouteFound,
  [RelayErrorCode.NoSwapRoutesFound]: TradeQuoteError.NoRouteFound,
  [RelayErrorCode.UnsupportedRoute]: TradeQuoteError.UnsupportedTradePair,
  [RelayErrorCode.UnsupportedExecutionType]: TradeQuoteError.UnknownError,
  [RelayErrorCode.UserRecipientMismatch]: TradeQuoteError.UnknownError,
  [RelayErrorCode.PermitFailed]: TradeQuoteError.UnknownError,
  [RelayErrorCode.SwapImpactTooHigh]: TradeQuoteError.UnknownError,
  [RelayErrorCode.SwapQuoteFailed]: TradeQuoteError.UnknownError,
  [RelayErrorCode.Unauthorized]: TradeQuoteError.UnknownError,
  [RelayErrorCode.UnknownError]: TradeQuoteError.UnknownError,
  [RelayErrorCode.UnsupportedChain]: TradeQuoteError.UnknownError,
  [RelayErrorCode.UnsupportedCurrency]: TradeQuoteError.UnknownError,
}
