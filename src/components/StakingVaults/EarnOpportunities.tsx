import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { ethAssetId, foxAssetId, foxyAssetId, fromAssetId } from '@shapeshiftoss/caip'
import type { DefiAction } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import qs from 'qs'
import { useCallback, useEffect, useMemo } from 'react'
import { useHistory, useLocation } from 'react-router-dom'
import { WalletStakingByAsset } from 'components/EarnDashboard/components/ProviderDetails/WalletStakingByAsset'
import { useFoxEth } from 'context/FoxEthProvider/FoxEthProvider'
import { WalletActions } from 'context/WalletProvider/actions'
import { useWallet } from 'hooks/useWallet/useWallet'
import { foxEthLpAssetId } from 'state/slices/opportunitiesSlice/constants'
import type { StakingEarnOpportunityType } from 'state/slices/opportunitiesSlice/types'
import {
  selectAggregatedEarnUserLpOpportunities,
  selectAggregatedEarnUserStakingOpportunitiesIncludeEmpty,
  selectAssetById,
  selectUserStakingOpportunitiesWithMetadataByFilter,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type EarnOpportunitiesProps = {
  tokenId?: string
  assetId: AssetId
  accountId?: AccountId
  isLoaded?: boolean
}

export const EarnOpportunities = ({ assetId, accountId }: EarnOpportunitiesProps) => {
  const history = useHistory()
  const location = useLocation()
  const {
    state: { isConnected, isDemoWallet },
    dispatch,
  } = useWallet()
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  if (!asset) throw new Error(`Asset not found for AssetId ${assetId}`)

  const stakingOpportunities = useAppSelector(
    selectAggregatedEarnUserStakingOpportunitiesIncludeEmpty,
  )

  const lpOpportunities = useAppSelector(selectAggregatedEarnUserLpOpportunities)
  const userStakingOpportunitiesFilter = useMemo(
    () => ({
      accountId: accountId ?? '',
      assetId: assetId ?? '',
    }),
    [accountId, assetId],
  )
  const userStakingOpportunities = useAppSelector(state =>
    selectUserStakingOpportunitiesWithMetadataByFilter(state, userStakingOpportunitiesFilter),
  )

  const userStakingIds = useMemo(
    () => userStakingOpportunities.map(opportunity => opportunity.id),
    [userStakingOpportunities],
  )

  const { setLpAccountId, setFarmingAccountId } = useFoxEth()

  useEffect(() => {
    if (accountId) {
      setFarmingAccountId(accountId)
      setLpAccountId(accountId)
    }
  }, [setLpAccountId, setFarmingAccountId, accountId])

  const allRows = [...lpOpportunities, ...stakingOpportunities].filter(
    row =>
      row.assetId.toLowerCase() === asset.assetId.toLowerCase() ||
      // show FOX_ETH LP token on FOX and ETH pages
      (row.assetId === foxEthLpAssetId && [ethAssetId, foxAssetId].includes(asset.assetId)) ||
      // show foxy opportunity in the foxy asset page
      (row.assetId === foxAssetId && asset.assetId === foxyAssetId),
  )

  const handleClick = useCallback(
    (opportunity: StakingEarnOpportunityType, action: DefiAction) => {
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
          contractAddress,
          assetNamespace,
          assetReference,
          highestBalanceAccountAddress,
          rewardId: rewardAddress,
          modal: action,
        }),
        state: { background: location },
      })
    },
    [dispatch, history, isConnected, isDemoWallet, location],
  )

  // const renderRows = useMemo(() => {
  //   return allRows.map(row => <OpportunityRow onClick={handleClick} opportunity={row} />)
  // }, [allRows, handleClick])

  // if (allRows.length === 0) return null

  return <WalletStakingByAsset ids={userStakingIds} />
}
