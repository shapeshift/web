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
  setStakingAssetAccountId: React.Dispatch<React.SetStateAction<AccountId | undefined>>
}

const RFOXContext = createContext<RFOXContextType | undefined>(undefined)

export const RFOXProvider: React.FC<React.PropsWithChildren<{ stakingAssetId: AssetId }>> = ({
  stakingAssetId = foxOnArbitrumOneAssetId,
  children,
}) => {
  const [selectedAssetId, setSelectedAssetId] = useState<AssetId>(stakingAssetId)

  const stakingAsset = useAppSelector(state => selectAssetById(state, stakingAssetId))
  // This is required for wallets not supporting BIP44 accounts
  const defaultStakingAssetAccountId = useAppSelector(state =>
    selectFirstAccountIdByChainId(state, stakingAsset?.chainId ?? ''),
  )

  const [stakingAssetAccountId, setStakingAssetAccountId] = useState<AccountId | undefined>(
    defaultStakingAssetAccountId,
  )

  const filter = useMemo(
    () =>
      stakingAssetAccountId && stakingAssetId
        ? { assetId: stakingAssetAccountId, accountId: stakingAssetAccountId }
        : undefined,
    [stakingAssetAccountId, stakingAssetId],
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

  const runeMatchingAccountId = useMemo(() => {
    if (!(filter && stakingAssetAccountNumber !== undefined)) return
    const accountNumberAccountIds = accountIdsByAccountNumberAndChainId[stakingAssetAccountNumber]
    const runeAccountId = accountNumberAccountIds?.[thorchainChainId]
    return runeAccountId
  }, [accountIdsByAccountNumberAndChainId, filter, stakingAssetAccountNumber])

  const value: RFOXContextType = useMemo(
    () => ({
      selectedAssetAccountId,
      setStakingAssetAccountId,
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
