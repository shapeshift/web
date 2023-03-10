import type { AccountId } from '@shapeshiftoss/caip'
import type { TradeQuote } from '@shapeshiftoss/swapper'
import type { KnownChainIds } from '@shapeshiftoss/types'
import type { StoreApi, UseBoundStore } from 'zustand'
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

type SwapperStore<C extends KnownChainIds = KnownChainIds> = {
  selectedSellAssetAccountId?: AccountId
  selectedBuyAssetAccountId?: AccountId
  quote?: TradeQuote<C>
}

type SwapperAction = {
  updateSelectedSellAssetAccountId: (accountId: SwapperStore['selectedSellAssetAccountId']) => void
  updateSelectedBuyAssetAccountId: (accountId: SwapperStore['selectedBuyAssetAccountId']) => void
}

// https://github.com/pmndrs/zustand/blob/main/docs/guides/auto-generating-selectors.md
type WithSelectors<S> = S extends { getState: () => infer T }
  ? S & { use: { [K in keyof T]: () => T[K] } }
  : never

const createSelectors = <S extends UseBoundStore<StoreApi<object>>>(_store: S) => {
  let store = _store as WithSelectors<typeof _store>
  store.use = {}
  for (let k of Object.keys(store.getState())) {
    ;(store.use as any)[k] = () => store(s => s[k as keyof typeof s])
  }

  return store
}

const useSwapperStoreBase = create<SwapperStore & SwapperAction>()(
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
        set(() => ({ selectedBuyAssetAccountId }), false, 'swapper/selectedBuyAssetAccountId'),
    }),
    { name: 'SwapperStore' },
  ),
)

export const useSwapperStore = createSelectors(useSwapperStoreBase)
