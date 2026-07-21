import { fromChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'

import { getEvmNetworkFeeCryptoBaseUnit } from '../../../evm-utils'
import type { SwapperDeps, TxBuildData } from '../../../types'
import type { DebridgeTx } from './types'

export const getDebridgeStepData = async ({
  tx,
  gasLimit,
  fallbackNetworkFeeCryptoBaseUnit,
  sellAsset,
  from,
  supportsEIP1559,
  quoteOrRate,
  deps,
}: {
  tx: DebridgeTx
  gasLimit: string | undefined
  fallbackNetworkFeeCryptoBaseUnit: string | undefined
  sellAsset: Asset
  from: string
  supportsEIP1559: boolean
  quoteOrRate: 'quote' | 'rate'
  deps: SwapperDeps
}): Promise<{
  transactionData: TxBuildData
  networkFeeCryptoBaseUnit: string | undefined
}> => {
  const transactionData: TxBuildData = {
    type: 'evm',
    chainId: Number(fromChainId(sellAsset.chainId).chainReference),
    to: tx.to,
    data: tx.data,
    value: tx.value,
    gasLimit,
  }

  const networkFeeCryptoBaseUnit = await (async () => {
    try {
      return await getEvmNetworkFeeCryptoBaseUnit({
        adapter: deps.assertGetEvmChainAdapter(sellAsset.chainId),
        transactionData,
        from,
        supportsEIP1559,
        gasLimitBuffer: 1.2,
      })
    } catch (error) {
      // A quote missing a gas limit will throw at execution, so fail it here instead
      if (quoteOrRate === 'quote' && !transactionData.gasLimit) throw error
      return fallbackNetworkFeeCryptoBaseUnit
    }
  })()

  return { transactionData, networkFeeCryptoBaseUnit }
}
