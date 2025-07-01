import type { ChainId } from '@shapeshiftoss/caip'
import { KnownChainIds } from '@shapeshiftoss/types'

// https://api.portals.fi/v1/networks
export const PortalsSupportedChainIds: ChainId[] = [
  KnownChainIds.EthereumMainnet,
  KnownChainIds.ArbitrumMainnet,
  KnownChainIds.AvalancheMainnet,
  KnownChainIds.PolygonMainnet,
  KnownChainIds.BnbSmartChainMainnet,
  KnownChainIds.OptimismMainnet,
  KnownChainIds.GnosisMainnet,
  KnownChainIds.BaseMainnet,
]

export type PortalsSupportedChainId = (typeof PortalsSupportedChainIds)[number]
