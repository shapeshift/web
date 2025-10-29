import type { AccountId } from '@shapeshiftoss/caip'
import { useCallback, useMemo } from 'react'

import { useAccountSelection } from '@/hooks/useAccountSelection'
import { selectPortfolioAccountIdsByAssetIdFilter } from '@/state/slices/selectors'
import { selectInputBuyAsset, selectInputSellAsset } from '@/state/slices/tradeInputSlice/selectors'
import { tradeInput } from '@/state/slices/tradeInputSlice/tradeInputSlice'
import { useAppDispatch, useAppSelector } from '@/state/store'

export const useAccountIds = (): {
  buyAssetAccountId?: AccountId
  sellAssetAccountId?: AccountId
  setBuyAssetAccountId: (accountId: AccountId) => void
  setSellAssetAccountId: (accountId: AccountId) => void
} => {
  const dispatch = useAppDispatch()

  // Get sell asset and available account IDs
  const sellAsset = useAppSelector(selectInputSellAsset)
  const sellAssetFilter = useMemo(() => ({ assetId: sellAsset.assetId }), [sellAsset.assetId])
  const sellAccountIds = useAppSelector(state =>
    selectPortfolioAccountIdsByAssetIdFilter(state, sellAssetFilter),
  )

  // Use new hook for sell account selection (auto-select highest balance)
  const sellAssetAccountId = useAccountSelection({
    assetId: sellAsset.assetId,
    accountIds: sellAccountIds,
    defaultAccountId: undefined,
    autoSelectHighestBalance: true,
  })

  // Get buy asset and available account IDs
  const buyAsset = useAppSelector(selectInputBuyAsset)
  const buyAssetFilter = useMemo(() => ({ assetId: buyAsset.assetId }), [buyAsset.assetId])
  const buyAccountIds = useAppSelector(state =>
    selectPortfolioAccountIdsByAssetIdFilter(state, buyAssetFilter),
  )

  // Use new hook for buy account selection (auto-select highest balance)
  const buyAssetAccountId = useAccountSelection({
    assetId: buyAsset.assetId,
    accountIds: buyAccountIds,
    defaultAccountId: undefined,
    autoSelectHighestBalance: true,
  })

  // Setters - the selectors above initially select a *default* value, but eventually onAccountIdChange may fire if the user changes the account

  const setSellAssetAccountId = useCallback(
    (accountId: AccountId | undefined) => {
      dispatch(tradeInput.actions.setSellAccountId(accountId))
    },
    [dispatch],
  )

  const setBuyAssetAccountId = useCallback(
    (accountId: AccountId | undefined) => {
      dispatch(tradeInput.actions.setBuyAccountId(accountId))
    },
    [dispatch],
  )

  return useMemo(
    () => ({
      sellAssetAccountId,
      buyAssetAccountId,
      setSellAssetAccountId,
      setBuyAssetAccountId,
    }),
    [buyAssetAccountId, sellAssetAccountId, setBuyAssetAccountId, setSellAssetAccountId],
  )
}
