import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { v4 as uuid } from 'uuid'

import type {
  QuoteFeeData,
  SwapErrorRight,
  SwapperDeps,
  TradeCommon,
  TradeStepCommon,
} from '../../../types'
import { SwapperName } from '../../../types'
import { getInputOutputRate } from '../../../utils'
import type { BobGatewayTradeQuoteInput, BobGatewayTradeRateInput } from '../types'
import type { GetBobGatewayStepDataArgs } from './getBobGatewayStepData'
import {
  assertValidTrade,
  getBobGatewayAllowanceContract,
  getBobGatewayQuote,
  parseBobGatewayQuote,
} from './helpers'

type BobGatewayTradeContext = {
  tradeCommon: TradeCommon
  stepCommon: Omit<TradeStepCommon, 'feeData'>
  protocolFees: QuoteFeeData['protocolFees']
  stepDataArgs: Omit<GetBobGatewayStepDataArgs, 'type' | 'input' | 'from'>
}

export const getBobGatewayTradeContext = async ({
  input,
  deps,
  sender,
  recipient,
}: {
  input: BobGatewayTradeQuoteInput | BobGatewayTradeRateInput
  deps: SwapperDeps
  sender: string | undefined
  recipient: string
}): Promise<Result<BobGatewayTradeContext, SwapErrorRight>> => {
  const {
    sellAsset,
    buyAsset,
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
    affiliateBps,
    slippageTolerancePercentageDecimal,
  } = input

  const assertion = assertValidTrade({ sellAsset, buyAsset })

  if (assertion.isErr()) return Err(assertion.unwrapErr())
  const { sellChainName, buyChainName } = assertion.unwrap()

  const maybeQuote = await getBobGatewayQuote({
    config: deps.config,
    sellAsset,
    buyAsset,
    sellChainName,
    buyChainName,
    sender,
    recipient,
    amount: sellAmountIncludingProtocolFeesCryptoBaseUnit,
    affiliateBps,
    slippageTolerancePercentageDecimal,
  })

  if (maybeQuote.isErr()) return Err(maybeQuote.unwrapErr())
  const quote = maybeQuote.unwrap()

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

  return Ok({
    tradeCommon: {
      id: uuid(),
      rate,
      affiliateBps,
      slippageTolerancePercentageDecimal,
      swapperName: SwapperName.BobGateway,
    },
    stepCommon: {
      buyAmountBeforeFeesCryptoBaseUnit,
      buyAmountAfterFeesCryptoBaseUnit,
      sellAmountIncludingProtocolFeesCryptoBaseUnit,
      rate,
      source: SwapperName.BobGateway,
      buyAsset,
      sellAsset,
      allowanceContract,
      estimatedExecutionTimeMs,
    },
    protocolFees,
    stepDataArgs: {
      quote,
      sellAmountCryptoBaseUnit: sellAmountIncludingProtocolFeesCryptoBaseUnit,
      sellAsset,
      deps,
    },
  })
}
