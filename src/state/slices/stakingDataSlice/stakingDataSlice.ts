import { createSlice } from '@reduxjs/toolkit'
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { CAIP10, caip10 } from '@shapeshiftoss/caip'
import { ChainAdapter } from '@shapeshiftoss/chain-adapters'
import { chainAdapters, ChainTypes } from '@shapeshiftoss/types'
import { getChainAdapters } from 'context/PluginProvider/PluginProvider'

type AllStakingDataArgs = { accountSpecifier: CAIP10 }

export type StakingDataStatus = 'idle' | 'loading' | 'loaded'

export type Staking = {
  delegations: chainAdapters.cosmos.Delegation[]
  redelegations: chainAdapters.cosmos.Redelegation[]
  undelegations: chainAdapters.cosmos.Undelegation[]
  rewards: chainAdapters.cosmos.ValidatorReward[]
}
export type StakingDataByAccountSpecifier = {
  [k: CAIP10]: Staking
}

export type StakingData = {
  byAccountSpecifier: StakingDataByAccountSpecifier
  status: StakingDataStatus
}

const initialState: StakingData = {
  byAccountSpecifier: {},
  status: 'idle'
}

const updateOrInsert = (
  stakingDataState: StakingData,
  accountSpecifier: CAIP10,
  currentStakingData: Staking
) => {
  stakingDataState.byAccountSpecifier[accountSpecifier] = currentStakingData
}

type StakingDataStatusPayload = { payload: StakingDataStatus }

export const stakingData = createSlice({
  name: 'stakingData',
  initialState,
  reducers: {
    clear: () => initialState,
    setStatus: (state, { payload }: StakingDataStatusPayload) => {
      state.status = payload
    },
    upsertStakingData: (
      stakingDataState,
      { payload }: { payload: { accountSpecifier: CAIP10; stakingData: Staking } }
    ) => {
      // TODO(gomes): Improve the structure of this when we have cosmos websocket, for now this just inserts
      updateOrInsert(stakingDataState, payload.accountSpecifier, payload.stakingData)
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
      queryFn: async ({ accountSpecifier }, { dispatch }) => {
        const { caip2, account } = caip10.fromCAIP10(accountSpecifier)
        const chainAdapters = getChainAdapters()
        const adapter = (await chainAdapters.byChainId(caip2)) as ChainAdapter<ChainTypes.Cosmos>
        dispatch(stakingData.actions.setStatus('loading'))
        try {
          const data = await adapter.getAccount(account)

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
            stakingData.actions.upsertStakingData({
              stakingData: currentStakingData,
              accountSpecifier
            })
          )
          return { data: currentStakingData }
        } catch (e) {
          console.error('Error fetching staking data for ', account)
          return {
            error: {
              data: `Error fetching staking data for ${account}`,
              status: 500
            }
          }
        } finally {
          dispatch(stakingData.actions.setStatus('loaded'))
        }
      }
    })
  })
})
