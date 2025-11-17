import {
  arbitrumChainId,
  avalancheChainId,
  baseChainId,
  bscChainId,
  btcChainId,
  ethChainId,
  gnosisChainId,
  optimismChainId,
  polygonChainId,
  solanaChainId,
} from '@shapeshiftoss/caip'
import { KnownChainIds } from '@shapeshiftoss/types'
import invert from 'lodash/invert'
import { zeroAddress } from 'viem'
import {
  arbitrum,
  avalanche,
  base,
  bsc,
  gnosis,
  mainnet as ethereum,
  optimism,
  polygon,
} from 'viem/chains'

import { TradeQuoteError } from '../../types'
import { RelayErrorCode } from './utils/types'

export const relaySupportedChainIds = [
  KnownChainIds.EthereumMainnet,
  KnownChainIds.ArbitrumMainnet,
  KnownChainIds.BaseMainnet,
  KnownChainIds.OptimismMainnet,
  KnownChainIds.PolygonMainnet,
  KnownChainIds.GnosisMainnet,
  KnownChainIds.AvalancheMainnet,
  KnownChainIds.BitcoinMainnet,
  KnownChainIds.SolanaMainnet,
  KnownChainIds.BnbSmartChainMainnet,
]

export const chainIdToRelayChainId = {
  // https://docs.relay.link/resources/supported-chains
  [btcChainId]: 8253038,
  [ethChainId]: ethereum.id,
  [arbitrumChainId]: arbitrum.id,
  [baseChainId]: base.id,
  [optimismChainId]: optimism.id,
  [polygonChainId]: polygon.id,
  // https://docs.relay.link/resources/supported-chains
  [solanaChainId]: 792703809,
  [gnosisChainId]: gnosis.id,
  [avalancheChainId]: avalanche.id,
  [bscChainId]: bsc.id,
}

export enum RelayStatusMessage {
  WaitingForDeposit = 'Waiting for deposit...',
  DepositDetected = 'Deposit detected, processing swap...',
  Retrying = 'Taking a bit longer than usual to find a route, hang tight...',
  SwapComplete = 'Swap complete',
  SwapFailed = 'Swap failed',
}

export const relayChainIdToChainId = invert(chainIdToRelayChainId)

export const DEFAULT_RELAY_EVM_TOKEN_ADDRESS = zeroAddress
export const RELAY_BTC_TOKEN_ADDRESS = 'bc1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqmql8k8'
export const RELAY_SOLANA_TOKEN_ADDRESS = '11111111111111111111111111111111'

export const DEFAULT_RELAY_EVM_USER_ADDRESS = '0x000000000000000000000000000000000000dead'
export const DEFAULT_RELAY_BTC_USER_ADDRESS = 'bc1q4vxn43l44h30nkluqfxd9eckf45vr2awz38lwa'
export const DEFAULT_RELAY_SOLANA_USER_ADDRESS = 'CbKGgVKLJFb8bBrf58DnAkdryX6ubewVytn7X957YwNr'

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
