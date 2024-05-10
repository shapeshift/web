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
    const getZapperAppsBalancesQueries = Object.entries(queries).filter(([queryKey]) =>
      queryKey.startsWith('getZapperAppsBalancesOutput'),
    )

    const getZapperAppsBalancesOutput = getZapperAppsBalancesQueries.find(
      ([queryKey, queryInfo]) => {
        return (
          queryKey.startsWith('getZapperAppsBalancesOutput') &&
          queryInfo?.status === 'fulfilled' &&
          // Yes, arrays are references but that's absolutely fine because selector outputs *are* stable references
          (queryInfo.originalArgs as GetZapperAppsBalancesInput).evmAccountIds === evmAccountIds
        )
      },
    )?.[1]?.data as GetZapperAppsBalancesOutput

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
