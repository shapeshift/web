import { TradeAmountInputField } from 'components/Trade/types'
import type {
  SetSwapperStoreAction,
  SwapperAction,
  SwapperStore,
} from 'state/zustand/swapperStore/types'

export const updateTradeAmounts =
  (set: SetSwapperStoreAction<SwapperStore>): SwapperAction['updateTradeAmounts'] =>
  ({ fiatSellAmount, fiatBuyAmount, buyAmountCryptoPrecision, sellAmountCryptoPrecision }) =>
    set(
      state => {
        if (fiatSellAmount) state.sellAmountFiat = fiatSellAmount
        if (fiatBuyAmount) state.buyAmountFiat = fiatBuyAmount
        if (buyAmountCryptoPrecision) state.buyAmountCryptoPrecision = buyAmountCryptoPrecision
        if (sellAmountCryptoPrecision) state.sellAmountCryptoPrecision = sellAmountCryptoPrecision
        return state
      },
      false,
      {
        type: `swapper/updateTradeAmounts`,
        value: {
          fiatSellAmount,
          fiatBuyAmount,
          buyAmountCryptoPrecision,
          sellAmountCryptoPrecision,
        },
      },
    )

export const toggleIsExactAllowance =
  (set: SetSwapperStoreAction<SwapperStore>): SwapperAction['toggleIsExactAllowance'] =>
  () =>
    set(
      state => {
        state.isExactAllowance = !state.isExactAllowance
        return state
      },
      false,
      `swapper/toggleIsExactAllowance`,
    )

export const clearAmounts =
  (set: SetSwapperStoreAction<SwapperStore>): SwapperAction['clearAmounts'] =>
  () =>
    set(
      state => {
        state.sellAmountCryptoPrecision = '0'
        state.buyAmountCryptoPrecision = '0'
        state.buyAmountFiat = '0'
        state.sellAmountFiat = '0'
        state.amount = '0'
        state.isSendMax = false
        state.action = TradeAmountInputField.SELL_FIAT
        state.trade = undefined
        state.buyAmountFiat = '0'
        state.sellAmountFiat = '0'
        return state
      },
      false,
      `swapper/clearAmounts`,
    )
