import {
  cosmosAssetId,
  cosmosChainId,
  fromAssetId,
  osmosisAssetId,
  osmosisChainId,
} from '@shapeshiftoss/caip'
import { DefiProvider } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import type { EarnOpportunityType } from 'features/defi/helpers/normalizeOpportunity'
import { useTransformCosmosStaking } from 'features/defi/helpers/normalizeOpportunity'
import qs from 'qs'
import { useCallback, useMemo } from 'react'
import { useHistory, useLocation } from 'react-router'
import { WalletActions } from 'context/WalletProvider/actions'
import { useWallet } from 'hooks/useWallet/useWallet'
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
  const history = useHistory()
  const location = useLocation()
  const {
    state: { isConnected, isDemoWallet },
    dispatch,
  } = useWallet()
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

  const allOpportunities = [...stakingOpportunities, ...useTransformCosmosStaking(cosmos)]
  const filteredOpportunities = allOpportunities
    .filter(e => ids.includes(e.assetId as OpportunityId))
    .filter(e => e.provider !== DefiProvider.ThorchainSavers)

  const handleClick = useCallback(
    (opportunity: EarnOpportunityType) => {
      const { type, provider, contractAddress, chainId, rewardAddress, assetId } = opportunity
      const { assetReference, assetNamespace } = fromAssetId(assetId)
      const defaultAccountId = assetId === cosmosAssetId ? cosmosAccountId : osmosisAccountId

      if (!isConnected && isDemoWallet) {
        dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
        return
      }

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dispatch, history, isConnected, location],
  )

  const renderItems = useMemo(() => {
    return filteredOpportunities.map(e => (
      <StakingCard onClick={handleClick} key={e.assetId} {...e} />
    ))
  }, [filteredOpportunities, handleClick])
  return <>{renderItems}</>
}
