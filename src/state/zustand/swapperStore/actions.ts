import { TradeAmountInputField } from 'components/Trade/types'
import { fromBaseUnit } from 'lib/math'
import { selectTradeAmountsByActionAndAmount } from 'state/zustand/swapperStore/amountSelectors'
import type {
  SetSwapperStoreAction,
  SwapperAction,
  SwapperStore,
} from 'state/zustand/swapperStore/types'
import type { SwapperState } from 'state/zustand/swapperStore/useSwapperStore'

export const updateTradeAmounts =
  (set: SetSwapperStoreAction<SwapperStore>): SwapperAction['updateTradeAmounts'] =>
  ({ fiatSellAmount, fiatBuyAmount, buyAmountCryptoPrecision, sellAmountCryptoPrecision }) =>
    set(
      draft => {
        if (fiatSellAmount) draft.sellAmountFiat = fiatSellAmount
        if (fiatBuyAmount) draft.buyAmountFiat = fiatBuyAmount
        if (buyAmountCryptoPrecision) draft.buyAmountCryptoPrecision = buyAmountCryptoPrecision
        if (sellAmountCryptoPrecision) draft.sellAmountCryptoPrecision = sellAmountCryptoPrecision
        return draft
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
  (
    set: SetSwapperStoreAction<SwapperStore>,
    getState: () => SwapperState,
  ): SwapperAction['toggleIsExactAllowance'] =>
  () =>
    set(
      draft => {
        const currentState = getState()
        draft.isExactAllowance = !currentState.isExactAllowance
        return draft
      },
      false,
      `swapper/toggleIsExactAllowance`,
    )

export const clearAmounts =
  (set: SetSwapperStoreAction<SwapperStore>): SwapperAction['clearAmounts'] =>
  () =>
    set(
      draft => {
        draft.sellAmountCryptoPrecision = '0'
        draft.buyAmountCryptoPrecision = '0'
        draft.buyAmountFiat = '0'
        draft.sellAmountFiat = '0'
        draft.amount = '0'
        draft.isSendMax = false
        draft.action = TradeAmountInputField.SELL_FIAT
        draft.trade = undefined
        draft.buyAmountFiat = '0'
        draft.sellAmountFiat = '0'
        return draft
      },
      false,
      `swapper/clearAmounts`,
    )

export const handleAssetToggle =
  (
    set: SetSwapperStoreAction<SwapperStore>,
    getState: () => SwapperState,
  ): SwapperAction['handleAssetToggle'] =>
  () =>
    set(
      draft => {
        const currentState = getState()
        const currentSellAsset = currentState.sellAsset
        const currentBuyAsset = currentState.buyAsset
        const currentSellAssetFiatRate = currentState.sellAssetFiatRate
        const currentBuyAssetFiatRate = currentState.buyAssetFiatRate

        draft.buyAsset = currentSellAsset
        draft.sellAsset = currentBuyAsset
        draft.sellAmountCryptoPrecision = '0'
        draft.buyAmountCryptoPrecision = '0'
        draft.sellAmountFiat = '0'
        draft.buyAmountFiat = '0'
        draft.amount = '0'
        draft.feeAssetFiatRate = undefined
        draft.fees = undefined
        draft.trade = undefined
        draft.selectedSellAssetAccountId = undefined
        draft.selectedBuyAssetAccountId = undefined
        draft.buyAssetAccountId = undefined
        draft.sellAssetAccountId = undefined
        draft.buyAssetFiatRate = currentSellAssetFiatRate
        draft.sellAssetFiatRate = currentBuyAssetFiatRate
        return draft
      },
      false,
      `swapper/handleAssetToggle`,
    )

export const handleInputAmountChange =
  (
    set: SetSwapperStoreAction<SwapperStore>,
    getState: () => SwapperState,
  ): SwapperAction['handleInputAmountChange'] =>
  () =>
    set(
      draft => {
        const currentState = getState()
        const tradeAmountsByActionAndAmount = selectTradeAmountsByActionAndAmount(currentState)
        const currentSellAsset = draft.sellAsset
        const currentBuyAsset = draft.buyAsset
        const {
          sellAmountSellAssetBaseUnit,
          buyAmountBuyAssetBaseUnit,
          fiatSellAmount,
          fiatBuyAmount,
        } = tradeAmountsByActionAndAmount
        const buyAmountCryptoPrecision =
          buyAmountBuyAssetBaseUnit && currentBuyAsset
            ? fromBaseUnit(buyAmountBuyAssetBaseUnit, currentBuyAsset.precision)
            : '0'
        const sellAmountCryptoPrecision =
          sellAmountSellAssetBaseUnit && currentSellAsset
            ? fromBaseUnit(sellAmountSellAssetBaseUnit, currentSellAsset.precision)
            : '0'
        draft.buyAmountCryptoPrecision = buyAmountCryptoPrecision
        draft.sellAmountCryptoPrecision = sellAmountCryptoPrecision
        if (fiatBuyAmount) draft.buyAmountFiat = fiatBuyAmount
        if (fiatSellAmount) draft.sellAmountFiat = fiatSellAmount
        return draft
      },
      false,
      `swapper/handleInputAmountChange`,
    )
