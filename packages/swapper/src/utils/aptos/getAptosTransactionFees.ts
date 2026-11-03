import type { GetUnsignedAptosTransactionArgs } from '../../types'
import { getExecutableTradeStep, isExecutableTradeQuote } from '../../utils'

export const getAptosTransactionFees = ({
  tradeQuote,
  stepIndex,
}: Pick<GetUnsignedAptosTransactionArgs, 'tradeQuote' | 'stepIndex'>): Promise<string> => {
  if (!isExecutableTradeQuote(tradeQuote)) throw new Error('Unable to execute a trade rate quote')

  const step = getExecutableTradeStep(tradeQuote, stepIndex)
  if (!step.feeData.networkFeeCryptoBaseUnit) throw new Error('Missing network fee in quote')

  return Promise.resolve(step.feeData.networkFeeCryptoBaseUnit)
}
