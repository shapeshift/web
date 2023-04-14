import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import {
  DefiProviderMetadata,
  DefiTypeDisplayName,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import React, { useMemo } from 'react'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import type { OpportunityId } from 'state/slices/opportunitiesSlice/types'
import {
  selectAllEarnUserStakingOpportunitiesByFilter,
  selectAssetById,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { EquityRow } from './EquityRow'

type EquityStakingRowProps = {
  opportunityId: OpportunityId
  assetId: AssetId
  accountId?: AccountId
  allocation?: string
  color?: string
}
export const EquityStakingRow: React.FC<EquityStakingRowProps> = ({
  opportunityId,
  assetId,
  accountId,
  allocation,
  color,
}) => {
  const filter = useMemo(() => {
    return {
      assetId,
      ...(accountId ? { accountId } : {}),
    }
  }, [accountId, assetId])
  const stakingOpportunities = useAppSelector(state =>
    selectAllEarnUserStakingOpportunitiesByFilter(state, filter),
  )
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
      subText={opportunity.version ?? DefiTypeDisplayName[opportunity.type]}
      cryptoBalancePrecision={bnOrZero(opportunity.cryptoAmountBaseUnit)
        .div(bn(10).pow(asset.precision))
        .toFixed(asset.precision)}
    />
  )
}
