import type { Result } from '@sniptt/monads'
import { Ok } from '@sniptt/monads'
import { numberToHex } from 'web3-utils'

import type { SwapErrorRight, TradeResult } from '../../../api'
import { SwapError, SwapErrorType } from '../../../api'
import type { ZrxExecuteTradeInput, ZrxSwapperDeps } from '../types'
import { isNativeEvmAsset } from '../utils/helpers/helpers'
import type { ZrxSupportedChainId } from '../ZrxSwapper'

export async function zrxExecuteTrade<T extends ZrxSupportedChainId>(
  { adapter }: ZrxSwapperDeps,
  { trade, wallet }: ZrxExecuteTradeInput<T>,
): Promise<Result<TradeResult, SwapErrorRight>> {
  const { accountNumber, sellAsset } = trade

  try {
    // value is 0 for erc20s
    const value = isNativeEvmAsset(sellAsset.assetId)
      ? trade.sellAmountBeforeFeesCryptoBaseUnit
      : '0'

    const buildTxResponse = await adapter.buildSendTransaction({
      value,
      wallet,
      to: trade.depositAddress,
      chainSpecific: {
        gasPrice: numberToHex(trade.feeData?.chainSpecific?.gasPriceCryptoBaseUnit || 0),
        gasLimit: numberToHex(trade.feeData?.chainSpecific?.estimatedGasCryptoBaseUnit || 0),
      },
      accountNumber,
    })

    const { txToSign } = buildTxResponse

    const txWithQuoteData = { ...txToSign, data: trade.txData ?? '' }

    if (wallet.supportsOfflineSigning()) {
      const signedTx = await adapter.signTransaction({ txToSign: txWithQuoteData, wallet })

      const txid = await adapter.broadcastTransaction(signedTx)

      return Ok({ tradeId: txid })
    } else if (wallet.supportsBroadcast() && adapter.signAndBroadcastTransaction) {
      const txid = await adapter.signAndBroadcastTransaction?.({
        txToSign: txWithQuoteData,
        wallet,
      })

      return Ok({ tradeId: txid })
    } else {
      throw new SwapError('[zrxExecuteTrade]', {
        code: SwapErrorType.SIGN_AND_BROADCAST_FAILED,
      })
    }
  } catch (e) {
    // TODO(gomes): don't throw in module
    if (e instanceof SwapError) throw e
    throw new SwapError('[zrxExecuteTrade]', {
      cause: e,
      code: SwapErrorType.EXECUTE_TRADE_FAILED,
    })
  }
}
