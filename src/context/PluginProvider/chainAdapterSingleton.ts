import type { ChainAdapterManager } from '@keepkey/chain-adapters'

// don't export me, access me through the getter
let _chainAdapterManager: ChainAdapterManager = new Map()

// we need to be able to access this outside react
export const getChainAdapterManager = (): ChainAdapterManager => {
  return _chainAdapterManager
}
