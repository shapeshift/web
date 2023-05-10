import { TradeAmountInputField } from 'components/Trade/types'
import {
  selectTradeAmountsByActionAndAmount,
  selectTradeAmountsByActionAndAmountFromQuote,
} from 'state/zustand/swapperStore/amountSelectors'
import { baseSwapperState } from 'state/zustand/swapperStore/testData'
import type { SwapperState } from 'state/zustand/swapperStore/types'

describe('calculateAmounts', () => {
  it('returns sellAmountSellAssetCryptoPrecision, buyAmountBuyAssetBaseUnit, fiatSellAmount, fiatBuyAmount for SELL_CRYPTO action', () => {
    const action = TradeAmountInputField.SELL_CRYPTO
    const amount = '0.001'
    const state: SwapperState = { ...baseSwapperState, action, amount }
    const tradeAmountsByActionAndAmount = selectTradeAmountsByActionAndAmount(state)
    const tradeAmountsByActionAndAmountFromQuote =
      selectTradeAmountsByActionAndAmountFromQuote(state)

    // Negative values are expected as the swapper fees are higher than the sell amount
    expect(tradeAmountsByActionAndAmount).toEqual({
      sellAmountSellAssetCryptoPrecision: '0.001',
      buyAmountBuyAssetCryptoPrecision: '0',
      fiatSellAmount: '1.767',
      fiatBuyAmount: '0',
    })

    expect(tradeAmountsByActionAndAmountFromQuote).toEqual({
      sellAmountSellAssetCryptoPrecision: '0.001',
      buyAmountBuyAssetCryptoPrecision: '728.53893838230606312222513796069583299584',
      fiatSellAmount: '1.767',
      fiatBuyAmount: '24.044124341395620247368',
    })
  })

  it('returns sellAmountSellAssetCryptoPrecision, buyAmountBuyAssetCryptoPrecision, fiatSellAmount, fiatBuyAmount for BUY_CRYPTO action', () => {
    const action = TradeAmountInputField.BUY_CRYPTO
    const state: SwapperState = { ...baseSwapperState, action }
    const tradeAmountsByActionAndAmount = selectTradeAmountsByActionAndAmount(state)
    const tradeAmountsByActionAndAmountFromQuote =
      selectTradeAmountsByActionAndAmountFromQuote(state)

    expect(tradeAmountsByActionAndAmount).toEqual({
      sellAmountSellAssetCryptoPrecision: '0',
      buyAmountBuyAssetCryptoPrecision: '33',
      fiatSellAmount: '0',
      fiatBuyAmount: '1.089',
    })

    // These outputs are "correct" with the current logic, but don't really make sense unless we can specify a desired
    // receive amount when requesting a quote
    expect(tradeAmountsByActionAndAmountFromQuote).toEqual({
      sellAmountSellAssetCryptoPrecision: '0.018665',
      buyAmountBuyAssetCryptoPrecision: '-225.170392472859966802',
      fiatSellAmount: '32.981055',
      fiatBuyAmount: '1.089',
    })
  })

  it('returns sellAmountSellAssetCryptoPrecision, buyAmountBuyAssetCryptoPrecision, fiatSellAmount, fiatBuyAmount for SELL_FIAT action', () => {
    const action = TradeAmountInputField.SELL_FIAT
    const state: SwapperState = { ...baseSwapperState, action }
    const tradeAmountsByActionAndAmount = selectTradeAmountsByActionAndAmount(state)
    const tradeAmountsByActionAndAmountFromQuote =
      selectTradeAmountsByActionAndAmountFromQuote(state)

    expect(tradeAmountsByActionAndAmount).toEqual({
      sellAmountSellAssetCryptoPrecision: '0.01867572156196944',
      buyAmountBuyAssetCryptoPrecision: '0',
      fiatSellAmount: '33',
      fiatBuyAmount: '0',
    })

    expect(tradeAmountsByActionAndAmountFromQuote).toEqual({
      sellAmountSellAssetCryptoPrecision: '0.01867572156196944',
      buyAmountBuyAssetCryptoPrecision: '728.53893838230606312222513796069583299584',
      fiatSellAmount: '33',
      fiatBuyAmount: '24.044124341395620247368',
    })
  })

  it('returns sellAmountSellAssetCryptoPrecision, buyAmountBuyAssetCryptoPrecision, fiatSellAmount, fiatBuyAmount for BUY_FIAT action', () => {
    const action = TradeAmountInputField.BUY_FIAT
    const state: SwapperState = { ...baseSwapperState, action }
    const tradeAmountsByActionAndAmount = selectTradeAmountsByActionAndAmount(state)
    const tradeAmountsByActionAndAmountFromQuote =
      selectTradeAmountsByActionAndAmountFromQuote(state)

    expect(tradeAmountsByActionAndAmount).toEqual({
      sellAmountSellAssetCryptoPrecision: '0',
      buyAmountBuyAssetCryptoPrecision: '1000',
      fiatSellAmount: '0',
      fiatBuyAmount: '33',
    })

    // These outputs are "correct" with the current logic, but don't really make sense unless we can specify a desired
    // receive amount when requesting a quote
    expect(tradeAmountsByActionAndAmountFromQuote).toEqual({
      sellAmountSellAssetCryptoPrecision: '0.018665',
      buyAmountBuyAssetCryptoPrecision: '1000',
      fiatSellAmount: '32.981055',
      fiatBuyAmount: '24.480377048395620247368',
    })
  })
})
