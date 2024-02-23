import { cosmosChainId, fromAssetId } from '@shapeshiftoss/caip'
import qs from 'qs'
import { useCallback, useMemo } from 'react'
import { useHistory, useLocation } from 'react-router'
import { WalletActions } from 'context/WalletProvider/actions'
import { useWallet } from 'hooks/useWallet/useWallet'
import { trackOpportunityEvent } from 'lib/mixpanel/helpers'
import { MixPanelEvent } from 'lib/mixpanel/types'
import type { OpportunityId } from 'state/slices/opportunitiesSlice/types'
import { DefiProvider } from 'state/slices/opportunitiesSlice/types'
import {
  selectAggregatedEarnUserStakingOpportunitiesIncludeEmpty,
  selectFirstAccountIdByChainId,
  selectFungibleAssets,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { StakingCard } from './StakingCard'

type StakingCardsProps = {
  ids: OpportunityId[]
}
export const StakingCards: React.FC<StakingCardsProps> = ({ ids }) => {
  const history = useHistory()
  const location = useLocation()
  const {
    state: { isConnected, isDemoWallet },
    dispatch,
  } = useWallet()
  const assets = useAppSelector(selectFungibleAssets)
  const stakingOpportunities = useAppSelector(
    selectAggregatedEarnUserStakingOpportunitiesIncludeEmpty,
  )
  const cosmosAccountId = useAppSelector(state =>
    selectFirstAccountIdByChainId(state, cosmosChainId),
  )

  const filteredOpportunities = stakingOpportunities
    .filter(opportunity => ids.includes(opportunity.id))
    .filter(opportunity => opportunity.provider !== DefiProvider.ThorchainSavers)

  const handleClick = useCallback(
    (opportunityId: OpportunityId) => {
      const opportunity = stakingOpportunities.find(opportunity => opportunity.id === opportunityId)
      if (!opportunity) return
      const { type, provider, contractAddress, chainId, rewardAddress, assetId } = opportunity
      const { assetReference, assetNamespace } = fromAssetId(assetId)
      const defaultAccountId = cosmosAccountId

      if (!isConnected && isDemoWallet) {
        dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
        return
      }

      trackOpportunityEvent(
        MixPanelEvent.ClickOpportunity,
        {
          opportunity,
          element: 'Arkeo Featured Card',
        },
        assets,
      )

      history.push({
        pathname: location.pathname,
        search: qs.stringify({
          type,
          provider,
          chainId,
          defaultAccountId,
          contractAddress,
          assetNamespace,
          assetReference,
          highestBalanceAccountAddress: opportunity.highestBalanceAccountAddress,
          rewardId: rewardAddress,
          modal: 'overview',
        }),
        state: { background: location },
      })
    },
    // This was copied from AllEarnOpportunities
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dispatch, history, isConnected, location],
  )

  const renderItems = useMemo(() => {
    return filteredOpportunities.map(opportunity => (
      <StakingCard onClick={handleClick} key={opportunity.id} {...opportunity} />
    ))
  }, [filteredOpportunities, handleClick])
  return <>{renderItems}</>
}
