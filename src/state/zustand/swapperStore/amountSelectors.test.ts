import { TradeAmountInputField } from 'components/Trade/types'
import { selectTradeAmountsByActionAndAmount } from 'state/zustand/swapperStore/amountSelectors'
import { baseSwapperState } from 'state/zustand/swapperStore/testData'
import type { SwapperState } from 'state/zustand/swapperStore/types'

describe('calculateAmounts', () => {
  it('returns cryptoSellAmount, cryptoBuyAmount, fiatSellAmount, fiatBuyAmount for SELL_CRYPTO action', () => {
    const action = TradeAmountInputField.SELL_CRYPTO
    const amount = '0.001'
    const state: SwapperState = { ...baseSwapperState, action, amount }
    const tradeAmountsByActionAndAmount = selectTradeAmountsByActionAndAmount(state)

    expect(tradeAmountsByActionAndAmount).toEqual({
      sellAmountSellAssetBaseUnit: '1000000000000000',
      buyAmountBuyAssetBaseUnit: '52990469959503958061',
      fiatSellAmount: '1.77',
      fiatBuyAmount: '1.77',
    })
  })

  it('returns cryptoSellAmount, cryptoBuyAmount, fiatSellAmount, fiatBuyAmount for BUY_CRYPTO action', () => {
    const action = TradeAmountInputField.BUY_CRYPTO
    const state: SwapperState = { ...baseSwapperState, action }
    const tradeAmountsByActionAndAmount = selectTradeAmountsByActionAndAmount(state)

    expect(tradeAmountsByActionAndAmount).toEqual({
      sellAmountSellAssetBaseUnit: '622696861715069',
      buyAmountBuyAssetBaseUnit: '33000000000000000000',
      fiatSellAmount: '1.10',
      fiatBuyAmount: '1.10',
    })
  })

  it('returns cryptoSellAmount, cryptoBuyAmount, fiatSellAmount, fiatBuyAmount for SELL_FIAT action', () => {
    const action = TradeAmountInputField.SELL_FIAT
    const state: SwapperState = { ...baseSwapperState, action }
    const tradeAmountsByActionAndAmount = selectTradeAmountsByActionAndAmount(state)

    expect(tradeAmountsByActionAndAmount).toEqual({
      sellAmountSellAssetBaseUnit: '18665215685476932',
      buyAmountBuyAssetBaseUnit: '989152246003175558217',
      fiatSellAmount: '33.00',
      fiatBuyAmount: '33.00',
    })
  })

  it('returns cryptoSellAmount, cryptoBuyAmount, fiatSellAmount, fiatBuyAmount for BUY_FIAT action', () => {
    const action = TradeAmountInputField.BUY_FIAT
    const state: SwapperState = { ...baseSwapperState, action }
    const tradeAmountsByActionAndAmount = selectTradeAmountsByActionAndAmount(state)

    expect(tradeAmountsByActionAndAmount).toEqual({
      sellAmountSellAssetBaseUnit: '18665215685476932',
      buyAmountBuyAssetBaseUnit: '989168495123367446659',
      fiatSellAmount: '33.00',
      fiatBuyAmount: '33.00',
    })
  })
})
