import type { ChainId } from '@shapeshiftoss/caip'
import { aptosChainId } from '@shapeshiftoss/caip'
import { aptos } from '@shapeshiftoss/chain-adapters'
import type { KnownChainIds } from '@shapeshiftoss/types'
import { TxStatus } from '@shapeshiftoss/unchained-client'

import { getChainAdapterManager } from '@/context/PluginProvider/chainAdapterSingleton'

export const isAptosChainAdapter = (chainAdapter: unknown): chainAdapter is aptos.ChainAdapter => {
  if (!chainAdapter || typeof chainAdapter !== 'object') return false
  return (chainAdapter as aptos.ChainAdapter).getChainId() === aptosChainId
}

export const assertGetAptosChainAdapter = (
  chainId: ChainId | KnownChainIds,
): aptos.ChainAdapter => {
  const chainAdapterManager = getChainAdapterManager()
  const adapter = chainAdapterManager.get(chainId)

  if (!isAptosChainAdapter(adapter)) throw Error('invalid chain adapter')

  return adapter
}

export const getAptosTransactionStatus = async (txHash: string): Promise<TxStatus> => {
  try {
    const client = assertGetAptosChainAdapter(aptosChainId).getAptosClient()

    const tx = await client.transaction.getTransactionByHash({ transactionHash: txHash })

    return aptos.getAptosTxStatus(tx)
  } catch (error) {
    console.error('Error getting Aptos transaction status:', error)
    return TxStatus.Unknown
  }
}
