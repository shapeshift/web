import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import type { SwapErrorRight, TradeResult } from 'lib/swapper/api'
import { makeSwapErrorRight, SwapError, SwapErrorType } from 'lib/swapper/api'
import {
  buildAndBroadcast,
  createBuildCustomTxInput,
  isNativeEvmAsset,
} from 'lib/swapper/swappers/utils/helpers/helpers'
import type { ZrxExecuteTradeInput } from 'lib/swapper/swappers/ZrxSwapper/types'
import { isEvmChainAdapter } from 'lib/utils'

export async function zrxExecuteTrade({
  trade,
  wallet,
}: ZrxExecuteTradeInput): Promise<Result<TradeResult, SwapErrorRight>> {
  const { accountNumber, depositAddress, sellAmountBeforeFeesCryptoBaseUnit, sellAsset, txData } =
    trade

  const adapterManager = getChainAdapterManager()
  const adapter = adapterManager.get(sellAsset.chainId)

  if (!adapter || !isEvmChainAdapter(adapter)) {
    return Err(
      makeSwapErrorRight({
        message: 'Invalid chain adapter',
        code: SwapErrorType.UNSUPPORTED_CHAIN,
        details: { adapter },
      }),
    )
  }

  try {
    const buildCustomTxArgs = await createBuildCustomTxInput({
      accountNumber,
      adapter,
      to: depositAddress,
      data: txData,
      value: isNativeEvmAsset(sellAsset.assetId) ? sellAmountBeforeFeesCryptoBaseUnit : '0',
      wallet,
    })

    const txid = await buildAndBroadcast({
      buildCustomTxArgs,
      adapter,
      wallet,
    })

    return Ok({ tradeId: txid })
  } catch (e) {
    if (e instanceof SwapError)
      return Err(makeSwapErrorRight({ message: e.message, code: e.code, details: e.details }))
    return Err(
      makeSwapErrorRight({
        message: '[zrxExecuteTrade]',
        cause: e,
        code: SwapErrorType.EXECUTE_TRADE_FAILED,
      }),
    )
  }
}
