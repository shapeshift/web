import { tronChainId } from '@shapeshiftoss/caip'
import { convertDecimalPercentageToBasisPoints } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'

import { getDefaultSlippageDecimalPercentageForSwapper } from '../../../constants'
import type { SwapErrorRight, SwapperDeps, TradeQuote } from '../../../types'
import { SwapperName, TradeQuoteError } from '../../../types'
import { assertQuoteAddresses, makeSwapErrorRight } from '../../../utils'
import type { ButterSwapTradeQuoteInput } from '../types'
import { getButterSwapStepData } from '../utils/getButterSwapStepData'
import { getButterSwapTradeContext } from '../utils/getButterSwapTradeContext'
import { fetchTxData, isBuildTxSuccess } from '../xhr'

// TODO: Debug why same-chain Tron swaps revert (swapAndCall method works on EVM but 0 successful on Tron)

export const getTradeQuote = async (
  input: ButterSwapTradeQuoteInput,
  deps: SwapperDeps,
): Promise<Result<TradeQuote[], SwapErrorRight>> => {
  const { sellAsset, receiveAddress, accountNumber, slippageTolerancePercentageDecimal } = input

  const maybeAddresses = assertQuoteAddresses(input)

  if (maybeAddresses.isErr()) return Err(maybeAddresses.unwrapErr())
  const { sendAddress } = maybeAddresses.unwrap()

  const slippageDecimal =
    slippageTolerancePercentageDecimal ??
    getDefaultSlippageDecimalPercentageForSwapper(SwapperName.ButterSwap)

  const maybeContext = await getButterSwapTradeContext({
    input,
    deps,
    slippageTolerancePercentageDecimal: slippageDecimal,
  })

  if (maybeContext.isErr()) return Err(maybeContext.unwrapErr())
  const { tradeCommon, stepCommon, protocolFees, route, stepDataArgs } = maybeContext.unwrap()

  const buildTxResult = await fetchTxData({
    hash: route.hash,
    slippage: convertDecimalPercentageToBasisPoints(slippageDecimal).toString(),
    from: sendAddress,
    receiver: receiveAddress,
  })

  if (buildTxResult.isErr()) return Err(buildTxResult.unwrapErr())
  const buildTxResponse = buildTxResult.unwrap()

  if (!isBuildTxSuccess(buildTxResponse)) {
    return Err(
      makeSwapErrorRight({
        message: `[getTradeQuote] /swap failed: ${buildTxResponse.message}`,
        code: TradeQuoteError.QueryFailed,
      }),
    )
  }

  const buildTx = buildTxResponse.data[0]
  if (!buildTx) {
    return Err(
      makeSwapErrorRight({
        message: '[getTradeQuote] No buildTx data returned',
        code: TradeQuoteError.QueryFailed,
      }),
    )
  }

  const maybeStepData = await getButterSwapStepData({
    ...stepDataArgs,
    type: 'quote',
    input,
    buildTx,
    from: sendAddress,
  })

  if (maybeStepData.isErr()) return Err(maybeStepData.unwrapErr())
  const { networkFeeCryptoBaseUnit, transactionData, butterSwapTransactionMetadata } =
    maybeStepData.unwrap()

  const tradeQuote: TradeQuote = {
    ...tradeCommon,
    quoteOrRate: 'quote' as const,
    receiveAddress,
    steps: [
      {
        ...stepCommon,
        accountNumber,
        // Tron exec still builds from legacy metadata whose spender is the buildTx target
        allowanceContract:
          sellAsset.chainId === tronChainId ? buildTx.to : stepCommon.allowanceContract,
        transactionData,
        butterSwapTransactionMetadata,
        feeData: { networkFeeCryptoBaseUnit, protocolFees },
      },
    ],
  }

  return Ok([tradeQuote])
}
