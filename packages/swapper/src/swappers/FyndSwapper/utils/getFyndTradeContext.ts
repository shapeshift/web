import { bn } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Ok } from '@sniptt/monads'
import { v4 as uuid } from 'uuid'

import type {
  QuoteFeeData,
  SwapErrorRight,
  SwapSource,
  TradeCommon,
  TradeStepCommon,
} from '../../../types'
import { SwapperName } from '../../../types'
import type { FyndOrderQuote, FyndTradeQuoteInput, FyndTradeRateInput } from '../types'
import {
  calculateFyndAmounts,
  calculateFyndRate,
  calculateFyndRouterFee,
  isNativeFyndSell,
} from './helpers'

type FyndTradeContext = {
  tradeCommon: TradeCommon
  stepCommon: Omit<TradeStepCommon, 'feeData'>
  protocolFees: QuoteFeeData['protocolFees']
}

export const getFyndTradeContext = ({
  input,
  quote,
  routerAddress,
  slippageTolerancePercentageDecimal,
}: {
  input: FyndTradeQuoteInput | FyndTradeRateInput
  quote: FyndOrderQuote
  routerAddress: string
  slippageTolerancePercentageDecimal: string
}): Result<FyndTradeContext, SwapErrorRight> => {
  const { sellAsset, buyAsset, sellAmountIncludingProtocolFeesCryptoBaseUnit } = input
  const routerFee = quote.fee_breakdown?.router_fee ?? calculateFyndRouterFee(quote.amount_out)
  const clientFee = quote.fee_breakdown?.client_fee ?? '0'
  const { buyAmountBeforeFeesCryptoBaseUnit, buyAmountAfterFeesCryptoBaseUnit } =
    calculateFyndAmounts({ amountOut: quote.amount_out, routerFee, clientFee })
  const rate = calculateFyndRate({
    sellAmount: quote.amount_in,
    buyAmount: buyAmountAfterFeesCryptoBaseUnit,
    sellAsset,
    buyAsset,
  })
  const protocol = quote.route?.swaps[0]?.protocol.replace(/^vm:/, '')
  const source: SwapSource = protocol ? `${SwapperName.Fynd} • ${protocol}` : SwapperName.Fynd
  const protocolFees: QuoteFeeData['protocolFees'] = bn(routerFee).gt(0)
    ? {
        [buyAsset.assetId]: {
          amountCryptoBaseUnit: routerFee,
          asset: buyAsset,
          requiresBalance: false,
        },
      }
    : {}

  return Ok({
    tradeCommon: {
      id: uuid(),
      rate,
      swapperName: SwapperName.Fynd,
      affiliateBps: '0',
      slippageTolerancePercentageDecimal,
      priceImpactPercentageDecimal:
        quote.price_impact_bps === null
          ? undefined
          : bn(quote.price_impact_bps).div(10_000).toFixed(),
    },
    stepCommon: {
      estimatedExecutionTimeMs: 0,
      allowanceContract: isNativeFyndSell(sellAsset.assetId) ? '' : routerAddress,
      rate,
      sellAsset,
      buyAsset,
      sellAmountIncludingProtocolFeesCryptoBaseUnit,
      buyAmountBeforeFeesCryptoBaseUnit,
      buyAmountAfterFeesCryptoBaseUnit,
      source,
    },
    protocolFees,
  })
}
