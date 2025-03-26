import type { AccountId } from '@shapeshiftoss/caip'
import { toAssetId } from '@shapeshiftoss/caip'
import { AnimatePresence } from 'framer-motion'
import { useEffect, useMemo } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'

import { ClaimConfirm } from '../Claim/ClaimConfirm'
import { ClaimStatus } from './ClaimStatus'

import type { AccountDropdownProps } from '@/components/AccountDropdown/AccountDropdown'
import { RouteSteps } from '@/components/RouteSteps/RouteSteps'
import { SlideTransition } from '@/components/SlideTransition'
import type {
  DefiParams,
  DefiQueryParams,
} from '@/features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useBrowserRouter } from '@/hooks/useBrowserRouter/useBrowserRouter'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { fromBaseUnit } from '@/lib/math'
import type { UserStakingId } from '@/state/slices/opportunitiesSlice/types'
import { serializeUserStakingId, toOpportunityId } from '@/state/slices/opportunitiesSlice/utils'
import {
  selectAssets,
  selectFirstAccountIdByChainId,
  selectHighestStakingBalanceAccountIdByStakingId,
  selectUserStakingOpportunityByUserStakingId,
} from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

enum OverviewPath {
  Claim = '/',
  ClaimStatus = '/status',
}

export const routes = [
  { step: 0, path: OverviewPath.Claim, label: 'Confirm' },
  { step: 1, path: OverviewPath.ClaimStatus, label: 'Status' },
]

type ClaimRouteProps = {
  accountId: AccountId | undefined
  onAccountIdChange: AccountDropdownProps['onChange']
  onBack: () => void
}

export const ClaimRoutes = ({
  accountId,
  onAccountIdChange: handleAccountIdChange,
  onBack,
}: ClaimRouteProps) => {
  const { query } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { assetNamespace, contractAddress, chainId, rewardId } = query

  const rewardAssetId = toAssetId({ chainId, assetNamespace, assetReference: rewardId })

  const assets = useAppSelector(selectAssets)

  const opportunityId = useMemo(
    () =>
      toOpportunityId({
        chainId,
        assetNamespace,
        assetReference: contractAddress,
      }),
    [assetNamespace, chainId, contractAddress],
  )

  const opportunity = useAppSelector(state =>
    selectUserStakingOpportunityByUserStakingId(state, {
      userStakingId: accountId
        ? serializeUserStakingId(accountId ?? '', opportunityId)
        : ('' as UserStakingId),
    }),
  )

  const rewardAmountCryptoPrecision = useMemo(
    () =>
      fromBaseUnit(
        bnOrZero(opportunity?.rewardsCryptoBaseUnit?.amounts[0]),
        assets[opportunity?.underlyingAssetId ?? '']?.precision ?? 0,
      ),
    [assets, opportunity?.rewardsCryptoBaseUnit, opportunity?.underlyingAssetId],
  )

  const location = useLocation()

  const highestBalanceAccountIdFilter = useMemo(
    () => ({ stakingId: opportunityId }),
    [opportunityId],
  )
  const highestBalanceAccountId = useAppSelector(state =>
    selectHighestStakingBalanceAccountIdByStakingId(state, highestBalanceAccountIdFilter),
  )
  const defaultAccountId = useAppSelector(state => selectFirstAccountIdByChainId(state, chainId))
  const maybeAccountId = useMemo(
    () => accountId ?? highestBalanceAccountId ?? defaultAccountId,
    [accountId, defaultAccountId, highestBalanceAccountId],
  )

  useEffect(() => {
    if (!maybeAccountId) return
    handleAccountIdChange(maybeAccountId)
  }, [handleAccountIdChange, maybeAccountId])

  if (!opportunity) return null

  return (
    <SlideTransition>
      <RouteSteps routes={routes} location={location} pt={4} />
      <AnimatePresence mode='wait' initial={false}>
        <Routes>
          <Route 
            path='/'
            element={
              <ClaimConfirm
                accountId={accountId}
                assetId={rewardAssetId}
                onBack={onBack}
                amount={rewardAmountCryptoPrecision}
              />
            }
          />
          <Route 
            path='/status'
            element={<ClaimStatus accountId={accountId} />}
          />
        </Routes>
      </AnimatePresence>
    </SlideTransition>
  )
}
