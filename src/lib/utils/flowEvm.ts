import type { ChainId } from '@shapeshiftoss/caip'
import { flowEvmChainId } from '@shapeshiftoss/caip'
import type { EvmChainAdapter } from '@shapeshiftoss/chain-adapters'
import type { KnownChainIds } from '@shapeshiftoss/types'
import { TxStatus } from '@shapeshiftoss/unchained-client'

import { getConfig } from '@/config'
import { getChainAdapterManager } from '@/context/PluginProvider/chainAdapterSingleton'

export const isFlowEvmChainAdapter = (chainAdapter: unknown): chainAdapter is EvmChainAdapter => {
  if (!chainAdapter) return false

  const maybeAdapter = chainAdapter as EvmChainAdapter
  if (typeof maybeAdapter.getChainId !== 'function') return false

  return maybeAdapter.getChainId() === flowEvmChainId
}

export const assertGetFlowEvmChainAdapter = (chainId: ChainId | KnownChainIds): EvmChainAdapter => {
  const chainAdapterManager = getChainAdapterManager()
  const adapter = chainAdapterManager.get(chainId)

  if (!isFlowEvmChainAdapter(adapter)) {
    throw Error('invalid chain adapter')
  }

  return adapter
}

export const getFlowEvmTransactionStatus = async (txHash: string): Promise<TxStatus> => {
  const rpcUrl = getConfig().VITE_FLOW_EVM_NODE_URL

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
    console.error('Error fetching Flow EVM transaction status:', error)
    return TxStatus.Unknown
  }
}
