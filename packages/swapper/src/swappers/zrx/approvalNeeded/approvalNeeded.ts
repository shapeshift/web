import { BigNumber } from 'bignumber.js'
import { AxiosResponse } from 'axios'
import { ChainAdapter } from '@shapeshiftoss/chain-adapters'
import {
  ApprovalNeededInput,
  ApprovalNeededOutput,
  ChainTypes,
  QuoteResponse
} from '@shapeshiftoss/types'
import {
  AFFILIATE_ADDRESS,
  APPROVAL_BUY_AMOUNT,
  APPROVAL_GAS_LIMIT,
  DEFAULT_ETH_PATH,
  DEFAULT_SLIPPAGE
} from '../utils/constants'

import { SwapError } from '../../../api'
import { ZrxSwapperDeps } from '../ZrxSwapper'
import { zrxService } from '../utils/zrxService'
import { getERC20Allowance } from '../utils/helpers/helpers'
import { erc20AllowanceAbi } from '../utils/abi/erc20Allowance-abi'

export async function approvalNeeded(
  { adapterManager, web3 }: ZrxSwapperDeps,
  { quote, wallet }: ApprovalNeededInput
): Promise<ApprovalNeededOutput> {
  const { sellAsset } = quote

  if (sellAsset.symbol === 'ETH') {
    return { approvalNeeded: false }
  }

  if (sellAsset.chain !== ChainTypes.Ethereum) {
    throw new SwapError('ZrxSwapper:approvalNeeded only Ethereum chain type is supported')
  }

  const adapter: ChainAdapter<ChainTypes> = adapterManager.byChain(sellAsset.chain)
  const receiveAddress = await adapter.getAddress({ wallet, path: DEFAULT_ETH_PATH })

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

  const allowanceResult = getERC20Allowance(
    { web3, erc20AllowanceAbi },
    {
      tokenId: quote.sellAsset.tokenId as string,
      spenderAddress: data.allowanceTarget as string,
      ownerAddress: receiveAddress
    }
  )

  const allowanceOnChain = new BigNumber(allowanceResult || '0')

  return {
    approvalNeeded: allowanceOnChain.lt(new BigNumber(quote.sellAmount || 1)),
    gas: APPROVAL_GAS_LIMIT,
    gasPrice: data.gasPrice
  }
}
