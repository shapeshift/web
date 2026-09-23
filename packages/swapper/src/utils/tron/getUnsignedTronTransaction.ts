import { contractAddressOrUndefined } from '@shapeshiftoss/utils'

import type { GetUnsignedTronTransactionArgs } from '../../types'
import { getExecutableTradeStep, isExecutableTradeQuote } from '../../utils'

export const getUnsignedTronTransaction = ({
  stepIndex,
  tradeQuote,
  from,
  assertGetTronChainAdapter,
}: GetUnsignedTronTransactionArgs) => {
  if (!isExecutableTradeQuote(tradeQuote)) throw new Error('Unable to execute a trade rate')

  const step = getExecutableTradeStep(tradeQuote, stepIndex)
  const { accountNumber, sellAsset, transactionData } = step

  if (transactionData?.type !== 'tron') throw new Error('Missing tron transactionData')

  const adapter = assertGetTronChainAdapter(sellAsset.chainId)
  const { to, value, data, memo } = transactionData

  if (data) return adapter.buildCustomApiTx({ from, to, accountNumber, data, value })

  return adapter.buildSendApiTransaction({
    from,
    to,
    accountNumber,
    value,
    chainSpecific: { contractAddress: contractAddressOrUndefined(sellAsset.assetId), memo },
  })
}
