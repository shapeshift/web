import { createSlice } from '@reduxjs/toolkit'
import { createApi } from '@reduxjs/toolkit/query/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { ethAssetId, fromAssetId } from '@shapeshiftoss/caip'
import { bnOrZero } from '@shapeshiftoss/investor-foxy'
import { HistoryTimeframe } from '@shapeshiftoss/types'
import type { MarketData } from '@shapeshiftoss/types/dist/market'
import { Fetcher, Token } from '@uniswap/sdk'
import IUniswapV2Pair from '@uniswap/v2-core/build/IUniswapV2Pair.json'
import type { DefiType } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiProvider } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { foxEthLpAssetId } from 'features/defi/providers/fox-eth-lp/constants'
import { FOX_TOKEN_CONTRACT_ADDRESS, WETH_TOKEN_CONTRACT_ADDRESS } from 'plugins/foxPage/const'
import { calculateAPRFromToken0, getEthersProvider } from 'plugins/foxPage/utils'
import { BASE_RTK_CREATE_API_CONFIG } from 'state/apis/const'
import type { Nominal } from 'types/common'

import type { AssetsState } from '../assetsSlice/assetsSlice'
import { getOrCreateContract } from '../foxEthSlice/contractManager'
import { fetchPairData } from '../foxEthSlice/utils'
import { marketData } from '../marketDataSlice/marketDataSlice'
import { selectMarketDataById } from '../selectors'
import { DefiProviderToResolverByDeFiType } from './utils'

export type OpportunityMetadata = {
  apy: string
  assetId: AssetId
  provider: DefiProvider
  tvl: string
  type: DefiType
  underlyingAssetIds: readonly [AssetId, AssetId]
}

// User-specific values for this opportunity
export type UserStakingOpportunity = {
  // The amount of farmed LP tokens
  stakedAmountCryptoPrecision: string
  // The amount of rewards available to claim for the farmed LP position
  rewardsAmountCryptoPrecision: string
}

// The AccountId of the staking contract in the form of chainId:accountAddress
export type StakingId = Nominal<string, 'StakingId'>
// The AccountId of the LP contract in the form of chainId:accountAddress
export type LpId = Nominal<string, 'LpId'>
// The unique identifier of an lp opportunity in the form of UserAccountId*StakingId
export type UserStakingId = `${AccountId}*${StakingId}`

export type OpportunitiesState = {
  lp: {
    byAccountId: Record<AccountId, LpId[]> // a 1:n foreign key of which user AccountIds hold this LpId  [id: AccountId]: LpId[]
    byId: Record<LpId, OpportunityMetadata>
    ids: LpId[]
  }
  // Staking is the odd one here - it isn't a portfolio holding, but rather a synthetic value living on a smart contract
  // Which means we can't just derive the data from portfolio, marketData and other slices but have to actually store the amount in the slice
  userStaking: {
    byId: Record<UserStakingId, UserStakingOpportunity>
    ids: UserStakingId[]
  }

  staking: {
    // a 1:n foreign key of which user AccountIds hold this StakingId
    byAccountId: Record<AccountId, StakingId[]>
    byId: Record<StakingId, OpportunityMetadata>
    ids: StakingId[]
  }
}

export type OpportunityMetadataById = OpportunitiesState['lp' | 'staking']['byId']

export type GetOpportunityMetadataInput = {
  opportunityId: LpId | StakingId
  opportunityType: 'lp' | 'staking'
  defiType: DefiType
}

type GetOpportunityMetadataOutput = any

export const initialState: OpportunitiesState = {
  lp: {
    byAccountId: {},
    byId: {},
    ids: [],
  },
  staking: {
    byAccountId: {},
    byId: {},
    ids: [],
  },
  userStaking: {
    byId: {},
    ids: [],
  },
}

export const opportunities = createSlice({
  name: 'opportunitiesData',
  initialState,
  reducers: {
    clear: () => initialState,
    upsertOpportunityMetadata: (
      state,
      { payload }: { payload: { metadata: OpportunityMetadataById; type: 'lp' | 'staking' } },
    ) => {
      state[payload.type].byId = {
        ...state[payload.type].byId,
        ...payload.metadata,
      }
      state[payload.type].ids = Array.from(new Set([...Object.keys(payload.metadata)]))
    },
    upsertUserStakingOpportunities: (
      state,
      { payload }: { payload: OpportunitiesState['userStaking']['byId'] },
    ) => {
      state.userStaking.byId = {
        ...state.staking.byId,
        ...payload,
      }
      state.userStaking.ids = Array.from(new Set([...Object.keys(payload)])) as UserStakingId[]
    },

    // upsertOpportunitiesData: (opportunitiesSliceDraft, { payload }: { payload: {} }) => {}, // TODO:
  },
})

export const opportunitiesApi = createApi({
  ...BASE_RTK_CREATE_API_CONFIG,
  reducerPath: 'opportunitiesApi',
  keepUnusedDataFor: 300,
  endpoints: build => ({
    getOpportunityMetadata: build.query<GetOpportunityMetadataOutput, GetOpportunityMetadataInput>({
      queryFn: async ({ opportunityId, opportunityType, defiType }, { dispatch, getState }) => {
        const { data } = await DefiProviderToResolverByDeFiType[DefiProvider.FoxFarming][defiType](
          opportunityId,
          opportunityType,
          { dispatch, getState },
        )

        dispatch(opportunities.actions.upsertOpportunityMetadata(data))

        return { data }
      },
    }),
  }),
})
