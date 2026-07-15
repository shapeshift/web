import type { GetUnsignedSolanaTransactionArgs } from '../types'
import { getExecutableTradeStep, isExecutableTradeQuote } from '../utils'

export const getSolanaExecutionContext = async ({
  stepIndex,
  tradeQuote,
  from,
  assertGetSolanaChainAdapter,
}: GetUnsignedSolanaTransactionArgs) => {
  if (!isExecutableTradeQuote(tradeQuote)) throw new Error('unable to execute a trade rate')

  const step = getExecutableTradeStep(tradeQuote, stepIndex)

  const { transactionData, sellAsset } = step
  if (transactionData?.type !== 'solana') throw new Error('invalid solana transaction')

  const adapter = assertGetSolanaChainAdapter(sellAsset.chainId)

  const { fast: feeData } = await adapter.getFeeData({
    to: '',
    value: '0',
    chainSpecific: {
      from,
      addressLookupTableAccounts: transactionData.addressLookupTableAddresses,
      instructions: transactionData.instructions,
    },
  })

  return { step, adapter, feeData, transactionData }
}
