import type { AssetsByIdPartial } from '@shapeshiftoss/types'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { v4 as uuid } from 'uuid'

import { getDefaultSlippageDecimalPercentageForSwapper } from '../../../constants'
import type {
  GetSolanaTradeQuoteInput,
  SingleHopTradeQuoteSteps,
  SwapErrorRight,
  TradeQuote,
} from '../../../types'
import { SwapperName, TradeQuoteError } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import { BEBOP_SOLANA_DUMMY_ADDRESS } from '../types'
import { fetchBebopSolanaQuote } from '../utils/fetchFromBebop'
import { assertValidTrade, calculateRate } from '../utils/helpers/helpers'

export async function getBebopSolanaTradeQuote(
  input: GetSolanaTradeQuoteInput,
  _assetsById: AssetsByIdPartial,
  apiKey: string,
): Promise<Result<TradeQuote, SwapErrorRight>> {
  const {
    sellAsset,
    buyAsset,
    accountNumber,
    sendAddress,
    receiveAddress,
    affiliateBps,
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
  } = input

  const assertion = assertValidTrade({ buyAsset, sellAsset })
  if (assertion.isErr()) return Err(assertion.unwrapErr())

  const takerAddress = sendAddress || receiveAddress

  if (!takerAddress || takerAddress === BEBOP_SOLANA_DUMMY_ADDRESS) {
    return Err(
      makeSwapErrorRight({
        message: 'Cannot execute quote with dummy address - wallet required',
        code: TradeQuoteError.UnknownError,
      }),
    )
  }

  const slippageTolerancePercentageDecimal =
    input.slippageTolerancePercentageDecimal ??
    getDefaultSlippageDecimalPercentageForSwapper(SwapperName.Bebop)

  const maybeBebopQuoteResponse = await fetchBebopSolanaQuote({
    buyAsset,
    sellAsset,
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
    takerAddress,
    receiverAddress: receiveAddress ?? takerAddress,
    slippageTolerancePercentageDecimal,
    affiliateBps,
    apiKey,
  })

  if (maybeBebopQuoteResponse.isErr()) return Err(maybeBebopQuoteResponse.unwrapErr())
  const bebopQuoteResponse = maybeBebopQuoteResponse.unwrap()

  const sellTokenAddress = Object.keys(bebopQuoteResponse.sellTokens)[0]
  const buyTokenAddress = Object.keys(bebopQuoteResponse.buyTokens)[0]

  if (!sellTokenAddress || !buyTokenAddress) {
    return Err(
      makeSwapErrorRight({
        message: 'Invalid token addresses in response',
        code: TradeQuoteError.InvalidResponse,
      }),
    )
  }

  const sellAmount = bebopQuoteResponse.sellTokens[sellTokenAddress].amount
  const buyAmount = bebopQuoteResponse.buyTokens[buyTokenAddress].amount

  const rate = calculateRate({ buyAmount, sellAmount, buyAsset, sellAsset })

  const buyTokenData = bebopQuoteResponse.buyTokens[buyTokenAddress]
  const buyAmountBeforeFeesCryptoBaseUnit = buyTokenData.amountBeforeFee || buyAmount
  const buyAmountAfterFeesCryptoBaseUnit = buyAmount

  const networkFeeCryptoBaseUnit = bebopQuoteResponse.gasFee.native

  return Ok({
    id: uuid(),
    quoteOrRate: 'quote' as const,
    receiveAddress: receiveAddress ?? takerAddress,
    affiliateBps,
    slippageTolerancePercentageDecimal,
    rate,
    swapperName: SwapperName.Bebop,
    steps: [
      {
        estimatedExecutionTimeMs: 0,
        allowanceContract: '0x0',
        buyAsset,
        sellAsset,
        accountNumber,
        rate,
        feeData: {
          protocolFees: {},
          networkFeeCryptoBaseUnit,
        },
        buyAmountBeforeFeesCryptoBaseUnit,
        buyAmountAfterFeesCryptoBaseUnit,
        sellAmountIncludingProtocolFeesCryptoBaseUnit,
        source: SwapperName.Bebop,
        bebopSolanaSerializedTx: bebopQuoteResponse.solana_tx,
        bebopQuoteId: bebopQuoteResponse.quoteId,
      },
    ] as SingleHopTradeQuoteSteps,
  })
}
