import type { BaseQueryApi } from '@reduxjs/toolkit/dist/query/baseQueryTypes'
import type { AccountId } from '@shapeshiftoss/caip'

import type { LpId, OpportunityDefiType, StakingId } from '../types'

export type ReduxApi = Pick<BaseQueryApi, 'dispatch' | 'getState'>

export type OpportunitiesMetadataResolverInput = {
  opportunityType: OpportunityDefiType
  reduxApi: ReduxApi
}

export type OpportunityMetadataResolverInput = {
  opportunityId: LpId | StakingId
  opportunityType: OpportunityDefiType
  reduxApi: ReduxApi
}

export type OpportunityUserDataResolverInput = {
  opportunityId: LpId | StakingId
  opportunityType: OpportunityDefiType
  accountId: AccountId
  reduxApi: ReduxApi
}
