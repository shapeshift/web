import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import type { Asset } from 'lib/asset-service'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import type { MinMaxOutput, SwapErrorRight } from 'lib/swapper/api'
import { makeSwapErrorRight, SwapErrorType } from 'lib/swapper/api'

import { getUsdRate } from '../getUsdRate/getUsdRate'
import { MAX_ONEINCH_TRADE, MIN_ONEINCH_VALUE_USD } from '../utils/constants'
import type { OneInchSwapperDeps } from '../utils/types'

export const getMinMax = async (
  deps: OneInchSwapperDeps,
  sellAsset: Asset,
  buyAsset: Asset,
): Promise<Result<MinMaxOutput, SwapErrorRight>> => {
  if (
    !(
      isEvmChainId(sellAsset.chainId) &&
      isEvmChainId(buyAsset.chainId) &&
      buyAsset.chainId === sellAsset.chainId
    )
  ) {
    return Err(makeSwapErrorRight({ message: '[getMinMax]', code: SwapErrorType.UNSUPPORTED_PAIR }))
  }

  const maybeUsdRate = await getUsdRate(deps, sellAsset)

  return maybeUsdRate.andThen(usdRate => {
    const minimumAmountCryptoHuman = bn(MIN_ONEINCH_VALUE_USD)
      .dividedBy(bnOrZero(usdRate))
      .toString() // $1 worth of the sell token.
    const maximumAmountCryptoHuman = MAX_ONEINCH_TRADE // Arbitrarily large value. 10e+28 here.
    return Ok({
      minimumAmountCryptoHuman,
      maximumAmountCryptoHuman,
    })
  })
}
