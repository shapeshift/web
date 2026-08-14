import { nearChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { chainIdToFeeAssetId } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { v4 as uuid } from 'uuid'

import { getDefaultSlippageDecimalPercentageForSwapper } from '../../../constants'
import type {
  QuoteFeeData,
  SwapErrorRight,
  SwapperDeps,
  TradeCommon,
  TradeStepCommon,
} from '../../../types'
import { SwapperName } from '../../../types'
import { getInputOutputRate, makeTradeStepBuildFailedErr } from '../../../utils'
import { buildAffiliateFee } from '../../../utils/affiliateFee'
import type {
  NearIntentsExactOutputTradeQuoteInput,
  NearIntentsExactOutputTradeRateInput,
  NearIntentsTradeQuoteInput,
  NearIntentsTradeRateInput,
  QuoteResponse,
} from '../types'

type NearIntentsTradeContext = {
  tradeCommon: TradeCommon
  stepCommon: Omit<TradeStepCommon, 'feeData'>
  protocolFees: QuoteFeeData['protocolFees']
  stepDataArgs: {
    deps: SwapperDeps
    sellAsset: Asset
    sellAmountCryptoBaseUnit: string
    depositAddress: string
  }
}

export const getNearIntentsTradeContext = ({
  input,
  deps,
  quote,
}: {
  input:
    | NearIntentsTradeQuoteInput
    | NearIntentsTradeRateInput
    | NearIntentsExactOutputTradeQuoteInput
    | NearIntentsExactOutputTradeRateInput
  deps: SwapperDeps
  quote: QuoteResponse['quote']
}): Result<NearIntentsTradeContext, SwapErrorRight> => {
  const { sellAsset, buyAsset, affiliateBps, slippageTolerancePercentageDecimal } = input

  if (!quote.depositAddress) return Err(makeTradeStepBuildFailedErr('getNearIntentsTradeContext'))

  const rate = getInputOutputRate({
    sellAmountCryptoBaseUnit: quote.amountIn,
    buyAmountCryptoBaseUnit: quote.amountOut,
    sellAsset,
    buyAsset,
  })

  const isExactOutput = 'buyAmountCryptoBaseUnit' in input

  return Ok({
    tradeCommon: {
      id: uuid(),
      rate,
      swapperName: SwapperName.NearIntents,
      isExactOutput,
      affiliateBps,
      slippageTolerancePercentageDecimal:
        slippageTolerancePercentageDecimal ??
        getDefaultSlippageDecimalPercentageForSwapper(SwapperName.NearIntents),
    },
    stepCommon: {
      allowanceContract: '',
      buyAmountBeforeFeesCryptoBaseUnit: quote.amountOut,
      buyAmountAfterFeesCryptoBaseUnit: quote.amountOut,
      buyAsset,
      rate,
      sellAmountIncludingProtocolFeesCryptoBaseUnit: quote.amountIn,
      sellAsset,
      source: SwapperName.NearIntents,
      estimatedExecutionTimeMs: quote.timeEstimate ? quote.timeEstimate * 1000 : undefined,
      affiliateFee: buildAffiliateFee({
        strategy: 'fixed_asset',
        affiliateBps,
        sellAsset,
        buyAsset,
        sellAmountCryptoBaseUnit: quote.amountIn,
        buyAmountCryptoBaseUnit: quote.amountOut,
        fixedAssetId: chainIdToFeeAssetId(nearChainId),
        fixedAsset: deps.assetsById[chainIdToFeeAssetId(nearChainId)],
        isEstimate: true,
      }),
    },
    protocolFees: {},
    stepDataArgs: {
      deps,
      sellAsset,
      sellAmountCryptoBaseUnit: quote.amountIn,
      depositAddress: quote.depositAddress,
    },
  })
}
