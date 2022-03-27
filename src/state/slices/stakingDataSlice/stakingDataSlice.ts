import { createSlice } from '@reduxjs/toolkit'
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { CAIP19, caip19 } from '@shapeshiftoss/caip'
import { chainAdapters, ChainTypes } from '@shapeshiftoss/types'
import { getChainAdapters } from 'context/PluginProvider/PluginProvider'

export type PubKey = string
type AllStakingDataArgs = { pubKey: string; assetId: CAIP19 }

export type Staking = {
  delegations: chainAdapters.cosmos.Delegation[]
  redelegations: chainAdapters.cosmos.Redelegation[]
  undelegations: chainAdapters.cosmos.Undelegation[]
  rewards: chainAdapters.cosmos.Reward[]
}
export type StakingDataById = {
  [k: PubKey]: Staking
}

export type StakingData = {
  byPubKey: StakingDataById
}

export type StakingPayload = {
  payload: {
    pubKey: PubKey
    stakingData: Staking
  }
}
const initialState: StakingData = {
  byPubKey: {}
}

const updateOrInsert = (stakingDataState: StakingData, pubKey: PubKey, currentStakingData: any) => {
  stakingDataState.byPubKey[pubKey] = currentStakingData
}
export const stakingData = createSlice({
  name: 'stakingData',
  initialState,
  reducers: {
    clear: () => initialState,
    upsertStakingData: (stakingDataState, { payload }: any) => {
      // TODO(gomes): Improve the structure of this when we have cosmos websocket, for now this just inserts
      updateOrInsert(stakingDataState, payload.pubKey, payload.stakingData)
    }
  }
})

export const stakingDataApi = createApi({
  reducerPath: 'stakingDataApi',
  // not actually used, only used to satisfy createApi, we use a custom queryFn
  baseQuery: fetchBaseQuery({ baseUrl: '/' }),
  // refetch if network connection is dropped, useful for mobile
  refetchOnReconnect: true,
  endpoints: build => ({
    getStakingData: build.query<Staking, AllStakingDataArgs>({
      queryFn: async ({ pubKey, assetId }, { dispatch }) => {
        const { chain } = caip19.fromCAIP19(assetId)
        const chainAdapters = getChainAdapters()
        // TODO(gomes): remove casting
        const adapter = chainAdapters.byChain<ChainTypes.Cosmos>(chain as ChainTypes.Cosmos)
        try {
          const data = await adapter.getAccount(pubKey)

          const {
            chainSpecific: { delegations, redelegations, undelegations, rewards }
          } = data

          const currentStakingData = {
            delegations,
            redelegations,
            undelegations,
            rewards
          }

          dispatch(
            stakingData.actions.upsertStakingData({ pubKey, stakingData: currentStakingData })
          )
          return { data: currentStakingData }
        } catch (e) {
          console.error('Error fetching staking data for ', pubKey)
          return {
            error: `Error fetching staking data for ${pubKey}`
          }
        }
      }
    })
  })
})
