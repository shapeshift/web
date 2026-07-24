import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'

import type {
  GetEvmTradeQuoteInputBase,
  GetEvmTradeQuoteInputWithWallet,
  SwapErrorRight,
  SwapperDeps,
  TradeQuote,
} from '../../../types'
import { TradeQuoteError } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import { getArbitrumBridgeStepData } from '../utils/getArbitrumBridgeStepData'
import { getArbitrumBridgeTradeContext } from '../utils/getArbitrumBridgeTradeContext'

export const getTradeQuoteWithWallet = async (
  inputWithWallet: GetEvmTradeQuoteInputWithWallet,
  deps: SwapperDeps,
): Promise<Result<TradeQuote, SwapErrorRight>> => {
  const { wallet, ...input } = inputWithWallet
  const supportsEIP1559 = supportsETH(wallet) && (await wallet.ethSupportsEIP1559())

  const maybeQuotes = await getTradeQuote({ ...input, supportsEIP1559 }, deps)
  return maybeQuotes.map(quotes => quotes[0])
}

export const getTradeQuote = async (
  input: GetEvmTradeQuoteInputBase,
  deps: SwapperDeps,
): Promise<Result<TradeQuote[], SwapErrorRight>> => {
  const { sendAddress, receiveAddress, accountNumber } = input

  if (!sendAddress) {
    return Err(
      makeSwapErrorRight({
        message: '[getArbitrumBridgeTradeQuote] sendAddress is required',
        code: TradeQuoteError.UnknownError,
      }),
    )
  }

  if (!receiveAddress) {
    return Err(
      makeSwapErrorRight({
        message: '[getArbitrumBridgeTradeQuote] receiveAddress is required',
        code: TradeQuoteError.UnknownError,
      }),
    )
  }

  const maybeContext = await getArbitrumBridgeTradeContext({ input, deps })

  if (maybeContext.isErr()) return Err(maybeContext.unwrapErr())
  const { tradeCommon, stepCommon, stepDataArgs } = maybeContext.unwrap()

  const maybeStepData = await getArbitrumBridgeStepData({
    ...stepDataArgs,
    type: 'quote',
    input,
    from: sendAddress,
    receiveAddress,
  })

  if (maybeStepData.isErr()) return Err(maybeStepData.unwrapErr())
  const { transactionData, networkFeeCryptoBaseUnit } = maybeStepData.unwrap()

  const tradeQuote: TradeQuote = {
    ...tradeCommon,
    quoteOrRate: 'quote',
    receiveAddress,
    steps: [
      {
        ...stepCommon,
        accountNumber,
        transactionData,
        feeData: { protocolFees: {}, networkFeeCryptoBaseUnit },
      },
    ],
  }

  return Ok([tradeQuote])
}
