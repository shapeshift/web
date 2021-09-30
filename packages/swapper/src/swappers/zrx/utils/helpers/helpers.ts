import BigNumber from 'bignumber.js'
import { AbiItem } from 'web3-utils'
import Web3 from 'web3'
import { SwapError } from '../../../../api'
import { Quote } from '@shapeshiftoss/types'

export type GetAllowanceRequiredArgs = {
  quote: Quote
  web3: Web3
  erc20AllowanceAbi: AbiItem[]
}

/**
 * Very large amounts like those found in ERC20s with a precision of 18 get converted
 * to exponential notation ('1.6e+21') in javascript. The 0x api doesn't play well with
 * exponential notation so we need to ensure that it is represented as an integer string.
 * This function keeps 17 significant digits, so even if we try to trade 1 Billion of an
 * ETH or ERC20, we still keep 7 decimal places.
 * @param amount
 */
export const normalizeAmount = (amount: string | undefined): string | undefined => {
  if (!amount) return
  return new BigNumber(amount).toNumber().toLocaleString('fullwide', { useGrouping: false })
}

export const getAllowanceRequired = async ({
  quote,
  web3,
  erc20AllowanceAbi
}: GetAllowanceRequiredArgs): Promise<BigNumber> => {
  if (quote.sellAsset.symbol === 'ETH') {
    return new BigNumber(0)
  }

  const ownerAddress = quote.receiveAddress
  const spenderAddress = quote.allowanceContract

  const erc20Contract = new web3.eth.Contract(erc20AllowanceAbi, quote.sellAsset.tokenId)
  const allowanceOnChain = erc20Contract.methods.allowance(ownerAddress, spenderAddress).call()

  if (allowanceOnChain === '0') {
    return new BigNumber(quote.sellAmount || 0)
  }
  if (!allowanceOnChain) {
    throw new SwapError(
      `No allowance data for ${quote.allowanceContract} to ${quote.receiveAddress}`
    )
  }
  const allowanceRequired = new BigNumber(quote.sellAmount || 0).minus(allowanceOnChain)
  return allowanceRequired.lt(0) ? new BigNumber(0) : allowanceRequired
}
