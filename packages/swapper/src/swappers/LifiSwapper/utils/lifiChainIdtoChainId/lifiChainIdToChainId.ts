import type { ChainId, ChainReference } from '@shapeshiftoss/caip'
import { CHAIN_NAMESPACE, toChainId } from '@shapeshiftoss/caip'

export const lifiChainIdToChainId = (lifiChainId: number): ChainId => {
  return toChainId({
    chainNamespace: CHAIN_NAMESPACE.Evm,
    chainReference: lifiChainId.toString() as ChainReference,
  })
}
