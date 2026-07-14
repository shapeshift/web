import type { EvmChainAdapter } from '@shapeshiftoss/chain-adapters'
import { evm } from '@shapeshiftoss/chain-adapters'
import BigNumber from 'bignumber.js'

import type { TxBuildData } from '../../../types'

export const getEvmFeeData = async ({
  transactionData,
  from,
  supportsEIP1559,
  adapter,
}: {
  transactionData: Extract<TxBuildData, { type: 'evm' }>
  from: string
  supportsEIP1559: boolean
  adapter: EvmChainAdapter
}): Promise<evm.Fees> => {
  const { to, value, data, gasLimit } = transactionData

  try {
    const fees = await evm.getFees({ adapter, data, to, value, from, supportsEIP1559 })
    return { ...fees, gasLimit: BigNumber(fees.gasLimit).times('1.2').toFixed(0) }
  } catch (e) {
    if (!gasLimit) throw new Error('[deBridge] gas estimation failed, no fallback available')

    console.error('[deBridge] gas estimation failed, using fallback')

    const { average } = await adapter.getGasFeeData()

    const networkFeeCryptoBaseUnit = evm.calcNetworkFeeCryptoBaseUnit({
      ...average,
      supportsEIP1559,
      gasLimit,
    })

    const { gasPrice, maxFeePerGas, maxPriorityFeePerGas } = average

    if (supportsEIP1559 && maxFeePerGas && maxPriorityFeePerGas) {
      return {
        networkFeeCryptoBaseUnit,
        gasLimit,
        maxFeePerGas,
        maxPriorityFeePerGas,
      }
    }

    return { networkFeeCryptoBaseUnit, gasLimit, gasPrice }
  }
}
