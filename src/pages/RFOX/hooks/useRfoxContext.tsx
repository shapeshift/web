import {
  type AccountId,
  type AssetId,
  foxOnArbitrumOneAssetId,
  fromAssetId,
  thorchainChainId,
} from '@shapeshiftoss/caip'
import React, { createContext, useContext, useMemo, useState } from 'react'
import {
  selectAccountIdByAccountNumberAndChainId,
  selectAccountNumberByAccountId,
  selectFirstAccountIdByChainId,
} from 'state/slices/portfolioSlice/selectors'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type RFOXContextType = {
  selectedAssetAccountId: AccountId | undefined
  selectedAssetId: AssetId
  stakingAssetAccountId: AccountId | undefined
  stakingAssetId: AssetId
  runeMatchingAccountId: AccountId | undefined
  setSelectedAssetId: (assetId: AssetId) => void
  setSelectedAssetAccountId: React.Dispatch<React.SetStateAction<AccountId | undefined>>
}

const RFOXContext = createContext<RFOXContextType | undefined>(undefined)

export const RFOXProvider: React.FC<React.PropsWithChildren<{ stakingAssetId: AssetId }>> = ({
  stakingAssetId = foxOnArbitrumOneAssetId,
  children,
}) => {
  const [selectedAssetId, setSelectedAssetId] = useState<AssetId>(stakingAssetId)

  const selectedAsset = useAppSelector(state => selectAssetById(state, selectedAssetId))
  // This is required for wallets not supporting BIP44 accounts
  const defaultSelectedAssetAccountId = useAppSelector(state =>
    selectFirstAccountIdByChainId(state, selectedAsset?.chainId ?? ''),
  )

  const [selectedAssetAccountId, setSelectedAssetAccountId] = useState<AccountId | undefined>(
    defaultSelectedAssetAccountId,
  )

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

  const runeMatchingAccountId = useMemo(() => {
    if (!(filter && selectedAssetAccountNumber !== undefined)) return
    const accountNumberAccountIds = accountIdsByAccountNumberAndChainId[selectedAssetAccountNumber]
    const runeAccountId = accountNumberAccountIds?.[thorchainChainId]
    return runeAccountId
  }, [accountIdsByAccountNumberAndChainId, filter, selectedAssetAccountNumber])

  const value: RFOXContextType = useMemo(
    () => ({
      selectedAssetAccountId,
      setSelectedAssetAccountId,
      setSelectedAssetId,
      selectedAssetId,
      stakingAssetAccountId,
      stakingAssetId,
      runeMatchingAccountId,
    }),
    [
      runeMatchingAccountId,
      selectedAssetAccountId,
      selectedAssetId,
      stakingAssetAccountId,
      stakingAssetId,
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
