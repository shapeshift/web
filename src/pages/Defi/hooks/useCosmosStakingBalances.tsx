import { CAIP19 } from '@shapeshiftoss/caip'
import { chainAdapters, ChainTypes } from '@shapeshiftoss/types'
import { useMemo } from 'react'
import { BigNumber, bnOrZero } from 'lib/bignumber/bignumber'
import {
  ActiveStakingOpportunity,
  selectAccountSpecifier,
  selectAssetByCAIP19,
  selectMarketDataById,
  selectStakingOpportunitiesDataFull,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type UseCosmosStakingBalancesProps = {
  assetId: CAIP19
}

export type UseCosmosStakingBalancesReturn = {
  stakingOpportunities: MergedStakingOpportunity[]
  totalBalance: string
}

export type MergedActiveStakingOpportunity = ActiveStakingOpportunity & {
  fiatAmount?: string
  tokenAddress: string
  assetId: CAIP19
  chain: ChainTypes
  tvl: string
}

export type MergedStakingOpportunity = chainAdapters.cosmos.Validator & {
  tokenAddress: string
  assetId: CAIP19
  chain: ChainTypes
  tvl: string
}

export function useCosmosStakingBalances({
  assetId,
}: UseCosmosStakingBalancesProps): UseCosmosStakingBalancesReturn {
  const marketData = useAppSelector(state => selectMarketDataById(state, assetId))
  const asset = useAppSelector(state => selectAssetByCAIP19(state, assetId))

  const accountSpecifiers = useAppSelector(state => selectAccountSpecifier(state, asset?.caip2))
  const accountSpecifier = accountSpecifiers?.[0] // TODO: maybe remove me, or maybe not

  const stakingOpportunities = useAppSelector(state =>
    selectStakingOpportunitiesDataFull(state, accountSpecifier, '', assetId),
  )
  // TODO: This whole module probably goes away as well
  // We just parse total delegation in fiat, tvl in fiat, and parse cryptoAmount to precision - this should be done at component-level and not require a whole hook
  // We also shoehorn chain, assetId, and tokenAddress - all of which can also be shoehorned at component-level
  // Finally, we have a totalBalance - this can be added at selector-level
  // The loading state is not needed anymore
  const mergedActiveStakingOpportunities = useMemo(() => {
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
        chain: asset.chain,
        assetId,
        tokenAddress: asset.slip44.toString(),
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
        bnOrZero(0),
      ),
    [mergedActiveStakingOpportunities],
  )

  return {
    stakingOpportunities: mergedActiveStakingOpportunities,
    totalBalance: totalBalance.toString(),
  }
}
