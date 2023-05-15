import { createDeepEqualOutputSelector } from 'state/selector-utils'
import { opportunitiesApi } from 'state/slices/opportunitiesSlice/opportunitiesSlice'

import type { AggregatedOpportunitiesByProviderReturn } from '../types'

export const selectGetReadOnlyOpportunities =
  opportunitiesApi.endpoints.getReadOnlyOpportunities.select()

export const selectAggregatedReadOnlyOpportunitiesByProvider = createDeepEqualOutputSelector(
  selectGetReadOnlyOpportunities,
  (readOnlyOpportunities): AggregatedOpportunitiesByProviderReturn[] => {
    const data = readOnlyOpportunities?.data
    console.log({ data })
  },
)
