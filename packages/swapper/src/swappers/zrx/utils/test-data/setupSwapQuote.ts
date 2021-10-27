import { Asset } from '@shapeshiftoss/types'

import { DEFAULT_SLIPPAGE } from '../constants'
import { FOX, WETH } from './assets'

export const setupQuote = () => {
  const sellAsset: Asset = { ...FOX }
  const buyAsset: Asset = { ...WETH }

  const quoteInput = {
    sellAsset,
    buyAsset,
    success: true,
    sellAmount: '1000000000000000000',
    slippage: DEFAULT_SLIPPAGE,
    allowanceContract: 'allowanceContractAddress',
    allowanceTarget: 'allowanceTargetAddress',
    receiveAddress: 'receiveAddress',
    sellAssetAccountId: '0',
    buyAssetAccountId: '0'
  }
  return { quoteInput, buyAsset, sellAsset }
}
