import { chainAdapters, ChainTypes, SendMaxAmountInput } from '@shapeshiftoss/types'
import BigNumber from 'bignumber.js'

import { SwapError } from '../../../api'
import { bnOrZero } from '../utils/bignumber'
import { ETH_FEE_ESTIMATE_PADDING } from '../utils/constants'
import { ZrxSwapperDeps } from '../ZrxSwapper'

export async function getSendMaxAmount(
  { adapterManager }: ZrxSwapperDeps,
  {
    wallet,
    quote,
    sellAssetAccountId,
    feeEstimateKey = chainAdapters.FeeDataKey.Average
  }: SendMaxAmountInput
): Promise<string> {
  const adapter = adapterManager.byChain(ChainTypes.Ethereum)
  const bip32Params = adapter.buildBIP32Params({
    accountNumber: bnOrZero(sellAssetAccountId).toNumber()
  })
  const ethAddress = await adapter.getAddress({ wallet, bip32Params })

  const account = await adapter.getAccount(ethAddress)

  if (!quote.sellAsset) {
    throw new SwapError('quote.sellAsset is required')
  }

  const tokenId = quote.sellAsset?.tokenId

  let balance: string | undefined
  if (tokenId) {
    balance = account.chainSpecific.tokens?.find(
      (token: chainAdapters.ethereum.TokenWithBalance) =>
        token.contract.toLowerCase() === tokenId.toLowerCase()
    )?.balance
  } else {
    balance = account.balance
  }

  if (!balance) {
    throw new SwapError(`No balance found for ${tokenId ? quote.sellAsset.symbol : 'ETH'}`)
  }

  // return the erc20 token balance. No need to subtract the fee.
  if (tokenId && new BigNumber(balance).gt(0)) {
    return balance
  }

  if (!quote.txData) {
    throw new SwapError('quote.txData is required to get correct fee estimate')
  }

  const feeEstimates = await adapter.getFeeData({
    to: quote.depositAddress,
    value: bnOrZero(quote.sellAmount).toString(),
    chainSpecific: {
      from: ethAddress,
      contractData: quote.txData
    }
  })

  const estimatedFee = feeEstimates[feeEstimateKey].txFee

  // (ryankk) We need to pad the fee for ETH max sends because the fee estimate is based off
  // of a minimum quote value (quote.sellAmount) and not the users full ETH balance.
  const paddedFee = new BigNumber(estimatedFee).times(ETH_FEE_ESTIMATE_PADDING)
  const sendMaxAmount = new BigNumber(balance).minus(paddedFee)

  // gte covers if sendMaxAmount is NaN
  if (!sendMaxAmount.gte(0)) {
    throw new SwapError('ETH balance is less than estimated fee')
  }

  return sendMaxAmount.toString()
}
