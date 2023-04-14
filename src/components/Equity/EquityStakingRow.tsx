import type { AssetId } from '@shapeshiftoss/caip'
import { DefiProviderMetadata } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import React from 'react'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import type { OpportunityId } from 'state/slices/opportunitiesSlice/types'
import {
  selectAggregatedEarnUserStakingOpportunities,
  selectAssetById,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { EquityRow } from './EquityRow'

type EquityStakingRowProps = {
  opportunityId: OpportunityId
  assetId: AssetId
  allocation?: string
  color?: string
}
export const EquityStakingRow: React.FC<EquityStakingRowProps> = ({
  opportunityId,
  assetId,
  allocation,
  color,
}) => {
  const stakingOpportunities = useAppSelector(selectAggregatedEarnUserStakingOpportunities)
  const opportunity = stakingOpportunities.find(opportunity => opportunity.id === opportunityId)
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  if (!opportunity || !asset) return null
  return (
    <EquityRow
      fiatAmount={opportunity.fiatAmount}
      allocation={allocation}
      color={color}
      icon={DefiProviderMetadata[opportunity.provider].icon}
      label={opportunity.provider}
      symbol={asset.symbol}
      subText={opportunity.version ?? opportunity.type}
      cryptoBalancePrecision={bnOrZero(opportunity.cryptoAmountBaseUnit)
        .div(bn(10).pow(asset.precision))
        .toFixed(asset.precision)}
    />
  )
}
