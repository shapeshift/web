import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import type { Asset } from 'lib/asset-service'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import type { MinMaxOutput, SwapErrorRight } from 'lib/swapper/api'
import { makeSwapErrorRight, SwapErrorType } from 'lib/swapper/api'
import { MAX_ZRX_TRADE } from 'lib/swapper/swappers/ZrxSwapper/utils/constants'
import { selectSellAssetUsdRate } from 'state/zustand/swapperStore/amountSelectors'
import { swapperStore } from 'state/zustand/swapperStore/useSwapperStore'

export const getZrxMinMax = (
  sellAsset: Asset,
  buyAsset: Asset,
): Result<MinMaxOutput, SwapErrorRight> => {
  if (
    !(
      isEvmChainId(sellAsset.chainId) &&
      isEvmChainId(buyAsset.chainId) &&
      buyAsset.chainId === sellAsset.chainId
    )
  ) {
    return Err(
      makeSwapErrorRight({ message: '[getZrxMinMax]', code: SwapErrorType.UNSUPPORTED_PAIR }),
    )
  }

  const sellAssetUsdRate = selectSellAssetUsdRate(swapperStore.getState())
  const minimumAmountCryptoHuman = bn(1).dividedBy(bnOrZero(sellAssetUsdRate)).toString() // $1 worth of the sell token.
  const maximumAmountCryptoHuman = MAX_ZRX_TRADE // Arbitrarily large value. 10e+28 here.
  return Ok({
    minimumAmountCryptoHuman,
    maximumAmountCryptoHuman,
  })
}
