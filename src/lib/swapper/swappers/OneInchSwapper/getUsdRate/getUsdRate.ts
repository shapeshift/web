import type { Asset } from '@shapeshiftoss/asset-service'
import { fromAssetId, fromChainId } from '@shapeshiftoss/caip'
import type { AxiosResponse } from 'axios'
import axios from 'axios'
import { bn } from 'lib/bignumber/bignumber'

import { isNativeEvmAsset } from '../../utils/helpers/helpers'
import { usdcContractAddressFromChainId } from '../../ZrxSwapper/utils/helpers/helpers'
import { getNativeWrappedAssetId, getRate } from '../utils/helpers'
import type { OneInchQuoteApiInput, OneInchQuoteResponse, OneInchSwapperDeps } from '../utils/types'

export const getUsdRate = async (deps: OneInchSwapperDeps, sellAsset: Asset): Promise<string> => {
  const usdcContractAddress = usdcContractAddressFromChainId(sellAsset.chainId)
  const { assetReference: sellAssetContractAddress, chainId } = fromAssetId(sellAsset.assetId)
  if (sellAssetContractAddress === usdcContractAddress) return '1'

  const toTokenAddress = isNativeEvmAsset(sellAsset.assetId)
    ? fromAssetId(getNativeWrappedAssetId(chainId)).assetReference
    : sellAssetContractAddress //TODO: we need to extend this for all chains!

  // 1inch doesn't provide an API for getting the required input amount from an output,
  // so instead we flip this, selling 10 USDC for the asset and we can invert prior to returning
  // need to understand where else this value is used to know if this rate could be problematic
  const apiInput: OneInchQuoteApiInput = {
    fromTokenAddress: usdcContractAddress,
    toTokenAddress,
    amount: '10000000', // 10 USDC
  }
  const { chainReference } = fromChainId(chainId)
  const quoteResponse: AxiosResponse<OneInchQuoteResponse> = await axios.get(
    `${deps.apiUrl}/${chainReference}/quote`,
    { params: apiInput },
  )
  return bn(1).div(getRate(quoteResponse.data)).toString() // invert the rate
}
