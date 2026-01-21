import type { ChainId } from '@shapeshiftoss/caip'
import { celoChainId } from '@shapeshiftoss/caip'
import type { EvmChainAdapter } from '@shapeshiftoss/chain-adapters'
import { viemCeloClient } from '@shapeshiftoss/contracts'
import type { KnownChainIds } from '@shapeshiftoss/types'
import { TxStatus } from '@shapeshiftoss/unchained-client'

import { getChainAdapterManager } from '@/context/PluginProvider/chainAdapterSingleton'

export const isCeloChainAdapter = (chainAdapter: unknown): chainAdapter is EvmChainAdapter => {
  if (!chainAdapter) return false

  const maybeAdapter = chainAdapter as EvmChainAdapter
  if (typeof maybeAdapter.getChainId !== 'function') return false

  return maybeAdapter.getChainId() === celoChainId
}

export const assertGetCeloChainAdapter = (chainId: ChainId | KnownChainIds): EvmChainAdapter => {
  const chainAdapterManager = getChainAdapterManager()
  const adapter = chainAdapterManager.get(chainId)

  if (!isCeloChainAdapter(adapter)) {
    throw Error('invalid chain adapter')
  }

  return adapter
}

export const getCeloTransactionStatus = async (txHash: string): Promise<TxStatus> => {
  try {
    const receipt = await viemCeloClient.getTransactionReceipt({
      hash: txHash as `0x${string}`,
    })

    if (!receipt) return TxStatus.Pending

    if (receipt.status === 'success') return TxStatus.Confirmed
    if (receipt.status === 'reverted') return TxStatus.Failed

    return TxStatus.Unknown
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes('could not be found') ||
        error.message.includes('Transaction receipt with hash'))
    ) {
      return TxStatus.Pending
    }
    console.error('Error fetching Celo transaction status:', error)
    return TxStatus.Unknown
  }
}
