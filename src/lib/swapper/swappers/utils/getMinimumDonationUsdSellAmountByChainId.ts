import type { ChainId } from '@shapeshiftoss/caip'
import { ethChainId } from '@shapeshiftoss/caip'

export const getMinimumDonationUsdSellAmountByChainId = (chainId: ChainId) => {
  switch (chainId) {
    case ethChainId:
      return '500'
    default:
      return '0'
  }
}
