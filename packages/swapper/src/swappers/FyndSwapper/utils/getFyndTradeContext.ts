import { bn } from '@shapeshiftoss/utils'
import { v4 as uuid } from 'uuid'

import type { QuoteFeeData, SwapSource, TradeCommon, TradeStepCommon } from '../../../types'
import { SwapperName } from '../../../types'
import { getInputOutputRate } from '../../../utils'
import type { FyndEncodedQuote, FyndTradeQuoteInput, FyndTradeRateInput } from '../types'
import { isFyndNativeAsset } from './helpers'

type FyndTradeContext = {
  tradeCommon: TradeCommon
  stepCommon: Omit<TradeStepCommon, 'feeData'>
  protocolFees: QuoteFeeData['protocolFees']
}

export const getFyndTradeContext = ({
  input,
  quote,
  slippageTolerancePercentageDecimal,
}: {
  input: FyndTradeQuoteInput | FyndTradeRateInput
  quote: FyndEncodedQuote
  slippageTolerancePercentageDecimal: string
}): FyndTradeContext => {
  const { sellAsset, buyAsset, sellAmountIncludingProtocolFeesCryptoBaseUnit } = input
  const routerFee = quote.fee_breakdown.router_fee
  const buyAmountBeforeFeesCryptoBaseUnit = quote.amount_out
  const buyAmountAfterFeesCryptoBaseUnit = bn(quote.amount_out).minus(routerFee).toFixed()
  const rate = getInputOutputRate({
    sellAmountCryptoBaseUnit: quote.amount_in,
    buyAmountCryptoBaseUnit: buyAmountAfterFeesCryptoBaseUnit,
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

  return {
    tradeCommon: {
      id: uuid(),
      rate,
      swapperName: SwapperName.Fynd,
      affiliateBps: '0',
      slippageTolerancePercentageDecimal,
    },
    stepCommon: {
      estimatedExecutionTimeMs: 0,
      allowanceContract: isFyndNativeAsset(sellAsset.assetId) ? '' : quote.transaction.to,
      rate,
      sellAsset,
      buyAsset,
      sellAmountIncludingProtocolFeesCryptoBaseUnit,
      buyAmountBeforeFeesCryptoBaseUnit,
      buyAmountAfterFeesCryptoBaseUnit,
      source,
    },
    protocolFees,
  }
}
