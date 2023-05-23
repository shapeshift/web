import type { BaseQueryApi } from '@reduxjs/toolkit/dist/query/baseQueryTypes'
import type { AccountId } from '@shapeshiftoss/caip'

import type { DefiType, OpportunityId, UserStakingId } from '../types'

export type ReduxApi = Pick<BaseQueryApi, 'dispatch' | 'getState'>

export type OpportunitiesMetadataResolverInput = {
  opportunityIds?: OpportunityId[]
  defiType: DefiType
  reduxApi: ReduxApi
}

export type OpportunityMetadataResolverInput = {
  opportunityId: OpportunityId
  defiType: DefiType
  reduxApi: ReduxApi
}

export type OpportunityUserDataResolverInput = {
  opportunityId: OpportunityId
  defiType: DefiType
  accountId: AccountId
  reduxApi: ReduxApi
}

export type OpportunitiesUserDataResolverInput = {
  opportunityIds: OpportunityId[]
  defiType: DefiType
  accountId: AccountId
  reduxApi: ReduxApi
  onInvalidate: (userStakingId: UserStakingId) => void
}

export type OpportunityIdsResolverInput = {
  reduxApi: ReduxApi
}
