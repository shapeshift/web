import { KnownChainIds } from '@shapeshiftoss/types'

export const ChainflipSupportedChainIds = [
  KnownChainIds.EthereumMainnet,
  KnownChainIds.ArbitrumMainnet,
  KnownChainIds.BitcoinMainnet,
  KnownChainIds.SolanaMainnet,
  // TODO: Add Polkadot
] as const

export type ChainflipSupportedChainId = (typeof ChainflipSupportedChainIds)[number]
