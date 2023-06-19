import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { selectSellAssetUsdRate } from 'state/zustand/swapperStore/amountSelectors'
import { swapperStore } from 'state/zustand/swapperStore/useSwapperStore'

export const getMinimumCryptoHuman = (): string => {
  const sellAssetUsdRate = selectSellAssetUsdRate(swapperStore.getState())
  const minimumCryptoHuman = bn(1).dividedBy(bnOrZero(sellAssetUsdRate)).toString() // $1 worth of the sell token.
  return minimumCryptoHuman
}
