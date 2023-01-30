import { cosmosAssetId, cosmosChainId, osmosisAssetId, osmosisChainId } from '@shapeshiftoss/caip'
import { DefiProvider } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useTransformCosmosStaking } from 'features/defi/helpers/normalizeOpportunity'
import { useMemo } from 'react'
import { useCosmosSdkStakingBalances } from 'pages/Defi/hooks/useCosmosSdkStakingBalances'
import type { OpportunityId } from 'state/slices/opportunitiesSlice/types'
import {
  selectAggregatedEarnUserStakingOpportunitiesIncludeEmpty,
  selectFirstAccountIdByChainId,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { StakingCard } from './StakingCard'

type StakingCardsProps = {
  ids: OpportunityId[]
}
export const StakingCards: React.FC<StakingCardsProps> = ({ ids }) => {
  const stakingOpportunities = useAppSelector(
    selectAggregatedEarnUserStakingOpportunitiesIncludeEmpty,
  )
  const cosmosAccountId = useAppSelector(state =>
    selectFirstAccountIdByChainId(state, cosmosChainId),
  )
  const osmosisAccountId = useAppSelector(state =>
    selectFirstAccountIdByChainId(state, osmosisChainId),
  )

  const { cosmosSdkStakingOpportunities: cosmosStakingOpportunities } = useCosmosSdkStakingBalances(
    {
      assetId: cosmosAssetId,
      accountId: cosmosAccountId,
    },
  )

  const { cosmosSdkStakingOpportunities: osmosisStakingOpportunities } =
    useCosmosSdkStakingBalances({
      assetId: osmosisAssetId,
      accountId: osmosisAccountId,
    })

  const cosmos = useMemo(
    () => cosmosStakingOpportunities.concat(osmosisStakingOpportunities),
    [cosmosStakingOpportunities, osmosisStakingOpportunities],
  )

  const combined = [...stakingOpportunities, ...useTransformCosmosStaking(cosmos)]
  const filteredDown = combined
    .filter(e => ids.includes(e.assetId as OpportunityId))
    .filter(e => e.provider !== DefiProvider.ThorchainSavers)

  const renderItems = useMemo(() => {
    return filteredDown.map(e => <StakingCard key={e.assetId} {...e} />)
  }, [filteredDown])
  return <>{renderItems}</>
}
