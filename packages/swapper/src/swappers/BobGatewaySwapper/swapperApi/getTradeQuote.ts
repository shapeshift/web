import { btcChainId } from '@shapeshiftoss/caip'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'

import type { SwapErrorRight, SwapperDeps, TradeQuote } from '../../../types'
import { assertQuoteAddresses } from '../../../utils'
import { FALLBACK_QUOTE_DEADLINE_MS } from '../../../utils/helpers'
import type { BobGatewayTradeQuoteInput } from '../types'
import { getBobGatewayStepData } from '../utils/getBobGatewayStepData'
import { getBobGatewayTradeContext } from '../utils/getBobGatewayTradeContext'

export const getBobGatewayTradeQuote = async (
  input: BobGatewayTradeQuoteInput,
  deps: SwapperDeps,
): Promise<Result<TradeQuote[], SwapErrorRight>> => {
  const { sellAsset, accountNumber } = input

  const maybeAddresses = assertQuoteAddresses(input)

  if (maybeAddresses.isErr()) return Err(maybeAddresses.unwrapErr())
  const { sendAddress, receiveAddress } = maybeAddresses.unwrap()

  const isBtcSell = sellAsset.chainId === btcChainId

  // omit the sender for btc sells so the sdk doesn't build a psbt from a single address
  const sender = isBtcSell ? undefined : sendAddress

  const maybeContext = await getBobGatewayTradeContext({
    input,
    deps,
    sender,
    recipient: receiveAddress,
    refundAddress: sendAddress,
  })

  if (maybeContext.isErr()) return Err(maybeContext.unwrapErr())
  const { tradeCommon, stepCommon, protocolFees, stepDataArgs } = maybeContext.unwrap()

  const maybeStepData = await getBobGatewayStepData({
    ...stepDataArgs,
    type: 'quote',
    input,
    from: sendAddress,
  })

  if (maybeStepData.isErr()) return Err(maybeStepData.unwrapErr())
  const { orderId, transactionData, networkFeeCryptoBaseUnit } = maybeStepData.unwrap()

  const tradeQuote: TradeQuote = {
    ...tradeCommon,
    quoteOrRate: 'quote',
    deadline: Date.now() + FALLBACK_QUOTE_DEADLINE_MS,
    receiveAddress,
    steps: [
      {
        ...stepCommon,
        accountNumber,
        feeData: { networkFeeCryptoBaseUnit, protocolFees },
        swapperMetadata: { name: 'bob', orderId },
        transactionData,
      },
    ],
  }

  return Ok([tradeQuote])
}
