import type { AccountId } from '@shapeshiftoss/caip'
import type { TradeQuote } from '@shapeshiftoss/swapper'
import type { KnownChainIds } from '@shapeshiftoss/types'

export type UseSwapperStore<C extends KnownChainIds = KnownChainIds> = {
  selectedSellAssetAccountId?: AccountId
  selectedBuyAssetAccountId?: AccountId
  sellAssetAccountId?: AccountId | undefined
  buyAssetAccountId?: AccountId | undefined
  quote?: TradeQuote<C>
}

export type SwapperAction = {
  updateSelectedSellAssetAccountId: (
    accountId: UseSwapperStore['selectedSellAssetAccountId'],
  ) => void
  updateSelectedBuyAssetAccountId: (accountId: UseSwapperStore['selectedBuyAssetAccountId']) => void
  updateSellAssetAccountId: (accountId: UseSwapperStore['sellAssetAccountId']) => void
  updateBuyAssetAccountId: (accountId: UseSwapperStore['buyAssetAccountId']) => void
}
