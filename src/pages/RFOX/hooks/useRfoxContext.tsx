import {
  type AccountId,
  type AssetId,
  foxOnArbitrumOneAssetId,
  fromAssetId,
} from '@shapeshiftoss/caip'
import React, { createContext, useContext, useMemo, useState } from 'react'
import {
  selectAccountIdByAccountNumberAndChainId,
  selectAccountNumberByAccountId,
} from 'state/slices/portfolioSlice/selectors'
import { useAppSelector } from 'state/store'

type RFOXContextType = {
  selectedAssetAccountId: AccountId | undefined
  selectedAssetId: AssetId
  setSelectedAssetId: (assetId: AssetId) => void
  setSelectedAssetAccountId: React.Dispatch<React.SetStateAction<AccountId | undefined>>
}

const RFOXContext = createContext<RFOXContextType | undefined>(undefined)

export const RFOXProvider: React.FC<React.PropsWithChildren<{ stakingAssetId: AssetId }>> = ({
  stakingAssetId = foxOnArbitrumOneAssetId,
  children,
}) => {
  const [selectedAssetAccountId, setSelectedAssetAccountId] = useState<AccountId | undefined>()
  const [selectedAssetId, setSelectedAssetId] = useState<AssetId>(stakingAssetId)

  const filter = useMemo(
    () =>
      selectedAssetAccountId && selectedAssetId
        ? { assetId: selectedAssetAccountId, accountId: selectedAssetAccountId }
        : undefined,
    [selectedAssetAccountId, selectedAssetId],
  )

  const selectedAssetAccountNumber = useAppSelector(state =>
    filter ? selectAccountNumberByAccountId(state, filter) : undefined,
  )

  const accountIdsByAccountNumberAndChainId = useAppSelector(
    selectAccountIdByAccountNumberAndChainId,
  )

  const stakingAssetAccountId = useMemo(() => {
    if (!(filter && selectedAssetAccountNumber !== undefined)) return
    const accountNumberAccountIds = accountIdsByAccountNumberAndChainId[selectedAssetAccountNumber]
    const stakingAssetAccountId = accountNumberAccountIds?.[fromAssetId(stakingAssetId).chainId]
    return stakingAssetAccountId
  }, [accountIdsByAccountNumberAndChainId, filter, selectedAssetAccountNumber, stakingAssetId])

  const value: RFOXContextType = useMemo(
    () => ({
      selectedAssetAccountId,
      setSelectedAssetAccountId,
      setSelectedAssetId,
      selectedAssetId,
      stakingAssetAccountId,
    }),
    [selectedAssetAccountId, selectedAssetId, stakingAssetAccountId],
  )

  return <RFOXContext.Provider value={value}>{children}</RFOXContext.Provider>
}

export const useRFOXContext = () => {
  const context = useContext(RFOXContext)
  if (context === undefined) {
    throw new Error('useRFOXContext must be used within RFOXProvider')
  }
  return context
}
