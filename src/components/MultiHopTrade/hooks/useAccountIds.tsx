import type { AccountId } from '@shapeshiftoss/caip'
import { useCallback, useMemo } from 'react'
import { selectFirstHopSellAccountId, selectLastHopBuyAccountId } from 'state/slices/selectors'
import { tradeInput } from 'state/slices/tradeInputSlice/tradeInputSlice'
import { useAppDispatch, useAppSelector } from 'state/store'

export const useAccountIds = (): {
  buyAssetAccountId?: AccountId
  sellAssetAccountId?: AccountId
  setBuyAssetAccountId: (accountId: AccountId) => void
  setSellAssetAccountId: (accountId: AccountId) => void
} => {
  const dispatch = useAppDispatch()

  // Default sellAssetAccountId selection
  const sellAssetAccountId = useAppSelector(selectFirstHopSellAccountId)
  const buyAssetAccountId = useAppSelector(selectLastHopBuyAccountId)

  // Setters - the selectors above initially select a *default* value, but eventually onAccountIdChange may fire if the user changes the account

  const setSellAssetAccountId = useCallback(
    (accountId: AccountId | undefined) =>
      dispatch(tradeInput.actions.setSellAssetAccountId(accountId)),
    [dispatch],
  )

  const setBuyAssetAccountId = useCallback(
    (accountId: AccountId | undefined) =>
      dispatch(tradeInput.actions.setBuyAssetAccountId(accountId)),
    [dispatch],
  )

  const result = useMemo(
    () => ({
      sellAssetAccountId,
      buyAssetAccountId,
      setSellAssetAccountId,
      setBuyAssetAccountId,
    }),
    [buyAssetAccountId, sellAssetAccountId, setBuyAssetAccountId, setSellAssetAccountId],
  )

  return result
}
