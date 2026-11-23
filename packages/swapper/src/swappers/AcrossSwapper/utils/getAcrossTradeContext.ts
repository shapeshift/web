import { BigAmount, bnOrZero } from '@shapeshiftoss/utils'
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
import { buildAffiliateFee } from '../../../utils/affiliateFee'
import { acrossErrorCodeToTradeQuoteError } from '../constant'
import { fetchAcrossTrade } from './fetchAcrossTrade'
import type { GetAcrossStepDataArgs } from './getAcrossStepData'
import { assertValidTrade, getAcrossAssetAddress } from './helpers'
import type {
  AcrossApiError,
  AcrossApprovalAction,
  AcrossTradeQuoteInput,
  AcrossTradeRateInput,
  AcrossTransactionAction,
} from './types'
import { getAcrossApiError } from './types'

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

  const assertion = assertValidTrade({ sellAsset, buyAsset })
  if (assertion.isErr()) return Err(assertion.unwrapErr())
  const { sellAcrossChainId, buyAcrossChainId } = assertion.unwrap()

  const appFeeBps = bnOrZero(affiliateBps).toNumber()

  const maybeQuote = await fetchAcrossTrade(
    {
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
    },
    deps.config,
  )

  if (maybeQuote.isErr()) {
    const error = maybeQuote.unwrapErr()

    const acrossError = axios.isAxiosError(error.cause)
      ? getAcrossApiError(error.cause.response?.data)
      : undefined

    if (!acrossError) {
      return Err(
        makeSwapErrorRight({ message: 'Unknown error', code: TradeQuoteError.UnknownError }),
      )
    }

    return Err(
      makeSwapErrorRight({
        message: acrossError.message,
        code: getTradeQuoteError(acrossError),
        details: { code: acrossError.code, param: acrossError.param },
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
    BigAmount.fromBaseUnit({
      value: buyAmountAfterFeesCryptoBaseUnit,
      precision: buyAsset.precision,
    })
      .plus(
        BigAmount.fromBaseUnit({
          value: quote.fee.totalFee.amount ?? quote.fee.appFee.amount ?? '0',
          precision: buyAsset.precision,
        }),
      )
      .toBaseUnit()

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

  const walletGasEstimate = quote.gasEstimates?.find(
    estimate => estimate.effect === 'paid_by_wallet' && estimate.actionId === 'prefunded-store',
  )

  return Ok({
    tradeCommon: {
      id: quote.orderId,
      rate,
      swapperName: SwapperName.Across,
      affiliateBps,
      slippageTolerancePercentageDecimal: input.slippageTolerancePercentageDecimal,
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
