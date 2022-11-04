import { Box } from '@chakra-ui/react'
import { cosmosAssetId, fromAssetId, osmosisAssetId } from '@shapeshiftoss/caip'
import { bnOrZero } from '@shapeshiftoss/investor-foxy/dist/utils'
import type { EarnOpportunityType } from 'features/defi/helpers/normalizeOpportunity'
import { useNormalizeOpportunities } from 'features/defi/helpers/normalizeOpportunity'
import qs from 'qs'
import { useCallback, useMemo } from 'react'
import { useHistory, useLocation } from 'react-router'
import { Card } from 'components/Card/Card'
import { Text } from 'components/Text'
import { WalletActions } from 'context/WalletProvider/actions'
import { useSortedVaults } from 'hooks/useSortedVaults/useSortedVaults'
import { useWallet } from 'hooks/useWallet/useWallet'
import { fromBaseUnit } from 'lib/math'
import { useCosmosSdkStakingBalances } from 'pages/Defi/hooks/useCosmosSdkStakingBalances'
import { useFoxyBalances } from 'pages/Defi/hooks/useFoxyBalances'
import { foxEthLpAssetId } from 'state/slices/foxEthSlice/constants'
import { LP_EARN_OPPORTUNITIES } from 'state/slices/opportunitiesSlice/constants'
import type { LpId } from 'state/slices/opportunitiesSlice/types'
import {
  selectAssets,
  selectLpOpportunitiesById,
  selectPortfolioCryptoHumanBalanceByAssetId,
  selectVisibleFoxFarmingAccountOpportunitiesAggregated,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { StakingTable } from './StakingTable'

export const AllEarnOpportunities = () => {
  const assets = useAppSelector(selectAssets)
  const history = useHistory()
  const location = useLocation()
  const {
    state: { isConnected, isDemoWallet },
    dispatch,
  } = useWallet()

  const sortedVaults = useSortedVaults()

  const { data: foxyBalancesData } = useFoxyBalances()

  const emptyFilter = useMemo(() => ({}), [])
  const visibleFoxFarmingOpportunities = useAppSelector(state =>
    selectVisibleFoxFarmingAccountOpportunitiesAggregated(state, emptyFilter),
  )
  const lpOpportunitiesById = useAppSelector(selectLpOpportunitiesById)
  const opportunityData = useMemo(
    () => lpOpportunitiesById[foxEthLpAssetId as LpId],
    [lpOpportunitiesById],
  )

  const baseEarnOpportunity = LP_EARN_OPPORTUNITIES[opportunityData?.underlyingAssetId]

  const aggregatedLpAssetBalance = useAppSelector(state =>
    selectPortfolioCryptoHumanBalanceByAssetId(state, { assetId: foxEthLpAssetId }),
  )

  // TODO: This doesn't belong here at all and needs a better shape
  // This is effectively coming back to the previous implementation with specific fields we don't need like
  // `underlyingFoxAmount` and `underlyingEthAmount`, surely we can pass the LP token value and calculate this in place
  // The `useXYZDefiNormalizedStakingEarnDefiSomethingOPportunities` hooks are going away soon so this isn't staying here for long
  const [underlyingEthAmount, underlyingFoxAmount] = useMemo(
    () =>
      opportunityData?.underlyingAssetIds.map((assetId, i) =>
        bnOrZero(aggregatedLpAssetBalance)
          .times(fromBaseUnit(opportunityData.underlyingAssetRatios[i], assets[assetId].precision))
          .toFixed(6)
          .toString(),
      ),
    [
      aggregatedLpAssetBalance,
      assets,
      opportunityData?.underlyingAssetIds,
      opportunityData.underlyingAssetRatios,
    ],
  )

  // TODO: toEarnOpportunity util something something
  const foxEthLpOpportunity = useMemo(
    () => ({
      ...baseEarnOpportunity,
      // TODO; All of these should be derived in one place, this is wrong, just an intermediary step to make tsc happy
      chainId: fromAssetId(baseEarnOpportunity.assetId).chainId,
      underlyingFoxAmount,
      underlyingEthAmount,
      cryptoAmount: aggregatedLpAssetBalance,
      // TODO: this all goes away anyway
      fiatAmount: '42',
    }),
    [aggregatedLpAssetBalance, baseEarnOpportunity, underlyingEthAmount, underlyingFoxAmount],
  )

  const { cosmosSdkStakingOpportunities: cosmosStakingOpportunities } = useCosmosSdkStakingBalances(
    {
      assetId: cosmosAssetId,
    },
  )
  const { cosmosSdkStakingOpportunities: osmosisStakingOpportunities } =
    useCosmosSdkStakingBalances({
      assetId: osmosisAssetId,
    })
  const allRows = useNormalizeOpportunities({
    vaultArray: sortedVaults,
    foxyArray: foxyBalancesData?.opportunities ?? [],
    cosmosSdkStakingOpportunities: useMemo(
      () => cosmosStakingOpportunities.concat(osmosisStakingOpportunities),
      [cosmosStakingOpportunities, osmosisStakingOpportunities],
    ),
    foxEthLpOpportunity,
    foxFarmingOpportunities: visibleFoxFarmingOpportunities,
  })

  const handleClick = useCallback(
    (opportunity: EarnOpportunityType) => {
      const { provider, contractAddress, chainId, rewardAddress, assetId } = opportunity
      const { assetReference } = fromAssetId(assetId)
      if (!isConnected && isDemoWallet) {
        dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
        return
      }

      history.push({
        pathname: `/defi/earn`,
        search: qs.stringify({
          provider,
          chainId,
          contractAddress,
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
    <Card variant='outline' my={6}>
      <Card.Header flexDir='row' display='flex'>
        <Box>
          <Card.Heading>
            <Text translation='defi.earn' />
          </Card.Heading>
          <Text color='gray.500' translation='defi.earnBody' />
        </Box>
      </Card.Header>
      <Card.Body pt={0} px={2}>
        <StakingTable data={allRows} onClick={handleClick} />
      </Card.Body>
    </Card>
  )
}
