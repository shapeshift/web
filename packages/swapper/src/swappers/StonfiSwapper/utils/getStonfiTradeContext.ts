import { tonChainId } from '@shapeshiftoss/caip'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { SettlementMethod } from '@ston-fi/omniston-sdk'

import type {
  QuoteFeeData,
  SwapErrorRight,
  SwapperDeps,
  TradeCommon,
  TradeStepCommon,
} from '../../../types'
import { SwapperName, TradeQuoteError } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import { buildAffiliateFee } from '../../../utils/affiliateFee'
import { getTreasuryAddressFromChainId } from '../../../utils/helpers'
import type { StonfiTradeQuoteInput, StonfiTradeRateInput } from '../types'
import { STONFI_DEFAULT_SLIPPAGE_BPS, STONFI_QUOTE_TIMEOUT_MS } from './constants'
import type { GetStonfiStepDataArgs } from './getStonfiStepData'
import {
  affiliateBpsToNumber,
  assertValidTrade,
  calculateRate,
  slippageDecimalToBps,
  tonAddressToOmnistonAddress,
  waitForQuote,
} from './helpers'
import { omnistonManager } from './omnistonManager'

type StonfiTradeContext = {
  tradeCommon: TradeCommon
  stepCommon: Omit<TradeStepCommon, 'feeData'>
  protocolFees: QuoteFeeData['protocolFees']
  stepDataArgs: Omit<GetStonfiStepDataArgs, 'type' | 'input' | 'from'>
}

export const getStonfiTradeContext = async ({
  input,
  deps,
}: {
  input: StonfiTradeQuoteInput | StonfiTradeRateInput
  deps: SwapperDeps
}): Promise<Result<StonfiTradeContext, SwapErrorRight>> => {
  const {
    sellAsset,
    buyAsset,
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
    slippageTolerancePercentageDecimal,
    affiliateBps,
  } = input

  const assertion = assertValidTrade({ sellAsset, buyAsset })
  if (assertion.isErr()) return Err(assertion.unwrapErr())
  const { bidAssetAddress, askAssetAddress } = assertion.unwrap()

  try {
    const slippageBps = slippageDecimalToBps(
      slippageTolerancePercentageDecimal,
      STONFI_DEFAULT_SLIPPAGE_BPS,
    )
    const referrerFeeBps = affiliateBpsToNumber(affiliateBps)
    const referrerAddress = tonAddressToOmnistonAddress(getTreasuryAddressFromChainId(tonChainId))

    const quoteResult = await waitForQuote(
      omnistonManager.getInstance(),
      {
        settlementMethods: [SettlementMethod.SETTLEMENT_METHOD_SWAP],
        bidAssetAddress,
        askAssetAddress,
        amount: { bidUnits: sellAmountIncludingProtocolFeesCryptoBaseUnit },
        referrerAddress,
        referrerFeeBps,
        settlementParams: {
          maxPriceSlippageBps: slippageBps,
          gaslessSettlement: 'GASLESS_SETTLEMENT_PROHIBITED',
          flexibleReferrerFee: true,
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
          cause: quoteResult.error,
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

    const { quote } = quoteResult
    const buyAmountCryptoBaseUnit = quote.askUnits

    const rate = calculateRate(
      buyAmountCryptoBaseUnit,
      sellAmountIncludingProtocolFeesCryptoBaseUnit,
      buyAsset.precision,
      sellAsset.precision,
    )

    return Ok({
      tradeCommon: {
        id: quote.quoteId,
        rate,
        affiliateBps,
        slippageTolerancePercentageDecimal:
          slippageTolerancePercentageDecimal ?? String(STONFI_DEFAULT_SLIPPAGE_BPS / 10000),
        swapperName: SwapperName.Stonfi,
      },
      stepCommon: {
        buyAmountBeforeFeesCryptoBaseUnit: buyAmountCryptoBaseUnit,
        buyAmountAfterFeesCryptoBaseUnit: buyAmountCryptoBaseUnit,
        sellAmountIncludingProtocolFeesCryptoBaseUnit,
        rate,
        source: SwapperName.Stonfi,
        buyAsset,
        sellAsset,
        allowanceContract: '',
        estimatedExecutionTimeMs: 30000,
        swapperMetadata: { name: 'stonfi' as const, quoteId: quote.quoteId },
        affiliateFee: buildAffiliateFee({
          strategy: 'buy_asset',
          affiliateBps,
          sellAsset,
          buyAsset,
          sellAmountCryptoBaseUnit: sellAmountIncludingProtocolFeesCryptoBaseUnit,
          buyAmountCryptoBaseUnit,
          isEstimate: true,
        }),
      },
      protocolFees: undefined,
      stepDataArgs: { deps, sellAsset, quote, bidAssetAddress, askAssetAddress },
    })
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
