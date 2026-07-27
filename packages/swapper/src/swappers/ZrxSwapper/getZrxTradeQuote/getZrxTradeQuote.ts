import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'

import { getDefaultSlippageDecimalPercentageForSwapper } from '../../../constants'
import type {
  SingleHopTradeQuoteSteps,
  SwapErrorRight,
  SwapperDeps,
  TradeQuote,
} from '../../../types'
import { SwapperName, TradeQuoteError } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import { isNativeEvmAsset } from '../../../utils/helpers'
import type { ZrxTradeQuoteInput } from '../types'
import { fetchZrxQuote } from '../utils/fetchFromZrx'
import { getZrxStepData } from '../utils/getZrxStepData'
import { getZrxTradeContext } from '../utils/getZrxTradeContext'
import { assertValidTrade, isWrappedNativeSell } from '../utils/helpers'

export const getZrxTradeQuote = async (
  input: ZrxTradeQuoteInput,
  deps: SwapperDeps,
): Promise<Result<TradeQuote[], SwapErrorRight>> => {
  const {
    sellAsset,
    buyAsset,
    accountNumber,
    receiveAddress,
    affiliateBps,
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
  } = input

  const assertion = assertValidTrade({ buyAsset, sellAsset })
  if (assertion.isErr()) return Err(assertion.unwrapErr())

  const slippageTolerancePercentageDecimal =
    input.slippageTolerancePercentageDecimal ??
    getDefaultSlippageDecimalPercentageForSwapper(SwapperName.Zrx)

  const maybeZrxQuoteResponse = await fetchZrxQuote({
    buyAsset,
    sellAsset,
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
    // Cross-account not supported for ZRX
    sellAddress: receiveAddress,
    affiliateBps,
    slippageTolerancePercentageDecimal,
    zrxBaseUrl: deps.config.VITE_ZRX_BASE_URL,
  })

  if (maybeZrxQuoteResponse.isErr()) return Err(maybeZrxQuoteResponse.unwrapErr())
  const { sellAmount, buyAmount, fees, permit2, transaction, route } =
    maybeZrxQuoteResponse.unwrap()

  const permit2Eip712 = permit2?.eip712

  if (!isNativeEvmAsset(sellAsset.assetId) && !isWrappedNativeSell(route) && !permit2Eip712) {
    return Err(
      makeSwapErrorRight({
        message: 'Missing required Permit2 metadata from 0x response',
        code: TradeQuoteError.InvalidResponse,
        details: { transaction, permit2Eip712 },
      }),
    )
  }

  if (!transaction) {
    return Err(
      makeSwapErrorRight({
        message: 'Missing required transaction metadata from 0x response',
        code: TradeQuoteError.InvalidResponse,
        details: { transaction, permit2Eip712 },
      }),
    )
  }

  const maybeContext = getZrxTradeContext({
    input,
    deps,
    slippageTolerancePercentageDecimal,
    normalizedQuote: { buyAmount, sellAmount, fees, route },
  })

  if (maybeContext.isErr()) return Err(maybeContext.unwrapErr())
  const { tradeCommon, stepCommon, protocolFees, stepDataArgs } = maybeContext.unwrap()

  const maybeStepData = await getZrxStepData({
    ...stepDataArgs,
    type: 'quote',
    input,
    transaction,
    permit2Eip712,
    from: receiveAddress,
  })

  if (maybeStepData.isErr()) return Err(maybeStepData.unwrapErr())
  const { transactionData, networkFeeCryptoBaseUnit } = maybeStepData.unwrap()

  const tradeQuote: TradeQuote = {
    ...tradeCommon,
    quoteOrRate: 'quote' as const,
    receiveAddress,
    steps: [
      {
        ...stepCommon,
        accountNumber,
        transactionData,
        feeData: { networkFeeCryptoBaseUnit, protocolFees },
      },
    ] as SingleHopTradeQuoteSteps,
  }

  return Ok([tradeQuote])
}
