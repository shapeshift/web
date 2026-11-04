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
import { getInputOutputRate } from '../../../utils'
import { buildAffiliateFee } from '../../../utils/affiliateFee'
import { isNativeEvmAsset } from '../../../utils/helpers'
import type { KyberTradeQuoteInput, KyberTradeRateInput } from '../types'
import type { KyberBuildArgs } from './fetchFromKyber'
import { fetchKyberRoute } from './fetchFromKyber'
import type { GetKyberStepDataArgs } from './getKyberStepData'
import {
  assertValidTrade,
  assetIdToKyberToken,
  getKyberBuyAmountBeforeFees,
  getKyberFeeParams,
} from './helpers'

type KyberTradeContext = {
  tradeCommon: TradeCommon
  stepCommon: Omit<TradeStepCommon, 'feeData'>
  protocolFees: QuoteFeeData['protocolFees']
  buildArgs: KyberBuildArgs
  stepDataArgs: Omit<GetKyberStepDataArgs, 'type' | 'input' | 'from' | 'build'>
}

export const getKyberTradeContext = async ({
  input,
  deps,
  origin,
}: {
  input: KyberTradeQuoteInput | KyberTradeRateInput
  deps: SwapperDeps
  origin: string | undefined
}): Promise<Result<KyberTradeContext, SwapErrorRight>> => {
  const { sellAsset, buyAsset, sellAmountIncludingProtocolFeesCryptoBaseUnit, affiliateBps } = input

  const maybeChainId = assertValidTrade({ sellAsset, buyAsset })
  if (maybeChainId.isErr()) return Err(maybeChainId.unwrapErr())
  const chainId = maybeChainId.unwrap()

  const slippageTolerancePercentageDecimal =
    input.slippageTolerancePercentageDecimal ??
    getDefaultSlippageDecimalPercentageForSwapper(SwapperName.KyberSwap)

  const feeParams = getKyberFeeParams({ chainId, affiliateBps })
  const tokenIn = assetIdToKyberToken(sellAsset.assetId)
  const tokenOut = assetIdToKyberToken(buyAsset.assetId)
  const baseUrl = deps.config.VITE_KYBER_BASE_URL

  const maybeRoute = await fetchKyberRoute({
    chainId,
    tokenIn,
    tokenOut,
    sellAmountCryptoBaseUnit: sellAmountIncludingProtocolFeesCryptoBaseUnit,
    feeParams,
    origin,
    baseUrl,
  })

  if (maybeRoute.isErr()) return Err(maybeRoute.unwrapErr())
  const { routeSummary, routerAddress } = maybeRoute.unwrap()

  const buyAmountAfterFeesCryptoBaseUnit = routeSummary.amountOut
  const buyAmountBeforeFeesCryptoBaseUnit = getKyberBuyAmountBeforeFees({
    buyAmountAfterFeesCryptoBaseUnit,
    affiliateBps,
  })

  const rate = getInputOutputRate({
    sellAmountCryptoBaseUnit: sellAmountIncludingProtocolFeesCryptoBaseUnit,
    buyAmountCryptoBaseUnit: buyAmountAfterFeesCryptoBaseUnit,
    sellAsset,
    buyAsset,
  })

  const allowanceContract = isNativeEvmAsset(sellAsset.assetId) ? '' : routerAddress

  return Ok<KyberTradeContext, SwapErrorRight>({
    tradeCommon: {
      id: uuid(),
      rate,
      swapperName: SwapperName.KyberSwap,
      affiliateBps,
      slippageTolerancePercentageDecimal,
    },
    stepCommon: {
      estimatedExecutionTimeMs: 0,
      allowanceContract,
      rate,
      sellAsset,
      buyAsset,
      sellAmountIncludingProtocolFeesCryptoBaseUnit,
      buyAmountBeforeFeesCryptoBaseUnit,
      buyAmountAfterFeesCryptoBaseUnit,
      source: SwapperName.KyberSwap,
      affiliateFee: buildAffiliateFee({
        strategy: 'buy_asset',
        affiliateBps,
        sellAsset,
        buyAsset,
        sellAmountCryptoBaseUnit: sellAmountIncludingProtocolFeesCryptoBaseUnit,
        buyAmountCryptoBaseUnit: buyAmountBeforeFeesCryptoBaseUnit,
      }),
    },
    protocolFees: {},
    buildArgs: {
      chainId,
      routeSummary,
      tokenIn,
      tokenOut,
      sellAmountCryptoBaseUnit: sellAmountIncludingProtocolFeesCryptoBaseUnit,
      slippageTolerancePercentageDecimal,
      feeParams,
      baseUrl,
    },
    stepDataArgs: {
      deps,
      sellAsset,
      sellAmountCryptoBaseUnit: sellAmountIncludingProtocolFeesCryptoBaseUnit,
      spenderAddress: allowanceContract,
      providerGasLimit: routeSummary.gas,
      providerGasPrice: routeSummary.gasPrice,
    },
  })
}
