import { fromAssetId } from '@shapeshiftoss/caip'
import { Asset } from '@shapeshiftoss/types'
import { AxiosResponse } from 'axios'

import { SwapError, SwapErrorTypes } from '../../../../api'
import { bn, bnOrZero } from '../../../utils/bignumber'
import { ZrxPriceResponse } from '../../types'
import { zrxService } from '../zrxService'

export const getUsdRate = async (asset: Asset): Promise<string> => {
  const { assetReference: erc20Address, assetNamespace } = fromAssetId(asset.assetId)
  const { symbol } = asset

  try {
    const USDC_CONTRACT_ADDRESS = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
    if (erc20Address?.toLowerCase() === USDC_CONTRACT_ADDRESS) return '1' // Will break if comparing against usdc
    const rateResponse: AxiosResponse<ZrxPriceResponse> = await zrxService.get<ZrxPriceResponse>(
      '/swap/v1/price',
      {
        params: {
          buyToken: USDC_CONTRACT_ADDRESS,
          buyAmount: '1000000000', // rate is imprecise for low $ values, hence asking for $1000
          sellToken: assetNamespace === 'erc20' ? erc20Address : symbol
        }
      }
    )

    const price = bnOrZero(rateResponse.data.price)

    if (!price.gt(0))
      throw new SwapError('[getUsdRate] - Failed to get price data', {
        code: SwapErrorTypes.RESPONSE_ERROR
      })

    return bn(1).dividedBy(price).toString()
  } catch (e) {
    if (e instanceof SwapError) throw e
    throw new SwapError('[getUsdRate]', {
      cause: e,
      code: SwapErrorTypes.USD_RATE_FAILED
    })
  }
}
