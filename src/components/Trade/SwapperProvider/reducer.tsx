import type { SwapperAction, SwapperState } from 'components/Trade/SwapperProvider/types'
import { SwapperActionType } from 'components/Trade/SwapperProvider/types'

export const swapperReducer = (state: SwapperState, action: SwapperAction): SwapperState => {
  switch (action.type) {
    case SwapperActionType.SET_VALUES:
      return { ...state, ...action.payload }
    case SwapperActionType.SET_BUY_ASSET:
    case SwapperActionType.SET_SELL_ASSET:
      const actionKey =
        action.type === SwapperActionType.SET_BUY_ASSET ? 'buyTradeAsset' : 'sellTradeAsset'
      return {
        ...state,
        [actionKey]: {
          ...state[actionKey],
          asset: action.payload,
        },
      }
    case SwapperActionType.TOGGLE_IS_EXACT_ALLOWANCE:
      return {
        ...state,
        isExactAllowance: !state.isExactAllowance,
      }
    case SwapperActionType.SET_TRADE_AMOUNTS:
      const buyAmountCryptoPrecision = action.payload.buyAmountCryptoPrecision
      const sellAmountCryptoPrecision = action.payload.sellAmountCryptoPrecision
      const fiatSellAmount = action.payload.fiatSellAmount
      const fiatBuyAmount = action.payload.fiatBuyAmount
      return {
        ...state,
        buyTradeAsset: {
          ...state.buyTradeAsset,
          ...(() =>
            buyAmountCryptoPrecision ? { amountCryptoPrecision: buyAmountCryptoPrecision } : {})(),
        },
        sellTradeAsset: {
          ...state.sellTradeAsset,
          ...(() =>
            sellAmountCryptoPrecision
              ? { amountCryptoPrecision: sellAmountCryptoPrecision }
              : {})(),
        },
        ...(() => (fiatSellAmount ? { fiatSellAmount } : {}))(),
        ...(() => (fiatBuyAmount ? { fiatBuyAmount } : {}))(),
      }
    case SwapperActionType.CLEAR_AMOUNTS:
      return {
        ...state,
        buyTradeAsset: {
          ...state.buyTradeAsset,
          amountCryptoPrecision: '',
        },
        sellTradeAsset: {
          ...state.sellTradeAsset,
          amountCryptoPrecision: '',
        },
      }
    default:
      return state
  }
}
