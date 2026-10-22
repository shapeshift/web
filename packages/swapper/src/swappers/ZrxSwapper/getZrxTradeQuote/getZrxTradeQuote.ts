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
import { assertQuoteAddresses, makeSwapErrorRight } from '../../../utils'
import { isNativeEvmAsset } from '../../../utils/helpers'
import type { ZrxTradeQuoteInput } from '../types'
import { fetchZrxQuote } from '../utils/fetchFromZrx'
import { getZrxNativeCheckDeadline } from '../utils/getZrxNativeCheckDeadline'
import { getZrxStepData } from '../utils/getZrxStepData'
import { getZrxTradeContext } from '../utils/getZrxTradeContext'
import { assertValidTrade, isWrappedNativeSell } from '../utils/helpers'

const isValidDeadlineSeconds = (deadline: number): boolean =>
  Number.isSafeInteger(deadline) && deadline > 0 && Number.isSafeInteger(deadline * 1000)

export const getZrxTradeQuote = async (
  input: ZrxTradeQuoteInput,
  deps: SwapperDeps,
): Promise<Result<TradeQuote[], SwapErrorRight>> => {
  const {
    sellAsset,
    buyAsset,
    accountNumber,
    affiliateBps,
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
  } = input

  const maybeAddresses = assertQuoteAddresses(input)
  if (maybeAddresses.isErr()) return Err(maybeAddresses.unwrapErr())
  const { sendAddress, receiveAddress } = maybeAddresses.unwrap()

  // The 0x order binds taker, so a quote for a different receive address is not executable by the sender
  if (sendAddress !== receiveAddress) {
    return Err(
      makeSwapErrorRight({
        message: 'Cross-account trade not supported for ZRX',
        code: TradeQuoteError.UnsupportedTradePair,
      }),
    )
  }

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
  const permit2Deadline = permit2Eip712 ? Number(permit2Eip712.message.deadline) : undefined

  if (
    permit2Deadline !== undefined &&
    ((typeof permit2Eip712?.message.deadline !== 'string' &&
      typeof permit2Eip712?.message.deadline !== 'number') ||
      !isValidDeadlineSeconds(permit2Deadline))
  ) {
    return Err(
      makeSwapErrorRight({
        message: 'Invalid Permit2 deadline from 0x response',
        code: TradeQuoteError.InvalidResponse,
      }),
    )
  }

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

  // Permit2 calldata is not decodable until the signature is spliced in, so only native sells are read
  const nativeCheckDeadline = permit2Eip712
    ? undefined
    : getZrxNativeCheckDeadline(transaction.data)

  if (nativeCheckDeadline !== undefined && !isValidDeadlineSeconds(nativeCheckDeadline)) {
    return Err(
      makeSwapErrorRight({
        message: 'Invalid NATIVE_CHECK deadline in 0x calldata',
        code: TradeQuoteError.InvalidResponse,
      }),
    )
  }

  const deadlineSeconds = permit2Deadline ?? nativeCheckDeadline

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
    sellAmountCryptoBaseUnit: sellAmountIncludingProtocolFeesCryptoBaseUnit,
    permit2Eip712,
    from: receiveAddress,
  })

  if (maybeStepData.isErr()) return Err(maybeStepData.unwrapErr())
  const { transactionData, networkFeeCryptoBaseUnit } = maybeStepData.unwrap()

  const tradeQuote: TradeQuote = {
    ...tradeCommon,
    quoteOrRate: 'quote' as const,
    deadline: deadlineSeconds === undefined ? undefined : deadlineSeconds * 1000,
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
