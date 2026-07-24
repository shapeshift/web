import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'

import type {
  GetSolanaTradeQuoteInput,
  SwapErrorRight,
  SwapperDeps,
  TradeQuote,
} from '../../../types'
import { TradeQuoteError } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import { getBebopSolanaTradeContext } from '../utils/getBebopSolanaTradeContext'
import { isBebopSolanaTxSafe } from '../utils/helpers'

export const getBebopSolanaTradeQuote = async (
  input: GetSolanaTradeQuoteInput,
  deps: SwapperDeps,
): Promise<Result<TradeQuote[], SwapErrorRight>> => {
  const { sendAddress, receiveAddress, accountNumber } = input

  if (!sendAddress) {
    return Err(
      makeSwapErrorRight({
        message: '[getBebopSolanaTradeQuote] sendAddress is required',
        code: TradeQuoteError.UnknownError,
      }),
    )
  }

  if (!receiveAddress) {
    return Err(
      makeSwapErrorRight({
        message: '[getBebopSolanaTradeQuote] receiveAddress is required',
        code: TradeQuoteError.UnknownError,
      }),
    )
  }

  const maybeContext = await getBebopSolanaTradeContext({
    input,
    deps,
    takerAddress: sendAddress,
    receiverAddress: receiveAddress,
  })

  if (maybeContext.isErr()) return Err(maybeContext.unwrapErr())
  const { tradeCommon, stepCommon, response } = maybeContext.unwrap()

  if (!isBebopSolanaTxSafe(response.solana_tx, sendAddress)) {
    return Err(
      makeSwapErrorRight({
        message: 'Bebop signer index mismatch - taker not at expected position',
        code: TradeQuoteError.NoRouteFound,
      }),
    )
  }

  const tradeQuote: TradeQuote = {
    ...tradeCommon,
    quoteOrRate: 'quote',
    receiveAddress,
    steps: [
      {
        ...stepCommon,
        accountNumber,
        // Bebop Solana is gasless - Bebop pays the network fees via co-signing
        feeData: { protocolFees: {}, networkFeeCryptoBaseUnit: '0' },
        bebopSolanaSerializedTx: response.solana_tx,
        swapperMetadata: { name: 'bebop', quoteId: response.quoteId },
      },
    ],
  }

  return Ok([tradeQuote])
}
