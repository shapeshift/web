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
  deps,
}: {
  tx: DebridgeTx
  gasLimit: string | undefined
  fallbackNetworkFeeCryptoBaseUnit: string | undefined
  sellAsset: Asset
  from: string
  supportsEIP1559: boolean
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
      })
    } catch {
      return fallbackNetworkFeeCryptoBaseUnit
    }
  })()

  return { transactionData, networkFeeCryptoBaseUnit }
}
