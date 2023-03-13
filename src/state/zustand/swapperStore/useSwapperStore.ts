import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
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
  devtools(
    set => ({
      // State
      fiatSellAmount: '0',
      fiatBuyAmount: '0',

      // Actions
      updateSelectedSellAssetAccountId: createUpdateAction(set, 'selectedSellAssetAccountId'),
      updateSelectedBuyAssetAccountId: createUpdateAction(set, 'selectedBuyAssetAccountId'),
      updateSellAssetAccountId: createUpdateAction(set, 'sellAssetAccountId'),
      updateBuyAssetAccountId: createUpdateAction(set, 'buyAssetAccountId'),
      updateQuote: createUpdateAction(set, 'quote'),
      updateFiatSellAmount: createUpdateAction(set, 'fiatSellAmount'),
      updateFiatBuyAmount: createUpdateAction(set, 'fiatBuyAmount'),
      updateSellAssetFiatRate: createUpdateAction(set, 'sellAssetFiatRate'),
      updateBuyAssetFiatRate: createUpdateAction(set, 'buyAssetFiatRate'),
      updateFeeAssetFiatRate: createUpdateAction(set, 'feeAssetFiatRate'),
    }),
    { name: 'SwapperStore' },
  ),
)
