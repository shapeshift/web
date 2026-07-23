import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { v4 as uuid } from 'uuid'
import type { Address } from 'viem'
import { isAddress } from 'viem'

import { getDefaultSlippageDecimalPercentageForSwapper } from '../../../constants'
import type {
  GetEvmTradeQuoteInputBase,
  SwapErrorRight,
  SwapperDeps,
  TradeQuote,
} from '../../../types'
import { SwapperName, TradeQuoteError } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import { buildAffiliateFee } from '../../utils/affiliateFee'
import { isNativeEvmAsset } from '../../utils/helpers/helpers'
import { BEBOP_DUMMY_ADDRESS } from '../types'
import { fetchBebopQuote } from '../utils/fetchFromBebop'
import { getBebopStepData } from '../utils/getBebopStepData'
import { assertValidTrade, calculateRate } from '../utils/helpers/helpers'

export async function getBebopTradeQuote(
  input: GetEvmTradeQuoteInputBase,
  deps: SwapperDeps,
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

  const takerAddress = (sendAddress || receiveAddress) as Address

  if (takerAddress === BEBOP_DUMMY_ADDRESS) {
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

  const maybeBebopQuoteResponse = await fetchBebopQuote({
    buyAsset,
    sellAsset,
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
    takerAddress,
    receiverAddress: receiveAddress as Address,
    slippageTolerancePercentageDecimal,
    affiliateBps,
    apiKey: deps.config.VITE_BEBOP_API_KEY,
  })

  if (maybeBebopQuoteResponse.isErr()) return Err(maybeBebopQuoteResponse.unwrapErr())
  const quote = maybeBebopQuoteResponse.unwrap()

  const sellTokenAddress = Object.keys(quote.sellTokens)[0]
  const buyTokenAddress = Object.keys(quote.buyTokens)[0]

  if (!isAddress(sellTokenAddress) || !isAddress(buyTokenAddress)) {
    return Err(
      makeSwapErrorRight({
        message: 'Invalid token addresses in response',
        code: TradeQuoteError.InvalidResponse,
      }),
    )
  }

  const sellAmount = quote.sellTokens[sellTokenAddress].amount
  const buyAmount = quote.buyTokens[buyTokenAddress].amount

  const rate = calculateRate({ buyAmount, sellAmount, buyAsset, sellAsset })

  const buyTokenData = quote.buyTokens[buyTokenAddress]
  const buyAmountBeforeFeesCryptoBaseUnit = buyTokenData.amountBeforeFee || buyAmount
  const buyAmountAfterFeesCryptoBaseUnit = buyAmount

  try {
    const { transactionData, networkFeeCryptoBaseUnit } = await getBebopStepData({
      type: 'quote',
      input,
      tx: quote.tx,
      sellAsset,
      from: takerAddress,
      deps,
    })

    const tradeQuote: TradeQuote = {
      id: uuid(),
      quoteOrRate: 'quote',
      receiveAddress,
      affiliateBps,
      slippageTolerancePercentageDecimal,
      rate,
      swapperName: SwapperName.Bebop,
      steps: [
        {
          estimatedExecutionTimeMs: 0,
          allowanceContract: isNativeEvmAsset(sellAsset.assetId) ? '' : quote.approvalTarget,
          buyAsset,
          sellAsset,
          accountNumber,
          rate,
          feeData: {
            protocolFees: {}, // Bebop doesn't charge protocol fees
            networkFeeCryptoBaseUnit,
          },
          buyAmountBeforeFeesCryptoBaseUnit,
          buyAmountAfterFeesCryptoBaseUnit,
          sellAmountIncludingProtocolFeesCryptoBaseUnit,
          source: SwapperName.Bebop,
          transactionData,
          affiliateFee: buildAffiliateFee({
            strategy: 'buy_asset',
            affiliateBps,
            sellAsset,
            buyAsset,
            sellAmountCryptoBaseUnit: sellAmountIncludingProtocolFeesCryptoBaseUnit,
            buyAmountCryptoBaseUnit: buyAmountAfterFeesCryptoBaseUnit,
            isEstimate: true,
          }),
        },
      ],
    }

    return Ok(tradeQuote)
  } catch (err) {
    return Err(
      makeSwapErrorRight({
        message: 'Failed to get fee data',
        cause: err,
        code: TradeQuoteError.NetworkFeeEstimationFailed,
      }),
    )
  }
}
