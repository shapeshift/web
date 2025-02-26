import type { ChainId } from '@shapeshiftoss/caip'
import { KnownChainIds } from '@shapeshiftoss/types'

import type { SupportedChainIds } from '../../types'
import { PortalsSupportedChainIds } from './types'

export const PORTALS_SUPPORTED_CHAIN_IDS: SupportedChainIds = {
  sell: PortalsSupportedChainIds as unknown as ChainId[],
  buy: PortalsSupportedChainIds as unknown as ChainId[],
}

export const chainIdToPortalsNetwork: Partial<Record<KnownChainIds, string>> = {
  [KnownChainIds.EthereumMainnet]: 'ethereum',
  [KnownChainIds.AvalancheMainnet]: 'avalanche',
  [KnownChainIds.OptimismMainnet]: 'optimism',
  [KnownChainIds.BnbSmartChainMainnet]: 'bsc',
  [KnownChainIds.PolygonMainnet]: 'polygon',
  [KnownChainIds.GnosisMainnet]: 'gnosis',
  [KnownChainIds.ArbitrumMainnet]: 'arbitrum',
  [KnownChainIds.BaseMainnet]: 'base',
}
