import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type {
  SetSwapperStoreAction,
  SwapperAction,
  SwapperStore,
} from 'state/zustand/swapperStore/types'

const createUpdateAction =
  <T extends keyof SwapperStore>(set: SetSwapperStoreAction<SwapperStore>, key: string) =>
  (value: SwapperStore[T]): void =>
    set(
      () => ({ [key]: value }),
      false,
      `swapper/update${key.charAt(0).toUpperCase() + key.slice(1)}`,
    )

export const useSwapperStore = create<SwapperStore & SwapperAction>()(
  immer(
    devtools(
      set => ({
        // State
        fiatSellAmount: '0',
        fiatBuyAmount: '0',
        sellTradeAsset: { amountCryptoPrecision: '0' },
        buyTradeAsset: { amountCryptoPrecision: '0' },

        // Actions
        updateSelectedSellAssetAccountId: createUpdateAction(set, 'selectedSellAssetAccountId'),
        updateSelectedBuyAssetAccountId: createUpdateAction(set, 'selectedBuyAssetAccountId'),
        updateSellAssetAccountId: createUpdateAction(set, 'sellAssetAccountId'),
        updateBuyAssetAccountId: createUpdateAction(set, 'buyAssetAccountId'),
        updateQuote: createUpdateAction(set, 'quote'),
        updateSellAssetFiatRate: createUpdateAction(set, 'sellAssetFiatRate'),
        updateBuyAssetFiatRate: createUpdateAction(set, 'buyAssetFiatRate'),
        updateFeeAssetFiatRate: createUpdateAction(set, 'feeAssetFiatRate'),
        updateFiatSellAmount: createUpdateAction(set, 'fiatSellAmount'),
        updateFiatBuyAmount: createUpdateAction(set, 'fiatBuyAmount'),
        updateBuyTradeAsset: createUpdateAction(set, 'buyTradeAsset'),
        updateSellTradeAsset: createUpdateAction(set, 'sellTradeAsset'),
        updateTradeAmounts: ({
          fiatSellAmount,
          fiatBuyAmount,
          buyAmountCryptoPrecision,
          sellAmountCryptoPrecision,
        }) => {
          set(
            state => {
              if (fiatSellAmount) state.fiatSellAmount = fiatSellAmount
              if (fiatBuyAmount) state.fiatBuyAmount = fiatBuyAmount
              if (fiatBuyAmount && state.buyTradeAsset?.amountCryptoPrecision)
                state.buyTradeAsset.amountCryptoPrecision = buyAmountCryptoPrecision
              if (fiatSellAmount && state.sellTradeAsset?.amountCryptoPrecision)
                state.sellTradeAsset.amountCryptoPrecision = sellAmountCryptoPrecision
            },
            false,
            `swapper/updateTradeAmounts`,
          )
        },
        clearAmounts: () => {
          set(
            state => {
              if (state.sellTradeAsset?.amountCryptoPrecision)
                state.sellTradeAsset.amountCryptoPrecision = ''
              if (state.buyTradeAsset?.amountCryptoPrecision)
                state.buyTradeAsset.amountCryptoPrecision = ''
              state.fiatBuyAmount = '0'
              state.fiatSellAmount = '0'
            },
            false,
            `swapper/clearAmounts`,
          )
        },
      }),
      { name: 'SwapperStore' },
    ),
  ),
)
