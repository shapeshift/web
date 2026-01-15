import { Err, Ok } from '@sniptt/monads'
import type { Quote } from '@ston-fi/omniston-sdk'
import { SettlementMethod } from '@ston-fi/omniston-sdk'

import type { CommonTradeQuoteInput, TradeQuote, TradeQuoteResult } from '../../../types'
import { SwapperName, TradeQuoteError } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import type { OmnistonAssetAddress } from '../types'
import { STONFI_DEFAULT_SLIPPAGE_BPS, STONFI_QUOTE_TIMEOUT_MS } from '../utils/constants'
import {
  calculateRate,
  slippageDecimalToBps,
  validateTonAssets,
  waitForQuote,
} from '../utils/helpers'
import { omnistonManager } from '../utils/omnistonManager'

const buildStonfiSpecific = (
  quote: Quote,
  bidAssetAddress: OmnistonAssetAddress,
  askAssetAddress: OmnistonAssetAddress,
) => ({
  quoteId: quote.quoteId,
  resolverId: quote.resolverId,
  resolverName: quote.resolverName,
  tradeStartDeadline: quote.tradeStartDeadline,
  gasBudget: quote.gasBudget,
  bidAssetAddress: quote.bidAssetAddress ?? bidAssetAddress,
  askAssetAddress: quote.askAssetAddress ?? askAssetAddress,
  bidUnits: quote.bidUnits,
  askUnits: quote.askUnits,
  referrerAddress: quote.referrerAddress,
  referrerFeeAsset: quote.referrerFeeAsset,
  referrerFeeUnits: quote.referrerFeeUnits,
  protocolFeeAsset: quote.protocolFeeAsset,
  protocolFeeUnits: quote.protocolFeeUnits,
  quoteTimestamp: quote.quoteTimestamp,
  estimatedGasConsumption: quote.estimatedGasConsumption,
  params: quote.params,
})

export const getTradeQuote = async (input: CommonTradeQuoteInput): Promise<TradeQuoteResult> => {
  const {
    sellAsset,
    buyAsset,
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
    receiveAddress,
    accountNumber,
    slippageTolerancePercentageDecimal,
  } = input

  const validation = validateTonAssets(sellAsset, buyAsset)
  if (!validation.isValid) {
    return validation.error
  }

  const { bidAssetAddress, askAssetAddress } = validation
  const omniston = omnistonManager.getInstance()

  try {
    const slippageBps = slippageDecimalToBps(
      slippageTolerancePercentageDecimal,
      STONFI_DEFAULT_SLIPPAGE_BPS,
    )

    const quoteResult = await waitForQuote(
      omniston,
      {
        settlementMethods: [SettlementMethod.SETTLEMENT_METHOD_SWAP],
        bidAssetAddress,
        askAssetAddress,
        amount: { bidUnits: sellAmountIncludingProtocolFeesCryptoBaseUnit },
        settlementParams: {
          maxPriceSlippageBps: slippageBps,
          gaslessSettlement: 'GASLESS_SETTLEMENT_PROHIBITED',
        },
      },
      STONFI_QUOTE_TIMEOUT_MS,
    )

    if (quoteResult.type === 'error') {
      console.error('[Stonfi] Quote request error:', quoteResult.error)
      return Err(
        makeSwapErrorRight({
          message: `[Stonfi] Connection error while fetching quote`,
          code: TradeQuoteError.QueryFailed,
        }),
      )
    }

    if (quoteResult.type === 'timeout') {
      return Err(
        makeSwapErrorRight({
          message: `[Stonfi] Quote request timed out`,
          code: TradeQuoteError.QueryFailed,
        }),
      )
    }

    if (quoteResult.type === 'noQuote') {
      return Err(
        makeSwapErrorRight({
          message: `[Stonfi] No quote available for this pair`,
          code: TradeQuoteError.NoRouteFound,
        }),
      )
    }

    const quote = quoteResult.quote
    const buyAmountCryptoBaseUnit = quote.askUnits
    const networkFeeCryptoBaseUnit = quote.gasBudget

    const rate = calculateRate(
      buyAmountCryptoBaseUnit,
      sellAmountIncludingProtocolFeesCryptoBaseUnit,
      buyAsset.precision,
      sellAsset.precision,
    )

    const tradeQuote: TradeQuote = {
      id: quote.quoteId,
      rate,
      receiveAddress,
      affiliateBps: '0',
      slippageTolerancePercentageDecimal:
        slippageTolerancePercentageDecimal ?? String(STONFI_DEFAULT_SLIPPAGE_BPS / 10000),
      quoteOrRate: 'quote',
      swapperName: SwapperName.Stonfi,
      steps: [
        {
          buyAmountBeforeFeesCryptoBaseUnit: buyAmountCryptoBaseUnit,
          buyAmountAfterFeesCryptoBaseUnit: buyAmountCryptoBaseUnit,
          sellAmountIncludingProtocolFeesCryptoBaseUnit,
          feeData: {
            networkFeeCryptoBaseUnit,
            protocolFees: undefined,
          },
          rate,
          source: SwapperName.Stonfi,
          buyAsset,
          sellAsset,
          accountNumber,
          allowanceContract: '0x0000000000000000000000000000000000000000',
          estimatedExecutionTimeMs: 30000,
          stonfiSpecific: buildStonfiSpecific(quote, bidAssetAddress, askAssetAddress),
        },
      ],
    }

    return Ok([tradeQuote])
  } catch (err) {
    return Err(
      makeSwapErrorRight({
        message: `[Stonfi] Error getting quote: ${err}`,
        code: TradeQuoteError.QueryFailed,
        cause: err,
      }),
    )
  }
}
