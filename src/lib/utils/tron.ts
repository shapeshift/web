import type { ChainId } from '@shapeshiftoss/caip'
import { tronChainId } from '@shapeshiftoss/caip'
import type { tron } from '@shapeshiftoss/chain-adapters'
import type { KnownChainIds } from '@shapeshiftoss/types'
import { TxStatus } from '@shapeshiftoss/unchained-client'

import { getChainAdapterManager } from '@/context/PluginProvider/chainAdapterSingleton'

export const isTronChainAdapter = (chainAdapter: unknown): chainAdapter is tron.ChainAdapter => {
  if (!chainAdapter) return false

  const maybeAdapter = chainAdapter as tron.ChainAdapter
  if (typeof maybeAdapter.getChainId !== 'function') return false

  return maybeAdapter.getChainId() === tronChainId
}

export const assertGetTronChainAdapter = (chainId: ChainId | KnownChainIds): tron.ChainAdapter => {
  const chainAdapterManager = getChainAdapterManager()
  const adapter = chainAdapterManager.get(chainId)

  if (!isTronChainAdapter(adapter)) {
    throw Error('invalid chain adapter')
  }

  return adapter
}

export const getTronTransactionStatus = async (txHash: string): Promise<TxStatus> => {
  const adapter = assertGetTronChainAdapter(tronChainId)
  const rpcUrl = adapter.httpProvider.getRpcUrl()

  const response = await fetch(`${rpcUrl}/walletsolidity/gettransactionbyid`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      value: txHash,
    }),
  })

  if (!response.ok) return TxStatus.Unknown

  const txData = await response.json()
  const contractRet = txData?.ret?.[0]?.contractRet

  if (contractRet === 'OUT_OF_ENERGY') return TxStatus.Failed
  if (!contractRet) return TxStatus.Unknown

  return TxStatus.Confirmed
}
