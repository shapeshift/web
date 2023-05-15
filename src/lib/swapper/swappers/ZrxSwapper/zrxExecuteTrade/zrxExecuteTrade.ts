import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import type { SwapErrorRight, TradeResult } from 'lib/swapper/api'
import { makeSwapErrorRight, SwapError, SwapErrorType } from 'lib/swapper/api'
import {
  buildAndBroadcast,
  createBuildCustomTxInput,
  isNativeEvmAsset,
} from 'lib/swapper/swappers/utils/helpers/helpers'
import type { ZrxExecuteTradeInput, ZrxSwapperDeps } from 'lib/swapper/swappers/ZrxSwapper/types'
import type { ZrxSupportedChainId } from 'lib/swapper/swappers/ZrxSwapper/ZrxSwapper'

export async function zrxExecuteTrade<T extends ZrxSupportedChainId>(
  { adapter }: ZrxSwapperDeps,
  { trade, wallet }: ZrxExecuteTradeInput<T>,
): Promise<Result<TradeResult, SwapErrorRight>> {
  const { accountNumber, depositAddress, sellAmountBeforeFeesCryptoBaseUnit, sellAsset, txData } =
    trade

  try {
    const buildCustomTxArgs = await createBuildCustomTxInput({
      accountNumber,
      adapter,
      erc20ContractAddress: depositAddress,
      erc20ContractData: txData,
      sendAmountCryptoBaseUnit: isNativeEvmAsset(sellAsset.assetId)
        ? sellAmountBeforeFeesCryptoBaseUnit
        : '0',
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
