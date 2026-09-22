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

// A missing contractRet means the tx isn't mined yet; any non-SUCCESS value is a terminal failure
export const getTronTransactionStatus = async (txHash: string): Promise<TxStatus> => {
  const adapter = assertGetTronChainAdapter(tronChainId)
  const tx = await adapter.httpProvider.getTransaction({ txid: txHash })

  if (!tx) return TxStatus.Unknown

  const contractRet = tx.ret?.[0]?.contractRet

  if (!contractRet) return TxStatus.Pending
  if (contractRet === 'SUCCESS') return TxStatus.Confirmed

  return TxStatus.Failed
}

const TRON_TX_POLL_INTERVAL_MS = 1_000

// Resolves once the tx is mined and throws if it failed; gives up silently after the timeout since
// the tx may still land
export const waitForTronTransaction = async (txHash: string, timeoutMs = 60_000): Promise<void> => {
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    const status = await (async () => {
      try {
        return await getTronTransactionStatus(txHash)
      } catch {
        // Transient node errors (incl. TronGrid throttling) keep polling
        return TxStatus.Unknown
      }
    })()

    if (status === TxStatus.Confirmed) return
    if (status === TxStatus.Failed) throw new Error(`Tron transaction failed: ${txHash}`)

    await new Promise(resolve => setTimeout(resolve, TRON_TX_POLL_INTERVAL_MS))
  }
}
