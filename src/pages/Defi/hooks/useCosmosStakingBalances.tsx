import { AssetId, ChainId } from '@shapeshiftoss/caip'
import { chainAdapters, ChainTypes } from '@shapeshiftoss/types'
import { useMemo } from 'react'
import { BigNumber, bn, bnOrZero } from 'lib/bignumber/bignumber'
import {
  ActiveStakingOpportunity,
  selectAssetById,
  selectFirstAccountSpecifierByChainId,
  selectMarketDataById,
  selectStakingOpportunitiesDataFull,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type UseCosmosStakingBalancesProps = {
  assetId: AssetId
}

export type UseCosmosStakingBalancesReturn = {
  cosmosStakingOpportunities: MergedActiveStakingOpportunity[]
  totalBalance: string
}

export type MergedActiveStakingOpportunity = ActiveStakingOpportunity & {
  fiatAmount?: string
  assetId: AssetId
  chainId: ChainId
  tvl: string
  isLoaded?: boolean
}

export type MergedStakingOpportunity = chainAdapters.cosmos.Validator & {
  tokenAddress: string
  assetId: AssetId
  chainId: ChainTypes
  tvl: string
}

export function useCosmosStakingBalances({
  assetId,
}: UseCosmosStakingBalancesProps): UseCosmosStakingBalancesReturn {
  const marketData = useAppSelector(state => selectMarketDataById(state, assetId))
  const asset = useAppSelector(state => selectAssetById(state, assetId))

  const accountSpecifier = useAppSelector(state =>
    selectFirstAccountSpecifierByChainId(state, asset?.chainId),
  )

  const stakingOpportunities = useAppSelector(state =>
    selectStakingOpportunitiesDataFull(state, { accountSpecifier, assetId }),
  )

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
    cosmosStakingOpportunities: mergedActiveStakingOpportunities,
    totalBalance: totalBalance.toString(),
  }
}
