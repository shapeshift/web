import { KnownChainIds } from '@shapeshiftoss/types'

export const ChainflipSupportedChainIds = [
  KnownChainIds.EthereumMainnet,
  KnownChainIds.ArbitrumMainnet,
  KnownChainIds.BitcoinMainnet,
  KnownChainIds.SolanaMainnet,
  // TODO: Add Polkadot
] as const

export type ChainflipSupportedChainId = (typeof ChainflipSupportedChainIds)[number]

export const ChainflipSupportedAssets = {
  [KnownChainIds.EthereumMainnet]: ['eth', 'flip', 'usdc', 'usdt'],
  [KnownChainIds.ArbitrumMainnet]: ['eth', 'usdc'],
  [KnownChainIds.BitcoinMainnet]: ['btc'],
  [KnownChainIds.SolanaMainnet]: ['sol', 'usdc'],
}