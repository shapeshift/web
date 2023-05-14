import { zapperApi } from 'state/apis/zapper/zapperApi'
import { selectWalletAccountIds } from 'state/slices/common-selectors'

import type { ReadOnlyOpportunityType } from '../../types'
import type { ReduxApi } from '../types'

export const zapperReadOnlyOpportunitiesResolver = async ({
  reduxApi,
}: {
  reduxApi: ReduxApi
}): Promise<ReadOnlyOpportunityType[] | undefined> => {
  const { dispatch, getState } = reduxApi
  const state: any = getState() // ReduxState causes circular dependency

  const accountIds = selectWalletAccountIds(state)

  const getZapperAppsBalancesOutput = await dispatch(
    zapperApi.endpoints.getZapperAppsbalancesOutput.initiate({
      accountIds,
    }),
  )

  return getZapperAppsBalancesOutput.data
}
