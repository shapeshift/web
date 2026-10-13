import { bn } from '@shapeshiftoss/utils'
import { v4 as uuid } from 'uuid'

import type { QuoteFeeData, SwapSource, TradeCommon, TradeStepCommon } from '../../../types'
import { SwapperName } from '../../../types'
import { getInputOutputRate } from '../../../utils'
import { isNativeEvmAsset } from '../../../utils/helpers'
import type { FyndEncodedQuote, FyndTradeQuoteInput, FyndTradeRateInput } from '../types'

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
  const { router_fee: routerFee, client_fee: clientFee } = quote.fee_breakdown
  const buyAmountBeforeFeesCryptoBaseUnit = quote.amount_out
  const buyAmountAfterFeesCryptoBaseUnit = bn(quote.amount_out)
    .minus(routerFee)
    .minus(clientFee)
    .toFixed()
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
      affiliateBps: input.affiliateBps,
      slippageTolerancePercentageDecimal,
    },
    stepCommon: {
      estimatedExecutionTimeMs: 0,
      allowanceContract: isNativeEvmAsset(sellAsset.assetId) ? '' : quote.transaction.to,
      rate,
      sellAsset,
      buyAsset,
      sellAmountIncludingProtocolFeesCryptoBaseUnit,
      buyAmountBeforeFeesCryptoBaseUnit,
      buyAmountAfterFeesCryptoBaseUnit,
      source,
      affiliateFee: bn(clientFee).gt(0)
        ? { assetId: buyAsset.assetId, amountCryptoBaseUnit: clientFee, asset: buyAsset }
        : undefined,
    },
    protocolFees,
  }
}
