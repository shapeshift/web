import { getFormFees } from 'components/Trade/hooks/useSwapper/utils'
import { AssetClickAction } from 'components/Trade/hooks/useTradeRoutes/types'
import { TradeAmountInputField } from 'components/Trade/types'
import type { Asset } from 'lib/asset-service'
import {
  selectTradeAmountsByActionAndAmount,
  selectTradeAmountsByActionAndAmountFromQuote,
} from 'state/zustand/swapperStore/amountSelectors'
import { selectActiveSwapperWithMetadata, selectQuote } from 'state/zustand/swapperStore/selectors'
import type { SetSwapperStoreAction, SwapperState } from 'state/zustand/swapperStore/types'

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

        draft.buyAsset = sellAsset
        draft.sellAsset = buyAsset
        draft.sellAmountCryptoPrecision = '0'
        draft.buyAmountCryptoPrecision = '0'
        draft.sellAmountFiat = '0'
        draft.buyAmountFiat = '0'
        draft.amount = '0'
        draft.fees = undefined
        draft.trade = undefined
        draft.selectedSellAssetAccountId = undefined
        draft.selectedBuyAssetAccountId = undefined
        draft.buyAssetAccountId = undefined
        draft.sellAssetAccountId = undefined
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
        const {
          sellAmountSellAssetCryptoPrecision,
          buyAmountBuyAssetCryptoPrecision,
          fiatSellAmount,
          fiatBuyAmount,
        } = selectTradeAmountsByActionAndAmount(draft)
        if (buyAmountBuyAssetCryptoPrecision)
          draft.buyAmountCryptoPrecision = buyAmountBuyAssetCryptoPrecision
        if (sellAmountSellAssetCryptoPrecision)
          draft.sellAmountCryptoPrecision = sellAmountSellAssetCryptoPrecision
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
          if (isSameAsset) draft.sellAsset = buyAsset
          draft.selectedBuyAssetAccountId = undefined
          draft.buyAssetAccountId = undefined
        }

        if (isSell) {
          draft.sellAsset = asset
          if (isSameAsset) draft.buyAsset = sellAsset
          draft.selectedSellAssetAccountId = undefined
          draft.sellAssetAccountId = undefined
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
      const feeTrade = draft.trade ?? selectQuote(draft)?.steps[0]
      const sellAsset = draft.sellAsset
      const activeSwapperWithMetadata = selectActiveSwapperWithMetadata(draft)
      const activeTradeSwapper = activeSwapperWithMetadata?.swapper
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
      const {
        sellAmountSellAssetCryptoPrecision,
        buyAmountBuyAssetCryptoPrecision,
        fiatSellAmount,
        fiatBuyAmount,
      } = selectTradeAmountsByActionAndAmountFromQuote(draft)
      if (buyAmountBuyAssetCryptoPrecision)
        draft.buyAmountCryptoPrecision = buyAmountBuyAssetCryptoPrecision
      if (sellAmountSellAssetCryptoPrecision)
        draft.sellAmountCryptoPrecision = sellAmountSellAssetCryptoPrecision
      if (fiatBuyAmount) draft.buyAmountFiat = fiatBuyAmount
      if (fiatSellAmount) draft.sellAmountFiat = fiatSellAmount
      return draft
    },
    false,
    `swapper/updateTradeAmountsFromQuote`,
  )
