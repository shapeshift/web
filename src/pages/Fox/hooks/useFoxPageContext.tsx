import { type AccountId, type AssetId, fromAssetId } from '@shapeshiftoss/caip'
import React, { createContext, useContext, useMemo, useState } from 'react'
import {
  selectAccountIdByAccountNumberAndChainId,
  selectAccountNumberByAccountId,
} from 'state/slices/portfolioSlice/selectors'
import { useAppSelector } from 'state/store'

type FoxPageContextType = {
  selectedAssetAccountId: AccountId | undefined
  assetId: AssetId
  setAssetAccountId: React.Dispatch<React.SetStateAction<AccountId | undefined>>
}

const FoxPageContext = createContext<FoxPageContextType | undefined>(undefined)

export const FoxPageProvider: React.FC<React.PropsWithChildren<{ assetId: AssetId }>> = ({
  children,
  assetId,
}) => {
  const [assetAccountId, setAssetAccountId] = useState<AccountId | undefined>()

  const filter = useMemo(
    () => (assetAccountId && assetId ? { assetId, accountId: assetAccountId } : undefined),
    [assetAccountId, assetId],
  )

  const stakingAssetAccountNumber = useAppSelector(state =>
    filter ? selectAccountNumberByAccountId(state, filter) : undefined,
  )

  const accountIdsByAccountNumberAndChainId = useAppSelector(
    selectAccountIdByAccountNumberAndChainId,
  )

  const selectedAssetAccountId = useMemo(() => {
    if (!(filter && stakingAssetAccountNumber !== undefined)) return
    const accountNumberAccountIds = accountIdsByAccountNumberAndChainId[stakingAssetAccountNumber]
    const matchingAccountId = accountNumberAccountIds?.[fromAssetId(assetId).chainId]
    return matchingAccountId
  }, [accountIdsByAccountNumberAndChainId, filter, assetId, stakingAssetAccountNumber])

  const value: FoxPageContextType = useMemo(
    () => ({
      selectedAssetAccountId,
      setAssetAccountId,
      assetId,
      assetAccountId,
    }),
    [assetId, selectedAssetAccountId, assetAccountId],
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
