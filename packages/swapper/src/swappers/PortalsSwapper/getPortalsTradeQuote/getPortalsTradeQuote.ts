import { BigNumber, bn } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'

import type { SwapErrorRight, SwapperDeps, TradeQuote } from '../../../types'
import { TradeQuoteError } from '../../../types'
import {
  assertQuoteAddresses,
  makeSwapErrorRight,
  makeTradeStepBuildFailedErr,
} from '../../../utils'
import { getTreasuryAddressFromChainId } from '../../../utils/helpers'
import type { PortalsTradeQuoteInput } from '../types'
import { fetchPortalsTradeOrder, PortalsError } from '../utils/fetchPortalsTradeOrder'
import { getPortalsStepData } from '../utils/getPortalsStepData'
import { getPortalsTradeContext } from '../utils/getPortalsTradeContext'
import { assertValidTrade, getPortalsPercentages, getPortalsTokens } from '../utils/helpers'

export const getPortalsTradeQuote = async (
  input: PortalsTradeQuoteInput,
  deps: SwapperDeps,
): Promise<Result<TradeQuote[], SwapErrorRight>> => {
  const {
    sellAsset,
    buyAsset,
    accountNumber,
    affiliateBps,
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
  } = input

  const assertion = assertValidTrade({ sellAsset, buyAsset })
  if (assertion.isErr()) return Err(assertion.unwrapErr())
  const { sellChainId } = assertion.unwrap()

  const addresses = assertQuoteAddresses(input)
  if (addresses.isErr()) return Err(addresses.unwrapErr())
  const { sendAddress, receiveAddress } = addresses.unwrap()

  const maybeTokens = getPortalsTokens({ sellAsset, buyAsset })
  if (maybeTokens.isErr()) return Err(maybeTokens.unwrapErr())
  const { inputToken, outputToken } = maybeTokens.unwrap()

  const { affiliateBpsPercentage, slippageTolerancePercentage } = getPortalsPercentages({
    affiliateBps,
    slippageTolerancePercentageDecimal: input.slippageTolerancePercentageDecimal,
  })

  const maybePortalsTradeOrderResponse = await fetchPortalsTradeOrder({
    sender: sendAddress,
    inputToken,
    outputToken,
    inputAmount: sellAmountIncludingProtocolFeesCryptoBaseUnit,
    slippageTolerancePercentage,
    partner: getTreasuryAddressFromChainId(sellChainId),
    feePercentage: affiliateBpsPercentage,
    validate: true,
    swapperConfig: deps.config,
  })
    .then(res => Ok(res))
    .catch(async err => {
      if (err instanceof PortalsError) {
        // We assume a PortalsError was thrown because the slippage tolerance was too high during simulation
        // So we attempt another (failing) call with autoslippage which will give us the actual expected slippage
        const portalsExpectedSlippage = await fetchPortalsTradeOrder({
          sender: sendAddress,
          inputToken,
          outputToken,
          inputAmount: sellAmountIncludingProtocolFeesCryptoBaseUnit,
          autoSlippage: true,
          partner: getTreasuryAddressFromChainId(sellChainId),
          feePercentage: affiliateBpsPercentage,
          validate: true,
          swapperConfig: deps.config,
        })
          // This should never happen but could in very rare cases if original call failed on slippage slightly over 2.5% but this one succeeds on slightly under 2.5%
          .then(res => res.context.slippageTolerancePercentage)
          .catch(err => (err as PortalsError).message.match(/Expected slippage is (.*?)%/)?.[1])

        // This should never happen as we don't have auto-slippage on for `/portal` as of now (2024-12-06, see https://github.com/shapeshift/web/pull/8293)
        // But as soon as Portals implement auto-slippage for the estimate endpoint, we will most likely re-enable it, assuming it actually works
        if (err.message.includes('Auto slippage exceeds'))
          return Err(
            makeSwapErrorRight({
              message: err.message,
              details: {
                expectedSlippage: portalsExpectedSlippage
                  ? bn(portalsExpectedSlippage).toFixed(2, BigNumber.ROUND_HALF_UP)
                  : undefined,
              },
              cause: err,
              code: TradeQuoteError.FinalQuoteMaxSlippageExceeded,
            }),
          )
        if (err.message.includes('execution reverted'))
          return Err(
            makeSwapErrorRight({
              message: err.message,
              details: {
                expectedSlippage: portalsExpectedSlippage
                  ? bn(portalsExpectedSlippage).toFixed(2, BigNumber.ROUND_HALF_UP)
                  : undefined,
              },
              cause: err,
              code: TradeQuoteError.FinalQuoteExecutionReverted,
            }),
          )
      }

      // Validation simulates with the sender's live state, so an unapproved sender fails the
      // order outright - refetch without validation and estimate under state override instead
      return fetchPortalsTradeOrder({
        sender: sendAddress,
        inputToken,
        outputToken,
        inputAmount: sellAmountIncludingProtocolFeesCryptoBaseUnit,
        slippageTolerancePercentage,
        partner: getTreasuryAddressFromChainId(sellChainId),
        feePercentage: affiliateBpsPercentage,
        validate: false,
        swapperConfig: deps.config,
      })
        .then(res => Ok(res))
        .catch(() =>
          Err(
            makeSwapErrorRight({
              message: 'failed to get Portals quote',
              cause: err,
              code: TradeQuoteError.NetworkFeeEstimationFailed,
            }),
          ),
        )
    })

  if (maybePortalsTradeOrderResponse.isErr()) return Err(maybePortalsTradeOrderResponse.unwrapErr())
  const { context: orderContext, tx } = maybePortalsTradeOrderResponse.unwrap()

  if (!tx) return Err(makeTradeStepBuildFailedErr('getPortalsTradeQuote'))

  const maybeContext = getPortalsTradeContext({
    input,
    deps,
    sellChainId,
    inputToken,
    orderContext,
    tx,
  })

  if (maybeContext.isErr()) return Err(maybeContext.unwrapErr())
  const { tradeCommon, stepCommon, protocolFees, stepDataArgs } = maybeContext.unwrap()

  const maybeStepData = await getPortalsStepData({
    ...stepDataArgs,
    type: 'quote',
    input,
    from: sendAddress,
  })

  if (maybeStepData.isErr()) return Err(maybeStepData.unwrapErr())
  const { transactionData, networkFeeCryptoBaseUnit } = maybeStepData.unwrap()

  const tradeQuote: TradeQuote = {
    ...tradeCommon,
    quoteOrRate: 'quote' as const,
    receiveAddress,
    steps: [
      {
        ...stepCommon,
        accountNumber,
        transactionData,
        feeData: { networkFeeCryptoBaseUnit, protocolFees },
      },
    ],
  }

  return Ok([tradeQuote])
}
