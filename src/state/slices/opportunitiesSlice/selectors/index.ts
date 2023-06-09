import { createSelector } from 'reselect'
import type { ReduxState } from 'state/reducer'
import {
  selectDefiProviderParamFromFilter,
  selectDefiTypeParamFromFilter,
  selectQueryStatusParamFromFilter,
} from 'state/selectors'

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
      return (
        (!queryStatus || query?.status === queryStatus) &&
        (!defiProvider ||
          (query?.originalArgs as GetOpportunityUserDataInput).defiProvider === defiProvider) &&
        (!defiType || (query?.originalArgs as GetOpportunityUserDataInput).defiType === defiType)
      )
    }),
)
