import type { GetZapperAppsBalancesOutput } from 'state/apis/zapper/zapperApi'
import { zapper } from 'state/apis/zapper/zapperApi'
import { selectWalletAccountIds } from 'state/slices/common-selectors'

import type { ReduxApi } from '../types'

export const zapperReadOnlyOpportunitiesResolver = async ({
  reduxApi,
}: {
  reduxApi: ReduxApi
}): Promise<GetZapperAppsBalancesOutput | undefined> => {
  const { dispatch, getState } = reduxApi
  const state: any = getState() // ReduxState causes circular dependency

  const accountIds = selectWalletAccountIds(state)

  const getZapperAppsBalancesOutput = await dispatch(
    zapper.endpoints.getZapperAppsBalancesOutput.initiate({
      accountIds,
      reduxApi,
    }),
  )

  return getZapperAppsBalancesOutput.data
}
