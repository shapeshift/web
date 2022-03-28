import { createSlice } from '@reduxjs/toolkit'
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { CAIP10, caip10 } from '@shapeshiftoss/caip'
import { ChainAdapter } from '@shapeshiftoss/chain-adapters'
import { chainAdapters, ChainTypes } from '@shapeshiftoss/types'
import { getChainAdapters } from 'context/PluginProvider/PluginProvider'

export type PubKey = string
type AllStakingDataArgs = { accountSpecifier: CAIP10 }

export type StakingDataStatus = 'idle' | 'loading' | 'loaded'

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
  byAccountSpecifier: StakingDataById
  status: StakingDataStatus
}

export type StakingPayload = {
  payload: {
    pubKey: PubKey
    stakingData: Staking
  }
}
const initialState: StakingData = {
  byAccountSpecifier: {},
  status: 'idle'
}

const updateOrInsert = (
  stakingDataState: StakingData,
  accountSpecifier: string,
  currentStakingData: any
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
    upsertStakingData: (stakingDataState, { payload }: any) => {
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
      // Type '{ error: string; data?: undefined; }' is not assignable to type '{ error?: undefined; data: Staking; meta?: unknown; }'.
      //@ts-ignore silence TS yelling at us for the return type, is there any way to fix this?
      queryFn: async ({ accountSpecifier }, { dispatch }) => {
        const { caip2, account } = caip10.fromCAIP10(accountSpecifier)
        const chainAdapters = getChainAdapters()
        // TODO(gomes): remove casting
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
            error: `Error fetching staking data for ${account}`
          }
        } finally {
          dispatch(stakingData.actions.setStatus('loaded'))
        }
      }
    })
  })
})
