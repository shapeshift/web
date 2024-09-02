import { createSlice } from '@reduxjs/toolkit'
import { createApi } from '@reduxjs/toolkit/dist/query/react'
import { type AccountId, fromAccountId } from '@shapeshiftoss/caip'
import { evm } from '@shapeshiftoss/chain-adapters'
import axios from 'axios'
import { PURGE } from 'redux-persist'
import { BigNumber, bn, bnOrZero } from 'lib/bignumber/bignumber'
import { FEE_CURVE_PARAMETERS } from 'lib/fees/parameters'
import type { ParameterModel } from 'lib/fees/parameters/types'
import { findClosestFoxDiscountDelayBlockNumber } from 'lib/fees/utils'
import type { ReduxState } from 'state/reducer'

import { BASE_RTK_CREATE_API_CONFIG } from '../const'
import { getVotingPower } from './getVotingPower'
import type { Strategy } from './validators'
import { SnapshotSchema, VotingPowerSchema } from './validators'

type FoxVotingPowerCryptoBalance = string

const SNAPSHOT_SPACE = 'shapeshiftdao.eth'

export const initialState: {
  votingPowerByModel: Record<ParameterModel, string | undefined>
  strategies: Strategy[] | undefined
} = {
  votingPowerByModel: {
    SWAPPER: undefined,
    THORCHAIN_LP: undefined,
  },
  strategies: undefined,
}

export const snapshot = createSlice({
  name: 'snapshot',
  initialState,
  reducers: {
    setVotingPower: (
      state,
      { payload }: { payload: { foxHeld: string; model: ParameterModel } },
    ) => {
      const { model, foxHeld } = payload
      state.votingPowerByModel[model] = foxHeld
    },
    setStrategies: (state, { payload }: { payload: Strategy[] }) => {
      state.strategies = payload
    },
  },
  extraReducers: builder => builder.addCase(PURGE, () => initialState),
})

export const snapshotApi = createApi({
  ...BASE_RTK_CREATE_API_CONFIG,
  reducerPath: 'snapshotApi',
  endpoints: build => ({
    getStrategies: build.query<Strategy[], void>({
      keepUnusedDataFor: Number.MAX_SAFE_INTEGER, // never refetch these
      queryFn: async (_, { dispatch }) => {
        const query = `
          query {
            space(id: "${SNAPSHOT_SPACE}") {
              strategies {
                name
                network
                params
              }
            }
          }
        `
        // https://hub.snapshot.org/graphql?query=query%20%7B%0A%20%20space(id%3A%20%22shapeshiftdao.eth%22)%20%7B%0A%20%20%20%20strategies%20%7B%0A%20%20%20%20%20%20name%0A%20%20%20%20%20%20network%0A%20%20%20%20%20%20params%0A%20%20%20%20%7D%0A%20%20%7D%0A%7D
        const { data: resData } = await axios.post(
          'https://hub.snapshot.org/graphql',
          { query },
          { headers: { Accept: 'application/json' } },
        )
        try {
          const { strategies } = SnapshotSchema.parse(resData).data.space
          dispatch(snapshot.actions.setStrategies(strategies))
          return { data: strategies }
        } catch (e) {
          console.error('snapshotApi getStrategies', e)
          return { data: [] }
        }
      },
    }),
    getVotingPower: build.query<FoxVotingPowerCryptoBalance, { model: ParameterModel }>({
      queryFn: async ({ model }, { dispatch, getState }) => {
        try {
          const accountIds: AccountId[] =
            (getState() as ReduxState).portfolio.accountMetadata.ids ?? []
          const strategies = await (async () => {
            const maybeSliceStragies = (getState() as ReduxState).snapshot.strategies
            if (maybeSliceStragies) return maybeSliceStragies

            const strategiesResult = await dispatch(snapshotApi.endpoints.getStrategies.initiate())
            return strategiesResult?.data
          })()
          if (!strategies) {
            console.log('snapshotApi getVotingPower could not get strategies')
            return { data: bn(0).toString() }
          }
          const evmAddresses = Array.from(
            accountIds.reduce<Set<string>>((acc, accountId) => {
              const { account, chainId } = fromAccountId(accountId)
              evm.isEvmChainId(chainId) && acc.add(account)
              return acc
            }, new Set()),
          )
          const foxDiscountBlock = await findClosestFoxDiscountDelayBlockNumber(
            FEE_CURVE_PARAMETERS[model].FEE_CURVE_FOX_DISCOUNT_DELAY_HOURS,
          )
          const delegation = false // don't let people delegate for discounts - ambiguous in spec
          const votingPowerResults = await Promise.all(
            evmAddresses.map(async address => {
              const votingPowerUnvalidated = await getVotingPower(
                address,
                '1',
                strategies,
                foxDiscountBlock,
                SNAPSHOT_SPACE,
                delegation,
              )
              // vp is FOX in crypto balance
              return bnOrZero(VotingPowerSchema.parse(votingPowerUnvalidated).vp)
            }),
          )
          const foxHeld = BigNumber.sum(...votingPowerResults).toNumber()

          // Return an error tuple in case of an invalid foxHeld value so we don't cache an errored value
          if (isNaN(foxHeld)) {
            const data = 'NaN foxHeld value'
            return { error: { data, status: 400 } }
          }

          dispatch(snapshot.actions.setVotingPower({ foxHeld: foxHeld.toString(), model }))
          return { data: foxHeld.toString() }
        } catch (e) {
          console.error(e)

          return { error: { data: e, status: 400 } }
        }
      },
    }),
  }),
})
