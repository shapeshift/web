import type { ChainId } from '@shapeshiftoss/caip'
import { starknetChainId } from '@shapeshiftoss/caip'
import type { starknet } from '@shapeshiftoss/chain-adapters'
import type { KnownChainIds } from '@shapeshiftoss/types'
import { TxStatus } from '@shapeshiftoss/unchained-client'

import { getChainAdapterManager } from '@/context/PluginProvider/chainAdapterSingleton'

export const isStarknetChainAdapter = (
  chainAdapter: unknown,
): chainAdapter is starknet.ChainAdapter => {
  if (!chainAdapter) return false

  const maybeAdapter = chainAdapter as starknet.ChainAdapter
  if (typeof maybeAdapter.getChainId !== 'function') return false

  return maybeAdapter.getChainId() === starknetChainId
}

export const assertGetStarknetChainAdapter = (
  chainId: ChainId | KnownChainIds,
): starknet.ChainAdapter => {
  const chainAdapterManager = getChainAdapterManager()
  const adapter = chainAdapterManager.get(chainId)

  if (!isStarknetChainAdapter(adapter)) {
    throw Error('invalid chain adapter')
  }

  return adapter
}

export const getStarknetTransactionStatus = async (
  txHash: string,
  adapter: starknet.ChainAdapter,
): Promise<TxStatus> => {
  try {
    const provider = adapter.getStarknetProvider()
    const receipt = (await provider.getTransactionReceipt(txHash)) as any

    switch (receipt.execution_status) {
      case 'SUCCEEDED':
        return TxStatus.Confirmed
      case 'REVERTED':
        return TxStatus.Failed
      default:
        return TxStatus.Unknown
    }
  } catch (err) {
    console.error(`[Starknet] Error getting transaction status for ${txHash}:`, err)
    return TxStatus.Unknown
  }
}
