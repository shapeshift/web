import type { AccountId } from '@shapeshiftoss/caip'
import { useCallback } from 'react'
import { selectBuyAccountId, selectSellAccountId } from 'state/slices/selectors'
import { swappers } from 'state/slices/swappersSlice/swappersSlice'
import { useAppDispatch, useAppSelector } from 'state/store'

export const useAccountIds = (): {
  buyAssetAccountId?: AccountId
  sellAssetAccountId?: AccountId
  setBuyAssetAccountId: (accountId: AccountId) => void
  setSellAssetAccountId: (accountId: AccountId) => void
} => {
  const dispatch = useAppDispatch()
  const sellAssetAccountId = useAppSelector(selectSellAccountId)
  const buyAssetAccountId = useAppSelector(selectBuyAccountId)

  const setSellAssetAccountId = useCallback(
    (accountId: AccountId | undefined) =>
      dispatch(swappers.actions.setSellAssetAccountId(accountId)),
    [dispatch],
  )

  const setBuyAssetAccountId = useCallback(
    (accountId: AccountId | undefined) =>
      dispatch(swappers.actions.setBuyAssetAccountId(accountId)),
    [dispatch],
  )

  return {
    sellAssetAccountId,
    buyAssetAccountId,
    setSellAssetAccountId,
    setBuyAssetAccountId,
  }
}
