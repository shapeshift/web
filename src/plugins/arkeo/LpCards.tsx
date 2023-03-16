import { cosmosAssetId, cosmosChainId, fromAssetId, osmosisChainId } from '@shapeshiftoss/caip'
import qs from 'qs'
import { useCallback, useMemo } from 'react'
import { useHistory, useLocation } from 'react-router'
import { WalletActions } from 'context/WalletProvider/actions'
import { useWallet } from 'hooks/useWallet/useWallet'
import { trackOpportunityEvent } from 'lib/mixpanel/helpers'
import { MixPanelEvents } from 'lib/mixpanel/types'
import type { OpportunityId } from 'state/slices/opportunitiesSlice/types'
import {
  selectAggregatedEarnUserLpOpportunities,
  selectAssets,
  selectFirstAccountIdByChainId,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { LpCard } from './LpCard'

type LpCardsProps = {
  ids: OpportunityId[]
}

export const LpCards: React.FC<LpCardsProps> = ({ ids }) => {
  const history = useHistory()
  const location = useLocation()
  const assets = useAppSelector(selectAssets)
  const {
    state: { isConnected, isDemoWallet },
    dispatch,
  } = useWallet()
  const lpOpportunities = useAppSelector(selectAggregatedEarnUserLpOpportunities)
  const filteredLpOpportunities = lpOpportunities.filter(opportunity =>
    ids.includes(opportunity.id),
  )
  const cosmosAccountId = useAppSelector(state =>
    selectFirstAccountIdByChainId(state, cosmosChainId),
  )
  const osmosisAccountId = useAppSelector(state =>
    selectFirstAccountIdByChainId(state, osmosisChainId),
  )
  const handleClick = useCallback(
    (opportunityId: OpportunityId) => {
      const opportunity = lpOpportunities.find(opportunity => opportunity.id === opportunityId)
      if (!opportunity) return
      const { type, provider, contractAddress, chainId, rewardAddress, assetId } = opportunity
      const { assetReference, assetNamespace } = fromAssetId(assetId)
      const defaultAccountId = assetId === cosmosAssetId ? cosmosAccountId : osmosisAccountId

      if (!isConnected && isDemoWallet) {
        dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
        return
      }

      trackOpportunityEvent(
        MixPanelEvents.ClickOpportunity,
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

  const renderCards = useMemo(() => {
    return filteredLpOpportunities.map(lpOpportunity => (
      <LpCard key={lpOpportunity.id} onClick={handleClick} {...lpOpportunity} />
    ))
  }, [filteredLpOpportunities, handleClick])
  return <>{renderCards}</>
}
