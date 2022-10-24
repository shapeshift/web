import { createSlice } from '@reduxjs/toolkit'
import { createApi } from '@reduxjs/toolkit/query/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import type { DefiType } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { BASE_RTK_CREATE_API_CONFIG } from 'state/apis/const'

export const initialState: OpportunitiesState = {
  lp: {
    byAccountId: {},
    byId: {},
    ids: [],
  },
  farming: {
    byAccountId: {},
    byId: {},
    ids: [],
  },
  userLp: {
    byId: {},
    ids: [],
  },
  userFarming: {
    byId: {},
    ids: [],
  },
}

// The contract info, also referred to as "metadata" - doesn't contain any user-specific data
type Opportunity = {
  // The LP token AssetId
  assetId: AssetId
  provider: string
  tvl: string
  apy: string
  type: DefiType
}

type LpOpportunity = Opportunity & {
  // A tuple of the underlying assets this LP represents
  underlyingAssetIds: [AssetId, AssetId]
}

type FarmingOpportunity = Opportunity

// User-specific values for this opportunity
type UserLpOpportunity = LpOpportunity & {
  // The amount of held LP tokens
  cryptoAmount: string
  underlyingFoxCryptoBaseUnitAmount: string
  underlyingEthCryptoBaseUnitAmount: string
}

// User-specific values for this opportunity
type UserFarmingOpportunity = FarmingOpportunity & {
  // The amount of farmed LP tokens
  cryptoAmount: string
}

// The AccountId of the farming contract in the form of chainId:accountAddress
type FarmingId = AccountId
// The AccountId of the LP contract in the form of chainId:accountAddress
type LpId = AccountId
// The unique identifier of an lp opportunity in the form of UserAccountId:FarmingId
type UserFarmingId = AccountId
// The unique identifier of a farming opportunity in the form of UserAccountId:FarmingId
type UserLpId = AccountId

export type OpportunitiesState = {
  userLp: {
    byId: { [id: UserLpId]: UserLpOpportunity }
    ids: UserLpId[]
  }
  lp: {
    byAccountId: {
      [id: AccountId]: LpId[]
    }
    byId: {
      [id: LpId]: LpOpportunity
    }
    ids: LpId[]
  }
  // The user-specific farming data
  userFarming: {
    byId: {
      [id: UserFarmingId]: UserFarmingOpportunity
    }
    ids: UserFarmingId[]
  }

  farming: {
    byAccountId: {
      [k: AccountId]: FarmingId[]
    }
    byId: {
      [k: FarmingId]: FarmingOpportunity
    }
    ids: FarmingId[]
  }
}

export const opportunities = createSlice({
  name: 'opportunitiesData',
  initialState,
  reducers: {
    clear: () => initialState,
    // upsertOpportunitiesData: (opportunitiesSliceDraft, { payload }: { payload: {} }) => {}, // TODO:
  },
})

export const opportunitiesApi = createApi({
  ...BASE_RTK_CREATE_API_CONFIG,
  reducerPath: 'opportunitiesApi',
  keepUnusedDataFor: 300,
  endpoints: _build => ({
    // TODO
  }),
})
