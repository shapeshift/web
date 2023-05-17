import { DefiType } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import type { BN } from 'lib/bignumber/bignumber'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { createDeepEqualOutputSelector } from 'state/selector-utils'
import { opportunitiesApi } from 'state/slices/opportunitiesSlice/opportunitiesSlice'

import type { AggregatedOpportunitiesByProviderReturn } from '../types'

export const selectGetReadOnlyOpportunities =
  opportunitiesApi.endpoints.getReadOnlyOpportunities.select()

export type AggregatedReadOnlyOpportunitiesByProviderReturn = Omit<
  AggregatedOpportunitiesByProviderReturn,
  'provider'
> & {
  provider: string
}
export const selectAggregatedReadOnlyOpportunitiesByProvider = createDeepEqualOutputSelector(
  selectGetReadOnlyOpportunities,
  (readOnlyOpportunities): AggregatedReadOnlyOpportunitiesByProviderReturn[] => {
    const data = readOnlyOpportunities?.data

    if (!data) {
      return []
    }

    const result = data.userData.reduce<
      Record<
        string,
        AggregatedReadOnlyOpportunitiesByProviderReturn & {
          totalAbsoluteBalance: BN
          weightedApy: BN
        }
      >
    >((acc, item) => {
      const providerMetadata = data.metadataByProvider[item.provider]

      if (!providerMetadata) {
        return acc
      }

      const provider = providerMetadata.provider
      const opportunityMetadata = data.opportunities[item.opportunityId]

      const totalFiatAmount = bnOrZero(acc[provider]?.fiatAmount).plus(item.fiatAmount)

      // We need to calculate the weighted APY according to the total *abs* balance
      // The reason for that is staked amounts can be negative (i.e. borrowed)
      let totalAbsoluteBalance = bnOrZero(acc[provider]?.totalAbsoluteBalance)
      let weightedApy = bnOrZero(acc[provider]?.weightedApy)

      const fiatAmount = bnOrZero(item.fiatAmount)
      const absoluteFiatAmount = bnOrZero(fiatAmount.abs())
      const opportunityApy = bnOrZero(opportunityMetadata?.apy)

      totalAbsoluteBalance = totalAbsoluteBalance.plus(absoluteFiatAmount)
      weightedApy = weightedApy.plus(opportunityApy.multipliedBy(absoluteFiatAmount))

      const apy = totalAbsoluteBalance.isZero()
        ? '0'
        : weightedApy.div(totalAbsoluteBalance).toString()

      const otherOpportunityType =
        opportunityMetadata.type === DefiType.Staking ? DefiType.LiquidityPool : DefiType.Staking
      // TODO: concat item.opportunityId once the staking hardcoding for PoC is removed
      // At the moment, we assume staking for all so we don't really care about LPs, but we still need to at least have an initial {lp: []} object
      const otherOpportunity = {
        [otherOpportunityType]: acc[provider]?.opportunities[otherOpportunityType] || [],
      }
      const currentOpportunity = {
        [opportunityMetadata.type]: (
          acc[provider]?.opportunities[opportunityMetadata.type] || []
        ).concat(item.opportunityId),
      }

      return {
        ...acc,
        [provider]: {
          provider,
          apy,
          fiatAmount: totalFiatAmount.toString(),
          // @ts-ignore TODO(gomes): implement fiatRewardsAmount
          fiatRewardsAmount: bnOrZero(item.fiatRewardsAmount).toString(),
          // @ts-ignore TODO(gomes): implement fiatRewardsAmount
          netProviderFiatAmount: totalFiatAmount.plus(bnOrZero(item.fiatRewardsAmount)).toString(),
          opportunities: Object.assign(
            {},
            acc[provider]?.opportunities,
            currentOpportunity,
            otherOpportunity,
          ),
          weightedApy,
          totalAbsoluteBalance,
        },
      }
    }, {})

    return Object.values(result)
  },
)
