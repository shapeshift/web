import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'

import { getDefaultSlippageDecimalPercentageForSwapper } from '../../../constants'
import type {
  SingleHopTradeRateSteps,
  SwapErrorRight,
  SwapperDeps,
  TradeRate,
} from '../../../types'
import { SwapperName } from '../../../types'
import type { ZrxTradeRateInput } from '../types'
import { fetchZrxPrice } from '../utils/fetchFromZrx'
import { getZrxStepData } from '../utils/getZrxStepData'
import { getZrxTradeContext } from '../utils/getZrxTradeContext'
import { assertValidTrade } from '../utils/helpers'

export const getZrxTradeRate = async (
  input: ZrxTradeRateInput,
  deps: SwapperDeps,
): Promise<Result<TradeRate[], SwapErrorRight>> => {
  const {
    accountNumber,
    sellAsset,
    buyAsset,
    receiveAddress,
    affiliateBps,
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
  } = input

  const assertion = assertValidTrade({ buyAsset, sellAsset })
  if (assertion.isErr()) return Err(assertion.unwrapErr())

  const slippageTolerancePercentageDecimal =
    input.slippageTolerancePercentageDecimal ??
    getDefaultSlippageDecimalPercentageForSwapper(SwapperName.Zrx)

  const maybeZrxPriceResponse = await fetchZrxPrice({
    buyAsset,
    sellAsset,
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
    // Cross-account not supported for ZRX
    sellAddress: receiveAddress,
    affiliateBps,
    slippageTolerancePercentageDecimal,
    zrxBaseUrl: deps.config.VITE_ZRX_BASE_URL,
  })

  if (maybeZrxPriceResponse.isErr()) return Err(maybeZrxPriceResponse.unwrapErr())
  const { buyAmount, sellAmount, fees, totalNetworkFee, route } = maybeZrxPriceResponse.unwrap()

  const maybeContext = getZrxTradeContext({
    input,
    deps,
    slippageTolerancePercentageDecimal,
    normalizedQuote: { buyAmount, sellAmount, fees, route },
  })

  if (maybeContext.isErr()) return Err(maybeContext.unwrapErr())
  const { tradeCommon, stepCommon, protocolFees, stepDataArgs } = maybeContext.unwrap()

  const maybeStepData = await getZrxStepData({
    ...stepDataArgs,
    type: 'rate',
    input,
    totalNetworkFee,
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
    ] as SingleHopTradeRateSteps,
  }

  return Ok([tradeRate])
}
