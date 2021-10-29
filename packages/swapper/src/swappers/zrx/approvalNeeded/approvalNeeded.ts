import {
  ApprovalNeededInput,
  ApprovalNeededOutput,
  ChainTypes,
  QuoteResponse,
  SwapperType
} from '@shapeshiftoss/types'
import { AxiosResponse } from 'axios'
import { BigNumber } from 'bignumber.js'

import { SwapError } from '../../../api'
import { erc20AllowanceAbi } from '../utils/abi/erc20Allowance-abi'
import {
  AFFILIATE_ADDRESS,
  APPROVAL_BUY_AMOUNT,
  APPROVAL_GAS_LIMIT,
  DEFAULT_SLIPPAGE
} from '../utils/constants'
import { getERC20Allowance } from '../utils/helpers/helpers'
import { zrxService } from '../utils/zrxService'
import { ZrxSwapperDeps } from '../ZrxSwapper'

export async function approvalNeeded(
  { adapterManager, web3 }: ZrxSwapperDeps,
  { quote, wallet }: ApprovalNeededInput<ChainTypes, SwapperType>
): Promise<ApprovalNeededOutput> {
  const { sellAsset } = quote

  if (sellAsset.symbol === 'ETH') {
    return { approvalNeeded: false }
  }

  if (sellAsset.chain !== ChainTypes.Ethereum) {
    throw new SwapError('ZrxSwapper:approvalNeeded only Ethereum chain type is supported')
  }

  const accountNumber = quote.sellAssetAccountId ? Number(quote.sellAssetAccountId) : 0

  const adapter = adapterManager.byChain(sellAsset.chain)
  const bip32Params = adapter.buildBIP32Params({ accountNumber })
  const receiveAddress = await adapter.getAddress({ wallet, bip32Params })

  /**
   * /swap/v1/quote
   * params: {
   *   sellToken: contract address (or symbol) of token to sell
   *   buyToken: contractAddress (or symbol) of token to buy
   *   sellAmount?: integer string value of the smallest increment of the sell token
   *   buyAmount?: integer string value of the smallest incremtent of the buy token
   * }
   */
  const quoteResponse: AxiosResponse<QuoteResponse> = await zrxService.get<QuoteResponse>(
    '/swap/v1/quote',
    {
      params: {
        buyToken: 'ETH',
        sellToken: quote.sellAsset.tokenId || quote.sellAsset.symbol || quote.sellAsset.chain,
        buyAmount: APPROVAL_BUY_AMOUNT,
        takerAddress: receiveAddress,
        slippagePercentage: DEFAULT_SLIPPAGE,
        skipValidation: true,
        affiliateAddress: AFFILIATE_ADDRESS
      }
    }
  )
  const { data } = quoteResponse

  if (!quote.sellAsset.tokenId || !data.allowanceTarget) {
    throw new SwapError('approvalNeeded - tokenId and allowanceTarget are required')
  }
  const allowanceResult = await getERC20Allowance({
    web3,
    erc20AllowanceAbi,
    tokenId: quote.sellAsset.tokenId,
    spenderAddress: data.allowanceTarget,
    ownerAddress: receiveAddress
  })
  const allowanceOnChain = new BigNumber(allowanceResult || '0')

  return {
    approvalNeeded: allowanceOnChain.lt(new BigNumber(quote.sellAmount || 1)),
    gas: APPROVAL_GAS_LIMIT,
    gasPrice: data.gasPrice
  }
}
