import { CHAIN_NAMESPACE, fromChainId } from '@shapeshiftoss/caip'

import type { ChainId } from '../types'

// Only evm chains share an address space; everywhere else an address belongs to exactly one chain
export const sharesAddressSpace = (chainId: ChainId, otherChainId: ChainId): boolean =>
  chainId === otherChainId ||
  (fromChainId(chainId).chainNamespace === CHAIN_NAMESPACE.Evm &&
    fromChainId(otherChainId).chainNamespace === CHAIN_NAMESPACE.Evm)
