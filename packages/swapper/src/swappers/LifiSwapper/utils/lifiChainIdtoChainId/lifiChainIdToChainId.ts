import type { ChainId, ChainReference } from '@shapeshiftmonorepo/caip'
import { CHAIN_NAMESPACE, toChainId } from '@shapeshiftmonorepo/caip'

export const lifiChainIdToChainId = (lifiChainId: number): ChainId => {
  return toChainId({
    chainNamespace: CHAIN_NAMESPACE.Evm,
    chainReference: lifiChainId.toString() as ChainReference,
  })
}
