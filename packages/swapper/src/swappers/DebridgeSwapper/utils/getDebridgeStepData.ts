import { fromChainId } from '@shapeshiftoss/caip'

import { getEvmNetworkFeeCryptoBaseUnit } from '../../../evm-utils'
import type { StepDataArgs, TxBuildData } from '../../../types'
import type { DebridgeTx } from './types'

type BaseArgs = {
  tx: DebridgeTx
  gasLimit: string | undefined
  fallbackNetworkFeeCryptoBaseUnit: string | undefined
}

// Walletless rates estimate from the default sender, so from is always present
type GetDebridgeStepDataArgs = StepDataArgs<BaseArgs, { from: string }>

export const getDebridgeStepData = async ({
  tx,
  gasLimit,
  fallbackNetworkFeeCryptoBaseUnit,
  sellAsset,
  from,
  type,
  input,
  deps,
}: GetDebridgeStepDataArgs): Promise<{
  transactionData?: TxBuildData
  networkFeeCryptoBaseUnit: string | undefined
}> => {
  const supportsEIP1559 = 'supportsEIP1559' in input ? input.supportsEIP1559 : false

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
      // Execution needs the same fee data, so estimation failure fails the quote
      if (type === 'quote') throw error
      return fallbackNetworkFeeCryptoBaseUnit
    }
  })()

  if (type === 'rate') return { networkFeeCryptoBaseUnit }

  return { transactionData, networkFeeCryptoBaseUnit }
}
