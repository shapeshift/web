import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import type { BuildTradeInput, SwapErrorRight } from 'lib/swapper/api'
import { makeSwapErrorRight, SwapErrorType } from 'lib/swapper/api'
import type { ZrxTrade } from 'lib/swapper/swappers/ZrxSwapper/types'
import { DEFAULT_SOURCE } from 'lib/swapper/swappers/ZrxSwapper/utils/constants'
import { assertValidTrade, getAdapter } from 'lib/swapper/swappers/ZrxSwapper/utils/helpers/helpers'
import { getFees } from 'lib/utils/evm'

import { fetchZrxQuote } from '../utils/fetchZrxQuote'

export async function zrxBuildTrade(
  input: BuildTradeInput,
): Promise<Result<ZrxTrade, SwapErrorRight>> {
  const {
    sellAmountBeforeFeesCryptoBaseUnit,
    sellAsset,
    buyAsset,
    slippage,
    accountNumber,
    receiveAddress,
    affiliateBps,
    chainId,
    wallet,
  } = input
  const assertion = assertValidTrade({ buyAsset, sellAsset, receiveAddress })
  if (assertion.isErr()) return Err(assertion.unwrapErr())

  const maybeAdapter = getAdapter(chainId)
  if (maybeAdapter.isErr()) return Err(maybeAdapter.unwrapErr())
  const adapter = maybeAdapter.unwrap()

  const maybeQuoteResponse = await fetchZrxQuote({
    buyAsset,
    sellAsset,
    receiveAddress,
    slippage,
    affiliateBps,
    sellAmountBeforeFeesCryptoBaseUnit,
  })

  if (maybeQuoteResponse.isErr()) return Err(maybeQuoteResponse.unwrapErr())
  const { data: quote } = maybeQuoteResponse.unwrap()

  try {
    const { networkFeeCryptoBaseUnit } = await getFees({
      accountNumber,
      adapter,
      to: quote.to,
      value: quote.value,
      data: quote.data,
      wallet,
    })

    return Ok({
      sellAsset,
      buyAsset,
      accountNumber,
      receiveAddress,
      rate: quote.price,
      depositAddress: quote.to,
      feeData: {
        networkFeeCryptoBaseUnit,
        protocolFees: {},
      },
      txData: quote.data,
      buyAmountBeforeFeesCryptoBaseUnit: quote.buyAmount,
      sellAmountBeforeFeesCryptoBaseUnit: quote.sellAmount,
      sources: quote.sources?.filter(s => parseFloat(s.proportion) > 0) || DEFAULT_SOURCE,
    })
  } catch (err) {
    return Err(
      makeSwapErrorRight({
        message: '[Zrx: buildTrade] - failed to get fees',
        cause: err,
        code: SwapErrorType.BUILD_TRADE_FAILED,
      }),
    )
  }
}
