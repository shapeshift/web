import { cosmosAssetId, osmosisAssetId } from '@shapeshiftoss/caip'
import type { EarnOpportunityType } from 'features/defi/helpers/normalizeOpportunity'
import { useNormalizeOpportunities } from 'features/defi/helpers/normalizeOpportunity'
import { useMemo } from 'react'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { useCosmosSdkStakingBalances } from 'pages/Defi/hooks/useCosmosSdkStakingBalances'
import { foxEthLpAssetId } from 'state/slices/opportunitiesSlice/constants'
import {
  selectAggregatedEarnUserLpOpportunity,
  selectAggregatedEarnUserStakingOpportunities,
  selectAggregatedUserStakingOpportunity,
  selectMarketDataById,
  selectPortfolioFiatBalanceByAssetId,
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

  const foxFarmingOpportunities = useAppSelector(selectAggregatedEarnUserStakingOpportunities)

  const foxEthLpOpportunity = useAppSelector(state =>
    selectAggregatedEarnUserLpOpportunity(state, {
      lpId: foxEthLpAssetId,
      assetId: foxEthLpAssetId,
    }),
  )

  const farmContractsAggregatedOpportunity = useAppSelector(selectAggregatedUserStakingOpportunity)

  const lpAssetMarketData = useAppSelector(state => selectMarketDataById(state, foxEthLpAssetId))

  const farmContractsFiatBalance = useMemo(
    () =>
      bnOrZero(farmContractsAggregatedOpportunity?.stakedAmountCryptoPrecision)
        .times(lpAssetMarketData.price)
        .toString(),
    [farmContractsAggregatedOpportunity?.stakedAmountCryptoPrecision, lpAssetMarketData.price],
  )

  const lpAssetBalanceFilter = useMemo(
    () => ({
      assetId: foxEthLpAssetId,
    }),
    [],
  )
  const foxEthLpFiatBalance = useAppSelector(state =>
    selectPortfolioFiatBalanceByAssetId(state, lpAssetBalanceFilter),
  )

  const opportunities = useNormalizeOpportunities({
    vaultArray,
    foxyArray: foxyBalancesData?.opportunities || [],
    cosmosSdkStakingOpportunities: cosmosSdkStakingOpportunities.concat(
      osmosisStakingOpportunities,
    ),
    foxEthLpOpportunity,
    foxFarmingOpportunities,
  })
  // When staking, farming, lp, etc are added sum up the balances here
  const totalEarningBalance = bnOrZero(vaultsTotalBalance)
    .plus(foxyBalancesData?.totalBalance ?? '0')
    .plus(totalCosmosStakingBalance)
    .plus(totalOsmosisStakingBalance)
    .plus(farmContractsFiatBalance)
    .plus(foxEthLpFiatBalance ?? 0)
    .toString()

  return {
    opportunities,
    totalEarningBalance,
    loading: vaultsLoading || isFoxyBalancesLoading,
  }
}
