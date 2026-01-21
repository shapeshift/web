import type { ChainId } from '@shapeshiftoss/caip'
import { lineaChainId } from '@shapeshiftoss/caip'
import type { EvmChainAdapter } from '@shapeshiftoss/chain-adapters'
import { viemLineaClient } from '@shapeshiftoss/contracts'
import type { KnownChainIds } from '@shapeshiftoss/types'
import { TxStatus } from '@shapeshiftoss/unchained-client'

import { getChainAdapterManager } from '@/context/PluginProvider/chainAdapterSingleton'

export const isLineaChainAdapter = (chainAdapter: unknown): chainAdapter is EvmChainAdapter => {
  if (!chainAdapter) return false

  const maybeAdapter = chainAdapter as EvmChainAdapter
  if (typeof maybeAdapter.getChainId !== 'function') return false

  return maybeAdapter.getChainId() === lineaChainId
}

export const assertGetLineaChainAdapter = (chainId: ChainId | KnownChainIds): EvmChainAdapter => {
  const chainAdapterManager = getChainAdapterManager()
  const adapter = chainAdapterManager.get(chainId)

  if (!isLineaChainAdapter(adapter)) {
    throw Error('invalid chain adapter')
  }

  return adapter
}

export const getLineaTransactionStatus = async (txHash: string): Promise<TxStatus> => {
  try {
    const receipt = await viemLineaClient.getTransactionReceipt({
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
    console.error('Error fetching Linea transaction status:', error)
    return TxStatus.Unknown
  }
}
