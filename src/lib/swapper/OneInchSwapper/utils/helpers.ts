import type { Asset } from '@shapeshiftoss/asset-service'
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import type { MinMaxOutput } from '@shapeshiftoss/swapper'
import { SwapError, SwapErrorType } from '@shapeshiftoss/swapper'
import type BigNumber from 'bignumber.js'

import { bn, bnOrZero } from '../../../../lib/bignumber/bignumber'
import { getUsdRate } from '../getUsdRate/getUsdRate'
import { MAX_ONEINCH_TRADE, MIN_ONEINCH_VALUE_USD } from '../utils/constants'
import type { OneInchQuoteResponse, OneInchSwapperDeps } from './types'

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
