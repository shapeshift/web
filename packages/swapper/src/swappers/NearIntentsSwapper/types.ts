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
  KnownChainIds.GnosisMainnet,
  KnownChainIds.BitcoinMainnet,
  KnownChainIds.DogecoinMainnet,
  KnownChainIds.SolanaMainnet,
  // TODO(gomes): NEP-245 support - https://github.com/shapeshift/web/issues/11020
  // KnownChainIds.BnbSmartChainMainnet,
  // KnownChainIds.PolygonMainnet,
  // KnownChainIds.AvalancheMainnet,
  // KnownChainIds.OptimismMainnet,
] as const

export type NearIntentsSupportedChainId = (typeof nearIntentsSupportedChainIds)[number]

export const chainIdToNearIntentsChain: Record<NearIntentsSupportedChainId, string> = {
  [KnownChainIds.EthereumMainnet]: 'eth',
  [KnownChainIds.ArbitrumMainnet]: 'arb',
  [KnownChainIds.BaseMainnet]: 'base',
  [KnownChainIds.GnosisMainnet]: 'gnosis',
  [KnownChainIds.BitcoinMainnet]: 'btc',
  [KnownChainIds.DogecoinMainnet]: 'doge',
  [KnownChainIds.SolanaMainnet]: 'sol',
}
