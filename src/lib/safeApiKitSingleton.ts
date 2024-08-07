import SafeApiKit from '@safe-global/api-kit'
import Safe from '@safe-global/protocol-kit'
import { type ChainId, fromChainId } from '@shapeshiftoss/caip'
import type { EvmChainId } from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'
import { getConfig } from 'config'

import { assertUnreachable } from './utils'

export const rpcUrlByChainId = (chainId: EvmChainId): string => {
  switch (chainId) {
    case KnownChainIds.AvalancheMainnet:
      return getConfig().REACT_APP_AVALANCHE_NODE_URL
    case KnownChainIds.OptimismMainnet:
      return getConfig().REACT_APP_OPTIMISM_NODE_URL
    case KnownChainIds.BnbSmartChainMainnet:
      return getConfig().REACT_APP_BNBSMARTCHAIN_NODE_URL
    case KnownChainIds.PolygonMainnet:
      return getConfig().REACT_APP_POLYGON_NODE_URL
    case KnownChainIds.GnosisMainnet:
      return getConfig().REACT_APP_GNOSIS_NODE_URL
    case KnownChainIds.EthereumMainnet:
      return getConfig().REACT_APP_ETHEREUM_NODE_URL
    case KnownChainIds.ArbitrumMainnet:
      return getConfig().REACT_APP_ARBITRUM_NODE_URL
    case KnownChainIds.ArbitrumNovaMainnet:
      return getConfig().REACT_APP_ARBITRUM_NOVA_NODE_URL
    case KnownChainIds.BaseMainnet:
      return getConfig().REACT_APP_BASE_NODE_URL
    default:
      // @ts-ignore
      assertUnreachable(chainId)
  }
}

const safeApiKits: Map<ChainId, SafeApiKit> = new Map()

export const getSafeApiKit = async (
  chainId: EvmChainId,
  safeAddress: string,
): Promise<SafeApiKit> => {
  // TODO(gomes): we should leverage isSafeDeployed to ensure we're dealing with a SAFE sc
  const networkId = BigInt(fromChainId(chainId).chainReference)
  if (!safeApiKits.has(chainId)) {
    const safeApiKit = new SafeApiKit({
      chainId: networkId,
    })
    const safe = await Safe.init({
      provider: rpcUrlByChainId(chainId),
      safeAddress,
    })
    // TODO(gomes): should we check for SAFE deployed here?
    const isSafeDeployed = await safe.isSafeDeployed()
    debugger
    safeApiKits.set(chainId, safeApiKit)
    return safeApiKit
  } else {
    return safeApiKits.get(chainId)!
  }
}
