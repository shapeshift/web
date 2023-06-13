import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { MIN_COWSWAP_TRADE_VALUES } from 'lib/swapper/swappers/CowSwapper/utils/constants'
import { selectSellAssetUsdRate } from 'state/zustand/swapperStore/amountSelectors'
import { swapperStore } from 'state/zustand/swapperStore/useSwapperStore'

import type { CowChainId } from '../types'

export const getMinimumCryptoHuman = (chainId: CowChainId): string => {
  const sellAssetUsdRate = selectSellAssetUsdRate(swapperStore.getState())
  const minimumAmountCryptoHuman = bn(MIN_COWSWAP_TRADE_VALUES[chainId])
    .dividedBy(bnOrZero(sellAssetUsdRate))
    .toString()
  return minimumAmountCryptoHuman
}
