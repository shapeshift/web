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

    debugger
    const result = data.userData.reduce<
      Record<string, AggregatedReadOnlyOpportunitiesByProviderReturn>
    >((acc, item) => {
      const providerMetadata = data.metadataByProvider[item.provider]

      if (!providerMetadata) {
        return acc
      }

      const provider = providerMetadata.provider
      const opportunityMetadata = data.opportunities[item.opportunityId]

      const totalFiatAmount = bnOrZero(acc[provider]?.fiatAmount).plus(item.fiatAmount)
      const projectedAnnualizedYield = bnOrZero(opportunityMetadata?.apy)

      const apy = totalFiatAmount.isZero()
        ? '0'
        : projectedAnnualizedYield.div(totalFiatAmount).toString()

      const currentOpportunity = {
        [opportunityMetadata.type]: [
          ...(acc[provider]?.opportunities[opportunityMetadata.type] || []),
          item.opportunityId,
        ],
      }

      debugger
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
          opportunities: {
            ...acc[provider]?.opportunities,
            ...currentOpportunity,
          },
        },
      }
    }, {})

    debugger
    return Object.values(result)
  },
)
