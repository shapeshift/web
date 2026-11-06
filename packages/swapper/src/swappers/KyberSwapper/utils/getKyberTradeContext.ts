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
import { isNativeEvmAsset } from '../../../utils/helpers'
import type { KyberRouteSummary, KyberTradeQuoteInput, KyberTradeRateInput } from '../types'
import type { KyberSupportedChainId } from './constants'
import { KYBER_ROUTER_ADDRESS } from './constants'
import { fetchKyberRoute } from './fetchFromKyber'
import type { GetKyberStepDataArgs } from './getKyberStepData'
import {
  assertValidTrade,
  assetIdToKyberToken,
  getKyberFeeParams,
  getKyberTradeAmounts,
} from './helpers'

type KyberTradeContext = {
  tradeCommon: TradeCommon & { slippageTolerancePercentageDecimal: string }
  stepCommon: Omit<TradeStepCommon, 'feeData'>
  protocolFees: QuoteFeeData['protocolFees']
  chainId: KyberSupportedChainId
  routeSummary: KyberRouteSummary
  stepDataArgs: Omit<GetKyberStepDataArgs, 'type' | 'input' | 'from' | 'build'>
}

export const getKyberTradeContext = async ({
  input,
  deps,
}: {
  input: KyberTradeQuoteInput | KyberTradeRateInput
  deps: SwapperDeps
}): Promise<Result<KyberTradeContext, SwapErrorRight>> => {
  const { sellAsset, buyAsset, sellAmountIncludingProtocolFeesCryptoBaseUnit, affiliateBps } = input

  const maybeChainId = assertValidTrade({ sellAsset, buyAsset })
  if (maybeChainId.isErr()) return Err(maybeChainId.unwrapErr())
  const chainId = maybeChainId.unwrap()

  const slippageTolerancePercentageDecimal =
    input.slippageTolerancePercentageDecimal ??
    getDefaultSlippageDecimalPercentageForSwapper(SwapperName.KyberSwap)

  const maybeRoute = await fetchKyberRoute({
    chainId,
    tokenIn: assetIdToKyberToken(sellAsset.assetId),
    tokenOut: assetIdToKyberToken(buyAsset.assetId),
    sellAmountCryptoBaseUnit: sellAmountIncludingProtocolFeesCryptoBaseUnit,
    feeParams: getKyberFeeParams({ chainId, affiliateBps }),
    sendAddress: input.sendAddress,
    baseUrl: deps.config.VITE_KYBER_BASE_URL,
  })

  if (maybeRoute.isErr()) return Err(maybeRoute.unwrapErr())
  const routeSummary = maybeRoute.unwrap()

  const tradeAmounts = getKyberTradeAmounts({ input, amountOut: routeSummary.amountOut })

  const allowanceContract = isNativeEvmAsset(sellAsset.assetId) ? '' : KYBER_ROUTER_ADDRESS

  return Ok<KyberTradeContext, SwapErrorRight>({
    tradeCommon: {
      id: uuid(),
      rate: tradeAmounts.rate,
      swapperName: SwapperName.KyberSwap,
      affiliateBps,
      slippageTolerancePercentageDecimal,
    },
    stepCommon: {
      estimatedExecutionTimeMs: 0,
      allowanceContract,
      sellAsset,
      buyAsset,
      sellAmountIncludingProtocolFeesCryptoBaseUnit,
      ...tradeAmounts,
      source: SwapperName.KyberSwap,
    },
    protocolFees: {},
    chainId,
    routeSummary,
    stepDataArgs: {
      deps,
      sellAsset,
      sellAmountCryptoBaseUnit: sellAmountIncludingProtocolFeesCryptoBaseUnit,
      spenderAddress: allowanceContract,
      routeSummary,
    },
  })
}
