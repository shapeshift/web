import { QueryStatus } from '@reduxjs/toolkit/query'
import { createSelector } from 'reselect'
import type {
  GetPortalsAppsBalancesInput,
  GetPortalsAppsBalancesOutput,
} from 'state/apis/portals/portalsApi'
import type { ReduxState } from 'state/reducer'
import { selectEvmAccountIds } from 'state/slices/common-selectors'

// Get read-only opportunities from portals API
export const selectGetReadOnlyOpportunities = createSelector(
  selectEvmAccountIds,
  (state: ReduxState) => state.portals?.queries ?? {},
  (evmAccountIds, queries) => {
    const getPortalsAppsBalancesQueries = Object.entries(queries)
      .filter(([queryKey]) => queryKey.startsWith('getPortalsAppsBalancesOutput'))
      .map(([_queryKey, queryInfo]) => queryInfo)

    const getPortalsAppsBalancesOutput = getPortalsAppsBalancesQueries.find(queryInfo => {
      return (
        queryInfo?.status === QueryStatus.fulfilled &&
        // Yes, arrays are references but that's absolutely fine because selector outputs *are* stable references
        (queryInfo.originalArgs as GetPortalsAppsBalancesInput)?.evmAccountIds === evmAccountIds
      )
    })?.data as GetPortalsAppsBalancesOutput | undefined

    if (!getPortalsAppsBalancesOutput)
      return {
        data: {
          userData: [],
          opportunities: {},
          metadataByProvider: {},
        },
      }

    return { data: getPortalsAppsBalancesOutput }
  },
)
