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

  const { solanaTransactionMetadata, sellAsset } = step

  const adapter = assertGetSolanaChainAdapter(sellAsset.chainId)

  const { fast } = await adapter.getFeeData({
    to: '',
    value: '0',
    chainSpecific: {
      from,
      addressLookupTableAccounts: solanaTransactionMetadata?.addressLookupTableAddresses,
      instructions: solanaTransactionMetadata?.instructions,
    },
  })

  return fast.txFee
}
