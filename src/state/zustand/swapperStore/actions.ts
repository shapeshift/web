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
  (set: SetSwapperStoreAction<SwapperStore>): SwapperAction['toggleIsExactAllowance'] =>
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
  (set: SetSwapperStoreAction<SwapperStore>): SwapperAction['handleAssetToggle'] =>
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
