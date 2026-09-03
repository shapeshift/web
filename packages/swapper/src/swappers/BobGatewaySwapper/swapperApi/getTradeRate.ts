import { btcChainId } from '@shapeshiftoss/caip'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'

import type { SwapErrorRight, SwapperDeps, TradeRate } from '../../../types'
import type { BobGatewayTradeRateInput } from '../types'
import { getBobGatewayStepData } from '../utils/getBobGatewayStepData'
import { getBobGatewayTradeContext } from '../utils/getBobGatewayTradeContext'
import { dummyAddressForChainId } from '../utils/helpers'

export const getBobGatewayTradeRate = async (
  input: BobGatewayTradeRateInput,
  deps: SwapperDeps,
): Promise<Result<TradeRate[], SwapErrorRight>> => {
  const { accountNumber, sellAsset, buyAsset, receiveAddress } = input

  const isBtcSell = sellAsset.chainId === btcChainId

  const recipient = receiveAddress ?? dummyAddressForChainId(buyAsset.chainId)
  const sender = isBtcSell ? undefined : dummyAddressForChainId(sellAsset.chainId)
  // utxo deposits are refunded on the sell chain, so the refund address must be a btc address
  const refundAddress = isBtcSell ? dummyAddressForChainId(sellAsset.chainId) : undefined

  const maybeContext = await getBobGatewayTradeContext({
    input,
    deps,
    sender,
    recipient,
    refundAddress,
  })

  if (maybeContext.isErr()) return Err(maybeContext.unwrapErr())
  const { tradeCommon, stepCommon, protocolFees, stepDataArgs } = maybeContext.unwrap()

  const maybeStepData = await getBobGatewayStepData({ ...stepDataArgs, type: 'rate', input })

  if (maybeStepData.isErr()) return Err(maybeStepData.unwrapErr())
  const { networkFeeCryptoBaseUnit } = maybeStepData.unwrap()

  const tradeRate: TradeRate = {
    ...tradeCommon,
    quoteOrRate: 'rate',
    receiveAddress,
    steps: [
      {
        ...stepCommon,
        accountNumber,
        feeData: { networkFeeCryptoBaseUnit, protocolFees },
      },
    ],
  }

  return Ok([tradeRate])
}
