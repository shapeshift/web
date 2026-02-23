import type { AccountId } from '@shapeshiftoss/caip'
import { toAssetId } from '@shapeshiftoss/caip'
import qs from 'qs'
import { useCallback, useEffect, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'

import { ClaimConfirm } from '../Claim/ClaimConfirm'

import type { AccountDropdownProps } from '@/components/AccountDropdown/AccountDropdown'
import { DefiModalContent } from '@/features/defi/components/DefiModal/DefiModalContent'
import { DefiModalHeader } from '@/features/defi/components/DefiModal/DefiModalHeader'
import type {
  DefiParams,
  DefiQueryParams,
} from '@/features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiAction } from '@/features/defi/contexts/DefiManagerProvider/DefiCommon'
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

type ClaimProps = {
  accountId: AccountId | undefined
  onAccountIdChange: AccountDropdownProps['onChange']
}

export const Claim: React.FC<ClaimProps> = ({
  accountId,
  onAccountIdChange: handleAccountIdChange,
}) => {
  'use no memo'
  const navigate = useNavigate()
  const { query, location } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { assetNamespace, contractAddress, chainId, rewardId } = query
  const translate = useTranslate()

  const handleBack = useCallback(() => {
    navigate({
      pathname: location.pathname,
      search: qs.stringify({
        ...query,
        modal: DefiAction.Overview,
      }),
    })
  }, [query, location.pathname, navigate])

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
    <DefiModalContent>
      <DefiModalHeader
        title={translate('modals.claim.claimFrom', {
          opportunity: opportunity.name,
        })}
        onBack={handleBack}
      />
      <ClaimConfirm
        accountId={accountId}
        assetId={rewardAssetId}
        onBack={handleBack}
        amount={rewardAmountCryptoPrecision}
      />
    </DefiModalContent>
  )
}
