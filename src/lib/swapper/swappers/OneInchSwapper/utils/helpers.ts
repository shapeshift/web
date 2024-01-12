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
import type { OneInchBaseResponse, OneInchSupportedChainId } from './types'
import { oneInchSupportedChainIds } from './types'

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
  receiveAddress,
}: {
  buyAsset: Asset
  sellAsset: Asset
  receiveAddress?: string
}): Result<boolean, SwapErrorRight> => {
  if (!oneInchSupportedChainIds.includes(sellAsset.chainId as OneInchSupportedChainId)) {
    return Err(
      makeSwapErrorRight({
        message: `[OneInch: assertValidTrade] - unsupported chainId`,
        code: TradeQuoteError.UnknownError,
        details: { chainId: sellAsset.chainId },
      }),
    )
  }

  if (sellAsset.chainId !== buyAsset.chainId) {
    return Err(
      makeSwapErrorRight({
        message: `[OneInch: assertValidTrade] - both assets must be on chainId ${sellAsset.chainId}`,
        code: TradeQuoteError.UnknownError,
        details: { buyAsset, sellAsset },
      }),
    )
  }

  if (!receiveAddress) {
    return Err(
      makeSwapErrorRight({
        message: '[OneInch: assertValidTrade] - receive address is required',
        code: TradeQuoteError.UnknownError,
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
