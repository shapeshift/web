import { getProvidersExcluding } from '@cetusprotocol/aggregator-sdk'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { v4 as uuid } from 'uuid'

import type {
  QuoteFeeData,
  SwapErrorRight,
  SwapperDeps,
  TradeCommon,
  TradeStepCommon,
} from '../../../types'
import { SwapperName, TradeQuoteError } from '../../../types'
import { getInputOutputRate, makeSwapErrorRight } from '../../../utils'
import { buildAffiliateFee } from '../../utils/affiliateFee'
import type { CetusTradeQuoteInput, CetusTradeRateInput } from '../types'
import { PYTH_DEPENDENT_PROVIDERS } from '../utils/constants'
import { assertValidTrade, findBestRoute, getAggregatorClient, getCoinType } from '../utils/helpers'
import type { GetCetusStepDataArgs } from './getCetusStepData'

type CetusTradeContext = {
  tradeCommon: TradeCommon
  stepCommon: Omit<TradeStepCommon, 'feeData'>
  protocolFees: QuoteFeeData['protocolFees']
  stepDataArgs: Omit<GetCetusStepDataArgs, 'type' | 'input' | 'from'>
}

export const getCetusTradeContext = async (
  input: CetusTradeQuoteInput | CetusTradeRateInput,
  deps: SwapperDeps,
): Promise<Result<CetusTradeContext, SwapErrorRight>> => {
  const { sellAsset, buyAsset, sellAmountIncludingProtocolFeesCryptoBaseUnit, affiliateBps } = input

  const assertion = assertValidTrade({ sellAsset, buyAsset })
  if (assertion.isErr()) return Err(assertion.unwrapErr())

  try {
    const rpcUrl = deps.config.VITE_SUI_NODE_URL
    const client = getAggregatorClient(rpcUrl)

    const sellCoinType = getCoinType(sellAsset)
    const buyCoinType = getCoinType(buyAsset)

    // Exclude Pyth-dependent providers to avoid oracle failures
    const providersWithoutPyth = getProvidersExcluding(PYTH_DEPENDENT_PROVIDERS)

    const routerData = await findBestRoute(
      client,
      sellCoinType,
      buyCoinType,
      sellAmountIncludingProtocolFeesCryptoBaseUnit,
      providersWithoutPyth,
    )

    if (!routerData) {
      return Err(
        makeSwapErrorRight({
          message: `No route found for ${sellAsset.symbol}/${buyAsset.symbol}`,
          code: TradeQuoteError.NoRouteFound,
        }),
      )
    }

    const buyAmountAfterFeesCryptoBaseUnit = routerData.amountOut.toString()

    const rate = getInputOutputRate({
      sellAmountCryptoBaseUnit: sellAmountIncludingProtocolFeesCryptoBaseUnit,
      buyAmountCryptoBaseUnit: buyAmountAfterFeesCryptoBaseUnit,
      sellAsset,
      buyAsset,
    })

    return Ok({
      tradeCommon: {
        id: uuid(),
        rate,
        swapperName: SwapperName.Cetus,
        affiliateBps,
        slippageTolerancePercentageDecimal: input.slippageTolerancePercentageDecimal,
      },
      stepCommon: {
        rate,
        buyAmountBeforeFeesCryptoBaseUnit: buyAmountAfterFeesCryptoBaseUnit,
        buyAmountAfterFeesCryptoBaseUnit,
        sellAmountIncludingProtocolFeesCryptoBaseUnit,
        source: SwapperName.Cetus,
        buyAsset,
        sellAsset,
        allowanceContract: '',
        estimatedExecutionTimeMs: undefined,
        affiliateFee: buildAffiliateFee({
          strategy: 'buy_asset',
          affiliateBps,
          sellAsset,
          buyAsset,
          sellAmountCryptoBaseUnit: sellAmountIncludingProtocolFeesCryptoBaseUnit,
          buyAmountCryptoBaseUnit: buyAmountAfterFeesCryptoBaseUnit,
          isEstimate: true,
        }),
      },
      protocolFees: {},
      stepDataArgs: {
        routerData,
        rpcUrl,
        slippageTolerancePercentageDecimal: input.slippageTolerancePercentageDecimal,
        sellAsset,
        deps,
      },
    })
  } catch (error) {
    return Err(
      makeSwapErrorRight({
        message: error instanceof Error ? error.message : 'Unknown error getting Cetus data',
        code: TradeQuoteError.QueryFailed,
      }),
    )
  }
}
