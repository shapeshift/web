import { KnownChainIds } from '@shapeshiftoss/types'

export { QuoteRequest } from '@defuse-protocol/one-click-sdk-typescript'
export type {
  GetExecutionStatusResponse,
  QuoteResponse,
  TokenResponse
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
  KnownChainIds.BitcoinCashMainnet,
  KnownChainIds.DogecoinMainnet,
  KnownChainIds.ZcashMainnet,
  KnownChainIds.SolanaMainnet,
  KnownChainIds.TronMainnet,
  KnownChainIds.SuiMainnet,
  KnownChainIds.StarknetMainnet,
  KnownChainIds.MonadMainnet,
  KnownChainIds.NearMainnet,
  KnownChainIds.PlasmaMainnet,
  KnownChainIds.TonMainnet,
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
  [KnownChainIds.BitcoinCashMainnet]: 'bch',
  [KnownChainIds.DogecoinMainnet]: 'doge',
  [KnownChainIds.ZcashMainnet]: 'zec',
  [KnownChainIds.PlasmaMainnet]: 'plasma',
  [KnownChainIds.SolanaMainnet]: 'sol',
  [KnownChainIds.TronMainnet]: 'tron',
  [KnownChainIds.SuiMainnet]: 'sui',
  [KnownChainIds.StarknetMainnet]: 'starknet',
  [KnownChainIds.MonadMainnet]: 'monad',
  [KnownChainIds.NearMainnet]: 'near',
  [KnownChainIds.TonMainnet]: 'ton',
}
