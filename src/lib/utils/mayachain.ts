import type { ChainId } from '@shapeshiftoss/caip'
import { mayachainChainId } from '@shapeshiftoss/caip'
import type { mayachain } from '@shapeshiftoss/chain-adapters'
import type { KnownChainIds } from '@shapeshiftoss/types'
import { TxStatus } from '@shapeshiftoss/unchained-client'

import { getConfig } from '@/config'
import { getChainAdapterManager } from '@/context/PluginProvider/chainAdapterSingleton'

export const isMayachainChainAdapter = (
  chainAdapter: unknown,
): chainAdapter is mayachain.SecondClassMayachainAdapter => {
  if (!chainAdapter || typeof chainAdapter !== 'object') return false
  const adapter = chainAdapter as mayachain.SecondClassMayachainAdapter
  if (typeof adapter.getChainId !== 'function') return false
  return adapter.getChainId() === mayachainChainId
}

export const assertGetMayachainChainAdapter = (
  chainId: ChainId | KnownChainIds,
): mayachain.SecondClassMayachainAdapter => {
  const chainAdapterManager = getChainAdapterManager()
  const adapter = chainAdapterManager.get(chainId)

  if (!isMayachainChainAdapter(adapter)) {
    throw Error('invalid chain adapter')
  }

  return adapter
}

export const getMayachainTransactionStatus = async (txHash: string): Promise<TxStatus> => {
  try {
    const nodeUrl = getConfig().VITE_MAYACHAIN_NODE_URL
    const response = await fetch(`${nodeUrl}/cosmos/tx/v1beta1/txs/${txHash}`)

    if (!response.ok) {
      if (response.status === 404) return TxStatus.Pending
      return TxStatus.Unknown
    }

    const data = (await response.json()) as {
      tx_response?: { code: number; txhash: string }
    }

    if (!data.tx_response) return TxStatus.Unknown

    if (data.tx_response.code === 0) return TxStatus.Confirmed
    return TxStatus.Failed
  } catch (error) {
    console.error('Error getting MAYAChain transaction status:', error)
    return TxStatus.Unknown
  }
}
