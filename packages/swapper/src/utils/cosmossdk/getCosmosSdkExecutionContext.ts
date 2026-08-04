import type { GetUnsignedCosmosSdkTransactionArgs } from '../../types'
import { getExecutableTradeStep, isExecutableTradeQuote } from '../../utils'

export const getCosmosSdkExecutionContext = async ({
  stepIndex,
  tradeQuote,
  assertGetCosmosSdkChainAdapter,
}: GetUnsignedCosmosSdkTransactionArgs) => {
  if (!isExecutableTradeQuote(tradeQuote)) throw new Error('unable to execute a trade rate')

  const step = getExecutableTradeStep(tradeQuote, stepIndex)

  const { transactionData, sellAsset } = step
  if (
    transactionData?.type !== 'cosmossdk_msg_send' &&
    transactionData?.type !== 'cosmossdk_msg_deposit'
  ) {
    throw new Error('invalid cosmossdk transaction')
  }

  const adapter = assertGetCosmosSdkChainAdapter(sellAsset.chainId)

  const { fast } = await adapter.getFeeData({})

  return { step, adapter, transactionData, feeData: fast }
}
