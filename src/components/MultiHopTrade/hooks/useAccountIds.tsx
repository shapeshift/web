import type { AccountId } from '@shapeshiftoss/caip'
import { useCallback } from 'react'
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

  // currently, a multi-hop trade will be automagically routed though the accountId corresponding to
  // the accountNumber for the first hop.
  const sellAssetAccountId = useAppSelector(selectFirstHopSellAccountId)
  const buyAssetAccountId = useAppSelector(selectLastHopBuyAccountId)

  const setSellAssetAccountId = useCallback(
    (accountId: AccountId | undefined) =>
      dispatch(tradeInput.actions.setSellAssetAccountNumber(accountId)),
    [dispatch],
  )

  const setBuyAssetAccountId = useCallback(
    (accountId: AccountId | undefined) =>
      dispatch(tradeInput.actions.setBuyAssetAccountNumber(accountId)),
    [dispatch],
  )

  return {
    sellAssetAccountId,
    buyAssetAccountId,
    setSellAssetAccountId,
    setBuyAssetAccountId,
  }
}
