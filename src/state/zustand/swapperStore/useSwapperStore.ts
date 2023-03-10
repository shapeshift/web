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
      // Actions
      updateSelectedSellAssetAccountId: createUpdateAction(set, 'selectedSellAssetAccountId'),
      updateSelectedBuyAssetAccountId: createUpdateAction(set, 'selectedBuyAssetAccountId'),
      updateSellAssetAccountId: createUpdateAction(set, 'sellAssetAccountId'),
      updateBuyAssetAccountId: createUpdateAction(set, 'buyAssetAccountId'),
    }),
    { name: 'SwapperStore' },
  ),
)
