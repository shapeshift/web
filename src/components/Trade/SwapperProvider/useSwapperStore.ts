import type { AccountId } from '@shapeshiftoss/caip'
import type { TradeQuote } from '@shapeshiftoss/swapper'
import type { KnownChainIds } from '@shapeshiftoss/types'
import type { StoreApi, UseBoundStore } from 'zustand'
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

export type SwapperStore<C extends KnownChainIds = KnownChainIds> = {
  selectedSellAssetAccountId?: AccountId
  selectedBuyAssetAccountId?: AccountId
  sellAssetAccountId?: AccountId | undefined
  buyAssetAccountId?: AccountId | undefined
  quote?: TradeQuote<C>
}

type SwapperAction = {
  updateSelectedSellAssetAccountId: (accountId: SwapperStore['selectedSellAssetAccountId']) => void
  updateSelectedBuyAssetAccountId: (accountId: SwapperStore['selectedBuyAssetAccountId']) => void
  updateSellAssetAccountId: (accountId: SwapperStore['sellAssetAccountId']) => void
  updateBuyAssetAccountId: (accountId: SwapperStore['buyAssetAccountId']) => void
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

// https://github.com/pmndrs/zustand/blob/main/src/vanilla.ts#L1
type SetSwapperStoreAction<T> = {
  (
    partial:
      | T
      | Partial<T>
      | {
          (state: T): T | Partial<T>
        },
    replace?: boolean | undefined,
    action?: string,
  ): void
}

const createUpdateAction =
  <T extends keyof SwapperStore>(set: SetSwapperStoreAction<SwapperStore>, key: string) =>
  (value: SwapperStore[T]): void =>
    set(
      () => ({ [key]: value }),
      false,
      `swapper/update${key.charAt(0).toUpperCase() + key.slice(1)}`,
    )

const useSwapperStoreBase = create<SwapperStore & SwapperAction>()(
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

export const useSwapperStore = createSelectors(useSwapperStoreBase)
