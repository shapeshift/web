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

    // Negative values are expected as the swapper fees are higher than the sell amount
    expect(tradeAmountsByActionAndAmount).toEqual({
      sellAmountSellAssetBaseUnit: '1000000000000000',
      buyAmountBuyAssetBaseUnit: '-204624937927405447829',
      fiatSellAmount: '1.767',
      fiatBuyAmount: '-6.752622951604379778357',
    })
  })

  it('returns sellAmountSellAssetBaseUnit, buyAmountBuyAssetBaseUnit, fiatSellAmount, fiatBuyAmount for BUY_CRYPTO action', () => {
    const action = TradeAmountInputField.BUY_CRYPTO
    const state: SwapperState = { ...baseSwapperState, action }
    const tradeAmountsByActionAndAmount = selectTradeAmountsByActionAndAmount(state)

    expect(tradeAmountsByActionAndAmount).toEqual({
      sellAmountSellAssetBaseUnit: '5437817176912496',
      buyAmountBuyAssetBaseUnit: '33000000000000000000',
      fiatSellAmount: '9.608622951604380432',
      fiatBuyAmount: '1.089',
    })
  })

  it('returns sellAmountSellAssetBaseUnit, buyAmountBuyAssetBaseUnit, fiatSellAmount, fiatBuyAmount for SELL_FIAT action', () => {
    const action = TradeAmountInputField.SELL_FIAT
    const state: SwapperState = { ...baseSwapperState, action }
    const tradeAmountsByActionAndAmount = selectTradeAmountsByActionAndAmount(state)

    expect(tradeAmountsByActionAndAmount).toEqual({
      sellAmountSellAssetBaseUnit: '18675721561969440',
      buyAmountBuyAssetBaseUnit: '741829607527140007496',
      fiatSellAmount: '33',
      fiatBuyAmount: '24.480377048395620247368',
    })
  })

  it('returns sellAmountSellAssetBaseUnit, buyAmountBuyAssetBaseUnit, fiatSellAmount, fiatBuyAmount for BUY_FIAT action', () => {
    const action = TradeAmountInputField.BUY_FIAT
    const state: SwapperState = { ...baseSwapperState, action }
    const tradeAmountsByActionAndAmount = selectTradeAmountsByActionAndAmount(state)

    expect(tradeAmountsByActionAndAmount).toEqual({
      sellAmountSellAssetBaseUnit: '23497239927336944',
      buyAmountBuyAssetBaseUnit: '1000000000000000000000',
      fiatSellAmount: '41.519622951604380048',
      fiatBuyAmount: '33',
    })
  })
})
