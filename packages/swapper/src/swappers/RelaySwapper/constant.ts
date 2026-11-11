import {
  arbitrumChainId,
  avalancheChainId,
  baseChainId,
  bobChainId,
  bscChainId,
  btcChainId,
  celoChainId,
  cronosChainId,
  elysiumChainId,
  ethChainId,
  gnosisChainId,
  hyperEvmChainId,
  inkChainId,
  katanaChainId,
  mantleChainId,
  megaethChainId,
  monadChainId,
  optimismChainId,
  plasmaChainId,
  polygonChainId,
  robinhoodChainId,
  seiChainId,
  solanaChainId,
  sonicChainId,
  tronChainId,
  unichainChainId,
} from '@shapeshiftoss/caip'
import invert from 'lodash/invert'
import { zeroAddress } from 'viem'
import {
  arbitrum,
  avalanche,
  base,
  bob,
  bsc,
  celo,
  cronos,
  gnosis,
  hyperEvm,
  ink,
  katana,
  mainnet as ethereum,
  mantle,
  megaeth,
  monad,
  optimism,
  plasma,
  polygon,
  robinhood,
  sei,
  sonic,
  tron,
  unichain,
} from 'viem/chains'

import { TradeQuoteError } from '../../types'
import { RelayErrorCode } from './utils/types'

// https://docs.relay.link/resources/supported-chains
export const chainIdToRelayChainId = {
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
  [tronChainId]: tron.id,
  [monadChainId]: monad.id,
  [hyperEvmChainId]: hyperEvm.id,
  [mantleChainId]: mantle.id,
  [inkChainId]: ink.id,
  [megaethChainId]: megaeth.id,
  [plasmaChainId]: plasma.id,
  [katanaChainId]: katana.id,
  [celoChainId]: celo.id,
  [cronosChainId]: cronos.id,
  [sonicChainId]: sonic.id,
  [unichainChainId]: unichain.id,
  [bobChainId]: bob.id,
  [seiChainId]: sei.id,
  [robinhoodChainId]: robinhood.id,
  [elysiumChainId]: 99901,
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

// depositor energy for a TRC20 deposit measured on mainnet, for token quotes without their allowance
export const RELAY_TRON_FALLBACK_DEPOSIT_ENERGY = '100000'
export const DEFAULT_RELAY_BTC_USER_ADDRESS = 'bc1q4vxn43l44h30nkluqfxd9eckf45vr2awz38lwa'
export const DEFAULT_RELAY_SOLANA_USER_ADDRESS = 'CbKGgVKLJFb8bBrf58DnAkdryX6ubewVytn7X957YwNr'
export const DEFAULT_RELAY_TRON_USER_ADDRESS = 'TLsV52sRDL79HXGGm9yzwKibb6BeruhUzy'

export const MAXIMUM_SUPPORTED_RELAY_STEPS = 2

export const relayErrorCodeToTradeQuoteError: Record<RelayErrorCode, TradeQuoteError> = {
  [RelayErrorCode.AmountTooLow]: TradeQuoteError.SellAmountBelowMinimum,
  [RelayErrorCode.ChainDisabled]: TradeQuoteError.TradingHalted,
  [RelayErrorCode.Erc20RouterAddressNotFound]: TradeQuoteError.UnsupportedTradePair,
  [RelayErrorCode.ExtraTransactionsNotSupported]: TradeQuoteError.UnsupportedTradePair,
  [RelayErrorCode.InsufficientFunds]: TradeQuoteError.InsufficientFunds,
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
