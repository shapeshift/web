import { KnownChainIds } from '@shapeshiftoss/types'
import type { TreasuryChainId } from '@shapeshiftoss/utils'
import type { Address } from 'viem'

export const KYBER_CLIENT_ID = 'shapeshift'
export const KYBER_DEADLINE_SECONDS = 1200

export const KYBER_CHAINS = {
  [KnownChainIds.EthereumMainnet]: 'ethereum',
  [KnownChainIds.OptimismMainnet]: 'optimism',
  [KnownChainIds.BnbSmartChainMainnet]: 'bsc',
  [KnownChainIds.PolygonMainnet]: 'polygon',
  [KnownChainIds.ArbitrumMainnet]: 'arbitrum',
  [KnownChainIds.BaseMainnet]: 'base',
  [KnownChainIds.AvalancheMainnet]: 'avalanche',
  [KnownChainIds.UnichainMainnet]: 'unichain',
  [KnownChainIds.SonicMainnet]: 'sonic',
  [KnownChainIds.RobinhoodMainnet]: 'robinhood',
  [KnownChainIds.MonadMainnet]: 'monad',
  [KnownChainIds.HyperEvmMainnet]: 'hyperevm',
  [KnownChainIds.MegaEthMainnet]: 'megaeth',
  [KnownChainIds.PlasmaMainnet]: 'plasma',
  [KnownChainIds.ElysiumMainnet]: 'elysium',
} as const satisfies Partial<Record<TreasuryChainId, string>>

export type KyberSupportedChainId = keyof typeof KYBER_CHAINS

// MetaAggregationRouterV2, same address on every chain: https://docs.kyberswap.com/developer-guide/aggregator-api/contracts
export const KYBER_ROUTER_ADDRESS: Address = '0x6131B5fae19EA4f9D964eAc0408E4408b66337b5'
export const KYBER_NATIVE_TOKEN: Address = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'
