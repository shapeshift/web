import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { foxAssetId, fromAssetId } from '@shapeshiftoss/caip'
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import {
  selectAccountNumberByAccountId,
  selectFirstAccountIdByChainId,
  selectPortfolioAccountIdsByAssetIdFilter,
} from 'state/slices/portfolioSlice/selectors'
import { useAppSelector } from 'state/store'

type FoxPageContextType = {
  assetAccountId: AccountId | undefined
  assetId: AssetId
  setAssetAccountId: React.Dispatch<React.SetStateAction<AccountId | undefined>>
  assetAccountNumber: number
}

const FoxPageContext = createContext<FoxPageContextType | undefined>(undefined)

export const FoxPageProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [assetAccountId, setAssetAccountId] = useState<AccountId | undefined>()
  const accountIdsFilter = useMemo(() => ({ assetId: foxAssetId }), [])
  const accountIds = useAppSelector(
    state => selectPortfolioAccountIdsByAssetIdFilter(state, accountIdsFilter),
    // We lost a lot of time trying to find why accountIds wasn't triggering the useEffect
    () => false,
  )

  const filter = useMemo(
    () => (assetAccountId ? { assetId: foxAssetId, accountId: assetAccountId } : undefined),
    [assetAccountId],
  )

  useEffect(() => {
    if (!accountIds.length) setAssetAccountId(undefined)
    if (accountIds.length === 1) {
      setAssetAccountId(accountIds[0])
    }
  }, [accountIds, setAssetAccountId])

  const assetAccountNumber = useAppSelector(state =>
    filter ? selectAccountNumberByAccountId(state, filter) : undefined,
  )

  const firstAssetAccountId = useAppSelector(state =>
    selectFirstAccountIdByChainId(state, fromAssetId(foxAssetId).chainId),
  )

  const value: FoxPageContextType = useMemo(
    () => ({
      setAssetAccountId,
      assetId: foxAssetId,
      assetAccountNumber: assetAccountNumber ?? 0,
      assetAccountId: assetAccountId ?? firstAssetAccountId,
    }),
    [assetAccountId, assetAccountNumber, firstAssetAccountId, setAssetAccountId],
  )

  return <FoxPageContext.Provider value={value}>{children}</FoxPageContext.Provider>
}

export const useFoxPageContext = () => {
  const context = useContext(FoxPageContext)
  if (context === undefined) {
    throw new Error('useFoxPageContext must be used within FoxPageProvider')
  }
  return context
}
