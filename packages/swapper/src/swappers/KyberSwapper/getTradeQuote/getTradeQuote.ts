import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'

import type { SwapErrorRight, SwapperDeps, TradeQuote } from '../../../types'
import { assertQuoteAddresses } from '../../../utils'
import type { KyberTradeQuoteInput } from '../types'
import { KYBER_DEADLINE_SECONDS } from '../utils/constants'
import { fetchKyberBuild } from '../utils/fetchFromKyber'
import { getKyberStepData } from '../utils/getKyberStepData'
import { getKyberTradeContext } from '../utils/getKyberTradeContext'
import { getKyberBuyAmounts } from '../utils/helpers'

export const getTradeQuote = async (
  input: KyberTradeQuoteInput,
  deps: SwapperDeps,
): Promise<Result<TradeQuote[], SwapErrorRight>> => {
  const { accountNumber } = input

  const maybeAddresses = assertQuoteAddresses(input)
  if (maybeAddresses.isErr()) return Err(maybeAddresses.unwrapErr())
  const { sendAddress, receiveAddress } = maybeAddresses.unwrap()

  const maybeContext = await getKyberTradeContext({ input, deps, origin: sendAddress })
  if (maybeContext.isErr()) return Err(maybeContext.unwrapErr())
  const { tradeCommon, stepCommon, protocolFees, chainId, routeSummary, stepDataArgs } =
    maybeContext.unwrap()

  const deadline = Math.floor(Date.now() / 1000) + KYBER_DEADLINE_SECONDS

  const maybeBuild = await fetchKyberBuild({
    chainId,
    routeSummary,
    slippageTolerancePercentageDecimal: tradeCommon.slippageTolerancePercentageDecimal,
    baseUrl: deps.config.VITE_KYBER_BASE_URL,
    sender: sendAddress,
    recipient: receiveAddress,
    deadline,
  })

  if (maybeBuild.isErr()) return Err(maybeBuild.unwrapErr())
  const build = maybeBuild.unwrap()

  // Kyber re-prices at build time and derives the calldata's minimum return from the built amount
  const { rate, ...buyAmounts } = getKyberBuyAmounts({ input, amountOut: build.amountOut })

  const maybeStepData = await getKyberStepData({
    ...stepDataArgs,
    type: 'quote',
    input,
    from: sendAddress,
    build,
  })

  if (maybeStepData.isErr()) return Err(maybeStepData.unwrapErr())
  const { transactionData, networkFeeCryptoBaseUnit } = maybeStepData.unwrap()

  const tradeQuote: TradeQuote = {
    ...tradeCommon,
    rate,
    quoteOrRate: 'quote' as const,
    receiveAddress,
    deadline: deadline * 1000,
    steps: [
      {
        ...stepCommon,
        ...buyAmounts,
        rate,
        accountNumber,
        transactionData,
        feeData: { networkFeeCryptoBaseUnit, protocolFees },
      },
    ],
  }

  return Ok([tradeQuote])
}
