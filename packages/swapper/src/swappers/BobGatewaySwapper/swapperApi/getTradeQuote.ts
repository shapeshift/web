import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
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

  // omit the sender for utxo sells so order creation does not enforce a per-address confirmed
  // funds check (deposits are matched via op_return, not the sending address)
  const sender = isEvmChainId(sellAsset.chainId) ? sendAddress : undefined

  const maybeContext = await getBobGatewayTradeContext({
    input,
    deps,
    sender,
    recipient: receiveAddress,
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
