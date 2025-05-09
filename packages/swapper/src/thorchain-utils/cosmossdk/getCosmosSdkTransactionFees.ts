import type { GetUnsignedCosmosSdkTransactionArgs } from '../../types'
import { getExecutableTradeStep, isExecutableTradeQuote } from '../../utils'

export const getCosmosSdkTransactionFees = async ({
  stepIndex,
  tradeQuote,
  assertGetCosmosSdkChainAdapter,
}: GetUnsignedCosmosSdkTransactionArgs): Promise<string> => {
  if (!isExecutableTradeQuote(tradeQuote)) throw new Error('Unable to execute trade')

  const step = getExecutableTradeStep(tradeQuote, stepIndex)

  const { sellAsset } = step

  const adapter = assertGetCosmosSdkChainAdapter(sellAsset.chainId)

  const { fast } = await adapter.getFeeData({})

  return fast.txFee
}
