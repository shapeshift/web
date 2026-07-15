import type { GetUnsignedSolanaTransactionArgs } from '../types'
import { getExecutableTradeStep, isExecutableTradeQuote } from '../utils'

export const getSolanaTransactionFees = async ({
  stepIndex,
  tradeQuote,
  from,
  assertGetSolanaChainAdapter,
}: GetUnsignedSolanaTransactionArgs): Promise<string> => {
  if (!isExecutableTradeQuote(tradeQuote)) throw new Error('Unable to execute a trade rate quote')

  const step = getExecutableTradeStep(tradeQuote, stepIndex)

  const { transactionData, sellAsset } = step
  if (transactionData?.type !== 'solana') throw new Error('Missing solana transactionData')

  const adapter = assertGetSolanaChainAdapter(sellAsset.chainId)

  const { fast } = await adapter.getFeeData({
    to: '',
    value: '0',
    chainSpecific: {
      from,
      addressLookupTableAccounts: transactionData.addressLookupTableAddresses,
      instructions: transactionData.instructions,
    },
  })

  return fast.txFee
}
