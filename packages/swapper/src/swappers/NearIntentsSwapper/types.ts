import { KnownChainIds } from '@shapeshiftoss/types'

export { QuoteRequest } from '@defuse-protocol/one-click-sdk-typescript'
export type {
  GetExecutionStatusResponse,
  QuoteResponse,
  TokenResponse,
} from '@defuse-protocol/one-click-sdk-typescript'
export const nearIntentsSupportedChainIds = [
  KnownChainIds.EthereumMainnet,
  KnownChainIds.ArbitrumMainnet,
  KnownChainIds.BaseMainnet,
  KnownChainIds.GnosisMainnet,
  KnownChainIds.BnbSmartChainMainnet,
  KnownChainIds.PolygonMainnet,
  KnownChainIds.AvalancheMainnet,
  KnownChainIds.OptimismMainnet,
  KnownChainIds.BitcoinMainnet,
  KnownChainIds.DogecoinMainnet,
  KnownChainIds.ZcashMainnet,
  KnownChainIds.SolanaMainnet,
  KnownChainIds.TronMainnet,
  KnownChainIds.SuiMainnet,
  KnownChainIds.StarknetMainnet,
  KnownChainIds.MonadMainnet,
  KnownChainIds.NearMainnet,
] as const

export type NearIntentsSupportedChainId = (typeof nearIntentsSupportedChainIds)[number]

export const chainIdToNearIntentsChain: Record<NearIntentsSupportedChainId, string> = {
  [KnownChainIds.EthereumMainnet]: 'eth',
  [KnownChainIds.ArbitrumMainnet]: 'arb',
  [KnownChainIds.BaseMainnet]: 'base',
  [KnownChainIds.GnosisMainnet]: 'gnosis',
  [KnownChainIds.BnbSmartChainMainnet]: 'bsc',
  [KnownChainIds.PolygonMainnet]: 'pol',
  [KnownChainIds.AvalancheMainnet]: 'avax',
  [KnownChainIds.OptimismMainnet]: 'op',
  [KnownChainIds.BitcoinMainnet]: 'btc',
  [KnownChainIds.DogecoinMainnet]: 'doge',
  [KnownChainIds.ZcashMainnet]: 'zec',
  [KnownChainIds.SolanaMainnet]: 'sol',
  [KnownChainIds.TronMainnet]: 'tron',
  [KnownChainIds.SuiMainnet]: 'sui',
  [KnownChainIds.StarknetMainnet]: 'starknet',
  [KnownChainIds.MonadMainnet]: 'monad',
  [KnownChainIds.NearMainnet]: 'near',
}
