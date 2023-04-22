import type { Asset } from '@shapeshiftoss/asset-service'
import { fromAssetId } from '@shapeshiftoss/caip'
import { KnownChainIds } from '@shapeshiftoss/types'
import type { Result } from '@sniptt/monads'
import { Err } from '@sniptt/monads'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import type { MinMaxOutput, SwapErrorRight } from 'lib/swapper/api'
import { makeSwapErrorRight, SwapErrorType } from 'lib/swapper/api'
import type { CowSwapperDeps } from 'lib/swapper/swappers/CowSwapper/CowSwapper'
import {
  MAX_COWSWAP_TRADE,
  MIN_COWSWAP_VALUE_USD,
} from 'lib/swapper/swappers/CowSwapper/utils/constants'
import { getUsdRate } from 'lib/swapper/swappers/CowSwapper/utils/helpers/helpers'

export const getCowSwapMinMax = async (
  deps: CowSwapperDeps,
  sellAsset: Asset,
  buyAsset: Asset,
): Promise<Result<MinMaxOutput, SwapErrorRight>> => {
  const { assetNamespace: sellAssetNamespace } = fromAssetId(sellAsset.assetId)
  const { chainId: buyAssetChainId } = fromAssetId(buyAsset.assetId)

  if (sellAssetNamespace !== 'erc20' || buyAssetChainId !== KnownChainIds.EthereumMainnet) {
    return Err(
      makeSwapErrorRight({ message: '[getCowSwapMinMax]', code: SwapErrorType.UNSUPPORTED_PAIR }),
    )
  }

  const maybeUsdRate = await getUsdRate(deps, sellAsset)

  return maybeUsdRate.map(usdRate => {
    const minimumAmountCryptoHuman = bn(MIN_COWSWAP_VALUE_USD)
      .dividedBy(bnOrZero(usdRate))
      .toString() // $10 worth of the sell token.
    const maximumAmountCryptoHuman = MAX_COWSWAP_TRADE // Arbitrarily large value. 10e+28 here.
    return {
      minimumAmountCryptoHuman,
      maximumAmountCryptoHuman,
    }
  })
}
