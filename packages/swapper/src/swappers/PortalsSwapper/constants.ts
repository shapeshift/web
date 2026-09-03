import { KnownChainIds } from '@shapeshiftoss/types'

// Vitalik's address — a realistic connected-wallet stand-in for walletless rate pricing + simulation
export const PORTALS_RATE_DEFAULT_ADDRESS = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'

// The feeCosts entry Portals use for the partner fee we requested
export const PARTNER_FEE_NAME = 'Partner fee'

export const chainIdToPortalsNetwork: Partial<Record<KnownChainIds, string>> = {
  [KnownChainIds.EthereumMainnet]: 'ethereum',
  [KnownChainIds.AvalancheMainnet]: 'avalanche',
  [KnownChainIds.OptimismMainnet]: 'optimism',
  [KnownChainIds.BnbSmartChainMainnet]: 'bsc',
  [KnownChainIds.PolygonMainnet]: 'polygon',
  [KnownChainIds.ArbitrumMainnet]: 'arbitrum',
  [KnownChainIds.BaseMainnet]: 'base',
  [KnownChainIds.HyperEvmMainnet]: 'hyperevm',
  [KnownChainIds.SonicMainnet]: 'sonic',
  [KnownChainIds.PlasmaMainnet]: 'plasma',
}
