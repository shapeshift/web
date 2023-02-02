import { Box } from '@chakra-ui/react'
import {
  cosmosAssetId,
  cosmosChainId,
  fromAssetId,
  osmosisAssetId,
  osmosisChainId,
} from '@shapeshiftoss/caip'
import type { EarnOpportunityType } from 'features/defi/helpers/normalizeOpportunity'
import { useNormalizeOpportunities } from 'features/defi/helpers/normalizeOpportunity'
import qs from 'qs'
import { useCallback, useMemo } from 'react'
import { useHistory, useLocation } from 'react-router'
import { Card } from 'components/Card/Card'
import { Text } from 'components/Text'
import { WalletActions } from 'context/WalletProvider/actions'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { useCosmosSdkStakingBalances } from 'pages/Defi/hooks/useCosmosSdkStakingBalances'
import { foxEthStakingIds } from 'state/slices/opportunitiesSlice/constants'
import type { StakingId } from 'state/slices/opportunitiesSlice/types'
import {
  selectAggregatedEarnUserLpOpportunities,
  selectAggregatedEarnUserStakingOpportunitiesIncludeEmpty,
  selectFirstAccountIdByChainId,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { StakingTable } from './StakingTable'

export const AllEarnOpportunities = () => {
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

  const lpOpportunities = useAppSelector(selectAggregatedEarnUserLpOpportunities)

  const allRows = useNormalizeOpportunities({
    cosmosSdkStakingOpportunities: useMemo(
      () => cosmosStakingOpportunities.concat(osmosisStakingOpportunities),
      [cosmosStakingOpportunities, osmosisStakingOpportunities],
    ),
    stakingOpportunities: stakingOpportunities.filter(
      opportunity =>
        !opportunity.expired ||
        (opportunity.expired && bnOrZero(opportunity.cryptoAmountBaseUnit).gt(0)),
    ),
    lpOpportunities,
  })

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
      <Card.Header flexDir='row' display='flex' px={4}>
        <Box>
          <Card.Heading>
            <Text translation='defi.earn' />
          </Card.Heading>
          <Text color='gray.500' translation='defi.earnBody' />
        </Box>
      </Card.Header>
      <Card.Body pt={0} px={0}>
        <StakingTable data={filteredRows} onClick={handleClick} />
      </Card.Body>
    </Card>
  )
}
