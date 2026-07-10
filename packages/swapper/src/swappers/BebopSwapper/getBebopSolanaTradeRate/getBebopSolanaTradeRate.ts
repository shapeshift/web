import type { AssetsByIdPartial } from '@shapeshiftoss/types'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { v4 as uuid } from 'uuid'

import { getDefaultSlippageDecimalPercentageForSwapper } from '../../../constants'
import type { GetSolanaTradeRateInput, SwapErrorRight, TradeRate } from '../../../types'
import { SwapperName, TradeQuoteError } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import { BEBOP_SOLANA_DUMMY_ADDRESS } from '../types'
import { fetchBebopSolanaQuote } from '../utils/fetchFromBebop'
import { assertValidTrade, calculateRate, isBebopSolanaTxSafe } from '../utils/helpers/helpers'

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

  const address = receiveAddress ?? BEBOP_SOLANA_DUMMY_ADDRESS

  const maybeBebopQuoteResponse = await fetchBebopSolanaQuote({
    buyAsset,
    sellAsset,
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
    takerAddress: address,
    receiverAddress: address,
    slippageTolerancePercentageDecimal,
    affiliateBps,
    apiKey,
  })

  if (maybeBebopQuoteResponse.isErr()) return Err(maybeBebopQuoteResponse.unwrapErr())
  const bebopPriceResponse = maybeBebopQuoteResponse.unwrap()

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

  if (bebopPriceResponse.solana_tx) {
    if (!receiveAddress) {
      return Err(
        makeSwapErrorRight({
          message: 'Cannot validate Bebop Solana tx without a taker address',
          code: TradeQuoteError.NoRouteFound,
        }),
      )
    }
    if (!isBebopSolanaTxSafe(bebopPriceResponse.solana_tx, receiveAddress)) {
      return Err(
        makeSwapErrorRight({
          message: 'Bebop signer index mismatch - taker not at expected position',
          code: TradeQuoteError.NoRouteFound,
        }),
      )
    }
  }

  const sellAmount = bebopPriceResponse.sellTokens[sellTokenAddress].amount
  const buyAmount = bebopPriceResponse.buyTokens[buyTokenAddress].amount

  const rate = calculateRate({ buyAmount, sellAmount, buyAsset, sellAsset })

  const buyTokenData = bebopPriceResponse.buyTokens[buyTokenAddress]
  const buyAmountBeforeFeesCryptoBaseUnit = buyTokenData.amountBeforeFee || buyAmount
  const buyAmountAfterFeesCryptoBaseUnit = buyAmount

  const tradeRate: TradeRate = {
    id: uuid(),
    quoteOrRate: 'rate',
    receiveAddress,
    affiliateBps,
    slippageTolerancePercentageDecimal,
    rate,
    swapperName: SwapperName.Bebop,
    steps: [
      {
        estimatedExecutionTimeMs: 0,
        allowanceContract: '',
        buyAsset,
        sellAsset,
        accountNumber,
        rate,
        feeData: {
          protocolFees: {},
          networkFeeCryptoBaseUnit: '0', // Bebop Solana is gasless - Bebop pays the network fees via co-signing
        },
        buyAmountBeforeFeesCryptoBaseUnit,
        buyAmountAfterFeesCryptoBaseUnit,
        sellAmountIncludingProtocolFeesCryptoBaseUnit,
        source: SwapperName.Bebop,
      },
    ],
  }

  return Ok(tradeRate)
}
