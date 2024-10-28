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
  stakingAssetAccountId: AccountId | undefined
  stakingAssetId: AssetId
  setSelectedAssetId: (assetId: AssetId) => void
  setStakingAssetAccountId: React.Dispatch<React.SetStateAction<AccountId | undefined>>
}

const RFOXContext = createContext<RFOXContextType | undefined>(undefined)

export const RFOXProvider: React.FC<React.PropsWithChildren<{ stakingAssetId: AssetId }>> = ({
  stakingAssetId = foxOnArbitrumOneAssetId,
  children,
}) => {
  const [selectedAssetId, setSelectedAssetId] = useState<AssetId>(stakingAssetId)

  const [stakingAssetAccountId, setStakingAssetAccountId] = useState<AccountId | undefined>()

  const filter = useMemo(
    () => (stakingAssetAccountId ? { accountId: stakingAssetAccountId } : undefined),
    [stakingAssetAccountId],
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
    const matchingAccountId = accountNumberAccountIds?.[fromAssetId(selectedAssetId).chainId]
    return matchingAccountId
  }, [accountIdsByAccountNumberAndChainId, filter, selectedAssetId, stakingAssetAccountNumber])

  const value: RFOXContextType = useMemo(
    () => ({
      selectedAssetAccountId,
      setStakingAssetAccountId,
      setSelectedAssetId,
      selectedAssetId,
      stakingAssetAccountId,
      stakingAssetId,
    }),
    [
      selectedAssetAccountId,
      selectedAssetId,
      stakingAssetAccountId,
      stakingAssetId,
      setStakingAssetAccountId,
      setSelectedAssetId,
    ],
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
