import { createSlice } from '@reduxjs/toolkit'
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { cosmosChainId } from '@shapeshiftoss/caip'
import { cosmossdk } from '@shapeshiftoss/chain-adapters'
// @ts-ignore this will fail at 'file differs in casing' error
import { chainAdapters } from '@shapeshiftoss/types'
import { getChainAdapters } from 'context/PluginProvider/PluginProvider'

export type PubKey = string

type SingleValidatorDataArgs = { validatorAddress: PubKey }

export type Validators = {
  validators: chainAdapters.cosmos.Validator[]
}

export type ValidatorData = {
  byValidator: ValidatorDataByPubKey
  validatorIds: PubKey[]
}

export type ValidatorDataByPubKey = {
  [k: PubKey]: chainAdapters.cosmos.Validator
}

const initialState: ValidatorData = {
  byValidator: {},
  validatorIds: [],
}

const updateOrInsertValidatorData = (
  validatorDataState: ValidatorData,
  validators: chainAdapters.cosmos.Validator[],
) => {
  validators.forEach(validator => {
    validatorDataState.validatorIds.push(validator.address)
    validatorDataState.byValidator[validator.address] = validator
  })
}

export const validatorData = createSlice({
  name: 'validatorData',
  initialState,
  reducers: {
    clear: () => initialState,
    upsertValidatorData: (
      validatorDataState,
      { payload }: { payload: { validators: chainAdapters.cosmos.Validator[] } },
    ) => {
      updateOrInsertValidatorData(validatorDataState, payload.validators)
    },
  },
})

export const validatorDataApi = createApi({
  reducerPath: 'validatorDataApi',
  // not actually used, only used to satisfy createApi, we use a custom queryFn
  baseQuery: fetchBaseQuery({ baseUrl: '/' }),
  // 5 minutes caching against overfetching. The only thing that can change on new Tx is effectively TVL and APR
  // The first won't noticeably change given the Million fiat precision we use, and the former effectively won't noticeably change either in such timeframe
  keepUnusedDataFor: 300,
  // refetch if network connection is dropped, useful for mobile
  refetchOnReconnect: true,
  endpoints: build => ({
    getValidatorData: build.query<chainAdapters.cosmos.Validator, SingleValidatorDataArgs>({
      queryFn: async ({ validatorAddress }, { dispatch }) => {
        const chainAdapters = getChainAdapters()
        const adapter = (await chainAdapters.byChainId(
          cosmosChainId,
        )) as cosmossdk.cosmos.ChainAdapter
        try {
          const data = await adapter.getValidator(validatorAddress)
          dispatch(
            validatorData.actions.upsertValidatorData({
              validators: [data],
            }),
          )
          return { data }
        } catch (e) {
          console.error('Error fetching single validator data', e)
          return {
            error: {
              data: `Error fetching validator data`,
              status: 500,
            },
          }
        }
      },
    }),
  }),
})
