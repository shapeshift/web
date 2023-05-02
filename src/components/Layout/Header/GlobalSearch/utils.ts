import { fromAssetId } from '@shapeshiftoss/caip'
import type { DefiAction } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiType } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import type { History, Location } from 'history'
import qs from 'qs'
import { trackOpportunityEvent } from 'lib/mixpanel/helpers'
import { MixPanelEvents } from 'lib/mixpanel/types'
import { assets } from 'state/slices/assetsSlice/assetsSlice'
import type {
  LpEarnOpportunityType,
  OpportunityId,
  StakingEarnOpportunityType,
} from 'state/slices/opportunitiesSlice/types'

type goToOpportunityProps = {
  stakingOpportunities: StakingEarnOpportunityType[]
  lpOpportunities: LpEarnOpportunityType[]
  opportunityId: OpportunityId
  opportunityType: DefiType
  action: DefiAction
  location: Location
}
export const GoToOpportunity = ({
  stakingOpportunities,
  lpOpportunities,
  opportunityId,
  action,
  opportunityType,
  location,
}: goToOpportunityProps) => {
  const lpOpportunity = lpOpportunities.find(lpOpportunity => lpOpportunity.id === opportunityId)
  const stakingOpportunity = stakingOpportunities.find(
    stakingOpportunity => stakingOpportunity.id === opportunityId,
  )
  const opportunity =
    opportunityType === DefiType.LiquidityPool ? lpOpportunity : stakingOpportunity

  if (!opportunity) return null

  const {
    type,
    provider,
    contractAddress,
    chainId,
    rewardAddress,
    assetId,
    highestBalanceAccountAddress,
  } = opportunity
  const { assetReference, assetNamespace } = fromAssetId(assetId)

  trackOpportunityEvent(
    MixPanelEvents.ClickOpportunity,
    {
      opportunity,
      element: 'Search Row',
    },
    assets,
  )

  return {
    pathname: location.pathname,
    search: qs.stringify({
      type,
      provider,
      chainId,
      contractAddress,
      assetNamespace,
      assetReference,
      highestBalanceAccountAddress,
      rewardId: rewardAddress,
      modal: action,
    }),
    state: { background: location },
  }
}
