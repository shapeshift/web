import { numberToHex } from 'web3-utils'

import { ExecuteTradeInput, SwapError, SwapErrorTypes, TradeResult } from '../../../api'
import { bnOrZero } from '../utils/bignumber'
import { ZrxSwapperDeps } from '../ZrxSwapper'

export async function zrxExecuteTrade(
  { adapterManager }: ZrxSwapperDeps,
  { trade, wallet }: ExecuteTradeInput<'eip155:1'>
): Promise<TradeResult> {
  const { sellAsset } = trade
  try {
    // value is 0 for erc20s
    const value = sellAsset.assetId === 'eip155:1/slip44:60' ? trade.sellAmount : '0'
    const adapter = await adapterManager.byChainId(sellAsset.chainId)
    const bip44Params = adapter.buildBIP44Params({
      accountNumber: bnOrZero(trade.sellAssetAccountId).toNumber()
    })

    const buildTxResponse = await adapter.buildSendTransaction({
      value,
      wallet,
      to: trade.depositAddress,
      chainSpecific: {
        gasPrice: numberToHex(trade.feeData?.chainSpecific?.gasPrice || 0),
        gasLimit: numberToHex(trade.feeData?.chainSpecific?.estimatedGas || 0)
      },
      bip44Params
    })

    const { txToSign } = buildTxResponse

    const txWithQuoteData = { ...txToSign, data: trade.txData ?? '' }

    if (wallet.supportsOfflineSigning()) {
      const signedTx = await adapter.signTransaction({ txToSign: txWithQuoteData, wallet })

      const txid = await adapter.broadcastTransaction(signedTx)

      return { txid }
    } else if (wallet.supportsBroadcast() && adapter.signAndBroadcastTransaction) {
      const txid = await adapter.signAndBroadcastTransaction?.({
        txToSign: txWithQuoteData,
        wallet
      })

      return { txid }
    } else {
      throw new SwapError('[zrxExecuteTrade]', {
        code: SwapErrorTypes.SIGN_AND_BROADCAST_FAILED
      })
    }
  } catch (e) {
    if (e instanceof SwapError) throw e
    throw new SwapError('[zrxExecuteTrade]', {
      cause: e,
      code: SwapErrorTypes.EXECUTE_TRADE_FAILED
    })
  }
}
