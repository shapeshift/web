import type { ETHWallet } from '@shapeshiftoss/hdwallet-core'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import type { SwapErrorRight, TradeResult } from 'lib/swapper/api'
import { makeSwapErrorRight, SwapErrorType } from 'lib/swapper/api'
import { isNativeEvmAsset } from 'lib/swapper/swappers/utils/helpers/helpers'
import type { ZrxExecuteTradeInput } from 'lib/swapper/swappers/ZrxSwapper/types'
import { buildAndBroadcast, createBuildCustomTxInput } from 'lib/utils/evm'

import { getAdapter } from '../utils/helpers/helpers'

export async function zrxExecuteTrade({
  trade,
  wallet,
  from,
}: ZrxExecuteTradeInput): Promise<Result<TradeResult, SwapErrorRight>> {
  const { accountNumber, depositAddress, sellAsset, txData } = trade
  const sellAmount = trade.sellAmountBeforeFeesCryptoBaseUnit

  const maybeAdapter = getAdapter(sellAsset.chainId)
  if (maybeAdapter.isErr()) return Err(maybeAdapter.unwrapErr())
  const adapter = maybeAdapter.unwrap()

  const supportsEIP1559 = await (wallet as ETHWallet)?.ethSupportsEIP1559()

  try {
    const buildCustomTxInput = await createBuildCustomTxInput({
      from,
      supportsEIP1559,
      accountNumber,
      adapter,
      to: depositAddress,
      data: txData,
      value: isNativeEvmAsset(sellAsset.assetId) ? sellAmount : '0',
      wallet,
    })

    const txid = await buildAndBroadcast({
      buildCustomTxInput,
      adapter,
      wallet,
    })

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
