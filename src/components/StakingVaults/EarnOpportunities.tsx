import { ArrowForwardIcon } from '@chakra-ui/icons'
import { Box, Button, HStack } from '@chakra-ui/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { ethAssetId, foxAssetId, foxyAssetId, fromAssetId } from '@shapeshiftoss/caip'
import qs from 'qs'
import { useEffect, useMemo } from 'react'
import { NavLink, useHistory, useLocation } from 'react-router-dom'
import { Card } from 'components/Card/Card'
import { OpportunityRow } from 'components/EarnDashboard/components/ProviderDetails/OpportunityRow'
import { Text } from 'components/Text'
import { useFoxEth } from 'context/FoxEthProvider/FoxEthProvider'
import { WalletActions } from 'context/WalletProvider/actions'
import { useWallet } from 'hooks/useWallet/useWallet'
import { foxEthLpAssetId } from 'state/slices/opportunitiesSlice/constants'
import type { EarnOpportunityType } from 'state/slices/opportunitiesSlice/types'
import {
  selectAggregatedEarnUserLpOpportunities,
  selectAggregatedEarnUserStakingOpportunitiesIncludeEmpty,
  selectAssetById,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { StakingTable } from './StakingTable'

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
    state: { isConnected },
    dispatch,
  } = useWallet()
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  if (!asset) throw new Error(`Asset not found for AssetId ${assetId}`)

  const stakingOpportunities = useAppSelector(
    selectAggregatedEarnUserStakingOpportunitiesIncludeEmpty,
  )

  const lpOpportunities = useAppSelector(selectAggregatedEarnUserLpOpportunities)

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

  const handleClick = (opportunity: EarnOpportunityType) => {
    const { type, provider, contractAddress, chainId, assetId, rewardAddress } = opportunity
    const { assetReference, assetNamespace } = fromAssetId(assetId)
    if (!isConnected) {
      dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
      return
    }

    history.push({
      pathname: location.pathname,
      search: qs.stringify({
        chainId,
        contractAddress,
        assetNamespace,
        assetReference,
        highestBalanceAccountAddress: opportunity.highestBalanceAccountAddress,
        rewardId: rewardAddress,
        provider,
        type,
        modal: 'overview',
      }),
      state: { background: location },
    })
  }

  const renderRows = useMemo(() => {
    return allRows.map(row => (
      <OpportunityRow onClick={() => console.info('click')} opportunity={row} />
    ))
  }, [allRows])

  if (allRows.length === 0) return null

  return <>{renderRows}</>
}
