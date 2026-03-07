import type { AssetsByIdPartial } from '@shapeshiftoss/types'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { v4 as uuid } from 'uuid'

import { getDefaultSlippageDecimalPercentageForSwapper } from '../../../constants'
import type {
  GetSolanaTradeRateInput,
  SingleHopTradeRateSteps,
  SwapErrorRight,
  TradeRate,
} from '../../../types'
import { SwapperName, TradeQuoteError } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import { fetchBebopSolanaPrice } from '../utils/fetchFromBebop'
import { assertValidTrade, calculateRate } from '../utils/helpers/helpers'

export async function getBebopSolanaTradeRate(
  input: GetSolanaTradeRateInput,
  _assetsById: AssetsByIdPartial,
  apiKey: string,
): Promise<Result<TradeRate, SwapErrorRight>> {
  const {
    sellAsset,
    buyAsset,
    accountNumber,
    receiveAddress,
    affiliateBps,
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
  } = input

  const assertion = assertValidTrade({ buyAsset, sellAsset })
  if (assertion.isErr()) return Err(assertion.unwrapErr())

  const slippageTolerancePercentageDecimal =
    input.slippageTolerancePercentageDecimal ??
    getDefaultSlippageDecimalPercentageForSwapper(SwapperName.Bebop)

  const maybeBebopPriceResponse = await fetchBebopSolanaPrice({
    buyAsset,
    sellAsset,
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
    receiveAddress,
    affiliateBps,
    apiKey,
  })

  if (maybeBebopPriceResponse.isErr()) return Err(maybeBebopPriceResponse.unwrapErr())
  const bebopPriceResponse = maybeBebopPriceResponse.unwrap()

  const sellTokenAddress = Object.keys(bebopPriceResponse.sellTokens)[0]
  const buyTokenAddress = Object.keys(bebopPriceResponse.buyTokens)[0]

  if (!sellTokenAddress || !buyTokenAddress) {
    return Err(
      makeSwapErrorRight({
        message: 'Invalid token addresses in response',
        code: TradeQuoteError.InvalidResponse,
      }),
    )
  }

  const sellAmount = bebopPriceResponse.sellTokens[sellTokenAddress].amount
  const buyAmount = bebopPriceResponse.buyTokens[buyTokenAddress].amount

  const rate = calculateRate({ buyAmount, sellAmount, buyAsset, sellAsset })

  const buyTokenData = bebopPriceResponse.buyTokens[buyTokenAddress]
  const buyAmountBeforeFeesCryptoBaseUnit = buyTokenData.amountBeforeFee || buyAmount
  const buyAmountAfterFeesCryptoBaseUnit = buyAmount

  const networkFeeCryptoBaseUnit = bebopPriceResponse.gasFee.native

  return Ok({
    id: uuid(),
    quoteOrRate: 'rate' as const,
    accountNumber: undefined,
    receiveAddress,
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
      },
    ] as SingleHopTradeRateSteps,
  })
}
