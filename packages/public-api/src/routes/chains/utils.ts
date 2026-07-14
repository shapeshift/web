import type { ChainNamespace } from '@shapeshiftoss/caip'
import { CHAIN_NAMESPACE, fromChainId } from '@shapeshiftoss/caip'
import { getBaseAsset } from '@shapeshiftoss/utils'

import { SUPPORTED_CHAIN_IDS } from '../../constants'
import type { Chain, ChainType } from './types'

const chainNamespaceToType: Record<ChainNamespace, ChainType> = {
  [CHAIN_NAMESPACE.Evm]: 'evm',
  [CHAIN_NAMESPACE.Utxo]: 'utxo',
  [CHAIN_NAMESPACE.CosmosSdk]: 'cosmos',
  [CHAIN_NAMESPACE.Solana]: 'solana',
  [CHAIN_NAMESPACE.Tron]: 'tron',
  [CHAIN_NAMESPACE.Sui]: 'sui',
  [CHAIN_NAMESPACE.Near]: 'near',
  [CHAIN_NAMESPACE.Starknet]: 'starknet',
  [CHAIN_NAMESPACE.Ton]: 'ton',
  [CHAIN_NAMESPACE.Aptos]: 'aptos',
}

const buildChainList = (): Chain[] => {
  const chains: Chain[] = []

  for (const chainId of SUPPORTED_CHAIN_IDS) {
    try {
      const baseAsset = getBaseAsset(chainId)
      const { chainNamespace } = fromChainId(chainId)
      const chainType = chainNamespaceToType[chainNamespace]

      chains.push({
        chainId,
        name: baseAsset.networkName ?? baseAsset.name,
        type: chainType,
        symbol: baseAsset.symbol,
        precision: baseAsset.precision,
        color: baseAsset.color,
        networkColor: baseAsset.networkColor,
        icon: baseAsset.icon,
        networkIcon: baseAsset.networkIcon,
        explorer: baseAsset.explorer,
        explorerAddressLink: baseAsset.explorerAddressLink,
        explorerTxLink: baseAsset.explorerTxLink,
        nativeAssetId: baseAsset.assetId,
      })
    } catch (error) {
      console.warn(`Failed to get base asset for chainId: ${chainId}`, error)
    }
  }

  return chains.sort((a, b) => a.name.localeCompare(b.name))
}

let cachedChains: Chain[] | null = null

export const getChainList = (): Chain[] => {
  if (!cachedChains) {
    cachedChains = buildChainList()
  }
  return cachedChains
}
