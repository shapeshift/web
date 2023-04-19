import type { Asset } from '@shapeshiftoss/asset-service'
import { fromAssetId, fromChainId } from '@shapeshiftoss/caip'
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import type { MinMaxOutput } from '@shapeshiftoss/swapper'
import { SwapError, SwapErrorType } from '@shapeshiftoss/swapper'
import type { AxiosResponse } from 'axios'
import axios from 'axios'
import type BigNumber from 'bignumber.js'

import { usdcContractAddressFromChainId } from '../../../../../packages/swapper/src/swappers/zrx/utils/helpers/helpers'
import { bn, bnOrZero } from '../../../../lib/bignumber/bignumber'
import { MAX_ONEINCH_TRADE, MIN_ONEINCH_VALUE_USD } from '../utils/constants'
import type { OneInchQuoteApiInput, OneInchQuoteResponse, OneInchSwapperDeps } from './types'

export const getUsdRate = async (deps: OneInchSwapperDeps, sellAsset: Asset): Promise<string> => {
  const usdcContractAddress = usdcContractAddressFromChainId(sellAsset.chainId)
  const { assetReference: sellAssetContractAddress, chainId } = fromAssetId(sellAsset.assetId)

  if (sellAssetContractAddress === usdcContractAddress) return '1'

  // 1inch doesn't provide an API for getting the required input amount from an output,
  // so instead we flip this, selling 10 USDC for the asset and we can invert prior to returning
  // need to understand where else this value is used to know if this rate could be problematic
  const apiInput: OneInchQuoteApiInput = {
    fromTokenAddress: usdcContractAddress,
    toTokenAddress: sellAssetContractAddress,
    amount: '10000000', // 10 USDC
  }
  const { chainReference } = fromChainId(chainId)
  const quoteResponse: AxiosResponse<OneInchQuoteResponse> = await axios.get(
    `${deps.apiUrl}/${chainReference}/quote`,
    { params: apiInput },
  )
  return bn(1).div(getRate(quoteResponse.data)).toString() // invert the rate
}

export const getRate = (quoteResponse: OneInchQuoteResponse): BigNumber => {
  const fromTokenAmountDecimal = bn(quoteResponse.fromTokenAmount).div(
    bn(10).pow(quoteResponse.fromToken.decimals),
  )
  const toTokenAmountDecimal = bn(quoteResponse.toTokenAmount).div(
    bn(10).pow(quoteResponse.toToken.decimals),
  )
  return toTokenAmountDecimal.div(fromTokenAmountDecimal)
}

export const getMinMax = async (
  deps: OneInchSwapperDeps,
  sellAsset: Asset,
  buyAsset: Asset,
): Promise<MinMaxOutput> => {
  try {
    if (
      !(
        isEvmChainId(sellAsset.chainId) &&
        isEvmChainId(buyAsset.chainId) &&
        buyAsset.chainId === sellAsset.chainId
      )
    ) {
      throw new SwapError('[getMinMax]', { code: SwapErrorType.UNSUPPORTED_PAIR })
    }

    const usdRate = await getUsdRate(deps, sellAsset)
    const minimumAmountCryptoHuman = bn(MIN_ONEINCH_VALUE_USD)
      .dividedBy(bnOrZero(usdRate))
      .toString() // $1 worth of the sell token.
    const maximumAmountCryptoHuman = MAX_ONEINCH_TRADE // Arbitrarily large value. 10e+28 here.
    return {
      minimumAmountCryptoHuman,
      maximumAmountCryptoHuman,
    }
  } catch (e) {
    if (e instanceof SwapError) throw e
    throw new SwapError('[getMinMax]', { cause: e, code: SwapErrorType.MIN_MAX_FAILED })
  }
}
