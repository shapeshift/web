import { numberToHex } from 'web3-utils'

import { SwapError, SwapErrorType, TradeResult } from '../../../api'
import { ZrxExecuteTradeInput, ZrxSwapperDeps } from '../types'
import { isNativeEvmAsset } from '../utils/helpers/helpers'
import { ZrxSupportedChainId } from '../ZrxSwapper'

export async function zrxExecuteTrade<T extends ZrxSupportedChainId>(
  { adapter }: ZrxSwapperDeps,
  { trade, wallet }: ZrxExecuteTradeInput<T>,
): Promise<TradeResult> {
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
        gasLimit: numberToHex(trade.feeData?.chainSpecific?.estimatedGas || 0),
      },
      accountNumber,
    })

    const { txToSign } = buildTxResponse

    const txWithQuoteData = { ...txToSign, data: trade.txData ?? '' }

    if (wallet.supportsOfflineSigning()) {
      const signedTx = await adapter.signTransaction({ txToSign: txWithQuoteData, wallet })

      const txid = await adapter.broadcastTransaction(signedTx)

      return { tradeId: txid }
    } else if (wallet.supportsBroadcast() && adapter.signAndBroadcastTransaction) {
      const txid = await adapter.signAndBroadcastTransaction?.({
        txToSign: txWithQuoteData,
        wallet,
      })

      return { tradeId: txid }
    } else {
      throw new SwapError('[zrxExecuteTrade]', {
        code: SwapErrorType.SIGN_AND_BROADCAST_FAILED,
      })
    }
  } catch (e) {
    if (e instanceof SwapError) throw e
    throw new SwapError('[zrxExecuteTrade]', {
      cause: e,
      code: SwapErrorType.EXECUTE_TRADE_FAILED,
    })
  }
}
