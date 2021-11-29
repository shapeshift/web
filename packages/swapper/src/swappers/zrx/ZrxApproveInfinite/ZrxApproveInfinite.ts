import { ChainAdapter } from '@shapeshiftoss/chain-adapters'
import { ApproveInfiniteInput, ChainTypes, QuoteResponse, SwapperType } from '@shapeshiftoss/types'
import { AxiosResponse } from 'axios'

import { SwapError } from '../../../api'
import { erc20Abi } from '../utils/abi/erc20-abi'
import { bnOrZero } from '../utils/bignumber'
import { AFFILIATE_ADDRESS, DEFAULT_SLIPPAGE, MAX_ALLOWANCE } from '../utils/constants'
import { grantAllowance } from '../utils/helpers/helpers'
import { zrxService } from '../utils/zrxService'
import { ZrxSwapperDeps } from '../ZrxSwapper'

export async function ZrxApproveInfinite(
  { adapterManager, web3 }: ZrxSwapperDeps,
  { quote, wallet }: ApproveInfiniteInput<ChainTypes, SwapperType>
) {
  const adapter: ChainAdapter<ChainTypes.Ethereum> = adapterManager.byChain(ChainTypes.Ethereum)
  const bip32Params = adapter.buildBIP32Params({
    accountNumber: bnOrZero(quote.sellAssetAccountId).toNumber()
  }) // TODO: Add account number
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
        sellToken: quote.sellAsset.tokenId || quote.sellAsset.symbol || quote.sellAsset.network,
        buyAmount: '100000000000000000', // A valid buy amount - 0.1 ETH
        takerAddress: receiveAddress,
        slippagePercentage: DEFAULT_SLIPPAGE,
        skipValidation: true,
        affiliateAddress: AFFILIATE_ADDRESS
      }
    }
  )
  const { data } = quoteResponse

  if (!data.allowanceTarget) {
    throw new SwapError('approveInfinite - allowanceTarget is required')
  }

  const allowanceGrantRequired = await grantAllowance({
    quote: {
      ...quote,
      allowanceContract: data.allowanceTarget,
      sellAmount: MAX_ALLOWANCE
    },
    wallet,
    adapter,
    erc20Abi,
    web3
  })

  return allowanceGrantRequired
}
