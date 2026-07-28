import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { validateAndParseAddress } from 'starknet'

import type { SwapErrorRight, SwapperDeps, TradeRate } from '../../../types'
import type { AvnuTradeRateInput } from '../types'
import { getAvnuTradeContext } from '../utils/getAvnuTradeContext'

export const getTradeRate = async (
  input: AvnuTradeRateInput,
  deps: SwapperDeps,
): Promise<Result<TradeRate[], SwapErrorRight>> => {
  const { accountNumber, sellAsset, receiveAddress } = input

  const maybeContext = await getAvnuTradeContext({ input, takerAddress: undefined })

  if (maybeContext.isErr()) return Err(maybeContext.unwrapErr())
  const { tradeCommon, stepCommon, protocolFees, sellTokenAddress } = maybeContext.unwrap()

  // Rates may be walletless - normalize the receive address only when present, and use it as a
  // stand-in sender for fee estimation
  const normalizedReceiveAddress = receiveAddress
    ? validateAndParseAddress(receiveAddress)
    : undefined

  // Rates are best-effort display: without an address, or if estimation fails, degrade to a zero fee
  const networkFeeCryptoBaseUnit = await (async () => {
    if (!normalizedReceiveAddress) return '0'

    try {
      const feeData = await deps.assertGetStarknetChainAdapter(sellAsset.chainId).getFeeData({
        to: normalizedReceiveAddress,
        value: stepCommon.sellAmountIncludingProtocolFeesCryptoBaseUnit,
        chainSpecific: {
          from: normalizedReceiveAddress,
          tokenContractAddress: sellTokenAddress,
        },
        sendMax: false,
      })

      return feeData.fast.txFee
    } catch {
      return '0'
    }
  })()

  const tradeRate: TradeRate = {
    ...tradeCommon,
    receiveAddress: normalizedReceiveAddress,
    quoteOrRate: 'rate',
    steps: [
      {
        ...stepCommon,
        accountNumber,
        feeData: { protocolFees, networkFeeCryptoBaseUnit },
      },
    ],
  }

  return Ok([tradeRate])
}
