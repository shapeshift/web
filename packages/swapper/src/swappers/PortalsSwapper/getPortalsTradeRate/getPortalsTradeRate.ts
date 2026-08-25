import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'

import type { SwapErrorRight, SwapperDeps, TradeRate } from '../../../types'
import { makeNetworkFeeEstimationFailedErr, makeTradeStepBuildFailedErr } from '../../../utils'
import { getTreasuryAddressFromChainId } from '../../../utils/helpers'
import { PORTALS_RATE_DEFAULT_ADDRESS } from '../constants'
import type { PortalsTradeRateInput } from '../types'
import { fetchPortalsTradeOrder } from '../utils/fetchPortalsTradeOrder'
import { getPortalsStepData } from '../utils/getPortalsStepData'
import { getPortalsTradeContext } from '../utils/getPortalsTradeContext'
import { assertValidTrade, getPortalsPercentages, getPortalsTokens } from '../utils/helpers'

export const getPortalsTradeRate = async (
  input: PortalsTradeRateInput,
  deps: SwapperDeps,
): Promise<Result<TradeRate[], SwapErrorRight>> => {
  const {
    accountNumber,
    sellAsset,
    buyAsset,
    affiliateBps,
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
    receiveAddress,
  } = input

  const assertion = assertValidTrade({ sellAsset, buyAsset })
  if (assertion.isErr()) return Err(assertion.unwrapErr())
  const { sellChainId } = assertion.unwrap()

  const maybeTokens = getPortalsTokens({ sellAsset, buyAsset })
  if (maybeTokens.isErr()) return Err(maybeTokens.unwrapErr())
  const { inputToken, outputToken } = maybeTokens.unwrap()

  const { affiliateBpsPercentage, slippageTolerancePercentage } = getPortalsPercentages({
    affiliateBps,
    slippageTolerancePercentageDecimal: input.slippageTolerancePercentageDecimal,
  })

  // Walletless rate: full /portal endpoint (validate off) with a realistic stand-in sender so Portals
  // prices and estimation can simulate gas
  const maybeOrder = await fetchPortalsTradeOrder({
    sender: PORTALS_RATE_DEFAULT_ADDRESS,
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
    .catch(err => Err(makeNetworkFeeEstimationFailedErr('getPortalsTradeRate', err)))

  if (maybeOrder.isErr()) return Err(maybeOrder.unwrapErr())
  const { context: orderContext, tx } = maybeOrder.unwrap()

  if (!tx) return Err(makeTradeStepBuildFailedErr('getPortalsTradeRate'))

  const maybeContext = getPortalsTradeContext({
    input,
    deps,
    sellChainId,
    orderContext,
    outputToken,
    slippageTolerancePercentage,
    tx,
  })

  if (maybeContext.isErr()) return Err(maybeContext.unwrapErr())
  const { tradeCommon, stepCommon, protocolFees, stepDataArgs } = maybeContext.unwrap()

  const maybeStepData = await getPortalsStepData({
    ...stepDataArgs,
    type: 'rate',
    input,
    inputToken,
    outputToken,
    inputAmount: sellAmountIncludingProtocolFeesCryptoBaseUnit,
    slippageTolerancePercentage,
  })

  if (maybeStepData.isErr()) return Err(maybeStepData.unwrapErr())
  const { networkFeeCryptoBaseUnit } = maybeStepData.unwrap()

  const tradeRate: TradeRate = {
    ...tradeCommon,
    quoteOrRate: 'rate' as const,
    receiveAddress,
    steps: [
      {
        ...stepCommon,
        accountNumber,
        feeData: { networkFeeCryptoBaseUnit, protocolFees },
      },
    ],
  }

  return Ok([tradeRate])
}
