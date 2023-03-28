import { TradeAmountInputField } from 'components/Trade/types'
import { selectTradeAmountsByActionAndAmount } from 'state/zustand/swapperStore/amountSelectors'
import { baseSwapperState } from 'state/zustand/swapperStore/testData'
import type { SwapperState } from 'state/zustand/swapperStore/types'

describe('calculateAmounts', () => {
  it('returns sellAmountSellAssetBaseUnit, buyAmountBuyAssetBaseUnit, fiatSellAmount, fiatBuyAmount for SELL_CRYPTO action', () => {
    const action = TradeAmountInputField.SELL_CRYPTO
    const amount = '0.001'
    const state: SwapperState = { ...baseSwapperState, action, amount }
    const tradeAmountsByActionAndAmount = selectTradeAmountsByActionAndAmount(state)

    expect(tradeAmountsByActionAndAmount).toEqual({
      sellAmountSellAssetBaseUnit: '1000000000000000',
      buyAmountBuyAssetBaseUnit: '53540633027089177171.70247933884298653524',
      fiatSellAmount: '1.767',
      fiatBuyAmount: '1.766840889',
    })
  })

  it('returns sellAmountSellAssetBaseUnit, buyAmountBuyAssetBaseUnit, fiatSellAmount, fiatBuyAmount for BUY_CRYPTO action', () => {
    const action = TradeAmountInputField.BUY_CRYPTO
    const state: SwapperState = { ...baseSwapperState, action }
    const tradeAmountsByActionAndAmount = selectTradeAmountsByActionAndAmount(state)

    expect(tradeAmountsByActionAndAmount).toEqual({
      sellAmountSellAssetBaseUnit: '616298811544992',
      buyAmountBuyAssetBaseUnit: '33000000000000000000',
      fiatSellAmount: '1.088472',
      fiatBuyAmount: '1.089',
    })
  })

  it('returns sellAmountSellAssetBaseUnit, buyAmountBuyAssetBaseUnit, fiatSellAmount, fiatBuyAmount for SELL_FIAT action', () => {
    const action = TradeAmountInputField.SELL_FIAT
    const state: SwapperState = { ...baseSwapperState, action }
    const tradeAmountsByActionAndAmount = selectTradeAmountsByActionAndAmount(state)

    expect(tradeAmountsByActionAndAmount).toEqual({
      sellAmountSellAssetBaseUnit: '18675721561969440',
      buyAmountBuyAssetBaseUnit: '999995178481634632496',
      fiatSellAmount: '33',
      fiatBuyAmount: '32.999840874',
    })
  })

  it('returns sellAmountSellAssetBaseUnit, buyAmountBuyAssetBaseUnit, fiatSellAmount, fiatBuyAmount for BUY_FIAT action', () => {
    const action = TradeAmountInputField.BUY_FIAT
    const state: SwapperState = { ...baseSwapperState, action }
    const tradeAmountsByActionAndAmount = selectTradeAmountsByActionAndAmount(state)

    expect(tradeAmountsByActionAndAmount).toEqual({
      sellAmountSellAssetBaseUnit: '18675721561969440',
      buyAmountBuyAssetBaseUnit: '1000000000000000000000',
      fiatSellAmount: '32.998725',
      fiatBuyAmount: '33',
    })
  })
})
