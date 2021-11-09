import { ChainAdapter } from '@shapeshiftoss/chain-adapters'
import { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { Asset, ChainTypes, Quote, QuoteResponse, SwapperType } from '@shapeshiftoss/types'
import { AxiosResponse } from 'axios'
import BigNumber from 'bignumber.js'
import Web3 from 'web3'
import { AbiItem, numberToHex } from 'web3-utils'

import { SwapError } from '../../../../api'
import { ZrxError } from '../../ZrxSwapper'
import { zrxService } from '../zrxService'

export type GetAllowanceRequiredArgs = {
  quote: Quote<ChainTypes, SwapperType>
  web3: Web3
  erc20AllowanceAbi: AbiItem[]
}

export type GetERC20AllowanceArgs = {
  erc20AllowanceAbi: AbiItem[]
  web3: Web3
  tokenId: string
  ownerAddress: string
  spenderAddress: string
}

type GrantAllowanceArgs = {
  quote: Quote<ChainTypes, SwapperType>
  wallet: HDWallet
  adapter: ChainAdapter<ChainTypes.Ethereum>
  erc20Abi: AbiItem[]
  web3: Web3
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

export const getERC20Allowance = async ({
  erc20AllowanceAbi,
  web3,
  tokenId,
  ownerAddress,
  spenderAddress
}: GetERC20AllowanceArgs) => {
  const erc20Contract = new web3.eth.Contract(erc20AllowanceAbi, tokenId)
  return erc20Contract.methods.allowance(ownerAddress, spenderAddress).call()
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
  const tokenId = quote.sellAsset.tokenId

  if (!ownerAddress || !spenderAddress || !tokenId) {
    throw new SwapError(
      'getAllowanceRequired - receiveAddress, allowanceContract and tokenId are required'
    )
  }

  const allowanceOnChain = await getERC20Allowance({
    web3,
    erc20AllowanceAbi,
    ownerAddress,
    spenderAddress,
    tokenId
  })
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

export const getUsdRate = async (input: Pick<Asset, 'symbol' | 'tokenId'>): Promise<string> => {
  const { symbol, tokenId } = input
  if (symbol === 'USDC') return '1' // Will break if comparing against usdc
  const rateResponse: AxiosResponse<QuoteResponse> = await zrxService.get<QuoteResponse>(
    '/swap/v1/price',
    {
      params: {
        buyToken: 'USDC',
        buyAmount: '1000000', // $1
        sellToken: tokenId || symbol
      }
    }
  )
  if (!rateResponse.data.price) throw new ZrxError('getUsdRate - Failed to get price data')

  return new BigNumber(1).dividedBy(rateResponse.data.price).toString()
}

export const grantAllowance = async ({
  quote,
  wallet,
  adapter,
  erc20Abi,
  web3
}: GrantAllowanceArgs): Promise<string> => {
  if (!quote.sellAsset.tokenId) {
    throw new Error('sellAsset.tokenId is required')
  }

  const erc20Contract = new web3.eth.Contract(erc20Abi, quote.sellAsset.tokenId)
  const approveTx = erc20Contract.methods
    .approve(quote.allowanceContract, quote.sellAmount)
    .encodeABI()

  const bip32Params = adapter.buildBIP32Params({
    accountNumber: Number(quote.sellAssetAccountId) || 0
  })

  let grantAllowanceTxToSign, signedTx, broadcastedTxId

  try {
    const { txToSign } = await adapter.buildSendTransaction({
      wallet,
      to: quote.sellAsset.tokenId,
      bip32Params,
      value: '0',
      chainSpecific: {
        erc20ContractAddress: quote.sellAsset.tokenId,
        gasPrice: numberToHex(quote.feeData?.chainSpecific?.gasPrice || 0),
        gasLimit: numberToHex(quote.feeData?.chainSpecific?.estimatedGas || 0)
      }
    })

    grantAllowanceTxToSign = {
      ...txToSign,
      data: approveTx
    }
  } catch (error) {
    throw new Error(`grantAllowance - buildSendTransaction: ${error}`)
  }

  try {
    signedTx = await adapter.signTransaction({ txToSign: grantAllowanceTxToSign, wallet })
  } catch (error) {
    throw new Error(`grantAllowance - signTransaction: ${error}`)
  }

  try {
    broadcastedTxId = await adapter.broadcastTransaction(signedTx)
  } catch (error) {
    throw new Error(`grantAllowance - broadcastTransaction: ${error}`)
  }

  return broadcastedTxId
}
