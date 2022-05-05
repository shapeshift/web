import { ChainTypes } from '@shapeshiftoss/types'
import { numberToHex } from 'web3-utils'

import { ExecuteTradeInput, SwapError, TradeResult } from '../../../api'
import { ZrxSwapperDeps } from '../ZrxSwapper'

export async function zrxExecuteTrade(
  { adapterManager }: ZrxSwapperDeps,
  { trade, wallet }: ExecuteTradeInput<ChainTypes.Ethereum>
): Promise<TradeResult> {
  const { sellAsset } = trade

  if (!sellAsset.symbol) {
    throw new SwapError('ZrxSwapper:ZrxExecuteTrade sellAssetSymbol is required')
  }

  if (!trade.sellAssetAccountId) {
    throw new SwapError('ZrxSwapper:ZrxExecuteTrade sellAssetAccountId is required')
  }

  if (!trade.sellAmount) {
    throw new SwapError('ZrxSwapper:ZrxExecuteTrade sellAmount is required')
  }

  if (!trade.depositAddress) {
    throw new SwapError('ZrxSwapper:ZrxExecuteTrade depositAddress is required')
  }

  // value is 0 for erc20s
  const value = sellAsset.symbol === 'ETH' ? trade.sellAmount : '0'
  const adapter = adapterManager.byChain(sellAsset.chain)
  const bip44Params = adapter.buildBIP44Params({
    accountNumber: Number(trade.sellAssetAccountId)
  })

  let buildTxResponse, signedTx, txid
  try {
    buildTxResponse = await adapter.buildSendTransaction({
      value,
      wallet,
      to: trade.depositAddress,
      chainSpecific: {
        gasPrice: numberToHex(trade.feeData?.chainSpecific?.gasPrice || 0),
        gasLimit: numberToHex(trade.feeData?.chainSpecific?.estimatedGas || 0)
      },
      bip44Params
    })
  } catch (error) {
    throw new SwapError(`ZrxExecuteTrade - buildSendTransaction error: ${error}`)
  }

  const { txToSign } = buildTxResponse

  const txWithQuoteData = { ...txToSign, data: trade.txData ?? '' }

  if (wallet.supportsOfflineSigning()) {
    try {
      signedTx = await adapter.signTransaction({ txToSign: txWithQuoteData, wallet })
    } catch (error) {
      throw new SwapError(`ZrxExecuteTrade - signTransaction error: ${error}`)
    }

    if (!signedTx) {
      throw new SwapError(`ZrxExecuteTrade - Signed transaction is required: ${signedTx}`)
    }

    try {
      txid = await adapter.broadcastTransaction(signedTx)
    } catch (error) {
      throw new SwapError(`ZrxExecuteTrade - broadcastTransaction error: ${error}`)
    }

    return { txid }
  } else if (wallet.supportsBroadcast() && adapter.signAndBroadcastTransaction) {
    try {
      txid = await adapter.signAndBroadcastTransaction?.({ txToSign: txWithQuoteData, wallet })
    } catch (error) {
      throw new SwapError(`ZrxExecuteTrade - signAndBroadcastTransaction error: ${error}`)
    }

    return { txid }
  } else {
    throw new SwapError('ZrxExecuteTrade - invalid HDWallet config')
  }
}
