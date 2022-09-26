import { Asset } from '@shapeshiftoss/asset-service'

import { FOX, WETH } from '../../../utils/test-data/assets'
import { ZrxQuoteResponse } from '../../types'

export const setupZrxTradeQuoteResponse = () => {
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
    buyAmount: '',
  }
  return { quoteResponse, buyAsset, sellAsset }
}

export const setupExecuteTrade = () => {
  const sellAsset: Asset = { ...FOX }
  const buyAsset: Asset = { ...WETH }
  const executeTradeInput = {
    sellAmount: '1000000000000000000',
    allowanceTarget: 'allowanceTargetAddress',
    price: '1',
    to: '0x123',
    gas: '1235',
    gasPrice: '1236',
    buyAmount: '',
    buyAsset,
    sellAsset,
    sendMax: false,
    bip44Params: { purpose: 44, coinType: 60, accountNumber: 0 },
    txData: '0x0',
    depositAddress: '0x0',
    receiveAddress: '0x0',
    feeData: { fee: '0', chainSpecific: {}, tradeFee: '0' },
    rate: '0',
    sources: [],
  }
  return { executeTradeInput, buyAsset, sellAsset }
}
