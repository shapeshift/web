import { fromAssetId } from '@shapeshiftoss/caip'
import { KnownChainIds } from '@shapeshiftoss/types'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import type { Asset } from 'lib/asset-service'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import type { MinMaxOutput, SwapErrorRight } from 'lib/swapper/api'
import { makeSwapErrorRight, SwapErrorType } from 'lib/swapper/api'
import {
  MAX_COWSWAP_TRADE,
  MIN_COWSWAP_VALUE_USD,
} from 'lib/swapper/swappers/CowSwapper/utils/constants'
import { selectSellAssetFiatRate } from 'state/zustand/swapperStore/selectors'
import { swapperStore } from 'state/zustand/swapperStore/useSwapperStore'

export const getCowSwapMinMax = (
  sellAsset: Asset,
  buyAsset: Asset,
): Result<MinMaxOutput, SwapErrorRight> => {
  const { assetNamespace: sellAssetNamespace } = fromAssetId(sellAsset.assetId)
  const { chainId: buyAssetChainId } = fromAssetId(buyAsset.assetId)

  if (sellAssetNamespace !== 'erc20' || buyAssetChainId !== KnownChainIds.EthereumMainnet) {
    return Err(
      makeSwapErrorRight({ message: '[getCowSwapMinMax]', code: SwapErrorType.UNSUPPORTED_PAIR }),
    )
  }

  const sellAssetFiatRate = selectSellAssetFiatRate(swapperStore.getState())
  const minimumAmountCryptoHuman = bn(MIN_COWSWAP_VALUE_USD)
    .dividedBy(bnOrZero(sellAssetFiatRate))
    .toString() // $10 worth of the sell token.
  const maximumAmountCryptoHuman = MAX_COWSWAP_TRADE // Arbitrarily large value. 10e+28 here.
  return Ok({
    minimumAmountCryptoHuman,
    maximumAmountCryptoHuman,
  })
}
