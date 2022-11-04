import { cosmosAssetId, fromAssetId, osmosisAssetId } from '@shapeshiftoss/caip'
import type { EarnOpportunityType } from 'features/defi/helpers/normalizeOpportunity'
import { useNormalizeOpportunities } from 'features/defi/helpers/normalizeOpportunity'
import { useMemo } from 'react'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import { useCosmosSdkStakingBalances } from 'pages/Defi/hooks/useCosmosSdkStakingBalances'
import {
  foxEthLpAssetId,
  LP_EARN_OPPORTUNITIES,
  STAKING_EARN_OPPORTUNITIES,
} from 'state/slices/opportunitiesSlice/constants'
import type { LpId } from 'state/slices/opportunitiesSlice/types'
import {
  selectAggregatedUserStakingOpportunities,
  selectAggregatedUserStakingOpportunity,
  selectAssets,
  selectLpOpportunitiesById,
  selectMarketDataById,
  selectPortfolioCryptoHumanBalanceByAssetId,
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

  const foxFarmingOpportunitiesAggregated = useAppSelector(selectAggregatedUserStakingOpportunities)
  const foxFarmingOpportunities = useMemo(
    () =>
      foxFarmingOpportunitiesAggregated.map(opportunity => ({
        ...STAKING_EARN_OPPORTUNITIES[foxEthLpAssetId],
        chainId: fromAssetId(foxEthLpAssetId).chainId,
        ...opportunity,
      })),
    [foxFarmingOpportunitiesAggregated],
  )

  const lpOpportunitiesById = useAppSelector(selectLpOpportunitiesById)
  const opportunityData = useMemo(
    () => lpOpportunitiesById[foxEthLpAssetId as LpId],
    [lpOpportunitiesById],
  )
  const baseEarnOpportunity = LP_EARN_OPPORTUNITIES[opportunityData?.assetId]

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
          .times(
            fromBaseUnit(
              opportunityData?.underlyingAssetRatios[i] ?? '0',
              assets[assetId].precision,
            ),
          )
          .toFixed(6)
          .toString(),
      ) ?? ['0', '0'],
    [
      aggregatedLpAssetBalance,
      assets,
      opportunityData?.underlyingAssetIds,
      opportunityData?.underlyingAssetRatios,
    ],
  )

  // TODO: toEarnOpportunity util something something
  const foxEthLpOpportunity = useMemo(
    () => ({
      ...baseEarnOpportunity,
      // TODO; All of these should be derived in one place, this is wrong, just an intermediary step to make tsc happy
      chainId: fromAssetId(foxEthLpAssetId).chainId,
      underlyingFoxAmount,
      underlyingEthAmount,
      cryptoAmount: aggregatedLpAssetBalance,
      // TODO: this all goes away anyway
      fiatAmount: '42',
    }),
    [aggregatedLpAssetBalance, baseEarnOpportunity, underlyingEthAmount, underlyingFoxAmount],
  )

  const farmContractsAggregatedOpportunity = useAppSelector(selectAggregatedUserStakingOpportunity)

  const lpAssetMarketData = useAppSelector(state => selectMarketDataById(state, foxEthLpAssetId))

  const farmContractsFiatBalance = useMemo(
    () =>
      bnOrZero(farmContractsAggregatedOpportunity.stakedAmountCryptoPrecision)
        .times(lpAssetMarketData.price)
        .toString(),
    [farmContractsAggregatedOpportunity.stakedAmountCryptoPrecision, lpAssetMarketData.price],
  )

  const lpAssetBalanceFilter = useMemo(
    () => ({
      assetId: foxEthLpAssetId ?? '',
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
    .plus(foxEthLpFiatBalance)
    .toString()

  return {
    opportunities,
    totalEarningBalance,
    loading: vaultsLoading || isFoxyBalancesLoading,
  }
}
