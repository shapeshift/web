import type { ChainId } from '@shapeshiftoss/caip'
import type { EvmChainAdapter } from '@shapeshiftoss/chain-adapters'
import type { KnownChainIds } from '@shapeshiftoss/types'
import type { Result } from '@sniptt/monads/build'
import { Err, Ok } from '@sniptt/monads/build'
import type BigNumber from 'bignumber.js'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import type { Asset } from 'lib/asset-service'
import { bn } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import type { SwapErrorRight } from 'lib/swapper/api'
import { makeSwapErrorRight, SwapErrorType } from 'lib/swapper/api'
import { isEvmChainAdapter } from 'lib/utils/evm'

import { isNativeEvmAsset } from '../../utils/helpers/helpers'
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
        code: SwapErrorType.UNSUPPORTED_CHAIN,
        details: { chainId: sellAsset.chainId },
      }),
    )
  }

  if (sellAsset.chainId !== buyAsset.chainId) {
    return Err(
      makeSwapErrorRight({
        message: `[OneInch: assertValidTrade] - both assets must be on chainId ${sellAsset.chainId}`,
        code: SwapErrorType.UNSUPPORTED_PAIR,
        details: { buyAsset, sellAsset },
      }),
    )
  }

  if (isNativeEvmAsset(sellAsset.assetId) || isNativeEvmAsset(buyAsset.assetId)) {
    return Err(
      makeSwapErrorRight({
        message: '[OneInch: assetValidTrade] - no support for native assets',
        code: SwapErrorType.UNSUPPORTED_PAIR,
        details: { buyAsset, sellAsset },
      }),
    )
  }

  if (!receiveAddress) {
    return Err(
      makeSwapErrorRight({
        message: '[OneInch: assertValidTrade] - receive address is required',
        code: SwapErrorType.MISSING_INPUT,
      }),
    )
  }

  return Ok(true)
}

export const getAdapter = (
  chainId: ChainId | KnownChainIds,
): Result<EvmChainAdapter, SwapErrorRight> => {
  const chainAdapterManager = getChainAdapterManager()
  const adapter = chainAdapterManager.get(chainId)

  if (!isEvmChainAdapter(adapter)) {
    return Err(
      makeSwapErrorRight({
        message: '[OneInch: getAdapter] - invalid chain adapter',
        code: SwapErrorType.UNSUPPORTED_NAMESPACE,
        details: { chainId },
      }),
    )
  }

  return Ok(adapter)
}
