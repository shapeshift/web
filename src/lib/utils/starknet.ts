import type { ChainId } from '@shapeshiftoss/caip'
import { starknetChainId } from '@shapeshiftoss/caip'
import type { starknet } from '@shapeshiftoss/chain-adapters'
import type { KnownChainIds } from '@shapeshiftoss/types'
import { TxStatus } from '@shapeshiftoss/unchained-client'

import { getChainAdapterManager } from '@/context/PluginProvider/chainAdapterSingleton'

export const isStarknetChainAdapter = (
  chainAdapter: unknown,
): chainAdapter is starknet.ChainAdapter => {
  if (!chainAdapter || typeof chainAdapter !== 'object') return false
  return (chainAdapter as starknet.ChainAdapter).getChainId() === starknetChainId
}

export const assertGetStarknetChainAdapter = (
  chainId: ChainId | KnownChainIds,
): starknet.ChainAdapter => {
  const chainAdapterManager = getChainAdapterManager()
  const adapter = chainAdapterManager.get(chainId)

  if (!isStarknetChainAdapter(adapter)) {
    throw Error('invalid chain adapter')
  }

  return adapter
}

export const getStarknetTransactionStatus = async (
  txHash: string,
  adapter: starknet.ChainAdapter,
): Promise<TxStatus> => {
  try {
    const provider = adapter.getStarknetProvider()

    const receipt: any = await provider.getTransactionReceipt(txHash)

    if (receipt.execution_status === 'SUCCEEDED') return TxStatus.Confirmed
    if (receipt.execution_status === 'REVERTED') return TxStatus.Failed

    return TxStatus.Unknown
  } catch (error) {
    console.error('Error getting Starknet transaction status:', error)
    return TxStatus.Unknown
  }
}
