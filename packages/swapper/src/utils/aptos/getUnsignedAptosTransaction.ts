import { contractAddressOrUndefined } from '@shapeshiftoss/utils'

import type { GetUnsignedAptosTransactionArgs } from '../../types'
import { getExecutableTradeStep, isExecutableTradeQuote } from '../../utils'

export const getUnsignedAptosTransaction = ({
  stepIndex,
  tradeQuote,
  from,
  assertGetAptosChainAdapter,
}: GetUnsignedAptosTransactionArgs) => {
  if (!isExecutableTradeQuote(tradeQuote)) throw new Error('Unable to execute a trade rate')

  const step = getExecutableTradeStep(tradeQuote, stepIndex)
  const { accountNumber, sellAsset, transactionData } = step

  if (transactionData?.type !== 'aptos') throw new Error('Missing aptos transactionData')

  const adapter = assertGetAptosChainAdapter(sellAsset.chainId)
  const { to, value, gasUnitPrice, maxGasAmount } = transactionData

  return adapter.buildSendApiTransaction({
    from,
    to,
    accountNumber,
    value,
    chainSpecific: {
      contractAddress: contractAddressOrUndefined(sellAsset.assetId),
      gasUnitPrice,
      maxGasAmount,
    },
  })
}
