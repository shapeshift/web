import { cosmosAssetId, osmosisAssetId } from '@shapeshiftoss/caip'
import type { EarnOpportunityType } from 'features/defi/helpers/normalizeOpportunity'
import { useNormalizeOpportunities } from 'features/defi/helpers/normalizeOpportunity'
import { useMemo } from 'react'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import { useCosmosSdkStakingBalances } from 'pages/Defi/hooks/useCosmosSdkStakingBalances'
import { foxEthLpAssetId } from 'state/slices/foxEthSlice/constants'
import type { LpId } from 'state/slices/opportunitiesSlice/types'
import {
  selectAssets,
  selectFarmContractsFiatBalance,
  selectFoxEthLpFiatBalance,
  selectLpOpportunitiesById,
  selectPortfolioCryptoHumanBalanceByAssetId,
  selectVisibleFoxFarmingAccountOpportunitiesAggregated,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { useFoxyBalances } from './useFoxyBalances'
import type { MergedEarnVault } from './useVaultBalances'
import { useVaultBalances } from './useVaultBalances'

export type UseEarnBalancesReturn = {
  opportunities: EarnOpportunityType[]
  totalEarningBalance: string
  loading: boolean
}

export type SerializableOpportunity = MergedEarnVault

export function useEarnBalances(): UseEarnBalancesReturn {
  const assets = useAppSelector(selectAssets)
  const { isLoading: isFoxyBalancesLoading, data: foxyBalancesData } = useFoxyBalances()
  const { vaults, totalBalance: vaultsTotalBalance, loading: vaultsLoading } = useVaultBalances()
  const vaultArray: SerializableOpportunity[] = useMemo(() => Object.values(vaults), [vaults])
  const { cosmosSdkStakingOpportunities, totalBalance: totalCosmosStakingBalance } =
    useCosmosSdkStakingBalances({
      assetId: cosmosAssetId,
    })
  const {
    cosmosSdkStakingOpportunities: osmosisStakingOpportunities,
    totalBalance: totalOsmosisStakingBalance,
  } = useCosmosSdkStakingBalances({
    assetId: osmosisAssetId,
  })

  const emptyFilter = useMemo(() => ({}), [])
  const visibleFoxFarmingOpportunities = useAppSelector(state =>
    selectVisibleFoxFarmingAccountOpportunitiesAggregated(state, emptyFilter),
  )

  const lpOpportunitiesById = useAppSelector(selectLpOpportunitiesById)
  const opportunityData = useMemo(
    () => lpOpportunitiesById[foxEthLpAssetId as LpId],
    [lpOpportunitiesById],
  )

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
  const foxEthLpOpportunity = useMemo(() => ({}), [])
  const farmContractsFiatBalance = useAppSelector(state =>
    selectFarmContractsFiatBalance(state, emptyFilter),
  )
  const foxEthLpFiatBalance = useAppSelector(state => selectFoxEthLpFiatBalance(state))

  const opportunities = useNormalizeOpportunities({
    vaultArray,
    foxyArray: foxyBalancesData?.opportunities || [],
    cosmosSdkStakingOpportunities: cosmosSdkStakingOpportunities.concat(
      osmosisStakingOpportunities,
    ),
    foxEthLpOpportunity,
    foxFarmingOpportunities: visibleFoxFarmingOpportunities,
  })
  // When staking, farming, lp, etc are added sum up the balances here
  const totalEarningBalance = bnOrZero(vaultsTotalBalance)
    .plus(foxyBalancesData?.totalBalance ?? '0')
    .plus(totalCosmosStakingBalance)
    .plus(totalOsmosisStakingBalance)
    .plus(farmContractsFiatBalance)
    .plus(foxEthLpFiatBalance)
    .toString()

  return {
    opportunities,
    totalEarningBalance,
    loading: vaultsLoading || isFoxyBalancesLoading,
  }
}
