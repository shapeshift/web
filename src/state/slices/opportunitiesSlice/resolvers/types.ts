import type { BaseQueryApi } from '@reduxjs/toolkit/dist/query/baseQueryTypes'
import type { AccountId } from '@shapeshiftoss/caip'

import type { OpportunityDefiType, OpportunityId } from '../types'

export type ReduxApi = Pick<BaseQueryApi, 'dispatch' | 'getState'>

export type OpportunitiesMetadataResolverInput = {
  opportunityType: OpportunityDefiType
  reduxApi: ReduxApi
}

export type OpportunityMetadataResolverInput = {
  opportunityId: OpportunityId
  opportunityType: OpportunityDefiType
  reduxApi: ReduxApi
}

export type OpportunityUserDataResolverInput = {
  opportunityId: OpportunityId
  opportunityType: OpportunityDefiType
  accountId: AccountId
  reduxApi: ReduxApi
}

export type OpportunitiesUserDataResolverInput = {
  opportunityType: OpportunityDefiType
  accountId: AccountId
  reduxApi: ReduxApi
}
