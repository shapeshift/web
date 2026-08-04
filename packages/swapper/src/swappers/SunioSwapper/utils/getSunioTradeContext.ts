import { BigAmount, bn } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'

import type {
  QuoteFeeData,
  SwapErrorRight,
  SwapperDeps,
  TradeCommon,
  TradeStepCommon,
} from '../../../types'
import { SwapperName, TradeQuoteError } from '../../../types'
import { getInputOutputRate, makeSwapErrorRight } from '../../../utils'
import { buildAffiliateFee } from '../../../utils/affiliateFee'
import type { SunioTradeQuoteInput, SunioTradeRateInput } from '../types'
import { DEFAULT_SLIPPAGE_PERCENTAGE, SUNIO_SMART_ROUTER_CONTRACT } from './constants'
import { fetchSunioQuote } from './fetchFromSunio'
import type { GetSunioStepDataArgs } from './getSunioStepData'
import { assertValidTrade } from './helpers'
import { sunioServiceFactory } from './sunioService'

type SunioTradeContext = {
  tradeCommon: TradeCommon
  stepCommon: Omit<TradeStepCommon, 'feeData'>
  protocolFees: QuoteFeeData['protocolFees']
  stepDataArgs: Omit<GetSunioStepDataArgs, 'type' | 'input' | 'from'>
}

export const getSunioTradeContext = async ({
  input,
  deps,
}: {
  input: SunioTradeQuoteInput | SunioTradeRateInput
  deps: SwapperDeps
}): Promise<Result<SunioTradeContext, SwapErrorRight>> => {
  const {
    sellAsset,
    buyAsset,
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
    affiliateBps,
    slippageTolerancePercentageDecimal,
  } = input

  const assertion = assertValidTrade({ sellAsset, buyAsset })
  if (assertion.isErr()) return Err(assertion.unwrapErr())

  try {
    const maybeQuoteResponse = await fetchSunioQuote(
      {
        sellAssetId: sellAsset.assetId,
        buyAssetId: buyAsset.assetId,
        sellAmountCryptoBaseUnit: sellAmountIncludingProtocolFeesCryptoBaseUnit,
      },
      sunioServiceFactory(),
    )

    if (maybeQuoteResponse.isErr()) return Err(maybeQuoteResponse.unwrapErr())
    const bestRoute = maybeQuoteResponse.unwrap().data[0]

    if (!bestRoute) {
      return Err(
        makeSwapErrorRight({
          message: '[Sun.io] No routes available',
          code: TradeQuoteError.NoRouteFound,
        }),
      )
    }

    const buyAmountCryptoBaseUnit = BigAmount.fromPrecision({
      value: bestRoute.amountOut,
      precision: buyAsset.precision,
    }).toBaseUnit()

    const rate = getInputOutputRate({
      sellAmountCryptoBaseUnit: sellAmountIncludingProtocolFeesCryptoBaseUnit,
      buyAmountCryptoBaseUnit,
      sellAsset,
      buyAsset,
    })

    const protocolFeeCryptoBaseUnit = bn(bestRoute.fee)
      .times(sellAmountIncludingProtocolFeesCryptoBaseUnit)
      .toFixed(0)

    const protocolFees: QuoteFeeData['protocolFees'] = (() => {
      if (bn(protocolFeeCryptoBaseUnit).lte(0)) return

      return {
        [sellAsset.assetId]: {
          amountCryptoBaseUnit: protocolFeeCryptoBaseUnit,
          requiresBalance: false,
          asset: sellAsset,
        },
      }
    })()

    return Ok({
      tradeCommon: {
        id: crypto.randomUUID(),
        rate,
        affiliateBps,
        slippageTolerancePercentageDecimal:
          slippageTolerancePercentageDecimal ?? DEFAULT_SLIPPAGE_PERCENTAGE,
        swapperName: SwapperName.Sunio,
      },
      stepCommon: {
        buyAmountBeforeFeesCryptoBaseUnit: buyAmountCryptoBaseUnit,
        buyAmountAfterFeesCryptoBaseUnit: buyAmountCryptoBaseUnit,
        sellAmountIncludingProtocolFeesCryptoBaseUnit,
        rate,
        source: SwapperName.Sunio,
        buyAsset,
        sellAsset,
        allowanceContract: SUNIO_SMART_ROUTER_CONTRACT,
        estimatedExecutionTimeMs: undefined,
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
      protocolFees,
      stepDataArgs: { deps, sellAsset, route: bestRoute },
    })
  } catch (error) {
    return Err(
      makeSwapErrorRight({
        message: '[Sun.io] Failed to get trade',
        code: TradeQuoteError.UnknownError,
        cause: error,
      }),
    )
  }
}
