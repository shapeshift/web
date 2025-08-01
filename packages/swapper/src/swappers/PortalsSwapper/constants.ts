import { KnownChainIds } from '@shapeshiftoss/types'

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
