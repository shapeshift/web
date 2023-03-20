import { Box } from '@chakra-ui/react'
import { cosmosAssetId, cosmosChainId, fromAssetId, osmosisChainId } from '@shapeshiftoss/caip'
import qs from 'qs'
import { useCallback, useMemo } from 'react'
import { useHistory, useLocation } from 'react-router'
import { Card } from 'components/Card/Card'
import { Text } from 'components/Text'
import { WalletActions } from 'context/WalletProvider/actions'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { trackOpportunityEvent } from 'lib/mixpanel/helpers'
import { MixPanelEvents } from 'lib/mixpanel/types'
import { foxEthStakingIds } from 'state/slices/opportunitiesSlice/constants'
import type { EarnOpportunityType, StakingId } from 'state/slices/opportunitiesSlice/types'
import {
  selectAggregatedEarnUserLpOpportunities,
  selectAggregatedEarnUserStakingOpportunitiesIncludeEmpty,
  selectAssets,
  selectFirstAccountIdByChainId,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { StakingTable } from './StakingTable'

export const AllEarnOpportunities = () => {
  const history = useHistory()
  const location = useLocation()
  const assets = useAppSelector(selectAssets)
  const isDefiAggregationEnabled = useFeatureFlag('DefiAggregation')
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

  const lpOpportunities = useAppSelector(selectAggregatedEarnUserLpOpportunities)

  const allRows = useMemo(
    () => [
      ...stakingOpportunities.filter(
        opportunity =>
          !opportunity.expired ||
          (opportunity.expired && bnOrZero(opportunity.cryptoAmountBaseUnit).gt(0)),
      ),
      ...lpOpportunities,
    ],
    [lpOpportunities, stakingOpportunities],
  )

  const filteredRows = useMemo(
    () =>
      allRows.filter(
        opportunity =>
          foxEthStakingIds.includes(opportunity.assetId as StakingId) ||
          bnOrZero(opportunity.tvl).gte(50000),
      ),
    [allRows],
  )

  const handleClick = useCallback(
    (opportunity: EarnOpportunityType) => {
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
          element: 'Table Row',
        },
        assets,
      )

      history.push({
        pathname: `/defi/earn`,
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

  return (
    <Card variant='unstyled' my={6}>
      {!isDefiAggregationEnabled && (
        <Card.Header flexDir='row' display='flex' px={4}>
          <Box>
            <Card.Heading>
              <Text translation='defi.earn' />
            </Card.Heading>
            <Text color='gray.500' translation='defi.earnBody' />
          </Box>
        </Card.Header>
      )}
      <Card.Body pt={0} px={0}>
        <StakingTable data={filteredRows} onClick={handleClick} />
      </Card.Body>
    </Card>
  )
}
