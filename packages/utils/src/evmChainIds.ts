import type { EvmChainId } from '@shapeshiftoss/types'
import { KnownChainIds } from '@shapeshiftoss/types'

export const isEvmChainId = (
  maybeEvmChainId: string | EvmChainId,
): maybeEvmChainId is EvmChainId => {
  return evmChainIds.includes(maybeEvmChainId as EvmChainId)
}

export const evmChainIds = [
  KnownChainIds.EthereumMainnet,
  KnownChainIds.AvalancheMainnet,
  KnownChainIds.OptimismMainnet,
  KnownChainIds.BnbSmartChainMainnet,
  KnownChainIds.PolygonMainnet,
  KnownChainIds.GnosisMainnet,
  KnownChainIds.ArbitrumMainnet,
  KnownChainIds.ArbitrumNovaMainnet,
  KnownChainIds.BaseMainnet,
] as const
