import type { AccountId } from '@shapeshiftoss/caip'
import { useCallback, useMemo } from 'react'
import {
  selectAccountIdByAccountNumberAndChainId,
  selectAccountNumberByAccountId,
  selectFirstHopSellAccountId,
  selectInputBuyAsset,
  selectLastHopBuyAccountId,
} from 'state/slices/selectors'
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
  const sellAssetAccountNumberFilter = useMemo(
    () => ({ accountId: sellAssetAccountId }),
    [sellAssetAccountId],
  )
  const sellAssetAccountNumber = useAppSelector(state =>
    selectAccountNumberByAccountId(state, sellAssetAccountNumberFilter),
  )

  // Default buyAssetAccountId selection

  const accountIdsByAccountNumberAndChainId = useAppSelector(
    selectAccountIdByAccountNumberAndChainId,
  )
  const inputBuyAsset = useAppSelector(selectInputBuyAsset)
  const maybeMatchingBuyAccountId =
    accountIdsByAccountNumberAndChainId[sellAssetAccountNumber as number]?.[inputBuyAsset?.chainId]

  // We always default the buy asset account to be synchronized with the sellAssetAccountNumber
  // - if this isn't possible, i.e there is no matching account number on the buy side, we default to the highest balance
  // - if this was to fail for any reason, we default to the first account number as a default
  const buyAssetAccountId = useAppSelector(state =>
    selectLastHopBuyAccountId(state, { accountId: maybeMatchingBuyAccountId }),
  )

  // Setters - the selectors above initially select a *default* value, but eventually onAccountIdChange may fire if the user changes the account

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
