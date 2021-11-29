import { ChainTypes, ExecQuoteInput, ExecQuoteOutput, SwapperType } from '@shapeshiftoss/types'
import { numberToHex } from 'web3-utils'

import { SwapError } from '../../../api'
import { ZrxSwapperDeps } from '../ZrxSwapper'

export async function ZrxExecuteQuote(
  { adapterManager }: ZrxSwapperDeps,
  { quote, wallet }: ExecQuoteInput<ChainTypes.Ethereum, SwapperType>
): Promise<ExecQuoteOutput> {
  const { sellAsset } = quote

  if (!quote.success) {
    throw new SwapError('ZrxSwapper:ZrxExecuteQuote Cannot execute a failed quote')
  }

  if (!sellAsset.network || !sellAsset.symbol) {
    throw new SwapError(
      'ZrxSwapper:ZrxExecuteQuote sellAssetNetwork and sellAssetSymbol are required'
    )
  }

  if (!quote.sellAssetAccountId) {
    throw new SwapError('ZrxSwapper:ZrxExecuteQuote sellAssetAccountId is required')
  }

  if (!quote.sellAmount) {
    throw new SwapError('ZrxSwapper:ZrxExecuteQuote sellAmount is required')
  }

  if (!quote.depositAddress) {
    throw new SwapError('ZrxSwapper:ZrxExecuteQuote depositAddress is required')
  }

  // value is 0 for erc20s
  const value = sellAsset.symbol === 'ETH' ? quote.sellAmount : '0'
  const adapter = adapterManager.byChain(sellAsset.chain)
  const bip32Params = adapter.buildBIP32Params({
    accountNumber: Number(quote.sellAssetAccountId)
  })

  let buildTxResponse, signedTx, txid
  try {
    buildTxResponse = await adapter.buildSendTransaction({
      value,
      wallet,
      to: quote.depositAddress,
      chainSpecific: {
        gasPrice: numberToHex(quote.feeData?.chainSpecific?.gasPrice || 0),
        gasLimit: numberToHex(quote.feeData?.chainSpecific?.estimatedGas || 0)
      },
      bip32Params
    })
  } catch (error) {
    throw new SwapError(`ZrxExecuteQuote - buildSendTransaction error: ${error}`)
  }

  const { txToSign } = buildTxResponse

  const txWithQuoteData = { ...txToSign, data: quote.txData ?? '' }

  if (wallet.supportsOfflineSigning()) {
    try {
      signedTx = await adapter.signTransaction({ txToSign: txWithQuoteData, wallet })
    } catch (error) {
      throw new SwapError(`ZrxExecuteQuote - signTransaction error: ${error}`)
    }

    if (!signedTx) {
      throw new SwapError(`ZrxExecuteQuote - Signed transaction is required: ${signedTx}`)
    }

    try {
      txid = await adapter.broadcastTransaction(signedTx)
    } catch (error) {
      throw new SwapError(`ZrxExecuteQuote - broadcastTransaction error: ${error}`)
    }

    return { txid }
  } else if (wallet.supportsBroadcast() && adapter.signAndBroadcastTransaction) {
    try {
      txid = await adapter.signAndBroadcastTransaction?.({ txToSign: txWithQuoteData, wallet })
    } catch (error) {
      throw new SwapError(`ZrxExecuteQuote - signAndBroadcastTransaction error: ${error}`)
    }

    return { txid }
  } else {
    throw new SwapError('ZrxExecuteQuote - invalid HDWallet config')
  }
}
