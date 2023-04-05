import type { Asset } from '@shapeshiftoss/asset-service'
import { getFormFees } from 'components/Trade/hooks/useSwapper/utils'
import { AssetClickAction } from 'components/Trade/hooks/useTradeRoutes/types'
import { TradeAmountInputField } from 'components/Trade/types'
import { fromBaseUnit } from 'lib/math'
import {
  selectTradeAmountsByActionAndAmount,
  selectTradeAmountsByActionAndAmountFromQuote,
} from 'state/zustand/swapperStore/amountSelectors'
import { selectQuote } from 'state/zustand/swapperStore/selectors'
import type { SetSwapperStoreAction, SwapperState } from 'state/zustand/swapperStore/types'

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
        const sellAsset = draft.sellAsset
        const buyAsset = draft.buyAsset
        const sellAssetFiatRate = draft.sellAssetFiatRate
        const buyAssetFiatRate = draft.buyAssetFiatRate

        draft.buyAsset = sellAsset
        draft.sellAsset = buyAsset
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
        draft.buyAssetFiatRate = sellAssetFiatRate
        draft.sellAssetFiatRate = buyAssetFiatRate
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
        const sellAsset = draft.sellAsset
        const buyAsset = draft.buyAsset
        const {
          sellAmountSellAssetBaseUnit,
          buyAmountBuyAssetBaseUnit,
          fiatSellAmount,
          fiatBuyAmount,
        } = tradeAmountsByActionAndAmount
        const buyAmountCryptoPrecision =
          buyAmountBuyAssetBaseUnit && buyAsset
            ? fromBaseUnit(buyAmountBuyAssetBaseUnit, buyAsset.precision)
            : '0'
        const sellAmountCryptoPrecision =
          sellAmountSellAssetBaseUnit && sellAsset
            ? fromBaseUnit(sellAmountSellAssetBaseUnit, sellAsset.precision)
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

export const handleAssetSelection =
  (set: SetSwapperStoreAction<SwapperState>): SwapperState['handleAssetSelection'] =>
  ({ asset, action }) =>
    set(
      draft => {
        const isBuy = action === AssetClickAction.Buy
        const isSell = action === AssetClickAction.Sell
        const sellAsset = draft.sellAsset
        const buyAsset = draft.buyAsset
        const isSameAsset = asset.assetId === (isBuy ? sellAsset?.assetId : buyAsset?.assetId)

        if (isBuy) {
          draft.buyAsset = asset
          draft.buyAssetFiatRate = undefined
          if (isSameAsset) draft.sellAsset = buyAsset
          draft.selectedBuyAssetAccountId = undefined
          draft.buyAssetAccountId = undefined
        }

        if (isSell) {
          draft.sellAsset = asset
          if (isSameAsset) draft.buyAsset = sellAsset
          draft.selectedSellAssetAccountId = undefined
          draft.sellAssetAccountId = undefined
          draft.sellAssetFiatRate = undefined
          draft.feeAssetFiatRate = undefined
        }

        draft.fees = undefined
        draft.action = TradeAmountInputField.SELL_FIAT
        draft.amount = '0'
        draft.buyAmountCryptoPrecision = '0'
        draft.sellAmountCryptoPrecision = '0'
        draft.buyAmountFiat = '0'
        draft.sellAmountFiat = '0'

        return draft
      },
      false,
      {
        type: `swapper/handleAssetSelection`,
        value: {
          asset,
          action,
        },
      },
    )

export const updateFees = (set: SetSwapperStoreAction<SwapperState>) => (sellFeeAsset: Asset) =>
  set(
    draft => {
      const feeTrade = draft.trade ?? selectQuote(draft)
      const sellAsset = draft.sellAsset
      const activeTradeSwapper = draft.activeSwapperWithMetadata?.swapper
      if (sellAsset && activeTradeSwapper && feeTrade) {
        const fees = getFormFees({
          trade: feeTrade,
          sellAsset,
          tradeFeeSource: activeTradeSwapper.name,
          feeAsset: sellFeeAsset,
        })

        draft.fees = fees
      }
      return draft
    },
    false,
    `swapper/updateFees`,
  )

export const updateTradeAmountsFromQuote = (set: SetSwapperStoreAction<SwapperState>) => () =>
  set(
    draft => {
      const tradeAmountsByActionAndAmount = selectTradeAmountsByActionAndAmountFromQuote(draft)
      const sellAsset = draft.sellAsset
      const buyAsset = draft.buyAsset
      const {
        sellAmountSellAssetBaseUnit,
        buyAmountBuyAssetBaseUnit,
        fiatSellAmount,
        fiatBuyAmount,
      } = tradeAmountsByActionAndAmount
      const buyAmountCryptoPrecision =
        buyAmountBuyAssetBaseUnit && buyAsset
          ? fromBaseUnit(buyAmountBuyAssetBaseUnit, buyAsset.precision)
          : '0'
      const sellAmountCryptoPrecision =
        sellAmountSellAssetBaseUnit && sellAsset
          ? fromBaseUnit(sellAmountSellAssetBaseUnit, sellAsset.precision)
          : '0'
      draft.buyAmountCryptoPrecision = buyAmountCryptoPrecision
      draft.sellAmountCryptoPrecision = sellAmountCryptoPrecision
      if (fiatBuyAmount) draft.buyAmountFiat = fiatBuyAmount
      if (fiatSellAmount) draft.sellAmountFiat = fiatSellAmount
      return draft
    },
    false,
    `swapper/updateTradeAmountsFromQuote`,
  )
