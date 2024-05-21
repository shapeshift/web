import { createSelector } from 'reselect'
import type {
  GetZapperAppsBalancesInput,
  GetZapperAppsBalancesOutput,
} from 'state/apis/zapper/zapperApi'
import type { ReduxState } from 'state/reducer'
import { selectEvmAccountIds } from 'state/slices/common-selectors'

// Zapper only for now, make this readOnly.endpoints.selectGetReadOnlyOpportunities
// smooosh multiple providers into one output as we support more
const selectZapperQueries = (state: ReduxState) => state.zapper.queries
export const selectGetReadOnlyOpportunities = createSelector(
  selectEvmAccountIds,
  selectZapperQueries,
  (evmAccountIds, queries) => {
    const getZapperAppsBalancesQueries = Object.entries(queries)
      .filter(([queryKey]) => queryKey.startsWith('getZapperAppsBalancesOutput'))
      .map(([_queryKey, queryInfo]) => queryInfo)

    const getZapperAppsBalancesOutput = getZapperAppsBalancesQueries.find(queryInfo => {
      return (
        queryInfo?.status === 'fulfilled' &&
        // Yes, arrays are references but that's absolutely fine because selector outputs *are* stable references
        (queryInfo.originalArgs as GetZapperAppsBalancesInput).evmAccountIds === evmAccountIds
      )
    })?.data as GetZapperAppsBalancesOutput | undefined

    if (!getZapperAppsBalancesOutput)
      return {
        data: {
          userData: [],
          opportunities: {},
          metadataByProvider: {},
        },
      }

    return { data: getZapperAppsBalancesOutput }
  },
)
