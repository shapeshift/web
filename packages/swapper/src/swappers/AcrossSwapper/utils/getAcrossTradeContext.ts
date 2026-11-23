import { bn, bnOrZero } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import axios from 'axios'

import type {
  QuoteFeeData,
  SwapErrorRight,
  SwapperDeps,
  TradeCommon,
  TradeStepCommon,
} from '../../../types'
import { SwapperName, TradeQuoteError } from '../../../types'
import { getInputOutputRate, makeSwapErrorRight } from '../../../utils'
import { buildAffiliateFee, getGrossAffiliateBps } from '../../../utils/affiliateFee'
import { ACROSS_APP_FEE_SHARE, acrossErrorCodeToTradeQuoteError } from '../constant'
import { acrossService } from './acrossService'
import type { GetAcrossStepDataArgs } from './getAcrossStepData'
import { assertValidTrade, getAcrossAssetAddress } from './helpers'
import type {
  AcrossApiError,
  AcrossApprovalAction,
  AcrossQuote,
  AcrossQuoteRequest,
  AcrossTradeQuoteInput,
  AcrossTradeRateInput,
  AcrossTransactionAction,
} from './types'

type AcrossTradeContext = {
  tradeCommon: TradeCommon
  stepCommon: Omit<TradeStepCommon, 'feeData'>
  protocolFees: QuoteFeeData['protocolFees']
  stepDataArgs: Omit<GetAcrossStepDataArgs, 'type' | 'input'>
  deadline: number
}

const getTradeQuoteError = (error: AcrossApiError): TradeQuoteError => {
  if (error.code === 'policy.amount_out_of_range') {
    return error.details?.amountLimits?.side === 'max'
      ? TradeQuoteError.NoRouteFound
      : TradeQuoteError.SellAmountBelowMinimum
  }

  return acrossErrorCodeToTradeQuoteError[error.code] ?? TradeQuoteError.UnknownError
}

export const getAcrossTradeContext = async ({
  input,
  deps,
  depositor,
  recipient,
}: {
  input: AcrossTradeQuoteInput | AcrossTradeRateInput
  deps: SwapperDeps
  depositor: string
  recipient: string
}): Promise<Result<AcrossTradeContext, SwapErrorRight>> => {
  const { sellAsset, buyAsset, sellAmountIncludingProtocolFeesCryptoBaseUnit, affiliateBps } = input

  const assertion = assertValidTrade({
    sellAsset,
    buyAsset,
    isSolanaEnabled: deps.config.VITE_FEATURE_ACROSS_SOLANA,
  })
  if (assertion.isErr()) return Err(assertion.unwrapErr())
  const { sellAcrossChainId, buyAcrossChainId } = assertion.unwrap()

  const appFeeBps = getGrossAffiliateBps(affiliateBps, ACROSS_APP_FEE_SHARE)

  const request: AcrossQuoteRequest = {
    origin: {
      token: { chainId: sellAcrossChainId, address: getAcrossAssetAddress(sellAsset.assetId) },
      amount: sellAmountIncludingProtocolFeesCryptoBaseUnit,
      depositor,
    },
    destination: {
      token: { chainId: buyAcrossChainId, address: getAcrossAssetAddress(buyAsset.assetId) },
      recipient,
    },
    amountType: 'exact_input',
    authorizationPolicy: { allowedTypes: ['approval'] },
    ...(appFeeBps > 0 && { appFeeBps }),
  }

  const maybeQuote = await acrossService.post<AcrossQuote>(
    `${deps.config.VITE_ACROSS_API_URL}/v1/quotes`,
    request,
  )

  if (maybeQuote.isErr()) {
    const error = maybeQuote.unwrapErr()

    const acrossError = axios.isAxiosError<AcrossApiError>(error.cause)
      ? error.cause.response?.data
      : undefined

    return Err(
      makeSwapErrorRight({
        message: acrossError?.message ?? 'Unknown error',
        code: acrossError?.code ? getTradeQuoteError(acrossError) : TradeQuoteError.UnknownError,
        details: acrossError && { code: acrossError.code, param: acrossError.param },
      }),
    )
  }

  const { data: quote } = maybeQuote.unwrap()

  const approvalAction = quote.nextActions.find(
    (action): action is AcrossApprovalAction =>
      action.kind === 'approve_token' && action.id === 'approval',
  )

  const transactionAction = quote.nextActions.find(
    (action): action is AcrossTransactionAction =>
      action.kind === 'send_transaction' && action.id === 'prefunded-store',
  )

  const hasUnsupportedAction = quote.nextActions.some(
    action => action.kind !== 'approve_token' && action !== transactionAction,
  )

  if (!transactionAction || hasUnsupportedAction) {
    return Err(
      makeSwapErrorRight({
        message: `[getAcrossTradeContext] unsupported actions: ${quote.nextActions
          .map(action => action.id)
          .join(', ')}`,
        code: TradeQuoteError.InvalidResponse,
      }),
    )
  }

  const buyAmountAfterFeesCryptoBaseUnit = quote.destination.amount

  const buyAmountBeforeFeesCryptoBaseUnit =
    quote.destination.grossAmount ??
    bnOrZero(buyAmountAfterFeesCryptoBaseUnit)
      .plus(bnOrZero(quote.fee.totalFee.amount ?? quote.fee.appFee.amount))
      .toFixed(0)

  const rate = getInputOutputRate({
    sellAmountCryptoBaseUnit: sellAmountIncludingProtocolFeesCryptoBaseUnit,
    buyAmountCryptoBaseUnit: buyAmountAfterFeesCryptoBaseUnit,
    sellAsset,
    buyAsset,
  })

  // Fees are always denominated in the destination token
  const protocolFees: QuoteFeeData['protocolFees'] = quote.fee.transferFee.amount
    ? {
        [buyAsset.assetId]: {
          amountCryptoBaseUnit: quote.fee.transferFee.amount,
          asset: buyAsset,
          requiresBalance: false,
        },
      }
    : {}

  // Approvals are skipped when the depositor already has allowance, the deposit contract is the spender
  const allowanceContract = approvalAction?.spender ?? transactionAction.to

  // Across applies its own slippage, the guaranteed minimum is the floor below the expected output
  const slippage = bn(1).minus(bn(quote.destination.minAmount).div(quote.destination.amount))

  // Across can't apply a custom slippage, so only offer quotes whose guaranteed minimum is within it
  if (
    input.slippageTolerancePercentageDecimal &&
    slippage.gt(input.slippageTolerancePercentageDecimal)
  ) {
    return Err(
      makeSwapErrorRight({
        message: '[getAcrossTradeContext] slippage exceeds the custom slippage tolerance',
        code: TradeQuoteError.FinalQuoteMaxSlippageExceeded,
        details: { expectedSlippage: slippage.times(100).toFixed(2) },
      }),
    )
  }

  const walletGasEstimate = quote.gasEstimates?.find(
    estimate => estimate.effect === 'paid_by_wallet' && estimate.actionId === 'prefunded-store',
  )

  return Ok({
    tradeCommon: {
      id: quote.orderId,
      rate,
      swapperName: SwapperName.Across,
      affiliateBps,
      slippageTolerancePercentageDecimal: slippage.toFixed(),
    },
    stepCommon: {
      allowanceContract,
      rate,
      buyAmountBeforeFeesCryptoBaseUnit,
      buyAmountAfterFeesCryptoBaseUnit,
      sellAmountIncludingProtocolFeesCryptoBaseUnit,
      buyAsset,
      sellAsset,
      source: SwapperName.Across,
      estimatedExecutionTimeMs: quote.expectedFillTimeMs,
      affiliateFee: (() => {
        if (appFeeBps <= 0) return

        if (quote.fee.appFee.amount) {
          return {
            assetId: buyAsset.assetId,
            amountCryptoBaseUnit: quote.fee.appFee.amount,
            asset: buyAsset,
          }
        }

        return buildAffiliateFee({
          strategy: 'buy_asset',
          affiliateBps,
          sellAsset,
          buyAsset,
          sellAmountCryptoBaseUnit: sellAmountIncludingProtocolFeesCryptoBaseUnit,
          buyAmountCryptoBaseUnit: buyAmountAfterFeesCryptoBaseUnit,
          isEstimate: true,
        })
      })(),
    },
    protocolFees,
    stepDataArgs: {
      transactionAction,
      sellAsset,
      sellAmountCryptoBaseUnit: sellAmountIncludingProtocolFeesCryptoBaseUnit,
      from: depositor,
      spenderAddress: allowanceContract,
      providerGasLimit: walletGasEstimate?.gasUnits,
      fallbackNetworkFeeCryptoBaseUnit: walletGasEstimate?.amount ?? '0',
      deps,
    },
    deadline: new Date(quote.originValidUntil).getTime(),
  })
}
