import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import {
  foxOnArbitrumOneAssetId,
  fromAssetId,
  uniV2EthFoxArbitrumAssetId,
} from '@shapeshiftoss/caip'
import React, { createContext, useContext, useMemo, useState } from 'react'

import { RFOX_STAKING_ASSET_IDS } from '../constants'

import {
  selectAccountIdByAccountNumberAndChainId,
  selectAccountNumberByAccountId,
} from '@/state/slices/portfolioSlice/selectors'
import { preferences } from '@/state/slices/preferencesSlice/preferencesSlice'
import { store, useAppSelector } from '@/state/store'

type RFOXContextType = {
  selectedAssetAccountId: AccountId | undefined
  stakingAssetId: AssetId
  stakingAssetAccountId: AccountId | undefined
  setStakingAssetId: (assetId: AssetId) => void
  setStakingAssetAccountId: React.Dispatch<React.SetStateAction<AccountId | undefined>>
}

const RFOXContext = createContext<RFOXContextType | undefined>(undefined)

const featureFlags = preferences.selectors.selectFeatureFlags(store.getState())
export const supportedStakingAssetIds = RFOX_STAKING_ASSET_IDS.filter(stakingAssetId => {
  if (!featureFlags.RFOX_LP && stakingAssetId === uniV2EthFoxArbitrumAssetId) return false
  return true
})

export const RFOXProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [stakingAssetId, setStakingAssetId] = useState<AssetId>(foxOnArbitrumOneAssetId)
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
    const matchingAccountId = accountNumberAccountIds?.[fromAssetId(stakingAssetId).chainId]
    return matchingAccountId
  }, [accountIdsByAccountNumberAndChainId, filter, stakingAssetId, stakingAssetAccountNumber])

  const value: RFOXContextType = useMemo(
    () => ({
      selectedAssetAccountId,
      setStakingAssetAccountId,
      setStakingAssetId,
      stakingAssetId,
      stakingAssetAccountId,
    }),
    [
      selectedAssetAccountId,
      stakingAssetId,
      stakingAssetAccountId,
      setStakingAssetAccountId,
      setStakingAssetId,
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
