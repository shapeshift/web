// don't export me, access me through the getter
import { ChainAdapterManager } from '@shapeshiftoss/chain-adapters'

let _chainAdapterManager: ChainAdapterManager | undefined

// we need to be able to access this outside react
export const getChainAdapterManager = (): ChainAdapterManager => {
  if (!_chainAdapterManager) _chainAdapterManager = new Map()
  return _chainAdapterManager
}
