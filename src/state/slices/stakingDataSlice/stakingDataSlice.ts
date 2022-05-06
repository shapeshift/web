import { createSlice } from '@reduxjs/toolkit'
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { AccountId, caip10, ChainId } from '@shapeshiftoss/caip'
import { ChainAdapter } from '@shapeshiftoss/chain-adapters'
import { CosmosSdkBaseAdapter } from '@shapeshiftoss/chain-adapters/dist/cosmossdk/CosmosSdkBaseAdapter'
import { chainAdapters, ChainTypes } from '@shapeshiftoss/types'
import { getChainAdapters } from 'context/PluginProvider/PluginProvider'

export type PubKey = string
type AllStakingDataArgs = { accountSpecifier: AccountId }

type AllValidatorDataArgs = { chainId: ChainId }

type SingleValidatorDataArgs = { chainId: ChainId; validatorAddress: PubKey }

export type StakingDataStatus = 'idle' | 'loading' | 'loaded'

export type Staking = {
  delegations: chainAdapters.cosmos.Delegation[]
  redelegations: chainAdapters.cosmos.Redelegation[]
  undelegations: chainAdapters.cosmos.Undelegation[]
  rewards: chainAdapters.cosmos.ValidatorReward[]
}

export type Validators = {
  validators: chainAdapters.cosmos.Validator[]
}

export type StakingDataByAccountSpecifier = {
  [k: string]: Staking
}

export type StakingData = {
  byAccountSpecifier: StakingDataByAccountSpecifier
  status: StakingDataStatus
  validatorStatus: StakingDataStatus
  byValidator: ValidatorDataByPubKey
}

export type ValidatorDataByPubKey = {
  [k: PubKey]: chainAdapters.cosmos.Validator
}

const initialState: StakingData = {
  byAccountSpecifier: {},
  byValidator: {},
  status: 'idle',
  validatorStatus: 'idle',
}

const updateOrInsert = (
  stakingDataState: StakingData,
  accountSpecifier: AccountId,
  currentStakingData: Staking,
) => {
  stakingDataState.byAccountSpecifier[accountSpecifier] = currentStakingData
}

const updateOrInsertValidatorData = (
  stakingDataState: StakingData,
  validators: chainAdapters.cosmos.Validator[],
) => {
  validators.forEach(validator => {
    stakingDataState.byValidator[validator.address] = validator
  })
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
    setValidatorStatus: (state, { payload }: StakingDataStatusPayload) => {
      state.validatorStatus = payload
    },
    upsertStakingData: (
      stakingDataState,
      { payload }: { payload: { accountSpecifier: AccountId; stakingData: Staking } },
    ) => {
      updateOrInsert(stakingDataState, payload.accountSpecifier, payload.stakingData)
    },
    upsertValidatorData: (
      stakingDataState,
      { payload }: { payload: { validators: chainAdapters.cosmos.Validator[] } },
    ) => {
      updateOrInsertValidatorData(stakingDataState, payload.validators)
    },
  },
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
        if (!accountSpecifier?.length) {
          const error = `Missing accountSpecifier in getStakingData query. Expected an accountSpecifier string but got: ${accountSpecifier}`
          console.error(error)
          return {
            error: {
              data: error,
              status: 400,
            },
          }
        }

        try {
          const { caip2, account } = caip10.fromCAIP10(accountSpecifier)
          const chainAdapters = getChainAdapters()
          const adapter = (await chainAdapters.byChainId(caip2)) as ChainAdapter<ChainTypes.Cosmos>
          dispatch(stakingData.actions.setStatus('loading'))
          const data = await adapter.getAccount(account)

          const {
            chainSpecific: { delegations, redelegations, undelegations, rewards },
          } = data

          const currentStakingData = {
            delegations,
            redelegations,
            undelegations,
            rewards,
          }

          dispatch(
            stakingData.actions.upsertStakingData({
              stakingData: currentStakingData,
              accountSpecifier,
            }),
          )
          return { data: currentStakingData }
        } catch (e) {
          console.error('Error fetching staking data for ', accountSpecifier)
          return {
            error: {
              data: `Error fetching staking data for ${accountSpecifier}`,
              status: 500,
            },
          }
        } finally {
          dispatch(stakingData.actions.setStatus('loaded'))
        }
      },
    }),
    getAllValidatorsData: build.query<Validators, AllValidatorDataArgs>({
      queryFn: async ({ chainId }, { dispatch }) => {
        const chainAdapters = getChainAdapters()
        const adapter = (await chainAdapters.byChainId(
          chainId,
        )) as CosmosSdkBaseAdapter<ChainTypes.Cosmos>
        dispatch(stakingData.actions.setValidatorStatus('loading'))
        try {
          const data = await adapter.getValidators()
          dispatch(
            stakingData.actions.upsertValidatorData({
              validators: data,
            }),
          )
          return {
            data: {
              validators: data,
            },
          }
        } catch (e) {
          console.error('Error fetching all validators data', e)
          return {
            error: {
              data: `Error fetching staking data`,
              status: 500,
            },
          }
        } finally {
          dispatch(stakingData.actions.setValidatorStatus('loaded'))
        }
      },
    }),
    getValidatorData: build.query<chainAdapters.cosmos.Validator, SingleValidatorDataArgs>({
      queryFn: async ({ chainId, validatorAddress }, { dispatch }) => {
        const chainAdapters = getChainAdapters()
        const adapter = (await chainAdapters.byChainId(
          chainId,
        )) as CosmosSdkBaseAdapter<ChainTypes.Cosmos>
        dispatch(stakingData.actions.setValidatorStatus('loading'))
        try {
          const data = await adapter.getValidator(validatorAddress)
          dispatch(
            stakingData.actions.upsertValidatorData({
              validators: [data],
            }),
          )
          return {
            data,
          }
        } catch (e) {
          console.error('Error fetching single validator data', e)
          return {
            error: {
              data: `Error fetching staking data`,
              status: 500,
            },
          }
        } finally {
          dispatch(stakingData.actions.setValidatorStatus('loaded'))
        }
      },
    }),
  }),
})
