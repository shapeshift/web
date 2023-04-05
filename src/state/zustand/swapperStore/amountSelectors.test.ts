import { TradeAmountInputField } from 'components/Trade/types'
import {
  selectTradeAmountsByActionAndAmount,
  selectTradeAmountsByActionAndAmountFromQuote,
} from 'state/zustand/swapperStore/amountSelectors'
import { baseSwapperState } from 'state/zustand/swapperStore/testData'
import type { SwapperState } from 'state/zustand/swapperStore/types'

describe('calculateAmounts', () => {
  it('returns sellAmountSellAssetBaseUnit, buyAmountBuyAssetBaseUnit, fiatSellAmount, fiatBuyAmount for SELL_CRYPTO action', () => {
    const action = TradeAmountInputField.SELL_CRYPTO
    const amount = '0.001'
    const state: SwapperState = { ...baseSwapperState, action, amount }
    const tradeAmountsByActionAndAmount = selectTradeAmountsByActionAndAmount(state)
    const tradeAmountsByActionAndAmountFromQuote =
      selectTradeAmountsByActionAndAmountFromQuote(state)

    // Negative values are expected as the swapper fees are higher than the sell amount
    expect(tradeAmountsByActionAndAmount).toEqual({
      sellAmountSellAssetBaseUnit: '1000000000000000',
      buyAmountBuyAssetBaseUnit: '0',
      fiatSellAmount: '1.767',
      fiatBuyAmount: '0',
    })

    expect(tradeAmountsByActionAndAmountFromQuote).toEqual({
      sellAmountSellAssetBaseUnit: '1000000000000000',
      buyAmountBuyAssetBaseUnit: '986780221000000000000',
      fiatSellAmount: '1.767',
      fiatBuyAmount: '32.563747293',
    })
  })

  it('returns sellAmountSellAssetBaseUnit, buyAmountBuyAssetBaseUnit, fiatSellAmount, fiatBuyAmount for BUY_CRYPTO action', () => {
    const action = TradeAmountInputField.BUY_CRYPTO
    const state: SwapperState = { ...baseSwapperState, action }
    const tradeAmountsByActionAndAmount = selectTradeAmountsByActionAndAmount(state)
    const tradeAmountsByActionAndAmountFromQuote =
      selectTradeAmountsByActionAndAmountFromQuote(state)

    expect(tradeAmountsByActionAndAmount).toEqual({
      sellAmountSellAssetBaseUnit: '0',
      buyAmountBuyAssetBaseUnit: '33000000000000000000',
      fiatSellAmount: '0',
      fiatBuyAmount: '1.089',
    })

    // These outputs are "correct" with the current logic, but don't really make sense unless we can specify a desired
    // receive amount when requesting a quote
    expect(tradeAmountsByActionAndAmountFromQuote).toEqual({
      sellAmountSellAssetBaseUnit: '18665000000000000',
      buyAmountBuyAssetBaseUnit: '-225170392472859992504',
      fiatSellAmount: '32.981055',
      fiatBuyAmount: '1.089',
    })
  })

  it('returns sellAmountSellAssetBaseUnit, buyAmountBuyAssetBaseUnit, fiatSellAmount, fiatBuyAmount for SELL_FIAT action', () => {
    const action = TradeAmountInputField.SELL_FIAT
    const state: SwapperState = { ...baseSwapperState, action }
    const tradeAmountsByActionAndAmount = selectTradeAmountsByActionAndAmount(state)
    const tradeAmountsByActionAndAmountFromQuote =
      selectTradeAmountsByActionAndAmountFromQuote(state)

    expect(tradeAmountsByActionAndAmount).toEqual({
      sellAmountSellAssetBaseUnit: '18675721561969440',
      buyAmountBuyAssetBaseUnit: '0',
      fiatSellAmount: '33',
      fiatBuyAmount: '0',
    })

    expect(tradeAmountsByActionAndAmountFromQuote).toEqual({
      sellAmountSellAssetBaseUnit: '18675721561969440',
      buyAmountBuyAssetBaseUnit: '986780221000000000000',
      fiatSellAmount: '32.998725',
      fiatBuyAmount: '32.563747293',
    })
  })

  it('returns sellAmountSellAssetBaseUnit, buyAmountBuyAssetBaseUnit, fiatSellAmount, fiatBuyAmount for BUY_FIAT action', () => {
    const action = TradeAmountInputField.BUY_FIAT
    const state: SwapperState = { ...baseSwapperState, action }
    const tradeAmountsByActionAndAmount = selectTradeAmountsByActionAndAmount(state)
    const tradeAmountsByActionAndAmountFromQuote =
      selectTradeAmountsByActionAndAmountFromQuote(state)

    expect(tradeAmountsByActionAndAmount).toEqual({
      sellAmountSellAssetBaseUnit: '0',
      buyAmountBuyAssetBaseUnit: '1000000000000000000000',
      fiatSellAmount: '0',
      fiatBuyAmount: '33',
    })

    // These outputs are "correct" with the current logic, but don't really make sense unless we can specify a desired
    // receive amount when requesting a quote
    expect(tradeAmountsByActionAndAmountFromQuote).toEqual({
      sellAmountSellAssetBaseUnit: '18665000000000000',
      buyAmountBuyAssetBaseUnit: '1000000000000000000000',
      fiatSellAmount: '32.981055',
      fiatBuyAmount: '24.480377031',
    })
  })
})
