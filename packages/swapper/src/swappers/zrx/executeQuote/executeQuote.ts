import { numberToHex } from 'web3-utils'
import { BIP32Params, ExecQuoteInput, ExecQuoteOutput } from '@shapeshiftoss/types'
import { SwapError } from '../../../api'
import { ZrxSwapperDeps } from '../ZrxSwapper'

export async function executeQuote(
  { adapterManager }: ZrxSwapperDeps,
  { quote, wallet }: ExecQuoteInput
): Promise<ExecQuoteOutput> {
  const { sellAsset } = quote

  if (!quote.success) {
    throw new SwapError('ZrxSwapper:executeQuote Cannot execute a failed quote')
  }

  if (!sellAsset.network || !sellAsset.symbol) {
    throw new SwapError('ZrxSwapper:executeQuote sellAssetNetwork and sellAssetSymbol are required')
  }

  if (!quote.sellAssetAccountId) {
    throw new SwapError('ZrxSwapper:executeQuote sellAssetAccountId is required')
  }

  if (!quote.sellAmount) {
    throw new SwapError('ZrxSwapper:executeQuote sellAmount is required')
  }

  if (!quote.depositAddress) {
    throw new SwapError('ZrxSwapper:executeQuote depositAddress is required')
  }

  // value is 0 for erc20s
  const value = sellAsset.symbol === 'ETH' ? numberToHex(quote.sellAmount || 0) : '0x0'
  const adapter = adapterManager.byChain(sellAsset.chain)

  // TODO(0xdef1cafe): populate this
  const bip32Params: BIP32Params = {
    purpose: 0,
    coinType: 0,
    accountNumber: 0
  }
  const { txToSign } = await adapter.buildSendTransaction({
    value,
    wallet,
    to: quote.depositAddress,
    fee: numberToHex(quote.feeData?.gasPrice || 0),
    gasLimit: numberToHex(quote.feeData?.estimatedGas || 0),
    bip32Params
  })

  const signedTx = await adapter.signTransaction({ txToSign, wallet })

  const txid = await adapter.broadcastTransaction(signedTx)

  return { txid }
}
