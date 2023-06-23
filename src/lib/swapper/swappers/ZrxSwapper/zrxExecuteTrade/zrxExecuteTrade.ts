import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import type { SwapErrorRight, TradeResult } from 'lib/swapper/api'
import { makeSwapErrorRight, SwapErrorType } from 'lib/swapper/api'
import { isNativeEvmAsset } from 'lib/swapper/swappers/utils/helpers/helpers'
import { buildAndBroadcast, createBuildCustomTxInput, getFees } from 'lib/utils/evm'

import type { ZrxExecuteTradeInput } from '../types'
import { getAdapter } from '../utils/helpers/helpers'

export async function zrxExecuteTrade({
  trade,
  wallet,
}: ZrxExecuteTradeInput): Promise<Result<TradeResult, SwapErrorRight>> {
  const { accountNumber, depositAddress, sellAsset, txData } = trade
  const sellAmount = trade.sellAmountBeforeFeesCryptoBaseUnit

  const maybeAdapter = getAdapter(sellAsset.chainId)
  if (maybeAdapter.isErr()) return Err(maybeAdapter.unwrapErr())
  const adapter = maybeAdapter.unwrap()

  const [from, supportsEIP1559] = await Promise.all([
    adapter.getAddress({
      wallet,
      accountNumber,
    }),
    supportsETH(wallet) && (await wallet.ethSupportsEIP1559()),
  ])

  const fees = await getFees({
    adapter,
    to: depositAddress,
    data: txData,
    value: isNativeEvmAsset(sellAsset.assetId) ? sellAmount : '0',
    from,
    supportsEIP1559,
  })
  try {
    const buildCustomTxInput = await createBuildCustomTxInput({
      accountNumber,
      adapter,
      to: depositAddress,
      data: txData,
      value: isNativeEvmAsset(sellAsset.assetId) ? sellAmount : '0',
      wallet,
      chainSpecific: fees,
    })

    const txid = await buildAndBroadcast({ buildCustomTxInput, adapter })

    return Ok({ tradeId: txid })
  } catch (e) {
    return Err(
      makeSwapErrorRight({
        message: '[Zrx: executeTrade] - failed to build and broadcast transaction',
        cause: e,
        code: SwapErrorType.EXECUTE_TRADE_FAILED,
      }),
    )
  }
}
