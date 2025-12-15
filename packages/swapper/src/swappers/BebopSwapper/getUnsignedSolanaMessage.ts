import type { GetUnsignedSolanaMessageArgs } from '../../types'
import { getExecutableTradeStep, isExecutableTradeQuote } from '../../utils'

export const getUnsignedSolanaMessage = async ({
  tradeQuote,
  stepIndex,
}: GetUnsignedSolanaMessageArgs) => {
  if (!isExecutableTradeQuote(tradeQuote)) {
    throw new Error('Unable to execute a trade rate quote')
  }

  const step = getExecutableTradeStep(tradeQuote, stepIndex)
  const { bebopSolanaSerializedTx, bebopQuoteId } = step

  if (!bebopSolanaSerializedTx) {
    throw new Error('Missing Bebop Solana serialized transaction')
  }

  if (!bebopQuoteId) {
    throw new Error('Missing Bebop quote ID for Solana order submission')
  }

  // Return the unsigned message bytes for signing and the quote ID for order submission
  return {
    messageToSign: bebopSolanaSerializedTx,
    quoteId: bebopQuoteId,
  }
}