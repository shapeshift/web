import { KnownChainIds } from '@shapeshiftoss/types'

import type { GetEvmTradeQuoteInput, GetEvmTradeRateInput } from '../../types'

export type PortalsTradeQuoteInput = GetEvmTradeQuoteInput
export type PortalsTradeRateInput = GetEvmTradeRateInput

// https://api.portals.fi/v1/networks
export const PortalsSupportedChainIds = [
  KnownChainIds.EthereumMainnet,
  KnownChainIds.ArbitrumMainnet,
  KnownChainIds.AvalancheMainnet,
  KnownChainIds.PolygonMainnet,
  KnownChainIds.BnbSmartChainMainnet,
  KnownChainIds.OptimismMainnet,
  KnownChainIds.BaseMainnet,
  KnownChainIds.HyperEvmMainnet,
]

export type PortalsSupportedChainId = (typeof PortalsSupportedChainIds)[number]
