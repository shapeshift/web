import type { ChainId } from '@shapeshiftoss/caip'
import { CHAIN_NAMESPACE, fromChainId } from '@shapeshiftoss/caip'
import type { UtxoSupportedChainIds } from '@shapeshiftoss/swapper'
import { KnownChainIds } from '@shapeshiftoss/types'
import type { SupportedSwappingChain } from 'components/Trade/types'

export const isSupportedUtxoSwappingChain = (
  chainId: ChainId,
): chainId is UtxoSupportedChainIds => {
  const { chainNamespace } = fromChainId(chainId)
  return chainNamespace === CHAIN_NAMESPACE.Utxo
}

export const isSupportedNonUtxoSwappingChain = (
  chainId: ChainId,
): chainId is SupportedSwappingChain => {
  return (
    chainId === KnownChainIds.EthereumMainnet ||
    chainId === KnownChainIds.AvalancheMainnet ||
    chainId === KnownChainIds.OsmosisMainnet ||
    chainId === KnownChainIds.CosmosMainnet ||
    chainId === KnownChainIds.ThorchainMainnet
  )
}
