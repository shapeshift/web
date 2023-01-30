import { cosmosAssetId, cosmosChainId, osmosisAssetId, osmosisChainId } from '@shapeshiftoss/caip'
import { useCosmosSdkStakingBalances } from 'pages/Defi/hooks/useCosmosSdkStakingBalances'
import type { OpportunityId } from 'state/slices/opportunitiesSlice/types'
import {
  selectAggregatedEarnUserStakingOpportunitiesIncludeEmpty,
  selectFirstAccountIdByChainId,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

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

  const combined = [
    ...stakingOpportunities,
    ...cosmosStakingOpportunities,
    ...osmosisStakingOpportunities,
  ]
  const filter = ids.includes()
  return <></>
}
