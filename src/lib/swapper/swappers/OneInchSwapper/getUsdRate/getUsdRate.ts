import { fromAssetId, fromChainId } from '@shapeshiftoss/caip'
import type { Result } from '@sniptt/monads'
import { Ok } from '@sniptt/monads'
import type { Asset } from 'lib/asset-service'
import { bn } from 'lib/bignumber/bignumber'
import type { SwapErrorRight } from 'lib/swapper/api'

import { isNativeEvmAsset } from '../../utils/helpers/helpers'
import { usdcContractAddressFromChainId } from '../../ZrxSwapper/utils/helpers/helpers'
import { getNativeWrappedAssetId, getRate } from '../utils/helpers'
import { oneInchService } from '../utils/oneInchService'
import type { OneInchQuoteApiInput, OneInchQuoteResponse, OneInchSwapperDeps } from '../utils/types'

export const getUsdRate = async (
  deps: OneInchSwapperDeps,
  sellAsset: Asset,
): Promise<Result<string, SwapErrorRight>> => {
  const usdcContractAddress = usdcContractAddressFromChainId(sellAsset.chainId)
  const { assetReference: sellAssetContractAddress, chainId } = fromAssetId(sellAsset.assetId)
  if (sellAssetContractAddress === usdcContractAddress) return Ok('1')

  const toTokenAddress = isNativeEvmAsset(sellAsset.assetId)
    ? fromAssetId(getNativeWrappedAssetId(chainId)).assetReference
    : sellAssetContractAddress

  // 1inch doesn't provide an API for getting the required input amount from an output,
  // so instead we flip this, selling 10 USDC for the asset and we can invert prior to returning
  // need to understand where else this value is used to know if this rate could be problematic
  const apiInput: OneInchQuoteApiInput = {
    fromTokenAddress: usdcContractAddress,
    toTokenAddress,
    amount: '10000000', // 10 USDC
    fee: 0,
  }

  const { chainReference } = fromChainId(chainId)
  const maybeQuoteResponse = await oneInchService.get<OneInchQuoteResponse>(
    `${deps.apiUrl}/${chainReference}/quote`,
    { params: apiInput },
  )

  return maybeQuoteResponse.andThen(
    quoteResponse => Ok(bn(1).div(getRate(quoteResponse.data)).toString()), // invert the rate
  )
}
