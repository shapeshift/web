import type { Asset } from 'lib/asset-service'
import { FOX_MAINNET, WETH } from 'lib/swapper/swappers/utils/test-data/assets'
import type { ZrxQuoteResponse } from 'lib/swapper/swappers/ZrxSwapper/types'

export const setupZrxTradeQuoteResponse = () => {
  const sellAsset: Asset = { ...FOX_MAINNET }
  const buyAsset: Asset = { ...WETH }
  const quoteResponse: ZrxQuoteResponse = {
    sellAmount: '1000000000000000000',
    allowanceTarget: 'allowanceTargetAddress',
    price: '1',
    to: '0x123',
    data: '0x1234',
    gas: '1235',
    estimatedGas: '1235',
    gasPrice: '1236',
    value: '0',
    sources: [],
    buyAmount: '',
  }
  return { quoteResponse, buyAsset, sellAsset }
}

export const setupExecuteTrade = () => {
  const sellAsset: Asset = { ...FOX_MAINNET }
  const buyAsset: Asset = { ...WETH }
  const executeTradeInput = {
    sellAmountBeforeFeesCryptoBaseUnit: '1000000000000000000',
    allowanceTarget: 'allowanceTargetAddress',
    price: '1',
    to: '0x123',
    gas: '1235',
    gasPrice: '1236',
    buyAmountBeforeFeesCryptoBaseUnit: '',
    buyAsset,
    sellAsset,
    sendMax: false,
    accountNumber: 0,
    txData: '0x0',
    depositAddress: '0x0',
    receiveAddress: '0x0',
    feeData: {
      protocolFees: {},
      networkFeeCryptoBaseUnit: '0',
    },
    rate: '0',
    sources: [],
  }
  return { executeTradeInput, buyAsset, sellAsset }
}
