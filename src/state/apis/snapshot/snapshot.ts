import { createSlice } from '@reduxjs/toolkit'
import { createApi } from '@reduxjs/toolkit/dist/query/react'
import { type AccountId, fromAccountId } from '@shapeshiftoss/caip'
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import axios from 'axios'
import { PURGE } from 'redux-persist'
import { BigNumber, bn, bnOrZero } from 'lib/bignumber/bignumber'
import { FEE_CURVE_PARAMETERS } from 'lib/fees/parameters'
import type { ParameterModel } from 'lib/fees/parameters/types'
import { findClosestFoxDiscountDelayBlockNumber } from 'lib/fees/utils'
import type { ReduxState } from 'state/reducer'

import { BASE_RTK_CREATE_API_CONFIG } from '../const'
import { getVotingPower } from './getVotingPower'
import type { Proposal, Strategy } from './validators'
import { ProposalSchema, SnapshotSchema } from './validators'

type FoxVotingPowerCryptoBalance = string

const SNAPSHOT_SPACE = 'shapeshiftdao.eth'
const THORSWAP_SNAPSHOT_SPACE = 'thorswapcommunity.eth'

// https://snapshot.org/#/thorswapcommunity.eth/proposal/0x66a6c22cd2f4d88713bd4b4fd9068dfa35fee2fce94bb76fe274b8602cee556d
const THOR_TIP_014_BLOCK_NUMBER = 21072340

export const initialState: SnapshotState = {
  votingPowerByModel: {
    SWAPPER: undefined,
    THORCHAIN_LP: undefined,
    THORSWAP: undefined,
  },
  strategies: undefined,
  thorStrategies: undefined,
  proposals: undefined,
}

type ProposalsState = {
  activeProposals: Proposal[]
  closedProposals: Proposal[]
}

export type SnapshotState = {
  votingPowerByModel: Record<ParameterModel, string | undefined>
  strategies: Strategy[] | undefined
  thorStrategies: Strategy[] | undefined
  proposals: ProposalsState | undefined
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
    setThorVotingPower: (state, { payload }: { payload: string }) => {
      state.votingPowerByModel['THORSWAP'] = payload
    },
    setStrategies: (state, { payload }: { payload: Strategy[] }) => {
      state.strategies = payload
    },
    setThorStrategies: (state, { payload }: { payload: Strategy[] }) => {
      state.thorStrategies = payload
    },
    setProposals: (state, { payload }: { payload: ProposalsState }) => {
      state.proposals = payload
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
    getThorStrategies: build.query<Strategy[], void>({
      keepUnusedDataFor: Number.MAX_SAFE_INTEGER, // never refetch these
      queryFn: async (_, { dispatch }) => {
        const query = `
          query {
            space(id: "${THORSWAP_SNAPSHOT_SPACE}") {
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
          dispatch(snapshot.actions.setThorStrategies(strategies))
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
            console.error('snapshotApi getVotingPower could not get strategies')
            return { data: bn(0).toString() }
          }
          const evmAddresses = Array.from(
            accountIds.reduce<Set<string>>((acc, accountId) => {
              const { account, chainId } = fromAccountId(accountId)
              isEvmChainId(chainId) && acc.add(account)
              return acc
            }, new Set()),
          )
          const foxDiscountBlock = await findClosestFoxDiscountDelayBlockNumber(
            FEE_CURVE_PARAMETERS[model].FEE_CURVE_FOX_DISCOUNT_DELAY_HOURS,
          )
          const delegation = false // don't let people delegate for discounts - ambiguous in spec

          const votingPowerResults = await getVotingPower(
            evmAddresses,
            '1',
            strategies,
            foxDiscountBlock,
            SNAPSHOT_SPACE,
            delegation,
          )

          const foxHeld = votingPowerResults.reduce(
            (acc: BigNumber, scoreByAddress: Record<string, number>) => {
              const values = Object.values(scoreByAddress)

              if (!values.length) return acc

              return acc.plus(BigNumber.sum(...values.map(bnOrZero)))
            },
            bnOrZero(0),
          )

          dispatch(snapshot.actions.setVotingPower({ foxHeld: foxHeld.toString(), model }))

          return { data: foxHeld.toString() }
        } catch (e) {
          console.error(e)

          return { error: { data: e, status: 400 } }
        }
      },
    }),
    getThorVotingPower: build.query<FoxVotingPowerCryptoBalance, void>({
      queryFn: async (_, { dispatch, getState }) => {
        try {
          const accountIds: AccountId[] =
            (getState() as ReduxState).portfolio.accountMetadata.ids ?? []
          const strategies = await (async () => {
            const maybeSliceStragies = (getState() as ReduxState).snapshot.thorStrategies
            if (maybeSliceStragies) return maybeSliceStragies

            const strategiesResult = await dispatch(
              snapshotApi.endpoints.getThorStrategies.initiate(),
            )
            return strategiesResult?.data
          })()
          if (!strategies) {
            console.error('snapshotApi getThorVotingPower could not get strategies')
            return { data: bn(0).toString() }
          }
          const evmAddresses = Array.from(
            accountIds.reduce<Set<string>>((acc, accountId) => {
              const { account, chainId } = fromAccountId(accountId)
              isEvmChainId(chainId) && acc.add(account)
              return acc
            }, new Set()),
          )
          const delegation = false // don't let people delegate for discounts - ambiguous in spec

          const votingPowerResults = await getVotingPower(
            evmAddresses,
            '1',
            strategies,
            THOR_TIP_014_BLOCK_NUMBER,
            THORSWAP_SNAPSHOT_SPACE,
            delegation,
          )

          const thorHeld = votingPowerResults.reduce(
            (acc: BigNumber, scoreByAddress: Record<string, number>) => {
              const values = Object.values(scoreByAddress)

              if (!values.length) return acc

              return acc.plus(BigNumber.sum(...values.map(bnOrZero)))
            },
            bnOrZero(0),
          )

          dispatch(snapshot.actions.setThorVotingPower(thorHeld.toString()))
          return { data: thorHeld.toString() }
        } catch (e) {
          console.error(e)

          return { error: { data: e, status: 400 } }
        }
      },
    }),
    getProposals: build.query<ProposalsState, void>({
      queryFn: async (_, { dispatch }) => {
        const query = `
          query Proposals {
            activeProposals: proposals(
              first: 20,
              where: {
                space: "${SNAPSHOT_SPACE}",
                state: "active"
              },
              orderBy: "created",
              orderDirection: desc
            ) {
              id
              title
              body
              choices
              scores
              scores_total
              link
              state
            }
            
            closedProposals: proposals(
              first: 5,
              where: {
                space: "${SNAPSHOT_SPACE}",
                state: "closed"
              },
              orderBy: "created",
              orderDirection: desc
            ) {
              id
              title
              body
              choices
              scores
              scores_total
              link
              state
            }
          }
        `
        const { data: resData } = await axios.post(
          'https://hub.snapshot.org/graphql',
          { query },
          { headers: { Accept: 'application/json' } },
        )
        try {
          const proposals = ProposalSchema.parse(resData).data
          dispatch(snapshot.actions.setProposals(proposals))
          return { data: proposals }
        } catch (e) {
          console.error('snapshotApi getProposals', e)
          return { data: { activeProposals: [], closedProposals: [] } }
        }
      },
    }),
  }),
})

export const { useGetProposalsQuery } = snapshotApi
