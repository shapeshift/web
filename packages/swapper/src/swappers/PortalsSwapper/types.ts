import { KnownChainIds } from '@shapeshiftoss/types'

// https://api.portals.fi/v1/networks
export const PortalsSupportedChainIds = [
  KnownChainIds.EthereumMainnet,
  KnownChainIds.ArbitrumMainnet,
  KnownChainIds.AvalancheMainnet,
  KnownChainIds.PolygonMainnet,
  KnownChainIds.BnbSmartChainMainnet,
  KnownChainIds.OptimismMainnet,
  KnownChainIds.GnosisMainnet,
  KnownChainIds.BaseMainnet,
] as const

export type PortalsSupportedChainId = (typeof PortalsSupportedChainIds)[number]
