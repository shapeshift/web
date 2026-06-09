import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { v4 as uuid } from 'uuid'

import type {
  CommonTradeQuoteInput,
  GetTradeQuoteInput,
  SwapErrorRight,
  SwapperDeps,
  TradeQuote,
} from '../../../types'
import { SwapperName, TradeQuoteError } from '../../../types'
import { getInputOutputRate, makeSwapErrorRight } from '../../../utils'
import {
  assertValidTrade,
  createBobGatewayOrderMetadata,
  getBobGatewayAllowanceContract,
  getBobGatewayQuote,
  getBobGatewayQuoteFeeData,
  parseBobGatewayQuote,
} from '../utils/helpers'

export const getBobGatewayTradeQuote = async (
  input: CommonTradeQuoteInput,
  deps: SwapperDeps,
): Promise<Result<TradeQuote, SwapErrorRight>> => {
  const {
    sellAsset,
    buyAsset,
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
    sendAddress,
    receiveAddress,
    accountNumber,
    affiliateBps,
    slippageTolerancePercentageDecimal,
  } = input

  const { config } = deps

  if (!sendAddress) {
    return Err(
      makeSwapErrorRight({
        message: '[BobGateway] sendAddress is required for quote',
        code: TradeQuoteError.UnknownError,
      }),
    )
  }

  if (!receiveAddress) {
    return Err(
      makeSwapErrorRight({
        message: '[BobGateway] receiveAddress is required for quote',
        code: TradeQuoteError.UnknownError,
      }),
    )
  }

  const assertion = assertValidTrade({ sellAsset, buyAsset })
  if (assertion.isErr()) return Err(assertion.unwrapErr())

  const { sellChainName, buyChainName } = assertion.unwrap()

  const maybeQuote = await getBobGatewayQuote({
    config,
    sellAsset,
    buyAsset,
    sellChainName,
    buyChainName,
    sender: sendAddress,
    recipient: receiveAddress,
    amount: sellAmountIncludingProtocolFeesCryptoBaseUnit,
    affiliateBps,
    slippageTolerancePercentageDecimal,
  })

  if (maybeQuote.isErr()) return Err(maybeQuote.unwrapErr())
  const quote = maybeQuote.unwrap()

  const maybeOrderMetadata = await createBobGatewayOrderMetadata(config, quote)
  if (maybeOrderMetadata.isErr()) return Err(maybeOrderMetadata.unwrapErr())

  const orderMetadata = maybeOrderMetadata.unwrap()

  const maybeFeeData = await getBobGatewayQuoteFeeData(
    input as GetTradeQuoteInput,
    deps,
    orderMetadata,
  )

  if (maybeFeeData.isErr()) return Err(maybeFeeData.unwrapErr())
  const feeData = maybeFeeData.unwrap()

  const {
    buyAmountBeforeFeesCryptoBaseUnit,
    buyAmountAfterFeesCryptoBaseUnit,
    protocolFees,
    estimatedExecutionTimeMs,
  } = parseBobGatewayQuote(quote, buyAsset, deps.assetsById)

  const rate = getInputOutputRate({
    sellAmountCryptoBaseUnit: sellAmountIncludingProtocolFeesCryptoBaseUnit,
    buyAmountCryptoBaseUnit: buyAmountAfterFeesCryptoBaseUnit,
    sellAsset,
    buyAsset,
  })

  const allowanceContract = getBobGatewayAllowanceContract(quote, sellAsset)

  const tradeQuote: TradeQuote = {
    id: uuid(),
    quoteOrRate: 'quote',
    rate,
    receiveAddress,
    affiliateBps,
    slippageTolerancePercentageDecimal,
    swapperName: SwapperName.BobGateway,
    steps: [
      {
        buyAmountBeforeFeesCryptoBaseUnit,
        buyAmountAfterFeesCryptoBaseUnit,
        sellAmountIncludingProtocolFeesCryptoBaseUnit,
        feeData: { ...feeData, protocolFees },
        rate,
        source: SwapperName.BobGateway,
        buyAsset,
        sellAsset,
        accountNumber,
        allowanceContract,
        estimatedExecutionTimeMs,
        bobSpecific: orderMetadata,
      },
    ],
  }

  return Ok(tradeQuote)
}
