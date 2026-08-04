import { evm } from '@shapeshiftoss/chain-adapters'

import type { GetUnsignedEvmTransactionArgs } from '../../types'
import { getExecutableTradeStep, isExecutableTradeQuote } from '../../utils'

export const getEvmExecutionContext = async ({
  stepIndex,
  tradeQuote,
  supportsEIP1559,
  assertGetEvmChainAdapter,
}: GetUnsignedEvmTransactionArgs) => {
  if (!isExecutableTradeQuote(tradeQuote)) throw new Error('unable to execute a trade rate')

  const step = getExecutableTradeStep(tradeQuote, stepIndex)

  const { transactionData, sellAsset } = step
  if (transactionData?.type !== 'evm') throw new Error('invalid evm transaction')
  if (!transactionData.gasLimit) throw new Error('missing gas limit in evm transaction')

  const { gasLimit } = transactionData

  const adapter = assertGetEvmChainAdapter(sellAsset.chainId)

  const { average } = await adapter.getGasFeeData()

  const networkFeeCryptoBaseUnit = evm.calcNetworkFeeCryptoBaseUnit({
    ...average,
    supportsEIP1559,
    gasLimit,
  })

  const { gasPrice, maxFeePerGas, maxPriorityFeePerGas } = average

  const feeData: evm.Fees =
    supportsEIP1559 && maxFeePerGas && maxPriorityFeePerGas
      ? { networkFeeCryptoBaseUnit, gasLimit, maxFeePerGas, maxPriorityFeePerGas }
      : { networkFeeCryptoBaseUnit, gasLimit, gasPrice }

  return { step, adapter, transactionData, feeData }
}
