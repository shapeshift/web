import { fromAssetId } from '@shapeshiftoss/caip'
import { KnownChainIds } from '@shapeshiftoss/types'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import type { Asset } from 'lib/asset-service'
import type { BigNumber } from 'lib/bignumber/bignumber'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import type { MinMaxOutput, SwapErrorRight } from 'lib/swapper/api'
import { makeSwapErrorRight, SwapErrorType } from 'lib/swapper/api'
import {
  MAX_COWSWAP_TRADE,
  MIN_COWSWAP_ETH_TRADE_VALUE_USD,
  MIN_COWSWAP_XDAI_TRADE_VALUE_USD,
} from 'lib/swapper/swappers/CowSwapper/utils/constants'
import { selectSellAssetUsdRate } from 'state/zustand/swapperStore/amountSelectors'
import { swapperStore } from 'state/zustand/swapperStore/useSwapperStore'

import type { CowChainId } from '../types'
import { isCowswapSupportedChainId } from '../utils/utils'

export const getCowSwapMinMax = (
  sellAsset: Asset,
  buyAsset: Asset,
  supportedChainIds: CowChainId[],
): Result<MinMaxOutput, SwapErrorRight> => {
  const { assetNamespace: sellAssetNamespace } = fromAssetId(sellAsset.assetId)
  const { chainId: buyAssetChainId } = fromAssetId(buyAsset.assetId)

  if (
    sellAssetNamespace !== 'erc20' ||
    !isCowswapSupportedChainId(buyAssetChainId, supportedChainIds)
  ) {
    return Err(
      makeSwapErrorRight({ message: '[getCowSwapMinMax]', code: SwapErrorType.UNSUPPORTED_PAIR }),
    )
  }

  const getMinCowSwapValueUsd = (chainId: CowChainId): BigNumber.Value => {
    switch (chainId) {
      case KnownChainIds.EthereumMainnet:
        return MIN_COWSWAP_ETH_TRADE_VALUE_USD
      case KnownChainIds.GnosisMainnet:
        return MIN_COWSWAP_XDAI_TRADE_VALUE_USD
      default:
        throw new Error(`[getCowSwapMinMax] Unsupported chainId: ${buyAssetChainId}`)
    }
  }

  const sellAssetUsdRate = selectSellAssetUsdRate(swapperStore.getState())
  const minimumAmountCryptoHuman = bn(getMinCowSwapValueUsd(buyAssetChainId))
    .dividedBy(bnOrZero(sellAssetUsdRate))
    .toString()
  const maximumAmountCryptoHuman = MAX_COWSWAP_TRADE // Arbitrarily large value. 10e+28 here.
  return Ok({
    minimumAmountCryptoHuman,
    maximumAmountCryptoHuman,
  })
}
