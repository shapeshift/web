import type { ChainKey as LifiChainKey, EVMChain as LifiEVMChain } from '@lifi/sdk'
import type { ChainId } from '@shapeshiftoss/caip'
import { CHAIN_NAMESPACE, isChainReference, toChainId } from '@shapeshiftoss/caip'

export const createLifiChainMap = (
  lifiChains: Pick<LifiEVMChain, 'key' | 'id'>[],
): Map<ChainId, LifiChainKey> => {
  return new Map(
    lifiChains.map(({ id, key }) => {
      const chainReference = (() => {
        const maybeChainReference = id.toString()

        if (!isChainReference(maybeChainReference))
          throw Error('invalid chainId', {
            cause: { chainId: maybeChainReference },
          })
        return maybeChainReference
      })()

      const chainId = toChainId({
        chainNamespace: CHAIN_NAMESPACE.Evm,
        chainReference,
      })
      return [chainId, key]
    }),
  )
}
