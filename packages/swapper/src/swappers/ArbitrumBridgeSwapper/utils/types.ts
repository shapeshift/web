import { KnownChainIds } from '@shapeshiftmonorepo/types'

export const arbitrumBridgeSupportedChainIds = [
  KnownChainIds.EthereumMainnet,
  KnownChainIds.ArbitrumMainnet,
] as const

export type ArbitrumBridgeSupportedChainId = (typeof arbitrumBridgeSupportedChainIds)[number]
