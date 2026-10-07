import { bn, isToken } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import axios from 'axios'
import { v4 as uuid } from 'uuid'

import { getDefaultSlippageDecimalPercentageForSwapper } from '../../../constants'
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
import {
  SYMBIOSIS_DISABLED_PROVIDERS,
  SYMBIOSIS_PARTNER_ADDRESS,
  SYMBIOSIS_PARTNER_FEE_BPS,
} from './constants'
import type { GetSymbiosisStepDataArgs } from './getSymbiosisStepData'
import {
  assertValidTrade,
  getSymbiosisPartnerAddress,
  getSymbiosisProtocolFees,
  getSymbiosisSlippageBps,
  getSymbiosisTokenAddress,
  getSymbiosisTronFallbackEnergy,
  isSymbiosisRouteSupported,
  symbiosisErrorToTradeQuoteError,
} from './helpers'
import { symbiosisService } from './symbiosisService'
import type {
  SymbiosisErrorResponse,
  SymbiosisQuoteRequest,
  SymbiosisQuoteResponse,
  SymbiosisTradeQuoteInput,
  SymbiosisTradeRateInput,
} from './types'

type SymbiosisTradeContext = {
  tradeCommon: TradeCommon
  stepCommon: Omit<TradeStepCommon, 'feeData'>
  protocolFees: QuoteFeeData['protocolFees']
  stepDataArgs: Omit<GetSymbiosisStepDataArgs, 'type' | 'input'>
}

export const getSymbiosisTradeContext = async ({
  input,
  deps,
  from,
  to,
}: {
  input: SymbiosisTradeQuoteInput | SymbiosisTradeRateInput
  deps: SwapperDeps
  from: string
  to: string
}): Promise<Result<SymbiosisTradeContext, SwapErrorRight>> => {
  const { sellAsset, buyAsset, sellAmountIncludingProtocolFeesCryptoBaseUnit, affiliateBps } = input

  const assertion = assertValidTrade({ sellAsset, buyAsset })
  if (assertion.isErr()) return Err(assertion.unwrapErr())
  const { sellSymbiosisChainId, buySymbiosisChainId } = assertion.unwrap()

  const slippageBps = getSymbiosisSlippageBps(
    input.slippageTolerancePercentageDecimal ??
      getDefaultSlippageDecimalPercentageForSwapper(SwapperName.Symbiosis),
  )

  const partnerAddress = getSymbiosisPartnerAddress({
    partnerAddress: SYMBIOSIS_PARTNER_ADDRESS,
    partnerFeeBps: SYMBIOSIS_PARTNER_FEE_BPS,
    affiliateBps,
  })

  const request: SymbiosisQuoteRequest = {
    tokenAmountIn: {
      chainId: sellSymbiosisChainId,
      address: getSymbiosisTokenAddress(sellAsset),
      decimals: sellAsset.precision,
      amount: sellAmountIncludingProtocolFeesCryptoBaseUnit,
    },
    tokenOut: {
      chainId: buySymbiosisChainId,
      address: getSymbiosisTokenAddress(buyAsset),
      decimals: buyAsset.precision,
    },
    from,
    to,
    slippage: slippageBps,
    disabledProviders: SYMBIOSIS_DISABLED_PROVIDERS,
    partnerAddress,
  }

  const maybeQuote = await symbiosisService.post<SymbiosisQuoteResponse>(
    `${deps.config.VITE_SYMBIOSIS_API_URL}/v2/quote`,
    request,
  )

  if (maybeQuote.isErr()) {
    const { cause } = maybeQuote.unwrapErr()

    if (!axios.isAxiosError(cause)) {
      return Err(
        makeSwapErrorRight({
          message: 'Unknown error',
          code: TradeQuoteError.UnknownError,
          cause,
        }),
      )
    }

    if (cause.response?.status === 429) {
      return Err(
        makeSwapErrorRight({
          message: 'Symbiosis rate limit exceeded',
          code: TradeQuoteError.RateLimitExceeded,
        }),
      )
    }

    const message = (cause.response?.data as SymbiosisErrorResponse | undefined)?.message

    return Err(
      makeSwapErrorRight({
        message: message ?? 'Symbiosis quote request failed',
        code: symbiosisErrorToTradeQuoteError(message),
      }),
    )
  }

  const { data: quote } = maybeQuote.unwrap()

  if (!isSymbiosisRouteSupported({ quote, sellAsset })) {
    return Err(
      makeSwapErrorRight({
        message: 'No Symbiosis route through its own liquidity',
        code: TradeQuoteError.NoRouteFound,
      }),
    )
  }

  const buyAmountAfterFeesCryptoBaseUnit = quote.tokenAmountOut.amount
  const protocolFees = getSymbiosisProtocolFees(quote.fees)

  const buyAmountBeforeFeesCryptoBaseUnit = bn(buyAmountAfterFeesCryptoBaseUnit)
    .plus(protocolFees[buyAsset.assetId]?.amountCryptoBaseUnit ?? 0)
    .toFixed(0)

  const rate = getInputOutputRate({
    sellAmountCryptoBaseUnit: sellAmountIncludingProtocolFeesCryptoBaseUnit,
    buyAmountCryptoBaseUnit: buyAmountAfterFeesCryptoBaseUnit,
    sellAsset,
    buyAsset,
  })

  const allowanceContract = isToken(sellAsset.assetId) ? quote.approveTo : ''

  if (allowanceContract === undefined) {
    return Err(
      makeSwapErrorRight({
        message: 'Symbiosis returned no spender for a token sell',
        code: TradeQuoteError.QueryFailed,
      }),
    )
  }

  return Ok({
    tradeCommon: {
      id: uuid(),
      rate,
      swapperName: SwapperName.Symbiosis,
      affiliateBps: partnerAddress ? SYMBIOSIS_PARTNER_FEE_BPS : '0',
      slippageTolerancePercentageDecimal: bn(slippageBps).div(10000).toString(),
    },
    stepCommon: {
      allowanceContract,
      rate,
      buyAmountBeforeFeesCryptoBaseUnit,
      buyAmountAfterFeesCryptoBaseUnit,
      sellAmountIncludingProtocolFeesCryptoBaseUnit,
      buyAsset,
      sellAsset,
      source: SwapperName.Symbiosis,
      estimatedExecutionTimeMs: quote.estimatedTime * 1000,
      // The fee accrues in sTokens on the Symbiosis chain - the buy asset figure is a display estimate
      affiliateFee: partnerAddress
        ? buildAffiliateFee({
            strategy: 'buy_asset',
            affiliateBps: SYMBIOSIS_PARTNER_FEE_BPS,
            sellAsset,
            buyAsset,
            sellAmountCryptoBaseUnit: sellAmountIncludingProtocolFeesCryptoBaseUnit,
            buyAmountCryptoBaseUnit: buyAmountAfterFeesCryptoBaseUnit,
            isEstimate: true,
          })
        : undefined,
    },
    protocolFees,
    stepDataArgs: {
      swapTx: quote,
      sellAsset,
      sellAmountCryptoBaseUnit: sellAmountIncludingProtocolFeesCryptoBaseUnit,
      spenderAddress: allowanceContract,
      tronFallbackEnergy: getSymbiosisTronFallbackEnergy(quote.labels),
      from,
      deps,
    },
  })
}
