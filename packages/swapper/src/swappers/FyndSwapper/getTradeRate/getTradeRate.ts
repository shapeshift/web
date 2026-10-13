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

export const getTradeRate = async (
  input: FyndTradeRateInput,
  deps: SwapperDeps,
): Promise<Result<TradeRate[], SwapErrorRight>> => {
  const sender = input.sendAddress ?? FYND_RATE_ADDRESS
  const receiver = input.receiveAddress ?? sender
  const slippageTolerancePercentageDecimal =
    input.slippageTolerancePercentageDecimal ??
    getDefaultSlippageDecimalPercentageForSwapper(SwapperName.Fynd)
  const maybeFynd = await fetchFromFynd({
    sellAsset: input.sellAsset,
    buyAsset: input.buyAsset,
    chainId: input.chainId,
    sellAmountCryptoBaseUnit: input.sellAmountIncludingProtocolFeesCryptoBaseUnit,
    sender,
    receiver,
    slippageTolerancePercentageDecimal,
    affiliateBps: input.affiliateBps,
    baseUrl: deps.config.VITE_FYND_BASE_URL,
  })
  if (maybeFynd.isErr()) return Err(maybeFynd.unwrapErr())
  const quote = maybeFynd.unwrap()

  const { tradeCommon, stepCommon, protocolFees } = getFyndTradeContext({
    input,
    quote,
    slippageTolerancePercentageDecimal,
  })
  const maybeStepData = await getFyndStepData({
    type: 'rate',
    input,
    deps,
    sellAsset: input.sellAsset,
    transaction: quote.transaction,
    from: sender,
    spenderAddress: stepCommon.allowanceContract,
    sellAmountCryptoBaseUnit: input.sellAmountIncludingProtocolFeesCryptoBaseUnit,
    gasEstimate: quote.gas_estimate,
    gasPrice: quote.gas_price ?? null,
  })
  if (maybeStepData.isErr()) return Err(maybeStepData.unwrapErr())
  const { networkFeeCryptoBaseUnit } = maybeStepData.unwrap()

  const tradeRate: TradeRate = {
    ...tradeCommon,
    quoteOrRate: 'rate',
    receiveAddress: input.receiveAddress,
    steps: [
      {
        ...stepCommon,
        accountNumber: input.accountNumber,
        feeData: { networkFeeCryptoBaseUnit, protocolFees },
      },
    ] as SingleHopTradeRateSteps,
  }

  return Ok([tradeRate])
}
