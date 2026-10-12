import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'

import type {
  GetEvmTradeQuoteInputWithWallet,
  SwapErrorRight,
  SwapperDeps,
  TradeQuote,
} from '../../../types'
import { assertQuoteAddresses } from '../../../utils'
import type { ArbitrumBridgeTradeQuoteInput } from '../types'
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
  input: ArbitrumBridgeTradeQuoteInput,
  deps: SwapperDeps,
): Promise<Result<TradeQuote[], SwapErrorRight>> => {
  const { accountNumber } = input

  const maybeAddresses = assertQuoteAddresses(input)
  if (maybeAddresses.isErr()) return Err(maybeAddresses.unwrapErr())
  const { sendAddress, receiveAddress } = maybeAddresses.unwrap()

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
