import type { ChainId } from '@shapeshiftoss/caip'
import { KnownChainIds } from '@shapeshiftoss/types'

// https://docs.butternetwork.io/butter-swap-integration/butter-api-for-routing/get-supportedchainlist#butter-chain-id-explanation
const BUTTERSWAP_CHAIN_ID_TO_CHAIN_ID: Record<number, KnownChainIds> = {
  1: KnownChainIds.EthereumMainnet,
  137: KnownChainIds.PolygonMainnet,
  56: KnownChainIds.BnbSmartChainMainnet,
  42161: KnownChainIds.ArbitrumMainnet,
  10: KnownChainIds.OptimismMainnet,
  8453: KnownChainIds.BaseMainnet,
  43114: KnownChainIds.AvalancheMainnet,
  1360108768460801: KnownChainIds.SolanaMainnet,
  1360095883558913: KnownChainIds.BitcoinMainnet,
}

const CHAIN_ID_TO_BUTTERSWAP_CHAIN_ID: Record<KnownChainIds, number> = Object.entries(
  BUTTERSWAP_CHAIN_ID_TO_CHAIN_ID,
).reduce(
  (acc, [butterSwapChainId, chainId]) => {
    acc[chainId] = Number(butterSwapChainId)
    return acc
  },
  {} as Record<KnownChainIds, number>,
)

export const butterSwapChainIdToChainId = (butterSwapChainId: number): ChainId | undefined => {
  return BUTTERSWAP_CHAIN_ID_TO_CHAIN_ID[butterSwapChainId]
}

export const chainIdToButterSwapChainId = (chainId: ChainId): number | undefined => {
  return CHAIN_ID_TO_BUTTERSWAP_CHAIN_ID[chainId as KnownChainIds]
}
