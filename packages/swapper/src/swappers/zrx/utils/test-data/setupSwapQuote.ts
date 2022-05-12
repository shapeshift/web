import { Asset, SupportedChainIds } from '@shapeshiftoss/types'

import { GetTradeQuoteInput, TradeQuote } from '../../../../api'
import { ZrxQuoteResponse } from '../../types'
import { FOX, WETH } from './assets'

export const setupQuote = () => {
  const sellAsset: Asset = { ...FOX }
  const buyAsset: Asset = { ...WETH }
  const tradeQuote: TradeQuote<SupportedChainIds> = {
    success: true,
    statusReason: '',
    buyAmount: '',
    sellAmount: '1000000000000000000',
    sellAsset,
    buyAsset,
    allowanceContract: 'allowanceContractAddress',
    sellAssetAccountId: '0',
    minimum: '0',
    maximum: '999999999999',
    feeData: { fee: '0' },
    rate: '1',
    sources: []
  }

  const quoteInput: GetTradeQuoteInput = {
    sellAmount: '1000000000000000000',
    sellAsset,
    buyAsset,
    sellAssetAccountId: '0',
    sendMax: false
  }
  return { quoteInput, tradeQuote, buyAsset, sellAsset }
}

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
    buyAmount: ''
  }
  return { quoteResponse, buyAsset, sellAsset }
}

export const setupBuildTrade = () => {
  const sellAsset: Asset = { ...FOX }
  const buyAsset: Asset = { ...WETH }
  const buildTradeInput = {
    sellAmount: '1000000000000000000',
    allowanceTarget: 'allowanceTargetAddress',
    price: '1',
    to: '0x123',
    buyAmount: '',
    buyAsset,
    sendMax: false,
    sellAssetAccountId: '0',
    buyAssetAccountId: '0',
    sellAsset
  }
  return { buildTradeInput, buyAsset, sellAsset }
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
    sellAssetAccountId: '0',
    txData: '0x0',
    depositAddress: '0x0',
    receiveAddress: '0x0',
    success: true,
    statusReason: '',
    feeData: { fee: '0', chainSpecific: {} },
    rate: '0',
    allowanceContract: '0x0',
    sources: []
  }
  return { executeTradeInput, buyAsset, sellAsset }
}
