import { createSelector } from 'reselect'
import type { ReduxState } from 'state/reducer'
import {
  selectDefiProviderParamFromFilter,
  selectDefiTypeParamFromFilter,
  selectQueryStatusParamFromFilter,
} from 'state/selector-utils'

import type { GetOpportunityUserDataInput } from '../types'

export * from './combined'
export * from './lpSelectors'
export * from './stakingSelectors'
// Don't export me - this will produce circular deps
// export * from './readonly'

const selectOpportunitiesApiQueries = (state: ReduxState) => state.opportunitiesApi.queries

export const selectOpportunitiesApiQueriesByFilter = createSelector(
  selectOpportunitiesApiQueries,
  selectDefiProviderParamFromFilter,
  selectDefiTypeParamFromFilter,
  selectQueryStatusParamFromFilter,
  (queries, defiProvider, defiType, queryStatus) =>
    Object.values(queries).filter(query => {
      if (!query) return false
      return (
        (!queryStatus || query.status === queryStatus) &&
        (!defiProvider ||
          (Array.isArray(query.originalArgs) &&
            (query.originalArgs as GetOpportunityUserDataInput[]).some(
              input => input.defiProvider === defiProvider,
            ))) &&
        (!defiType ||
          (Array.isArray(query.originalArgs) &&
            (query.originalArgs as GetOpportunityUserDataInput[]).some(
              input => input.defiType === defiType,
            )))
      )
    }),
)
