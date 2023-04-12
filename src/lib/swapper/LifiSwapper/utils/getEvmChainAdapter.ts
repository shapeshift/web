import type { ChainId } from '@shapeshiftoss/caip'
import type { EvmChainAdapter } from '@shapeshiftoss/chain-adapters'
import { SwapError, SwapErrorType } from '@shapeshiftoss/swapper'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { isEvmChainAdapter } from 'lib/utils'

export const getEvmChainAdapter = (chainId: ChainId): EvmChainAdapter => {
  const adapterManager = getChainAdapterManager()
  const adapter = adapterManager.get(chainId)

  if (adapter === undefined) {
    throw new SwapError('[getEvmChainAdapter] - getChainAdapterManager returned undefined', {
      code: SwapErrorType.UNSUPPORTED_CHAIN,
      details: { chainId },
    })
  }

  if (!isEvmChainAdapter(adapter)) {
    throw new SwapError('[getEvmChainAdapter] - non-EVM chain adapter detected', {
      code: SwapErrorType.UNSUPPORTED_CHAIN,
      details: {
        chainAdapterName: adapter.getDisplayName(),
        chainId: adapter.getChainId(),
      },
    })
  }

  return adapter
}
