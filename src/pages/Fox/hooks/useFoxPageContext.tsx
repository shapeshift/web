import { type AccountId, type AssetId, foxAssetId, fromAssetId } from '@shapeshiftoss/caip'
import React, { createContext, useContext, useMemo, useState } from 'react'
import {
  selectAccountIdByAccountNumberAndChainId,
  selectAccountNumberByAccountId,
} from 'state/slices/portfolioSlice/selectors'
import { useAppSelector } from 'state/store'

type FoxPageContextType = {
  assetAccountId: AccountId | undefined
  assetId: AssetId
  setAssetAccountId: React.Dispatch<React.SetStateAction<AccountId | undefined>>
  assetAccountNumber: number | undefined
}

const FoxPageContext = createContext<FoxPageContextType | undefined>(undefined)

export const FoxPageProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [assetAccountId, setAssetAccountId] = useState<AccountId | undefined>()

  const filter = useMemo(
    () =>
      assetAccountId && foxAssetId ? { assetId: foxAssetId, accountId: assetAccountId } : undefined,
    [assetAccountId],
  )

  const assetAccountNumber = useAppSelector(state =>
    filter ? selectAccountNumberByAccountId(state, filter) : undefined,
  )

  const accountIdsByAccountNumberAndChainId = useAppSelector(
    selectAccountIdByAccountNumberAndChainId,
  )

  const selectedAssetAccountId = useMemo(() => {
    const accountNumberAccountIds =
      assetAccountNumber !== undefined
        ? accountIdsByAccountNumberAndChainId[assetAccountNumber]
        : accountIdsByAccountNumberAndChainId[0]
    const matchingAccountId = accountNumberAccountIds?.[fromAssetId(foxAssetId).chainId]
    return matchingAccountId
  }, [accountIdsByAccountNumberAndChainId, assetAccountNumber])

  const value: FoxPageContextType = useMemo(
    () => ({
      setAssetAccountId,
      assetId: foxAssetId,
      assetAccountNumber: assetAccountNumber ?? 0,
      assetAccountId: selectedAssetAccountId,
    }),
    [selectedAssetAccountId, assetAccountNumber],
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
