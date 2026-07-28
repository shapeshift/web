import type { GetUnsignedSolanaTransactionArgs } from '../../types'
import { getExecutableTradeStep, isExecutableTradeQuote } from '../../utils'

export const getSolanaExecutionContext = ({
  stepIndex,
  tradeQuote,
  assertGetSolanaChainAdapter,
}: GetUnsignedSolanaTransactionArgs) => {
  if (!isExecutableTradeQuote(tradeQuote)) throw new Error('unable to execute a trade rate')

  const step = getExecutableTradeStep(tradeQuote, stepIndex)

  const { transactionData, sellAsset } = step
  if (transactionData?.type !== 'solana_instructions') throw new Error('invalid solana transaction')

  const adapter = assertGetSolanaChainAdapter(sellAsset.chainId)

  return { step, adapter, transactionData }
}
