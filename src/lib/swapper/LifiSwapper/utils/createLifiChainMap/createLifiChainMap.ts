import type { ChainKey as LifiChainKey, EVMChain as LifiEVMChain } from '@lifi/sdk'
import type { ChainId, ChainReference } from '@shapeshiftoss/caip'
import { CHAIN_NAMESPACE, toChainId } from '@shapeshiftoss/caip'

export const createLifiChainMap = (lifiChains: LifiEVMChain[]): Map<ChainId, LifiChainKey> => {
  return new Map(
    lifiChains.map(({ id, key }) => {
      const chainId = toChainId({
        chainNamespace: CHAIN_NAMESPACE.Evm,
        // TODO: create explicit mapping instead of casting?
        chainReference: id.toString() as ChainReference,
      })
      return [chainId, key]
    }),
  )
}
