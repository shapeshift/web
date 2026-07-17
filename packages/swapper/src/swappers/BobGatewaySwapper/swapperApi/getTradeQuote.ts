import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
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
import { getBobGatewayStepData } from '../utils/getBobGatewayStepData'
import {
  assertValidTrade,
  getBobGatewayAllowanceContract,
  getBobGatewayQuote,
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

  // omit the sender for utxo sells so order creation does not enforce a per-address confirmed
  // funds check (deposits are matched via op_return, not the sending address)
  const sender = isEvmChainId(sellAsset.chainId) ? sendAddress : undefined

  const maybeQuote = await getBobGatewayQuote({
    config,
    sellAsset,
    buyAsset,
    sellChainName,
    buyChainName,
    sender,
    recipient: receiveAddress,
    amount: sellAmountIncludingProtocolFeesCryptoBaseUnit,
    affiliateBps,
    slippageTolerancePercentageDecimal,
  })

  if (maybeQuote.isErr()) return Err(maybeQuote.unwrapErr())
  const quote = maybeQuote.unwrap()

  const maybeStepData = await getBobGatewayStepData({
    input: input as GetTradeQuoteInput,
    deps,
    quote,
    sellAsset,
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
  })
  if (maybeStepData.isErr()) return Err(maybeStepData.unwrapErr())

  const { orderId, transactionData, feeData } = maybeStepData.unwrap()

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
        swapperMetadata: { name: 'bob', orderId },
        transactionData,
      },
    ],
  }

  return Ok(tradeQuote)
}
