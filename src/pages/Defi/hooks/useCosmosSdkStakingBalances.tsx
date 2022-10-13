import type { AccountId, AssetId, ChainId } from '@shapeshiftoss/caip'
import type { cosmos } from '@shapeshiftoss/unchained-client'
import { useMemo } from 'react'
import type { BigNumber } from 'lib/bignumber/bignumber'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import type { ActiveStakingOpportunity } from 'state/slices/selectors'
import {
  selectAssetById,
  selectMarketDataById,
  selectStakingOpportunitiesDataFullByFilter,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'
import type { Nullable } from 'types/common'

type UseCosmosStakingBalancesProps = {
  accountId?: Nullable<AccountId>
  assetId: AssetId
  supportsCosmosSdk?: boolean
}

export type UseCosmosStakingBalancesReturn = {
  cosmosSdkStakingOpportunities: MergedActiveStakingOpportunity[]
  totalBalance: string
}

export type MergedActiveStakingOpportunity = ActiveStakingOpportunity & {
  fiatAmount?: string
  assetId: AssetId
  chainId: ChainId
  tvl: string
  isLoaded?: boolean
}

export type MergedStakingOpportunity = cosmos.Validator & {
  tokenAddress: string
  assetId: AssetId
  chainId: ChainId
  tvl: string
}

export function useCosmosSdkStakingBalances({
  assetId,
  accountId,
  supportsCosmosSdk = true,
}: UseCosmosStakingBalancesProps): UseCosmosStakingBalancesReturn {
  const marketData = useAppSelector(state => selectMarketDataById(state, assetId))
  const asset = useAppSelector(state => selectAssetById(state, assetId))

  const stakingOpportunities = useAppSelector(state =>
    selectStakingOpportunitiesDataFullByFilter(state, {
      accountId,
      assetId,
      supportsCosmosSdk,
    }),
  )

  const mergedActiveStakingOpportunities = useMemo(() => {
    if (!asset) return []
    if (!marketData?.price) return []

    return Object.values(stakingOpportunities).map(opportunity => {
      const fiatAmount = bnOrZero(opportunity.totalDelegations)
        .div(`1e+${asset.precision}`)
        .times(bnOrZero(marketData.price))
        .toFixed(2)

      const tvl = bnOrZero(opportunity.tokens)
        .div(`1e+${asset.precision}`)
        .times(bnOrZero(marketData?.price))
        .toString()
      const data = {
        ...opportunity,
        cryptoAmount: bnOrZero(opportunity.totalDelegations)
          .div(`1e+${asset?.precision}`)
          .decimalPlaces(asset.precision)
          .toString(),
        tvl,
        fiatAmount,
        chainId: asset.chainId,
        assetId,
      }
      return data
    })
  }, [stakingOpportunities, assetId, asset, marketData])

  const totalBalance = useMemo(
    () =>
      Object.values(mergedActiveStakingOpportunities).reduce(
        (acc: BigNumber, opportunity: MergedActiveStakingOpportunity) => {
          return acc.plus(bnOrZero(opportunity.fiatAmount))
        },
        bn(0),
      ),
    [mergedActiveStakingOpportunities],
  )

  return {
    cosmosSdkStakingOpportunities: mergedActiveStakingOpportunities,
    totalBalance: totalBalance.toString(),
  }
}
