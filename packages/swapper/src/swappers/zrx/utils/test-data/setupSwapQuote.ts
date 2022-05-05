import { Asset } from '@shapeshiftoss/types'

import { ZrxQuoteResponse } from '../../types'
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

export const setupZrxQuoteResponse = () => {
  const sellAsset: Asset = { ...FOX }
  const buyAsset: Asset = { ...WETH }
  const quoteResponse: ZrxQuoteResponse = {
    sellAmount: '1000000000000000000',
    allowanceTarget: 'allowanceTargetAddress',
    price: '1',
    to: '0x123',
    data: '0x1234',
    gas: '1235',
    gasPrice: '1236',
    sources: [],
    buyAmount: ''
  }
  return { quoteResponse, buyAsset, sellAsset }
}
