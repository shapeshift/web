import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { DefiProviderMetadata } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import React, { useMemo } from 'react'
import type { OpportunityId } from 'state/slices/opportunitiesSlice/types'
import { getUnderlyingAssetIdsBalances } from 'state/slices/opportunitiesSlice/utils'
import {
  selectAllEarnUserLpOpportunitiesByFilters,
  selectAssetById,
  selectAssets,
  selectMarketDataSortedByMarketCap,
  selectOpportunityApiPending,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { EquityRow } from './EquityRow'

type EquityLpRowProps = {
  opportunityId: OpportunityId
  assetId: AssetId
  accountId?: AccountId
  allocation?: string
  color?: string
}
export const EquityLpRow: React.FC<EquityLpRowProps> = ({
  opportunityId,
  assetId,
  accountId,
  allocation,
  color,
}) => {
  const isLoading = useAppSelector(selectOpportunityApiPending)
  const assets = useAppSelector(selectAssets)
  const marketData = useAppSelector(selectMarketDataSortedByMarketCap)
  const filter = useMemo(() => {
    return {
      assetId,
      ...(accountId ? { accountId } : {}),
    }
  }, [accountId, assetId])
  const lpOpportunities = useAppSelector(state =>
    selectAllEarnUserLpOpportunitiesByFilters(state, filter),
  )
  const opportunity = lpOpportunities.find(opportunity => opportunity.id === opportunityId)
  const asset = useAppSelector(state => selectAssetById(state, assetId))

  if (!opportunity) throw new Error(`No opportunity found for ${assetId}`)
  if (!assetId) throw new Error(`No assetId ${assetId}`)

  const underlyingBalances = getUnderlyingAssetIdsBalances({
    underlyingAssetIds: opportunity.underlyingAssetIds,
    underlyingAssetRatiosBaseUnit: opportunity.underlyingAssetRatiosBaseUnit,
    cryptoAmountBaseUnit: opportunity.cryptoAmountBaseUnit,
    assetId,
    assets,
    marketData,
  })

  if (!opportunity || !asset || !underlyingBalances[assetId]) return null

  return (
    <EquityRow
      icon={DefiProviderMetadata[opportunity.provider].icon}
      label={opportunity.provider}
      fiatAmount={underlyingBalances[assetId]?.fiatAmount}
      cryptoBalancePrecision={underlyingBalances[assetId]?.cryptoBalancePrecision}
      symbol={asset.symbol}
      allocation={allocation}
      color={color}
      apy={opportunity.apy}
      isLoading={isLoading}
      subText={opportunity.opportunityName}
    />
  )
}
