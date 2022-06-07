import { fromAssetId } from '@shapeshiftoss/caip'
import { Asset } from '@shapeshiftoss/types'
import { AxiosResponse } from 'axios'

import { SwapError, SwapErrorTypes } from '../../../../api'
import { bn, bnOrZero } from '../../../utils/bignumber'
import { CowSwapperDeps } from '../../CowSwapper'
import { CowSwapPriceResponse } from '../../types'
import { cowService } from '../cowService'

const USDC_CONTRACT_ADDRESS = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
const USDC_ASSET_PRECISION = 6

export const getUsdRate = async ({ apiUrl }: CowSwapperDeps, input: Asset): Promise<string> => {
  const asset = input
  const { assetReference: erc20Address, assetNamespace } = fromAssetId(asset.assetId)

  if (assetNamespace !== 'erc20') {
    throw new SwapError('[getUsdRate] - unsupported asset namespace', {
      code: SwapErrorTypes.USD_RATE_FAILED,
      details: { assetNamespace }
    })
  }

  const buyAmountInDollars = 1000
  const buyAmount = bn(buyAmountInDollars).times(bn(10).exponentiatedBy(USDC_ASSET_PRECISION))

  try {
    // rate is imprecise for low $ values, hence asking for $1000
    // cowSwap api used : markets/{baseToken}-{quoteToken}/{kind}/{amount}
    // It returns the estimated amount in quoteToken for either buying or selling amount of baseToken.
    const rateResponse: AxiosResponse<CowSwapPriceResponse> =
      await cowService.get<CowSwapPriceResponse>(
        `${apiUrl}/v1/markets/${USDC_CONTRACT_ADDRESS}-${erc20Address}/buy/${buyAmount}`
      )

    const tokenAmount = bnOrZero(rateResponse.data.amount).div(
      bn(10).exponentiatedBy(asset.precision)
    )

    if (!tokenAmount.gt(0))
      throw new SwapError('[getUsdRate] - Failed to get token amount', {
        code: SwapErrorTypes.RESPONSE_ERROR
      })

    // dividing $1000 by amount of token received
    return bn(buyAmountInDollars).dividedBy(tokenAmount).toString()
  } catch (e) {
    if (e instanceof SwapError) throw e
    throw new SwapError('[getUsdRate]', {
      cause: e,
      code: SwapErrorTypes.USD_RATE_FAILED
    })
  }
}
