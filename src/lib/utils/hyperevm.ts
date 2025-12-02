import { hyperEvmChainId } from '@shapeshiftoss/caip'
import type { EvmChainAdapter } from '@shapeshiftoss/chain-adapters'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { JsonRpcProvider } from 'ethers'

export const isHyperEvmChainAdapter = (adapter: unknown): adapter is EvmChainAdapter => {
  if (!adapter) return false

  const maybeAdapter = adapter as EvmChainAdapter
  if (typeof maybeAdapter.getChainId !== 'function') return false

  return maybeAdapter.getChainId() === hyperEvmChainId
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

    if (!receipt) return TxStatus.Unknown

    switch (receipt.status) {
      case 1:
        return TxStatus.Confirmed
      case 0:
        return TxStatus.Failed
      case null:
      case undefined:
        return TxStatus.Unknown
      default:
        return TxStatus.Unknown
    }
  } catch (error) {
    console.error('[HyperEVM] Error getting transaction status:', error)
    return TxStatus.Unknown
  }
}
