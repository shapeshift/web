import type { AssetId } from '@shapeshiftoss/caip'
import { DefiProviderMetadata } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import React from 'react'
import type { OpportunityId } from 'state/slices/opportunitiesSlice/types'
import { getUnderlyingAssetIdsBalances } from 'state/slices/opportunitiesSlice/utils'
import {
  selectAggregatedEarnUserLpOpportunities,
  selectAssetById,
  selectAssets,
  selectMarketDataSortedByMarketCap,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { EquityRow } from './EquityRow'

type EquityLpRowProps = {
  opportunityId: OpportunityId
  assetId: AssetId
  allocation?: string
  color?: string
}
export const EquityLpRow: React.FC<EquityLpRowProps> = ({
  opportunityId,
  assetId,
  allocation,
  color,
}) => {
  const assets = useAppSelector(selectAssets)
  const marketData = useAppSelector(selectMarketDataSortedByMarketCap)
  const lpOpportunities = useAppSelector(selectAggregatedEarnUserLpOpportunities)
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
      subText={opportunity.opportunityName}
    />
  )
}
