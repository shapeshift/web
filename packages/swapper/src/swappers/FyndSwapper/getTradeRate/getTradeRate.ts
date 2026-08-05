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
import type { FyndTradeRateInput } from '../types'
import { FYND_RATE_ADDRESS } from '../utils/constants'
import { fetchFromFynd } from '../utils/fetchFromFynd'
import { getFyndStepData } from '../utils/getFyndStepData'
import { getFyndTradeContext } from '../utils/getFyndTradeContext'
import { assertValidTrade } from '../utils/helpers'

export const getTradeRate = async (
  input: FyndTradeRateInput,
  deps: SwapperDeps,
): Promise<Result<TradeRate[], SwapErrorRight>> => {
  const validation = assertValidTrade(input)
  if (validation.isErr()) return Err(validation.unwrapErr())

  const address = input.receiveAddress ?? FYND_RATE_ADDRESS
  const slippageTolerancePercentageDecimal =
    input.slippageTolerancePercentageDecimal ??
    getDefaultSlippageDecimalPercentageForSwapper(SwapperName.Fynd)
  const maybeFynd = await fetchFromFynd({
    sellAsset: input.sellAsset,
    buyAsset: input.buyAsset,
    sellAmountCryptoBaseUnit: input.sellAmountIncludingProtocolFeesCryptoBaseUnit,
    sender: address,
    receiver: address,
    slippageTolerancePercentageDecimal,
    baseUrl: deps.config.VITE_FYND_ETHEREUM_BASE_URL,
    quoteOrRate: 'rate',
  })
  if (maybeFynd.isErr()) return Err(maybeFynd.unwrapErr())
  const { quote, routerAddress } = maybeFynd.unwrap()

  const maybeContext = getFyndTradeContext({
    input,
    quote,
    routerAddress,
    slippageTolerancePercentageDecimal,
  })
  if (maybeContext.isErr()) return Err(maybeContext.unwrapErr())
  const { tradeCommon, stepCommon, protocolFees } = maybeContext.unwrap()
  const maybeStepData = await getFyndStepData({
    type: 'rate',
    input,
    deps,
    sellAsset: input.sellAsset,
    gasEstimate: quote.gas_estimate,
    gasPrice: quote.gas_price,
  })
  if (maybeStepData.isErr()) return Err(maybeStepData.unwrapErr())

  const tradeRate: TradeRate = {
    ...tradeCommon,
    quoteOrRate: 'rate',
    receiveAddress: input.receiveAddress,
    steps: [
      {
        ...stepCommon,
        accountNumber: input.accountNumber,
        feeData: {
          networkFeeCryptoBaseUnit: maybeStepData.unwrap().networkFeeCryptoBaseUnit,
          protocolFees,
        },
      },
    ] as SingleHopTradeRateSteps,
  }

  return Ok([tradeRate])
}
