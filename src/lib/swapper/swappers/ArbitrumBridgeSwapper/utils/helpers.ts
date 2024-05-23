import { fromAssetId } from '@shapeshiftoss/caip'
import { makeSwapErrorRight, type SwapErrorRight, TradeQuoteError } from '@shapeshiftoss/swapper'
import type { Asset } from '@shapeshiftoss/types'
import type { Result } from '@sniptt/monads/build'
import { Err, Ok } from '@sniptt/monads/build'
import type BigNumber from 'bignumber.js'
import { bn } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'

import { isNativeEvmAsset } from '../../utils/helpers/helpers'
import { ONE_INCH_NATIVE_ASSET_ADDRESS } from './constants'
import type { ArbitrumBridgeSupportedChainId, OneInchBaseResponse } from './types'
import { arbitrumBridgeSupportedChainIds } from './types'

export const getRate = (response: OneInchBaseResponse): BigNumber => {
  const fromTokenAmountCryptoHuman = fromBaseUnit(
    response.fromTokenAmount,
    response.fromToken.decimals,
  )
  const toTokenAmountCryptoHuman = fromBaseUnit(response.toTokenAmount, response.toToken.decimals)
  return bn(toTokenAmountCryptoHuman).div(fromTokenAmountCryptoHuman)
}

export const assertValidTrade = ({
  buyAsset,
  sellAsset,
}: {
  buyAsset: Asset
  sellAsset: Asset
}): Result<boolean, SwapErrorRight> => {
  // TODO(gomes): check that we're swapping from diff chains
  if (
    !arbitrumBridgeSupportedChainIds.includes(
      sellAsset.chainId as ArbitrumBridgeSupportedChainId,
    ) ||
    !arbitrumBridgeSupportedChainIds.includes(buyAsset.chainId as ArbitrumBridgeSupportedChainId)
  ) {
    return Err(
      makeSwapErrorRight({
        message: `[ArbitrumBridge: assertValidTrade] - unsupported chainId`,
        code: TradeQuoteError.UnsupportedChain,
        details: { buyAsset, sellAsset },
      }),
    )
  }

  return Ok(true)
}

export const getOneInchTokenAddress = (asset: Asset): string => {
  return isNativeEvmAsset(asset.assetId)
    ? ONE_INCH_NATIVE_ASSET_ADDRESS
    : fromAssetId(asset.assetId).assetReference
}
