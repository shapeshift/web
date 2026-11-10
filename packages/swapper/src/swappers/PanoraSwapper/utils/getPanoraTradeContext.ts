import { bnOrZero, fromBaseUnit } from '@shapeshiftoss/utils'
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
import { APTOS_PLACEHOLDER_ADDRESS } from '../../../utils/aptos'
import type { PanoraTradeQuoteInput, PanoraTradeRateInput } from '../types'
import { fetchPanoraSwap } from './fetchFromPanora'
import type { GetPanoraStepDataArgs } from './getPanoraStepData'
import {
  assertValidTrade,
  assetIdToPanoraToken,
  getPanoraFeeParams,
  getPanoraTradeAmounts,
  validatePanoraSwap,
} from './helpers'

type PanoraTradeContext = {
  tradeCommon: TradeCommon & { slippageTolerancePercentageDecimal: string }
  stepCommon: Omit<TradeStepCommon, 'feeData'>
  protocolFees: QuoteFeeData['protocolFees']
  stepDataArgs: Omit<GetPanoraStepDataArgs, 'type' | 'input' | 'from'>
}

export const getPanoraTradeContext = async ({
  input,
  deps,
}: {
  input: PanoraTradeQuoteInput | PanoraTradeRateInput
  deps: SwapperDeps
}): Promise<Result<PanoraTradeContext, SwapErrorRight>> => {
  const {
    sellAsset,
    buyAsset,
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
    sendAddress,
    receiveAddress,
    affiliateBps,
  } = input

  const maybeValidTrade = assertValidTrade({ sellAsset, buyAsset })
  if (maybeValidTrade.isErr()) return Err(maybeValidTrade.unwrapErr())

  const slippageTolerancePercentageDecimal =
    input.slippageTolerancePercentageDecimal ??
    getDefaultSlippageDecimalPercentageForSwapper(SwapperName.Panora)

  // The router pays out to toWalletAddress, which a walletless rate has to fill with a placeholder
  const toWalletAddress = receiveAddress ?? sendAddress ?? APTOS_PLACEHOLDER_ADDRESS

  const maybeResponse = await fetchPanoraSwap({
    request: {
      fromTokenAddress: assetIdToPanoraToken(sellAsset.assetId),
      toTokenAddress: assetIdToPanoraToken(buyAsset.assetId),
      fromTokenAmount: fromBaseUnit(
        sellAmountIncludingProtocolFeesCryptoBaseUnit,
        sellAsset.precision,
      ),
      toWalletAddress,
      slippagePercentage: bnOrZero(slippageTolerancePercentageDecimal).times(100).toNumber(),
      ...getPanoraFeeParams(affiliateBps),
    },
    apiKey: deps.config.VITE_PANORA_API_KEY,
  })

  if (maybeResponse.isErr()) return Err(maybeResponse.unwrapErr())

  const maybeSwap = validatePanoraSwap({
    response: maybeResponse.unwrap(),
    sellAsset,
    buyAsset,
  })

  if (maybeSwap.isErr()) return Err(maybeSwap.unwrapErr())
  const { quote, payload } = maybeSwap.unwrap()

  const tradeAmounts = getPanoraTradeAmounts({ input, quote })

  return Ok<PanoraTradeContext, SwapErrorRight>({
    tradeCommon: {
      id: uuid(),
      rate: tradeAmounts.rate,
      swapperName: SwapperName.Panora,
      affiliateBps,
      slippageTolerancePercentageDecimal,
    },
    stepCommon: {
      estimatedExecutionTimeMs: undefined,
      allowanceContract: '',
      sellAsset,
      buyAsset,
      sellAmountIncludingProtocolFeesCryptoBaseUnit,
      ...tradeAmounts,
      source: SwapperName.Panora,
    },
    protocolFees: {},
    stepDataArgs: { deps, sellAsset, payload },
  })
}
