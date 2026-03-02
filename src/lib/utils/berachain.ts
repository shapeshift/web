import { berachainChainId } from '@shapeshiftoss/caip'
import type { EvmChainAdapter } from '@shapeshiftoss/chain-adapters'
import { TxStatus } from '@shapeshiftoss/unchained-client'

import { getConfig } from '@/config'

export const isBerachainChainAdapter = (adapter: unknown): adapter is EvmChainAdapter => {
  if (!adapter) return false

  const maybeAdapter = adapter as EvmChainAdapter
  if (typeof maybeAdapter.getChainId !== 'function') return false

  return maybeAdapter.getChainId() === berachainChainId
}

export const getBerachainTransactionStatus = async (txHash: string): Promise<TxStatus> => {
  const rpcUrl = getConfig().VITE_BERACHAIN_NODE_URL

  try {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getTransactionReceipt',
        params: [txHash],
        id: 1,
      }),
    })

    if (!response.ok) return TxStatus.Unknown

    const data = await response.json()
    const receipt = data?.result

    if (!receipt) return TxStatus.Pending

    if (receipt.status === '0x1') return TxStatus.Confirmed
    if (receipt.status === '0x0') return TxStatus.Failed

    return TxStatus.Unknown
  } catch (error) {
    console.error('Error fetching Berachain transaction status:', error)
    return TxStatus.Unknown
  }
}
