import { hyperEvmChainId } from '@shapeshiftoss/caip'
import type { ChainAdapter } from '@shapeshiftoss/chain-adapters'
import { JsonRpcProvider } from 'ethers'

import { assertUnreachable } from '.'

import type { TxStatus } from '@/state/slices/txHistorySlice/txHistorySlice'

export const isHyperEvmChainAdapter = (adapter: unknown): adapter is ChainAdapter => {
  return (adapter as ChainAdapter).getChainId() === hyperEvmChainId
}

export const assertGetHyperEvmChainAdapter = (
  adapter: ChainAdapter,
): asserts adapter is ChainAdapter => {
  if (!isHyperEvmChainAdapter(adapter)) {
    throw new Error('HyperEVM adapter required')
  }
}

export const getHyperEvmTransactionStatus = async (
  txHash: string,
  nodeUrl: string,
): Promise<TxStatus> => {
  try {
    const provider = new JsonRpcProvider(nodeUrl, undefined, {
      staticNetwork: true,
    })

    const receipt = await provider.getTransactionReceipt(txHash)

    if (!receipt) return 'unknown'

    switch (receipt.status) {
      case 1:
        return 'confirmed'
      case 0:
        return 'failed'
      case null:
      case undefined:
        return 'unknown'
      default:
        assertUnreachable(receipt.status)
    }
  } catch (error) {
    console.error('[HyperEVM] Error getting transaction status:', error)
    return 'unknown'
  }
}
