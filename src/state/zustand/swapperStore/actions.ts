import { TradeAmountInputField } from 'components/Trade/types'
import { fromBaseUnit } from 'lib/math'
import { selectTradeAmountsByActionAndAmount } from 'state/zustand/swapperStore/amountSelectors'
import type { SetSwapperStoreAction, SwapperState } from 'state/zustand/swapperStore/types'

export const updateTradeAmounts =
  (set: SetSwapperStoreAction<SwapperState>): SwapperState['updateTradeAmounts'] =>
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
  (set: SetSwapperStoreAction<SwapperState>): SwapperState['toggleIsExactAllowance'] =>
  () =>
    set(
      draft => {
        draft.isExactAllowance = !draft.isExactAllowance
        return draft
      },
      false,
      `swapper/toggleIsExactAllowance`,
    )

export const clearAmounts =
  (set: SetSwapperStoreAction<SwapperState>): SwapperState['clearAmounts'] =>
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

export const handleSwitchAssets =
  (set: SetSwapperStoreAction<SwapperState>): SwapperState['handleSwitchAssets'] =>
  () =>
    set(
      draft => {
        const currentSellAsset = draft.sellAsset
        const currentBuyAsset = draft.buyAsset
        const currentSellAssetFiatRate = draft.sellAssetFiatRate
        const currentBuyAssetFiatRate = draft.buyAssetFiatRate

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
      `swapper/handleSwitchAssets`,
    )

export const handleInputAmountChange =
  (set: SetSwapperStoreAction<SwapperState>): SwapperState['handleInputAmountChange'] =>
  () =>
    set(
      draft => {
        const tradeAmountsByActionAndAmount = selectTradeAmountsByActionAndAmount(draft)
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
