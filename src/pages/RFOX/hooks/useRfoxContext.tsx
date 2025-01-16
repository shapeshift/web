import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import {
  foxOnArbitrumOneAssetId,
  fromAssetId,
  uniV2EthFoxArbitrumAssetId,
} from '@shapeshiftoss/caip'
import React, { createContext, useContext, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import {
  selectAccountIdByAccountNumberAndChainId,
  selectAccountNumberByAccountId,
} from 'state/slices/portfolioSlice/selectors'
import { selectFeatureFlags } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { RFOX_STAKING_ASSET_IDS } from '../constants'

type RFOXContextType = {
  selectedAssetAccountId: AccountId | undefined
  stakingAssetId: AssetId
  stakingAssetAccountId: AccountId | undefined
  supportedStakingAssetIds: AssetId[]
  setStakingAssetId: (assetId: AssetId) => void
  setStakingAssetAccountId: React.Dispatch<React.SetStateAction<AccountId | undefined>>
}

const RFOXContext = createContext<RFOXContextType | undefined>(undefined)

export const RFOXProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const featureFlags = useSelector(selectFeatureFlags)

  const [stakingAssetId, setStakingAssetId] = useState<AssetId>(foxOnArbitrumOneAssetId)
  const [stakingAssetAccountId, setStakingAssetAccountId] = useState<AccountId | undefined>()

  const supportedStakingAssetIds = useMemo(() => {
    return RFOX_STAKING_ASSET_IDS.filter(stakingAssetId => {
      if (!featureFlags.RFOX_LP && stakingAssetId === uniV2EthFoxArbitrumAssetId) return false
      return true
    })
  }, [featureFlags])

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
      supportedStakingAssetIds,
    }),
    [
      selectedAssetAccountId,
      stakingAssetId,
      stakingAssetAccountId,
      setStakingAssetAccountId,
      setStakingAssetId,
      supportedStakingAssetIds,
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
