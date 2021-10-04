import { numberToHex } from 'web3-utils'
import { ExecQuoteInput, ExecQuoteOutput } from '@shapeshiftoss/types'
import { SwapError } from '../../../api'
import { ZrxSwapperDeps } from '../ZrxSwapper'
import { DEFAULT_ETH_PATH } from '../utils/constants'

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

  const { txToSign } = await adapter.buildSendTransaction({
    value,
    wallet,
    to: quote.depositAddress,
    path: DEFAULT_ETH_PATH,
    fee: numberToHex(quote.feeData?.gasPrice || 0),
    limit: numberToHex(quote.feeData?.estimatedGas || 0)
  })

  const signedTx = await adapter.signTransaction({ txToSign, wallet })

  const txid = await adapter.broadcastTransaction(signedTx)

  return { txid }
}
