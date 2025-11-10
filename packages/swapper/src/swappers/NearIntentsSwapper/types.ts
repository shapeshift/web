import { KnownChainIds } from '@shapeshiftoss/types'

export { QuoteRequest } from '@defuse-protocol/one-click-sdk-typescript'
export type {
  QuoteResponse,
  GetExecutionStatusResponse,
  TokenResponse,
} from '@defuse-protocol/one-click-sdk-typescript'
export const nearIntentsSupportedChainIds = [
  KnownChainIds.EthereumMainnet,
  KnownChainIds.ArbitrumMainnet,
  KnownChainIds.BaseMainnet,
  KnownChainIds.BnbSmartChainMainnet,
  KnownChainIds.PolygonMainnet,
  KnownChainIds.GnosisMainnet,
  KnownChainIds.BitcoinMainnet,
  KnownChainIds.DogecoinMainnet,
  KnownChainIds.SolanaMainnet,
  // TODO(gomes): NEP-245 support for Avalanche, Optimism - https://github.com/shapeshift/web/issues/11020
  // KnownChainIds.AvalancheMainnet,
  // KnownChainIds.OptimismMainnet,
] as const

export type NearIntentsSupportedChainId = (typeof nearIntentsSupportedChainIds)[number]

export const chainIdToNearIntentsChain: Record<NearIntentsSupportedChainId, string> = {
  [KnownChainIds.EthereumMainnet]: 'eth',
  [KnownChainIds.ArbitrumMainnet]: 'arb',
  [KnownChainIds.BaseMainnet]: 'base',
  [KnownChainIds.BnbSmartChainMainnet]: 'bnb',
  [KnownChainIds.PolygonMainnet]: 'pol',
  [KnownChainIds.GnosisMainnet]: 'gnosis',
  [KnownChainIds.BitcoinMainnet]: 'btc',
  [KnownChainIds.DogecoinMainnet]: 'doge',
  [KnownChainIds.SolanaMainnet]: 'sol',
  // TODO(gomes): NEP-245 support - https://github.com/shapeshift/web/issues/11020
  // [KnownChainIds.AvalancheMainnet]: 'avax',
  // [KnownChainIds.OptimismMainnet]: 'op',
}

// TODO(gomes): appFees.recipient only accepts NEAR addresses - https://github.com/shapeshift/web/issues/11022
