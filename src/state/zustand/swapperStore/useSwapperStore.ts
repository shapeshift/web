import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { SwapperAction, UseSwapperStore } from 'state/zustand/swapperStore/types'

export const useSwapperStore = create<UseSwapperStore & SwapperAction>()(
  devtools(
    set => ({
      // Actions
      updateSelectedSellAssetAccountId: selectedSellAssetAccountId =>
        set(
          () => ({ selectedSellAssetAccountId }),
          false,
          'swapper/updateSelectedSellAssetAccountId',
        ),
      updateSelectedBuyAssetAccountId: selectedBuyAssetAccountId =>
        set(
          () => ({ selectedBuyAssetAccountId }),
          false,
          'swapper/updateSelectedBuyAssetAccountId',
        ),
      updateSellAssetAccountId: sellAssetAccountId =>
        set(() => ({ sellAssetAccountId }), false, 'swapper/updateSellAssetAccountId'),
      updateBuyAssetAccountId: buyAssetAccountId =>
        set(() => ({ buyAssetAccountId }), false, 'swapper/updateBuyAssetAccountId'),
    }),
    { name: 'SwapperStore' },
  ),
)
