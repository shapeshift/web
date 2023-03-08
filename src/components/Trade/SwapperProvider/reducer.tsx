import { DEFAULT_SLIPPAGE } from 'constants/constants'
import type { SwapperAction, SwapperState } from 'components/Trade/SwapperProvider/types'
import { SwapperActionType } from 'components/Trade/SwapperProvider/types'
import { fromBaseUnit } from 'lib/math'

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
      return { ...state, isExactAllowance: !state.isExactAllowance }
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
    case SwapperActionType.SET_ACTIVE_SWAPPER: {
      const slippage = action.payload.quote.recommendedSlippage ?? DEFAULT_SLIPPAGE
      const payload = action.payload
      const quote = payload.quote
      const buyAmountCryptoPrecision = fromBaseUnit(
        quote.buyAmountCryptoBaseUnit,
        quote.buyAsset.precision,
      )
      const sellAmountCryptoPrecision = fromBaseUnit(
        quote.sellAmountBeforeFeesCryptoBaseUnit,
        quote.sellAsset.precision,
      )
      return {
        ...state,
        activeSwapperWithMetadata: payload,
        quote,
        slippage,
        buyTradeAsset: {
          ...state.buyTradeAsset,
          amountCryptoPrecision: buyAmountCryptoPrecision,
        },
        sellTradeAsset: {
          ...state.sellTradeAsset,
          amountCryptoPrecision: sellAmountCryptoPrecision,
        },
      }
    }
    case SwapperActionType.SET_AVAILABLE_SWAPPERS:
      const swappersWithQuoteMetadata = action.payload
      const isCurrentSwapperStillAvailable = swappersWithQuoteMetadata.some(
        swapperWithQuoteMetadata =>
          swapperWithQuoteMetadata.swapper.getType() ===
          state.activeSwapperWithMetadata?.swapper.getType(),
      )
      const bestSwapperWithQuoteMetadata = swappersWithQuoteMetadata?.[0]
      const bestQuote = bestSwapperWithQuoteMetadata?.quote
      const bestSlippage = bestQuote.recommendedSlippage ?? DEFAULT_SLIPPAGE
      // If the current swapper is still available, keep it as the active swapper and update the quote/slippage
      // Otherwise, set the active swapper to the best swapper and update the quote/slippage
      const bestSwapperSpreadable: Partial<SwapperState> = isCurrentSwapperStillAvailable
        ? {
            activeSwapperWithMetadata: state.activeSwapperWithMetadata,
            slippage:
              state.activeSwapperWithMetadata?.quote?.recommendedSlippage ?? DEFAULT_SLIPPAGE,
            quote: state.activeSwapperWithMetadata?.quote,
          }
        : {
            activeSwapperWithMetadata: swappersWithQuoteMetadata?.[0],
            slippage: bestSlippage,
            quote: bestQuote,
          }
      return {
        ...state,
        ...bestSwapperSpreadable,
        availableSwappersWithMetadata: swappersWithQuoteMetadata,
      }
    default:
      return state
  }
}
